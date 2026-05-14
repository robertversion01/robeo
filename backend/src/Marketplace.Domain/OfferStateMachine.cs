namespace Marketplace.Domain;

/// <summary>
/// Canonical offer transitions (TEXT column in DB). Terminal states: Rejected, Cancelled; payment path ends at PaymentCompleted.
/// </summary>
public static class OfferStateMachine
{
    /// <summary>Returns true if <paramref name="to"/> is allowed from <paramref name="from"/>.</summary>
    public static bool CanTransition(OfferStatus from, OfferStatus to)
    {
        if (from == to) return true;
        return from switch
        {
            OfferStatus.Pending => to is OfferStatus.Accepted or OfferStatus.Rejected or OfferStatus.Countered
                or OfferStatus.Cancelled,
            OfferStatus.Countered => to is OfferStatus.Accepted or OfferStatus.Cancelled,
            OfferStatus.Accepted => to is OfferStatus.PaymentPending or OfferStatus.Cancelled,
            OfferStatus.PaymentPending => to is OfferStatus.PaymentCompleted or OfferStatus.Accepted,
            OfferStatus.PaymentCompleted => false,
            OfferStatus.Rejected => false,
            OfferStatus.Cancelled => false,
            OfferStatus.Completed => false,
            OfferStatus.Shipped => false,
            OfferStatus.Delivered => false,
            _ => false,
        };
    }

    public static void EnsureTransition(OfferStatus from, OfferStatus to)
    {
        if (from == to) return;
        if (!CanTransition(from, to))
            throw new InvalidOperationException($"Invalid offer transition: {from} -> {to}");
    }
}
