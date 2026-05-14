using Marketplace.Application;
using Marketplace.Domain;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Marketplace.Infrastructure;

public sealed class ProductRepository : IProductRepository
{
    private readonly AppDbContext _db;
    public ProductRepository(AppDbContext db) => _db = db;

    public async Task<Product> CreateAsync(Product product, CancellationToken ct)
    {
        _db.Products.Add(product);
        await _db.SaveChangesAsync(ct);
        return product;
    }

    public async Task<bool> DeleteAsync(Guid id, Guid sellerId, CancellationToken ct)
    {
        var row = await _db.Products.FirstOrDefaultAsync(x => x.Id == id && x.SellerId == sellerId, ct);
        if (row is null) return false;
        row.Status = ProductStatus.Deleted;
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public Task<Product?> GetByIdAsync(Guid id, CancellationToken ct) =>
        _db.Products.FirstOrDefaultAsync(x => x.Id == id, ct);

    public async Task<IReadOnlyList<Product>> GetProductsAsync(ProductFilter filter, CancellationToken ct)
    {
        var q = _db.Products.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(filter.Category)) q = q.Where(x => x.Category == filter.Category);
        if (!string.IsNullOrWhiteSpace(filter.Brand)) q = q.Where(x => x.Brand == filter.Brand);
        if (!string.IsNullOrWhiteSpace(filter.Size)) q = q.Where(x => x.Size == filter.Size);
        if (filter.MinPriceHuf.HasValue) q = q.Where(x => x.PriceHuf >= filter.MinPriceHuf.Value);
        if (filter.MaxPriceHuf.HasValue) q = q.Where(x => x.PriceHuf <= filter.MaxPriceHuf.Value);
        if (filter.Status.HasValue) q = q.Where(x => x.Status == filter.Status.Value);
        return await q.OrderByDescending(x => x.CreatedAtUtc).ToListAsync(ct);
    }

    public async Task<IReadOnlyList<Product>> GetFeaturedAsync(int take, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        return await _db.Products.AsNoTracking()
            .Where(p => p.Status == ProductStatus.Available && p.FeaturedUntilUtc != null && p.FeaturedUntilUtc > now)
            .OrderByDescending(p => p.FeaturedUntilUtc)
            .Take(take)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<Product>> GetPopularAsync(int take, CancellationToken ct)
    {
        return await _db.Products.AsNoTracking()
            .Where(p => p.Status == ProductStatus.Available)
            .OrderByDescending(p => p.ViewCount + p.FavoriteCount * 3)
            .ThenByDescending(p => p.CreatedAtUtc)
            .Take(take)
            .ToListAsync(ct);
    }

    public Task IncrementViewCountAsync(Guid productId, CancellationToken ct) =>
        _db.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE products SET view_count = view_count + 1 WHERE id = {productId}");

    public async Task<Product?> UpdateAsync(Product product, CancellationToken ct)
    {
        _db.Products.Update(product);
        await _db.SaveChangesAsync(ct);
        return product;
    }
}

public sealed class UserRepository : IUserRepository
{
    private readonly AppDbContext _db;
    public UserRepository(AppDbContext db) => _db = db;

    public Task<User?> GetByEmailAsync(string email, CancellationToken ct) =>
        _db.Users.FirstOrDefaultAsync(x => x.Email == email.Trim().ToLower(), ct);

    public Task<User?> GetByIdAsync(Guid id, CancellationToken ct) =>
        _db.Users.FirstOrDefaultAsync(x => x.Id == id, ct);

    public async Task<User> CreateAsync(User user, CancellationToken ct)
    {
        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);
        return user;
    }
}

public sealed class OfferRepository : IOfferRepository
{
    private readonly AppDbContext _db;
    public OfferRepository(AppDbContext db) => _db = db;

    public Task<Offer?> GetByIdAsync(Guid id, CancellationToken ct) =>
        _db.Offers.FirstOrDefaultAsync(x => x.Id == id, ct);

    public async Task<IReadOnlyList<Offer>> ListForProductAsync(Guid productId, CancellationToken ct)
    {
        var list = await _db.Offers.AsNoTracking()
            .Where(x => x.ProductId == productId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync(ct);
        return list;
    }

    public async Task<Offer> AddAsync(Offer offer, CancellationToken ct)
    {
        _db.Offers.Add(offer);
        await _db.SaveChangesAsync(ct);
        return offer;
    }

    public async Task<Offer> UpdateAsync(Offer offer, CancellationToken ct)
    {
        _db.Offers.Update(offer);
        await _db.SaveChangesAsync(ct);
        return offer;
    }
}

public sealed class OrderRepository : IOrderRepository
{
    private readonly AppDbContext _db;
    public OrderRepository(AppDbContext db) => _db = db;

    public Task<Order?> GetByIdAsync(Guid id, CancellationToken ct) =>
        _db.Orders.FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<Order?> GetByCheckoutSessionIdAsync(string checkoutSessionId, CancellationToken ct) =>
        _db.Orders.FirstOrDefaultAsync(x => x.StripeCheckoutSessionId == checkoutSessionId, ct);

    public Task<Order?> GetByPaymentIntentIdAsync(string paymentIntentId, CancellationToken ct) =>
        _db.Orders.FirstOrDefaultAsync(x => x.StripePaymentIntentId == paymentIntentId, ct);

    public Task<Order?> FindOpenCheckoutByOfferIdAsync(Guid offerId, CancellationToken ct) =>
        _db.Orders.OrderByDescending(o => o.CreatedAtUtc).FirstOrDefaultAsync(
            o => o.OfferId == offerId &&
                 (o.Status == OrderStatus.Created || o.Status == OrderStatus.PaymentPending),
            ct);

    public Task<Order?> FindOpenCheckoutBuyNowAsync(Guid productId, Guid buyerUserId, CancellationToken ct) =>
        _db.Orders.OrderByDescending(o => o.CreatedAtUtc).FirstOrDefaultAsync(
            o => o.OfferId == null &&
                 o.ProductId == productId &&
                 o.BuyerUserId == buyerUserId &&
                 (o.Status == OrderStatus.Created || o.Status == OrderStatus.PaymentPending),
            ct);

    public async Task<Order> AddAsync(Order order, CancellationToken ct)
    {
        _db.Orders.Add(order);
        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException pg && pg.SqlState == "23505")
        {
            throw new DuplicateActiveCheckoutException(
                "An open checkout already exists for this offer or buy-now slot.");
        }
        return order;
    }

    public async Task<Order> UpdateAsync(Order order, CancellationToken ct)
    {
        _db.Orders.Update(order);
        await _db.SaveChangesAsync(ct);
        return order;
    }
}

public sealed class ReviewRepository : IReviewRepository
{
    private readonly AppDbContext _db;
    public ReviewRepository(AppDbContext db) => _db = db;

    public Task<Review?> GetAsync(Guid orderId, Guid reviewerUserId, CancellationToken ct) =>
        _db.Reviews.FirstOrDefaultAsync(
            x => x.OrderId == orderId && x.ReviewerUserId == reviewerUserId, ct);

    public async Task<Review> AddAsync(Review review, CancellationToken ct)
    {
        _db.Reviews.Add(review);
        await _db.SaveChangesAsync(ct);
        return review;
    }
}

public sealed class StripeWebhookEventRepository : IStripeWebhookEventRepository
{
    private readonly AppDbContext _db;
    public StripeWebhookEventRepository(AppDbContext db) => _db = db;

    public async Task<bool> TryInsertPendingAsync(StripeWebhookEvent row, CancellationToken ct)
    {
        try
        {
            _db.StripeWebhookEvents.Add(row);
            await _db.SaveChangesAsync(ct);
            return true;
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException pg && pg.SqlState == "23505")
        {
            return false;
        }
    }

    public Task<StripeWebhookEvent?> GetByIdAsync(string stripeEventId, CancellationToken ct) =>
        _db.StripeWebhookEvents.AsNoTracking()
            .FirstOrDefaultAsync(x => x.StripeEventId == stripeEventId, ct);

    public async Task MarkProcessedAsync(string stripeEventId, CancellationToken ct)
    {
        var row = await _db.StripeWebhookEvents.FirstOrDefaultAsync(x => x.StripeEventId == stripeEventId, ct);
        if (row is null) return;
        row.Processed = true;
        row.ProcessedAtUtc = DateTime.UtcNow;
        row.Error = null;
        await _db.SaveChangesAsync(ct);
    }

    public async Task MarkFailedAsync(string stripeEventId, string error, CancellationToken ct)
    {
        var row = await _db.StripeWebhookEvents.FirstOrDefaultAsync(x => x.StripeEventId == stripeEventId, ct);
        if (row is null) return;
        row.Processed = false;
        row.ProcessedAtUtc = DateTime.UtcNow;
        row.Error = error.Length > 8000 ? error[..8000] : error;
        await _db.SaveChangesAsync(ct);
    }
}

public sealed class NotificationRepository : INotificationRepository
{
    private readonly AppDbContext _db;
    public NotificationRepository(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<Notification>> ListForUserAsync(Guid userId, bool unreadOnly, CancellationToken ct)
    {
        var q = _db.Notifications.AsNoTracking().Where(x => x.UserId == userId);
        if (unreadOnly) q = q.Where(x => x.ReadAtUtc == null);
        return await q.OrderByDescending(x => x.CreatedAtUtc).Take(200).ToListAsync(ct);
    }

    public Task<Notification?> GetAsync(Guid id, Guid userId, CancellationToken ct) =>
        _db.Notifications.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);

    public async Task AddAsync(Notification notification, CancellationToken ct)
    {
        _db.Notifications.Add(notification);
        await _db.SaveChangesAsync(ct);
    }

    public async Task MarkReadAsync(Guid id, Guid userId, CancellationToken ct)
    {
        var row = await _db.Notifications.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
        if (row is null) return;
        row.ReadAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }
}

public sealed class ConversationRepository : IConversationRepository
{
    private readonly AppDbContext _db;
    public ConversationRepository(AppDbContext db) => _db = db;

    public Task<Conversation?> GetByIdAsync(Guid id, CancellationToken ct) =>
        _db.Conversations.FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<Conversation?> FindListingThreadAsync(Guid buyerId, Guid sellerId, Guid productId, CancellationToken ct) =>
        _db.Conversations.FirstOrDefaultAsync(
            c => c.BuyerUserId == buyerId && c.SellerUserId == sellerId && c.ProductId == productId && c.OrderId == null,
            ct);

    public Task<Conversation?> FindOrderThreadAsync(Guid orderId, CancellationToken ct) =>
        _db.Conversations.FirstOrDefaultAsync(c => c.OrderId == orderId, ct);

    public async Task<Conversation> AddAsync(Conversation conversation, CancellationToken ct)
    {
        _db.Conversations.Add(conversation);
        await _db.SaveChangesAsync(ct);
        return conversation;
    }

    public async Task UpdateLastMessageAsync(Guid conversationId, DateTime sentAtUtc, CancellationToken ct)
    {
        var row = await _db.Conversations.FirstOrDefaultAsync(x => x.Id == conversationId, ct);
        if (row is null) return;
        row.LastMessageAtUtc = sentAtUtc;
        await _db.SaveChangesAsync(ct);
    }
}
