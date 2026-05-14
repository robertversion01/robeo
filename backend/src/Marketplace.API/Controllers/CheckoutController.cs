using Marketplace.Application;
using Marketplace.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Marketplace.API.Controllers;

/// <summary>Stripe Checkout session for accepted offers or buy-now.</summary>
[ApiController]
[Authorize]
[Route("api/checkout")]
public sealed class CheckoutController : ControllerBase
{
    private readonly MarketplaceCheckoutOrchestrator _checkout;

    public CheckoutController(MarketplaceCheckoutOrchestrator checkout) => _checkout = checkout;

    /// <summary>
    /// Creates an order in <see cref="OrderStatus.PaymentPending"/> and returns the hosted Stripe Checkout URL.
    /// Requires either <paramref name="OfferId"/> (accepted offer) or <paramref name="BuyNow"/> with <paramref name="ProductId"/>.
    /// </summary>
    [HttpPost("session")]
    public async Task<ActionResult<CreateCheckoutSessionResponse>> CreateSession(
        [FromBody] CreateCheckoutSessionRequest body,
        CancellationToken ct)
    {
        var buyerId = GetUserId();
        var result = await _checkout.CreateCheckoutSessionAsync(buyerId, body, ct);
        return Ok(result);
    }

    private Guid GetUserId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return Guid.TryParse(sub, out var id)
            ? id
            : throw new UnauthorizedAccessException("Missing user id claim.");
    }
}
