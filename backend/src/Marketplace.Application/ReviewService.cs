using Marketplace.Domain;

namespace Marketplace.Application;

public sealed class ReviewService
{
    private readonly IReviewRepository _reviews;
    private readonly IOrderRepository _orders;
    private readonly IMarketplaceNotifications _notify;

    public ReviewService(
        IReviewRepository reviews,
        IOrderRepository orders,
        IMarketplaceNotifications notify)
    {
        _reviews = reviews;
        _orders = orders;
        _notify = notify;
    }

    public async Task<Review> CreateAsync(Guid reviewerId, Guid orderId, int rating, string? comment, CancellationToken ct)
    {
        if (rating is < 1 or > 5)
            throw new InvalidOperationException("Rating must be between 1 and 5.");

        var order = await _orders.GetByIdAsync(orderId, ct)
            ?? throw new InvalidOperationException("Order not found.");

        if (order.Status != OrderStatus.Completed)
            throw new InvalidOperationException(
                "Reviews are allowed only after the order is completed (buyer confirmed receipt).");

        if (order.BuyerUserId != reviewerId && order.SellerUserId != reviewerId)
            throw new InvalidOperationException("Only transaction participants can leave a review.");

        var reviewedId = order.BuyerUserId == reviewerId ? order.SellerUserId : order.BuyerUserId;

        var existing = await _reviews.GetAsync(orderId, reviewerId, ct);
        if (existing is not null)
            throw new InvalidOperationException("You have already reviewed this order.");

        var review = new Review
        {
            Id = Guid.NewGuid(),
            OrderId = orderId,
            ProductId = order.ProductId,
            ReviewerUserId = reviewerId,
            ReviewedUserId = reviewedId,
            Rating = rating,
            Comment = comment,
            CreatedAtUtc = DateTime.UtcNow
        };

        var saved = await _reviews.AddAsync(review, ct);
        await _notify.OnReviewReceivedAsync(saved, ct);
        return saved;
    }
}
