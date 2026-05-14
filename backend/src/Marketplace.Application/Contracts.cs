using Marketplace.Domain;

namespace Marketplace.Application;

public sealed record ProductFilter(
    string? Category,
    string? Brand,
    string? Size,
    int? MinPriceHuf,
    int? MaxPriceHuf,
    ProductStatus? Status);

public sealed record CreateProductRequest(
    string Title,
    string Description,
    string Category,
    string Brand,
    string Size,
    ProductCondition Condition,
    int PriceHuf);

public sealed record UpdateProductRequest(
    string Title,
    string Description,
    string Category,
    string Brand,
    string Size,
    ProductCondition Condition,
    int PriceHuf,
    ProductStatus Status);

public sealed record AuthRequest(string Email, string Password);
public sealed record AuthResponse(string AccessToken, DateTime ExpiresAtUtc);

public interface IProductRepository
{
    Task<IReadOnlyList<Product>> GetProductsAsync(ProductFilter filter, CancellationToken ct);
    Task<Product?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<Product> CreateAsync(Product product, CancellationToken ct);
    Task<Product?> UpdateAsync(Product product, CancellationToken ct);
    Task<bool> DeleteAsync(Guid id, Guid sellerId, CancellationToken ct);
    Task<IReadOnlyList<Product>> GetFeaturedAsync(int take, CancellationToken ct);
    Task<IReadOnlyList<Product>> GetPopularAsync(int take, CancellationToken ct);
    Task IncrementViewCountAsync(Guid productId, CancellationToken ct);
}

public interface IUserRepository
{
    Task<User?> GetByEmailAsync(string email, CancellationToken ct);
    Task<User?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<User> CreateAsync(User user, CancellationToken ct);
}

public interface IJwtTokenService
{
    AuthResponse CreateToken(User user);
}

public interface IImageStorageService
{
    Task<string> UploadImageAsync(Stream stream, string fileName, CancellationToken ct);
}

public interface IShippingService
{
    Task<string> GenerateShippingLabelAsync(Guid orderId, string foxpostLockerCode, CancellationToken ct);
}

public interface IInvoicingService
{
    Task<string> CreateCommissionInvoiceAsync(Guid orderId, int amountHuf, int vatRatePercent, CancellationToken ct);
}

public interface IStripeConnectService
{
    Task<string> CreateEscrowIntentAsync(Guid orderId, int amountHuf, string currencyCode, CancellationToken ct);
}

public interface IOfferRepository
{
    Task<Offer?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<IReadOnlyList<Offer>> ListForProductAsync(Guid productId, CancellationToken ct);
    Task<Offer> AddAsync(Offer offer, CancellationToken ct);
    Task<Offer> UpdateAsync(Offer offer, CancellationToken ct);
}

public interface IOrderRepository
{
    Task<Order?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<Order?> GetByCheckoutSessionIdAsync(string checkoutSessionId, CancellationToken ct);
    Task<Order?> GetByPaymentIntentIdAsync(string paymentIntentId, CancellationToken ct);
    /// <summary>Open checkout: <see cref="OrderStatus.Created"/> or <see cref="OrderStatus.PaymentPending"/>.</summary>
    Task<Order?> FindOpenCheckoutByOfferIdAsync(Guid offerId, CancellationToken ct);
    Task<Order?> FindOpenCheckoutBuyNowAsync(Guid productId, Guid buyerUserId, CancellationToken ct);
    Task<Order> AddAsync(Order order, CancellationToken ct);
    Task<Order> UpdateAsync(Order order, CancellationToken ct);
}

public interface INotificationRepository
{
    Task<IReadOnlyList<Notification>> ListForUserAsync(Guid userId, bool unreadOnly, CancellationToken ct);
    Task<Notification?> GetAsync(Guid id, Guid userId, CancellationToken ct);
    Task AddAsync(Notification notification, CancellationToken ct);
    Task MarkReadAsync(Guid id, Guid userId, CancellationToken ct);
}

public interface IConversationRepository
{
    Task<Conversation?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<Conversation?> FindListingThreadAsync(Guid buyerId, Guid sellerId, Guid productId, CancellationToken ct);
    Task<Conversation?> FindOrderThreadAsync(Guid orderId, CancellationToken ct);
    Task<Conversation> AddAsync(Conversation conversation, CancellationToken ct);
    Task UpdateLastMessageAsync(Guid conversationId, DateTime sentAtUtc, CancellationToken ct);
}

public interface IStripeWebhookEventRepository
{
    /// <summary>Returns false if the event was already processed successfully.</summary>
    Task<bool> TryInsertPendingAsync(StripeWebhookEvent row, CancellationToken ct);
    Task<StripeWebhookEvent?> GetByIdAsync(string stripeEventId, CancellationToken ct);
    Task MarkProcessedAsync(string stripeEventId, CancellationToken ct);
    Task MarkFailedAsync(string stripeEventId, string error, CancellationToken ct);
}

public interface IReviewRepository
{
    Task<Review?> GetAsync(Guid orderId, Guid reviewerUserId, CancellationToken ct);
    Task<Review> AddAsync(Review review, CancellationToken ct);
}

public sealed record CreateOfferRequest(
    Guid ProductId,
    int OfferedPriceHuf,
    string? BuyerMessage,
    string? ShippingMethod,
    int ShippingFeeHuf);

public sealed record SellerCounterOfferRequest(int CounterPriceHuf, string? SellerCounterMessage);

public sealed record CreateCheckoutSessionRequest(
    Guid? OfferId,
    Guid? ProductId,
    bool BuyNow,
    string? ShippingMethod,
    int ShippingFeeHuf);

public sealed record CreateCheckoutSessionResponse(Guid OrderId, string CheckoutUrl);

public sealed record StripeCheckoutSessionResult(string SessionId, string CheckoutUrl, string? PaymentIntentId);

/// <param name="Status">Stripe session status: open, complete, expired, …</param>
public sealed record StripeCheckoutSessionInfo(string? Url, string Status);

public interface IStripeCheckoutSessionGateway
{
    Task<StripeCheckoutSessionResult> CreateCheckoutSessionAsync(
        Order order,
        Product product,
        User seller,
        int totalAmountHuf,
        int applicationFeeHuf,
        string successUrl,
        string cancelUrl,
        CancellationToken ct);

    Task<StripeCheckoutSessionInfo?> GetCheckoutSessionAsync(string sessionId, CancellationToken ct);
}
