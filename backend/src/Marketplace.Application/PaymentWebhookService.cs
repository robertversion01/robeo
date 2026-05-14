using Marketplace.Domain;

namespace Marketplace.Application;

/// <summary>Applies Stripe webhook results to orders, offers, and product availability (V1-aligned outcomes).</summary>
public sealed class PaymentWebhookService
{
    private readonly IOrderRepository _orders;
    private readonly IOfferRepository _offers;
    private readonly IProductRepository _products;
    private readonly IMarketplaceNotifications _notify;

    public PaymentWebhookService(
        IOrderRepository orders,
        IOfferRepository offers,
        IProductRepository products,
        IMarketplaceNotifications notify)
    {
        _orders = orders;
        _offers = offers;
        _products = products;
        _notify = notify;
    }

    public async Task ApplyCheckoutSessionCompletedAsync(
        string checkoutSessionId,
        string? paymentIntentId,
        CancellationToken ct)
    {
        var order = await _orders.GetByCheckoutSessionIdAsync(checkoutSessionId, ct);
        if (order is null)
            throw new InvalidOperationException($"No order for checkout_session_id={checkoutSessionId}");

        await MarkPaidAsync(order, paymentIntentId, ct);
    }

    public async Task ApplyPaymentIntentSucceededAsync(string paymentIntentId, CancellationToken ct)
    {
        var order = await _orders.GetByPaymentIntentIdAsync(paymentIntentId, ct);
        if (order is null)
            return;

        await MarkPaidAsync(order, paymentIntentId, ct);
    }

    private async Task MarkPaidAsync(Order order, string? paymentIntentId, CancellationToken ct)
    {
        if (order.Status == OrderStatus.FundsInEscrow || order.Status == OrderStatus.Shipped ||
            order.Status == OrderStatus.Delivered || order.Status == OrderStatus.Completed)
        {
            if (!string.IsNullOrEmpty(paymentIntentId) && string.IsNullOrEmpty(order.StripePaymentIntentId))
            {
                order.StripePaymentIntentId = paymentIntentId;
                order.UpdatedAtUtc = DateTime.UtcNow;
                await _orders.UpdateAsync(order, ct);
            }
            return;
        }

        if (order.Status != OrderStatus.PaymentPending && order.Status != OrderStatus.Created)
            return;

        // DB trigger: created → payment_pending → funds_in_escrow (two steps if webhook races before UI update).
        if (order.Status == OrderStatus.Created)
        {
            OrderStateMachine.EnsureTransition(order.Status, OrderStatus.PaymentPending);
            order.Status = OrderStatus.PaymentPending;
            order.UpdatedAtUtc = DateTime.UtcNow;
            await _orders.UpdateAsync(order, ct);
        }

        OrderStateMachine.EnsureTransition(order.Status, OrderStatus.FundsInEscrow);
        order.Status = OrderStatus.FundsInEscrow;
        if (!string.IsNullOrEmpty(paymentIntentId))
            order.StripePaymentIntentId = paymentIntentId;
        order.UpdatedAtUtc = DateTime.UtcNow;
        await _orders.UpdateAsync(order, ct);

        var product = await _products.GetByIdAsync(order.ProductId, ct);
        if (product is not null && product.Status == ProductStatus.Available)
        {
            product.Status = ProductStatus.Sold;
            product.UpdatedAtUtc = DateTime.UtcNow;
            await _products.UpdateAsync(product, ct);
        }

        if (order.OfferId is { } offerId)
        {
            var offer = await _offers.GetByIdAsync(offerId, ct);
            if (offer is not null)
            {
                if (offer.Status == OfferStatus.Accepted)
                {
                    OfferStateMachine.EnsureTransition(offer.Status, OfferStatus.PaymentPending);
                    offer.Status = OfferStatus.PaymentPending;
                    offer.UpdatedAtUtc = DateTime.UtcNow;
                    await _offers.UpdateAsync(offer, ct);
                }

                OfferStateMachine.EnsureTransition(offer.Status, OfferStatus.PaymentCompleted);
                offer.Status = OfferStatus.PaymentCompleted;
                offer.UpdatedAtUtc = DateTime.UtcNow;
                await _offers.UpdateAsync(offer, ct);
            }
        }

        await _notify.OnOrderPaidAsync(order, ct);
    }

    public async Task ApplyPaymentIntentFailedAsync(string paymentIntentId, CancellationToken ct)
    {
        var order = await _orders.GetByPaymentIntentIdAsync(paymentIntentId, ct);
        if (order is null) return;

        if (order.Status is OrderStatus.FundsInEscrow or OrderStatus.Shipped or OrderStatus.Delivered
            or OrderStatus.Completed)
            return;

        OrderStateMachine.EnsureTransition(order.Status, OrderStatus.Cancelled);
        order.Status = OrderStatus.Cancelled;
        order.UpdatedAtUtc = DateTime.UtcNow;
        await _orders.UpdateAsync(order, ct);

        if (order.OfferId is { } offerId)
        {
            var offer = await _offers.GetByIdAsync(offerId, ct);
            if (offer is not null)
            {
                OfferStateMachine.EnsureTransition(offer.Status, OfferStatus.Accepted);
                offer.Status = OfferStatus.Accepted;
                offer.UpdatedAtUtc = DateTime.UtcNow;
                await _offers.UpdateAsync(offer, ct);
            }
        }
    }

    public async Task ApplyChargeRefundedAsync(string paymentIntentId, CancellationToken ct)
    {
        var order = await _orders.GetByPaymentIntentIdAsync(paymentIntentId, ct);
        if (order is null) return;
        if (order.Status == OrderStatus.Refunded) return;

        OrderStateMachine.EnsureTransition(order.Status, OrderStatus.Refunded);
        order.Status = OrderStatus.Refunded;
        order.UpdatedAtUtc = DateTime.UtcNow;
        await _orders.UpdateAsync(order, ct);
    }
}
