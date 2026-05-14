using Marketplace.Application;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Marketplace.API.Controllers;

[ApiController]
[Authorize]
[Route("api/payments")]
public sealed class PaymentsController : ControllerBase
{
    private readonly LegacyStubCheckoutService _checkout;
    public PaymentsController(LegacyStubCheckoutService checkout) => _checkout = checkout;

    [HttpPost("escrow-intent")]
    public async Task<ActionResult<object>> CreateEscrowIntent([FromBody] EscrowIntentRequest request, CancellationToken ct)
    {
        var paymentIntentId = await _checkout.CreateEscrowIntentAsync(request.OrderId, request.AmountHuf, ct);
        return Ok(new { request.OrderId, paymentIntentId, currency = "HUF" });
    }
}

public sealed record EscrowIntentRequest(Guid OrderId, int AmountHuf);
