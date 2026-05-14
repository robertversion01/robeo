using Marketplace.Domain;

namespace Marketplace.Application;

/// <summary>Resolves or creates chat threads keyed by listing or order.</summary>
public sealed class ConversationRoutingService
{
    private readonly IConversationRepository _conversations;
    private readonly IOrderRepository _orders;
    private readonly IProductRepository _products;

    public ConversationRoutingService(
        IConversationRepository conversations,
        IOrderRepository orders,
        IProductRepository products)
    {
        _conversations = conversations;
        _orders = orders;
        _products = products;
    }

    public async Task<Conversation> GetOrCreateListingThreadAsync(
        Guid currentUserId, Guid productId, CancellationToken ct)
    {
        var product = await _products.GetByIdAsync(productId, ct)
            ?? throw new InvalidOperationException("Product not found.");

        if (product.SellerId == currentUserId)
            throw new InvalidOperationException("Use buyer account to start a listing thread.");

        var buyerId = currentUserId;
        var sellerId = product.SellerId;

        var existing = await _conversations.FindListingThreadAsync(buyerId, sellerId, productId, ct);
        if (existing is not null) return existing;

        var conv = new Conversation
        {
            Id = Guid.NewGuid(),
            BuyerUserId = buyerId,
            SellerUserId = sellerId,
            ProductId = productId,
            OrderId = null,
            CreatedAtUtc = DateTime.UtcNow
        };
        return await _conversations.AddAsync(conv, ct);
    }

    public async Task<Conversation> GetOrCreateOrderThreadAsync(Guid currentUserId, Guid orderId, CancellationToken ct)
    {
        var order = await _orders.GetByIdAsync(orderId, ct)
            ?? throw new InvalidOperationException("Order not found.");

        if (order.BuyerUserId != currentUserId && order.SellerUserId != currentUserId)
            throw new UnauthorizedAccessException("Not a participant of this order.");

        var existing = await _conversations.FindOrderThreadAsync(orderId, ct);
        if (existing is not null) return existing;

        var conv = new Conversation
        {
            Id = Guid.NewGuid(),
            BuyerUserId = order.BuyerUserId,
            SellerUserId = order.SellerUserId,
            ProductId = order.ProductId,
            OrderId = orderId,
            CreatedAtUtc = DateTime.UtcNow
        };
        return await _conversations.AddAsync(conv, ct);
    }
}
