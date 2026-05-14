namespace Marketplace.Domain;

/// <summary>
/// Mirrors PostgreSQL trigger <c>enforce_order_state_machine</c> — keep in sync with migrations.
/// </summary>
public static class OrderStateMachine
{
    public static bool CanTransition(OrderStatus from, OrderStatus to)
    {
        if (from == to) return true;
        return from switch
        {
            OrderStatus.Created => to is OrderStatus.PaymentPending or OrderStatus.Cancelled,
            OrderStatus.PaymentPending => to is OrderStatus.FundsInEscrow or OrderStatus.Cancelled,
            OrderStatus.FundsInEscrow => to is OrderStatus.Shipped or OrderStatus.Refunded,
            OrderStatus.Shipped => to is OrderStatus.Delivered or OrderStatus.Refunded,
            OrderStatus.Delivered => to is OrderStatus.Completed or OrderStatus.Refunded,
            OrderStatus.Completed => to is OrderStatus.Refunded,
            OrderStatus.Cancelled => false,
            OrderStatus.Refunded => false,
            _ => false,
        };
    }

    public static void EnsureTransition(OrderStatus from, OrderStatus to)
    {
        if (CanTransition(from, to) || from == to)
            return;
        throw new InvalidOperationException($"Invalid order transition: {from} -> {to}");
    }
}
