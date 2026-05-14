using Marketplace.Domain;

namespace Marketplace.Application;

/// <summary>Advances order status along the DB state machine (shipping slice hooks).</summary>
public sealed class OrderWorkflowService
{
    private readonly IOrderRepository _orders;
    private readonly IMarketplaceNotifications _notify;

    public OrderWorkflowService(IOrderRepository orders, IMarketplaceNotifications notify)
    {
        _orders = orders;
        _notify = notify;
    }

    public async Task<Order?> MarkShippedAsync(Guid sellerId, Guid orderId, CancellationToken ct)
    {
        var order = await _orders.GetByIdAsync(orderId, ct);
        if (order is null || order.SellerUserId != sellerId) return null;
        OrderStateMachine.EnsureTransition(order.Status, OrderStatus.Shipped);

        order.Status = OrderStatus.Shipped;
        order.UpdatedAtUtc = DateTime.UtcNow;
        var saved = await _orders.UpdateAsync(order, ct);
        await _notify.OnOrderShippedAsync(saved, ct);
        return saved;
    }

    public async Task<Order?> MarkDeliveredAsync(Guid sellerId, Guid orderId, CancellationToken ct)
    {
        var order = await _orders.GetByIdAsync(orderId, ct);
        if (order is null || order.SellerUserId != sellerId) return null;
        OrderStateMachine.EnsureTransition(order.Status, OrderStatus.Delivered);

        order.Status = OrderStatus.Delivered;
        order.UpdatedAtUtc = DateTime.UtcNow;
        var saved = await _orders.UpdateAsync(order, ct);
        await _notify.OnOrderDeliveredAsync(saved, ct);
        return saved;
    }

    public async Task<Order?> ConfirmReceivedAsync(Guid buyerId, Guid orderId, CancellationToken ct)
    {
        var order = await _orders.GetByIdAsync(orderId, ct);
        if (order is null || order.BuyerUserId != buyerId) return null;
        OrderStateMachine.EnsureTransition(order.Status, OrderStatus.Completed);

        order.Status = OrderStatus.Completed;
        order.UpdatedAtUtc = DateTime.UtcNow;
        var saved = await _orders.UpdateAsync(order, ct);
        await _notify.OnOrderCompletedAsync(saved, ct);
        return saved;
    }
}
