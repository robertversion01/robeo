using Marketplace.Domain;
using Microsoft.Extensions.Configuration;

namespace Marketplace.Application;

/// <summary>Listing → accepted offer → Stripe Checkout → order in payment_pending. Deduplicates open checkouts per offer / buy-now.</summary>
public sealed class MarketplaceCheckoutOrchestrator
{
    private readonly IOrderRepository _orders;
    private readonly IOfferRepository _offers;
    private readonly IProductRepository _products;
    private readonly IUserRepository _users;
    private readonly IStripeCheckoutSessionGateway _stripe;
    private readonly IConfiguration _configuration;

    public MarketplaceCheckoutOrchestrator(
        IOrderRepository orders,
        IOfferRepository offers,
        IProductRepository products,
        IUserRepository users,
        IStripeCheckoutSessionGateway stripe,
        IConfiguration configuration)
    {
        _orders = orders;
        _offers = offers;
        _products = products;
        _users = users;
        _stripe = stripe;
        _configuration = configuration;
    }

    public async Task<CreateCheckoutSessionResponse> CreateCheckoutSessionAsync(
        Guid buyerId,
        CreateCheckoutSessionRequest req,
        CancellationToken ct)
    {
        var product = await ResolveProductAsync(req, ct);
        if (product.Status != ProductStatus.Available)
            throw new InvalidOperationException("Product is not available.");

        if (product.SellerId == buyerId)
            throw new InvalidOperationException("Cannot purchase your own listing.");

        Offer? offer = null;
        Guid? offerId = null;
        int itemPriceHuf;
        int shippingFeeHuf = Math.Max(0, req.ShippingFeeHuf);

        if (req.OfferId is { } oid)
        {
            offer = await _offers.GetByIdAsync(oid, ct)
                ?? throw new InvalidOperationException("Offer not found.");

            if (offer.BuyerUserId != buyerId)
                throw new InvalidOperationException("Offer does not belong to the current buyer.");

            if (offer.ProductId != product.Id)
                throw new InvalidOperationException("Offer does not match product.");

            if (offer.Status != OfferStatus.Accepted)
                throw new InvalidOperationException("Offer must be accepted before checkout.");

            itemPriceHuf = offer.OfferedPriceHuf;
            offerId = offer.Id;
            if (shippingFeeHuf == 0 && offer.ShippingFeeHuf > 0)
                shippingFeeHuf = offer.ShippingFeeHuf;

            var reused = await TryReuseOpenCheckoutForOfferAsync(offer, ct);
            if (reused is not null)
                return reused;
        }
        else if (req.BuyNow && req.ProductId is not null)
        {
            itemPriceHuf = product.PriceHuf;
            var reusedBn = await TryReuseOpenCheckoutBuyNowAsync(product.Id, buyerId, ct);
            if (reusedBn is not null)
                return reusedBn;
        }
        else
        {
            throw new InvalidOperationException("Specify offerId or buyNow with productId.");
        }

        var platformFeeHuf = BuyerProtectionFeeCalculator.TotalBuyerProtectionFeeHuf(itemPriceHuf);
        var vatAmountHuf = (int)Math.Round((itemPriceHuf + platformFeeHuf) * 0.27m, MidpointRounding.AwayFromZero);

        var seller = await _users.GetByIdAsync(product.SellerId, ct)
            ?? throw new InvalidOperationException("Seller not found.");

        var order = new Order
        {
            Id = Guid.NewGuid(),
            ProductId = product.Id,
            BuyerUserId = buyerId,
            SellerUserId = product.SellerId,
            OfferId = offerId,
            Status = OrderStatus.Created,
            ItemPriceHuf = itemPriceHuf,
            ShippingFeeHuf = shippingFeeHuf,
            PlatformFeeHuf = platformFeeHuf,
            VatAmountHuf = vatAmountHuf,
            CurrencyCode = "HUF",
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };

        try
        {
            await _orders.AddAsync(order, ct);
        }
        catch (DuplicateActiveCheckoutException)
        {
            if (req.OfferId is { } dupOfferId)
            {
                var exOffer = await _offers.GetByIdAsync(dupOfferId, ct);
                if (exOffer is not null)
                {
                    var reused = await TryReuseOpenCheckoutForOfferAsync(exOffer, ct);
                    if (reused is not null)
                        return reused;
                }
            }
            else
            {
                var again = await _orders.FindOpenCheckoutBuyNowAsync(product.Id, buyerId, ct);
                if (again?.StripeCheckoutSessionId is { } sid)
                {
                    var info = await _stripe.GetCheckoutSessionAsync(sid, ct);
                    if (info is not null && info.Status == "open" && !string.IsNullOrEmpty(info.Url))
                        return new CreateCheckoutSessionResponse(again.Id, info.Url);
                }
            }

            throw new DuplicateActiveCheckoutException("Checkout conflict — retry after concurrent session.");
        }

        var totalHuf = itemPriceHuf + platformFeeHuf + shippingFeeHuf;

        var publicBase = _configuration["Stripe:PublicBaseUrl"]?.TrimEnd('/')
            ?? _configuration["PublicBaseUrl"]?.TrimEnd('/')
            ?? "http://localhost:5173";

        var successUrl = $"{publicBase}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}";
        var cancelUrl = $"{publicBase}/products/{product.Id}";

        var session = await _stripe.CreateCheckoutSessionAsync(
            order,
            product,
            seller,
            totalHuf,
            platformFeeHuf,
            successUrl,
            cancelUrl,
            ct);

        OrderStateMachine.EnsureTransition(order.Status, OrderStatus.PaymentPending);
        order.Status = OrderStatus.PaymentPending;
        order.StripeCheckoutSessionId = session.SessionId;
        order.StripePaymentIntentId = session.PaymentIntentId;
        order.UpdatedAtUtc = DateTime.UtcNow;
        await _orders.UpdateAsync(order, ct);

        if (offer is not null)
        {
            OfferStateMachine.EnsureTransition(offer.Status, OfferStatus.PaymentPending);
            offer.Status = OfferStatus.PaymentPending;
            offer.UpdatedAtUtc = DateTime.UtcNow;
            await _offers.UpdateAsync(offer, ct);
        }

        return new CreateCheckoutSessionResponse(order.Id, session.CheckoutUrl);
    }

    private async Task<CreateCheckoutSessionResponse?> TryReuseOpenCheckoutForOfferAsync(Offer offer, CancellationToken ct)
    {
        var existing = await _orders.FindOpenCheckoutByOfferIdAsync(offer.Id, ct);
        if (existing is null || string.IsNullOrEmpty(existing.StripeCheckoutSessionId))
            return null;

        var info = await _stripe.GetCheckoutSessionAsync(existing.StripeCheckoutSessionId, ct);
        if (info is not null && info.Status == "open" && !string.IsNullOrEmpty(info.Url))
            return new CreateCheckoutSessionResponse(existing.Id, info.Url);

        await CancelStaleOrderAndRevertOfferAsync(existing, offer, ct);
        return null;
    }

    private async Task<CreateCheckoutSessionResponse?> TryReuseOpenCheckoutBuyNowAsync(Guid productId, Guid buyerId, CancellationToken ct)
    {
        var existing = await _orders.FindOpenCheckoutBuyNowAsync(productId, buyerId, ct);
        if (existing is null || string.IsNullOrEmpty(existing.StripeCheckoutSessionId))
            return null;

        var info = await _stripe.GetCheckoutSessionAsync(existing.StripeCheckoutSessionId, ct);
        if (info is not null && info.Status == "open" && !string.IsNullOrEmpty(info.Url))
            return new CreateCheckoutSessionResponse(existing.Id, info.Url);

        OrderStateMachine.EnsureTransition(existing.Status, OrderStatus.Cancelled);
        existing.Status = OrderStatus.Cancelled;
        existing.UpdatedAtUtc = DateTime.UtcNow;
        await _orders.UpdateAsync(existing, ct);
        return null;
    }

    private async Task CancelStaleOrderAndRevertOfferAsync(Order order, Offer offer, CancellationToken ct)
    {
        if (order.Status == OrderStatus.PaymentPending)
        {
            OrderStateMachine.EnsureTransition(order.Status, OrderStatus.Cancelled);
            order.Status = OrderStatus.Cancelled;
            order.UpdatedAtUtc = DateTime.UtcNow;
            await _orders.UpdateAsync(order, ct);
        }

        if (offer.Status == OfferStatus.PaymentPending)
        {
            OfferStateMachine.EnsureTransition(offer.Status, OfferStatus.Accepted);
            offer.Status = OfferStatus.Accepted;
            offer.UpdatedAtUtc = DateTime.UtcNow;
            await _offers.UpdateAsync(offer, ct);
        }
    }

    private async Task<Product> ResolveProductAsync(CreateCheckoutSessionRequest req, CancellationToken ct)
    {
        if (req.OfferId is { } offerId)
        {
            var o = await _offers.GetByIdAsync(offerId, ct)
                ?? throw new InvalidOperationException("Offer not found.");
            return await _products.GetByIdAsync(o.ProductId, ct)
                ?? throw new InvalidOperationException("Product not found.");
        }

        if (req.ProductId is { } pid)
        {
            return await _products.GetByIdAsync(pid, ct)
                ?? throw new InvalidOperationException("Product not found.");
        }

        throw new InvalidOperationException("productId or offerId required.");
    }
}
