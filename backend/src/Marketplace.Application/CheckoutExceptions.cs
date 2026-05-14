namespace Marketplace.Application;

/// <summary>Thrown when DB uniqueness prevents a second open checkout for the same offer or buy-now slot.</summary>
public sealed class DuplicateActiveCheckoutException : InvalidOperationException
{
    public DuplicateActiveCheckoutException(string message) : base(message) { }
}
