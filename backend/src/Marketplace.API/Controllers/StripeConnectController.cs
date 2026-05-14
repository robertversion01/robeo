using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Marketplace.API.Controllers;

[ApiController]
[Authorize]
[Route("api/stripe-connect")]
public sealed class StripeConnectController : ControllerBase
{
    [HttpPost("account/onboarding-link")]
    public ActionResult<object> CreateOnboardingLink([FromBody] StripeOnboardingRequest request)
    {
        var link = $"https://connect.stripe.local/onboard/{request.UserId:N}";
        return Ok(new
        {
            request.UserId,
            request.ReturnUrl,
            request.RefreshUrl,
            onboardingUrl = link,
            mode = "stub"
        });
    }

    [HttpPost("escrow/intent")]
    public ActionResult<StripeEscrowIntentResponse> CreateEscrowIntent([FromBody] StripeEscrowIntentRequest request)
    {
        if (request.AmountHuf <= 0)
            return BadRequest(new { error = "AmountHuf must be > 0." });

        var intentId = $"pi_stub_{request.OrderId:N}_{request.AmountHuf}_HUF";
        var transferGroup = $"tg_{request.OrderId:N}";

        return Ok(new StripeEscrowIntentResponse(
            request.OrderId,
            intentId,
            transferGroup,
            "requires_payment_method",
            "HUF"));
    }

    [AllowAnonymous]
    [HttpPost("webhook")]
    public IActionResult Webhook([FromBody] StripeWebhookStubEvent payload)
    {
        // Placeholder: Stripe signature verification + event routing
        return Ok(new
        {
            received = true,
            payload.EventType,
            payload.PaymentIntentId,
            handledAtUtc = DateTime.UtcNow
        });
    }
}

public sealed record StripeOnboardingRequest(Guid UserId, string ReturnUrl, string RefreshUrl);
public sealed record StripeEscrowIntentRequest(Guid OrderId, int AmountHuf);
public sealed record StripeEscrowIntentResponse(Guid OrderId, string PaymentIntentId, string TransferGroup, string Status, string CurrencyCode);
public sealed record StripeWebhookStubEvent(string EventType, string? PaymentIntentId, string? TransferGroup);
