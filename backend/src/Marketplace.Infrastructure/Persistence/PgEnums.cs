using Marketplace.Domain;

namespace Marketplace.Infrastructure.Persistence;

internal static class PgEnums
{
    public static string ProductConditionToPg(ProductCondition c) =>
        c switch
        {
            ProductCondition.NewWithTags => "new_with_tags",
            ProductCondition.VeryGood => "very_good",
            ProductCondition.Good => "good",
            ProductCondition.Satisfactory => "satisfactory",
            _ => throw new ArgumentOutOfRangeException(nameof(c))
        };

    public static ProductCondition ProductConditionFromPg(string s) =>
        s switch
        {
            "new_with_tags" => ProductCondition.NewWithTags,
            "very_good" => ProductCondition.VeryGood,
            "good" => ProductCondition.Good,
            "satisfactory" => ProductCondition.Satisfactory,
            _ => ProductCondition.Good
        };

    public static string ProductStatusToPg(ProductStatus s) =>
        s switch
        {
            ProductStatus.Available => "available",
            ProductStatus.Sold => "sold",
            ProductStatus.Deleted => "deleted",
            _ => throw new ArgumentOutOfRangeException(nameof(s))
        };

    public static ProductStatus ProductStatusFromPg(string s) =>
        s switch
        {
            "available" => ProductStatus.Available,
            "sold" => ProductStatus.Sold,
            "deleted" => ProductStatus.Deleted,
            _ => ProductStatus.Available
        };

    public static string OrderStatusToPg(OrderStatus s) =>
        s switch
        {
            OrderStatus.Created => "created",
            OrderStatus.PaymentPending => "payment_pending",
            OrderStatus.FundsInEscrow => "funds_in_escrow",
            OrderStatus.Shipped => "shipped",
            OrderStatus.Delivered => "delivered",
            OrderStatus.Completed => "completed",
            OrderStatus.Cancelled => "cancelled",
            OrderStatus.Refunded => "refunded",
            _ => throw new ArgumentOutOfRangeException(nameof(s))
        };

    public static OrderStatus OrderStatusFromPg(string s) =>
        s switch
        {
            "created" => OrderStatus.Created,
            "payment_pending" => OrderStatus.PaymentPending,
            "funds_in_escrow" => OrderStatus.FundsInEscrow,
            "shipped" => OrderStatus.Shipped,
            "delivered" => OrderStatus.Delivered,
            "completed" => OrderStatus.Completed,
            "cancelled" => OrderStatus.Cancelled,
            "refunded" => OrderStatus.Refunded,
            _ => OrderStatus.Created
        };

    public static string OfferStatusToPg(OfferStatus s) =>
        s switch
        {
            OfferStatus.Pending => "pending",
            OfferStatus.Accepted => "accepted",
            OfferStatus.Rejected => "rejected",
            OfferStatus.Countered => "countered",
            OfferStatus.Cancelled => "cancelled",
            OfferStatus.Completed => "completed",
            OfferStatus.PaymentPending => "payment_pending",
            OfferStatus.PaymentCompleted => "payment_completed",
            OfferStatus.Shipped => "shipped",
            OfferStatus.Delivered => "delivered",
            _ => throw new ArgumentOutOfRangeException(nameof(s))
        };

    public static OfferStatus OfferStatusFromPg(string s) =>
        s switch
        {
            "pending" => OfferStatus.Pending,
            "accepted" => OfferStatus.Accepted,
            "rejected" => OfferStatus.Rejected,
            "countered" => OfferStatus.Countered,
            "cancelled" => OfferStatus.Cancelled,
            "completed" => OfferStatus.Completed,
            "payment_pending" => OfferStatus.PaymentPending,
            "payment_completed" => OfferStatus.PaymentCompleted,
            "shipped" => OfferStatus.Shipped,
            "delivered" => OfferStatus.Delivered,
            _ => OfferStatus.Pending
        };
}
