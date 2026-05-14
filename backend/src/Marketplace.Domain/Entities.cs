namespace Marketplace.Domain;

public enum ProductStatus
{
    Available,
    Sold,
    Deleted
}

public enum ProductCondition
{
    NewWithTags,
    VeryGood,
    Good,
    Satisfactory
}

/// <summary>Maps to PostgreSQL order_status enum labels.</summary>
public enum OrderStatus
{
    Created,
    PaymentPending,
    FundsInEscrow,
    Shipped,
    Delivered,
    Completed,
    Cancelled,
    Refunded
}

/// <summary>V1-aligned offer lifecycle (stored as lowercase TEXT in offers.status).</summary>
public enum OfferStatus
{
    Pending,
    Accepted,
    Rejected,
    Countered,
    Cancelled,
    Completed,
    PaymentPending,
    PaymentCompleted,
    Shipped,
    Delivered
}

public static class OfferPricingRules
{
    /// <summary>V1 rule: minimum offer is 60% of listing price (HUF, rounded up).</summary>
    public static int MinimumOfferPriceHuf(int listingPriceHuf)
    {
        if (listingPriceHuf < 1) return 1;
        return (int)Math.Ceiling(listingPriceHuf * 0.60m);
    }

    public static bool IsOfferPriceAllowed(int listingPriceHuf, int offeredPriceHuf) =>
        offeredPriceHuf >= MinimumOfferPriceHuf(listingPriceHuf);
}

/// <summary>V1 buyer protection fee: 280 Ft fixed + 5% of item price (HUF).</summary>
public static class BuyerProtectionFeeCalculator
{
    public const int FixedFeeHuf = 280;

    public static int VariableFeeHuf(int itemPriceHuf) =>
        (int)Math.Round(itemPriceHuf * 0.05m, MidpointRounding.AwayFromZero);

    public static int TotalBuyerProtectionFeeHuf(int itemPriceHuf) =>
        FixedFeeHuf + VariableFeeHuf(itemPriceHuf);
}

public sealed class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string CountryCode { get; set; } = "HU";
    public decimal RatingAverage { get; set; }
    public int RatingCount { get; set; }
    /// <summary>Optional Stripe Connect account for destination charges (acct_*).</summary>
    public string? StripeConnectAccountId { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}

public sealed class Product
{
    public Guid Id { get; set; }
    public Guid SellerId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    /// <summary>Filter slug (e.g. clothing) — maps to category_slug column.</summary>
    public string Category { get; set; } = string.Empty;
    public string Brand { get; set; } = string.Empty;
    public string Size { get; set; } = string.Empty;
    public ProductCondition Condition { get; set; }
    public int PriceHuf { get; set; }
    public ProductStatus Status { get; set; } = ProductStatus.Available;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    /// <summary>Shown on home featured strip while <see cref="FeaturedUntilUtc"/> &gt; UTC now.</summary>
    public DateTime? FeaturedUntilUtc { get; set; }
    public int ViewCount { get; set; }
    public int FavoriteCount { get; set; }
}

public sealed class ProductImage
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public string Url { get; set; } = string.Empty;
    public bool IsPrimary { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

public sealed class Message
{
    public Guid Id { get; set; }
    public Guid ConversationId { get; set; }
    public Guid SenderUserId { get; set; }
    public Guid ReceiverUserId { get; set; }
    public string Body { get; set; } = string.Empty;
    public DateTime SentAtUtc { get; set; } = DateTime.UtcNow;
}

public sealed class Offer
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public Guid BuyerUserId { get; set; }
    public Guid SellerUserId { get; set; }
    public int OfferedPriceHuf { get; set; }
    public OfferStatus Status { get; set; } = OfferStatus.Pending;
    public string? BuyerMessage { get; set; }
    public string? SellerCounterMessage { get; set; }
    public int? CounterPriceHuf { get; set; }
    public string? ShippingMethod { get; set; }
    public int ShippingFeeHuf { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}

public sealed class Order
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public Guid BuyerUserId { get; set; }
    public Guid SellerUserId { get; set; }
    public Guid? OfferId { get; set; }
    public OrderStatus Status { get; set; } = OrderStatus.Created;
    public int ItemPriceHuf { get; set; }
    public int ShippingFeeHuf { get; set; }
    public int PlatformFeeHuf { get; set; }
    public int VatRatePercent { get; set; } = 27;
    public int VatAmountHuf { get; set; }
    public string CurrencyCode { get; set; } = "HUF";
    public string? StripeTransferGroup { get; set; }
    public string? StripePaymentIntentId { get; set; }
    public string? StripeCheckoutSessionId { get; set; }
    public string? FoxpostLockerCode { get; set; }
    public string? ShippingLabelExternalId { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}

/// <summary>One review per participant per order (unique in DB).</summary>
public sealed class Review
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    /// <summary>Denormalized listing reference for profile/history queries.</summary>
    public Guid? ProductId { get; set; }
    public Guid ReviewerUserId { get; set; }
    public Guid ReviewedUserId { get; set; }
    public int Rating { get; set; }
    public string? Comment { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

/// <summary>Buyer–seller thread; either pre-purchase (listing) or post-payment (order).</summary>
public sealed class Conversation
{
    public Guid Id { get; set; }
    public Guid BuyerUserId { get; set; }
    public Guid SellerUserId { get; set; }
    public Guid? ProductId { get; set; }
    public Guid? OrderId { get; set; }
    public DateTime? LastMessageAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

public sealed class Notification
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Body { get; set; }
    public Guid? OrderId { get; set; }
    public Guid? OfferId { get; set; }
    public Guid? ProductId { get; set; }
    public DateTime? ReadAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

public sealed class StripeWebhookEvent
{
    public string StripeEventId { get; set; } = string.Empty;
    public DateTime ReceivedAtUtc { get; set; } = DateTime.UtcNow;
    public string? EventType { get; set; }
    public string? PayloadJson { get; set; }
    public bool Processed { get; set; }
    public DateTime? ProcessedAtUtc { get; set; }
    public string? Error { get; set; }
}
