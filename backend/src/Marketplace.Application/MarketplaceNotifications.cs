using Marketplace.Domain;

namespace Marketplace.Application;

public interface IMarketplaceNotifications
{
    Task OnOrderPaidAsync(Order order, CancellationToken ct);
    Task OnOrderShippedAsync(Order order, CancellationToken ct);
    Task OnOrderDeliveredAsync(Order order, CancellationToken ct);
    Task OnOrderCompletedAsync(Order order, CancellationToken ct);
    Task OnReviewReceivedAsync(Review review, CancellationToken ct);
}

public static class NotificationTypes
{
    public const string OrderPaid = "order.paid";
    public const string OrderShipped = "order.shipped";
    public const string OrderDelivered = "order.delivered";
    public const string OrderCompleted = "order.completed";
    public const string ReviewReceived = "review.received";
}

/// <summary>In-app notification rows (email/push can subscribe later).</summary>
public sealed class MarketplaceNotificationService : IMarketplaceNotifications
{
    private readonly INotificationRepository _notifications;

    public MarketplaceNotificationService(INotificationRepository notifications) =>
        _notifications = notifications;

    public async Task OnOrderPaidAsync(Order order, CancellationToken ct)
    {
        await Add(order.BuyerUserId, NotificationTypes.OrderPaid, "Fizetés sikeres",
            $"Rendelés #{order.Id:N} — a fizetés megérkezett.", order.Id, null, order.ProductId, ct);
        await Add(order.SellerUserId, NotificationTypes.OrderPaid, "Eladás — fizetve",
            $"Rendelés #{order.Id:N} — a vevő kifizette.", order.Id, null, order.ProductId, ct);
    }

    public async Task OnOrderShippedAsync(Order order, CancellationToken ct)
    {
        await Add(order.BuyerUserId, NotificationTypes.OrderShipped, "Szállítás elindult",
            $"Rendelés #{order.Id:N} — az eladó feladta a csomagot.", order.Id, null, order.ProductId, ct);
    }

    public async Task OnOrderDeliveredAsync(Order order, CancellationToken ct)
    {
        await Add(order.BuyerUserId, NotificationTypes.OrderDelivered, "Kézbesítve",
            $"Rendelés #{order.Id:N} — kézbesítés jelezve.", order.Id, null, order.ProductId, ct);
    }

    public async Task OnOrderCompletedAsync(Order order, CancellationToken ct)
    {
        await Add(order.BuyerUserId, NotificationTypes.OrderCompleted, "Rendelés lezárva",
            $"Rendelés #{order.Id:N} — átvétel megerősítve, írhatsz értékelést.", order.Id, null, order.ProductId, ct);
        await Add(order.SellerUserId, NotificationTypes.OrderCompleted, "Rendelés lezárva",
            $"Rendelés #{order.Id:N} — a vevő megerősítette az átvételt.", order.Id, null, order.ProductId, ct);
    }

    public async Task OnReviewReceivedAsync(Review review, CancellationToken ct)
    {
        await Add(review.ReviewedUserId, NotificationTypes.ReviewReceived, "Új értékelés",
            $"{review.Rating} csillag — rendelés #{review.OrderId:N}.", review.OrderId, null, review.ProductId, ct);
    }

    private async Task Add(Guid userId, string type, string title, string? body, Guid? orderId, Guid? offerId,
        Guid? productId, CancellationToken ct)
    {
        await _notifications.AddAsync(new Notification
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Type = type,
            Title = title,
            Body = body,
            OrderId = orderId,
            OfferId = offerId,
            ProductId = productId,
            CreatedAtUtc = DateTime.UtcNow
        }, ct);
    }
}
