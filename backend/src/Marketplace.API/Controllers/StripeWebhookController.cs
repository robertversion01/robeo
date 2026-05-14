using Marketplace.Application;
using Marketplace.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Stripe;
using System.Text.Json;

namespace Marketplace.API.Controllers;

/// <summary>Stripe webhook — signature verified, idempotent processing.</summary>
[ApiController]
[AllowAnonymous]
[Route("api/stripe/webhook")]
public sealed class StripeWebhookController : ControllerBase
{
    private readonly PaymentWebhookService _payment;
    private readonly IStripeWebhookEventRepository _events;
    private readonly IConfiguration _configuration;
    private readonly ILogger<StripeWebhookController> _logger;

    public StripeWebhookController(
        PaymentWebhookService payment,
        IStripeWebhookEventRepository events,
        IConfiguration configuration,
        ILogger<StripeWebhookController> logger)
    {
        _payment = payment;
        _events = events;
        _configuration = configuration;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> Post(CancellationToken ct)
    {
        var webhookSecret = _configuration["Stripe:WebhookSecret"];
        if (string.IsNullOrWhiteSpace(webhookSecret))
        {
            _logger.LogError("Stripe:WebhookSecret missing");
            return Ok(new { received = true });
        }

        Request.EnableBuffering();
        using var reader = new StreamReader(Request.Body);
        var json = await reader.ReadToEndAsync(ct);
        Request.Body.Position = 0;

        var signature = Request.Headers["Stripe-Signature"].ToString();
        if (string.IsNullOrEmpty(signature))
            return BadRequest();

        Event stripeEvent;
        try
        {
            stripeEvent = EventUtility.ConstructEvent(json, signature, webhookSecret, throwOnApiVersionMismatch: false);
        }
        catch (StripeException ex)
        {
            _logger.LogWarning(ex, "Stripe signature verification failed");
            return BadRequest();
        }

        var payloadTrimmed = json.Length > 450_000 ? JsonSerializer.Serialize(new { id = stripeEvent.Id, type = stripeEvent.Type, truncated = true }) : json;

        var row = new StripeWebhookEvent
        {
            StripeEventId = stripeEvent.Id,
            ReceivedAtUtc = DateTime.UtcNow,
            EventType = stripeEvent.Type,
            PayloadJson = payloadTrimmed,
            Processed = false
        };

        var inserted = await _events.TryInsertPendingAsync(row, ct);
        if (!inserted)
        {
            var existing = await _events.GetByIdAsync(stripeEvent.Id, ct);
            if (existing?.Processed == true)
                return Ok(new { received = true, duplicate = true });
            return Ok(new { received = true, duplicate = true });
        }

        try
        {
            switch (stripeEvent.Type)
            {
                case "checkout.session.completed":
                    var session = stripeEvent.Data.Object as Stripe.Checkout.Session;
                    if (session is null) break;
                    var piFromSession = session.PaymentIntentId
                        ?? (session.PaymentIntent as PaymentIntent)?.Id;
                    await _payment.ApplyCheckoutSessionCompletedAsync(session.Id, piFromSession, ct);
                    break;

                case "payment_intent.succeeded":
                    var piOk = stripeEvent.Data.Object as PaymentIntent;
                    if (piOk is not null)
                        await _payment.ApplyPaymentIntentSucceededAsync(piOk.Id, ct);
                    break;

                case "payment_intent.payment_failed":
                    var piFail = stripeEvent.Data.Object as PaymentIntent;
                    if (piFail is not null)
                        await _payment.ApplyPaymentIntentFailedAsync(piFail.Id, ct);
                    break;

                case "charge.refunded":
                    var charge = stripeEvent.Data.Object as Charge;
                    var piId = charge?.PaymentIntentId
                        ?? (charge?.PaymentIntent as PaymentIntent)?.Id;
                    if (!string.IsNullOrEmpty(piId))
                        await _payment.ApplyChargeRefundedAsync(piId, ct);
                    break;

                default:
                    _logger.LogInformation("Stripe webhook acknowledged (no handler): {Type}", stripeEvent.Type);
                    break;
            }

            await _events.MarkProcessedAsync(stripeEvent.Id, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Stripe webhook handler failed for {EventId}", stripeEvent.Id);
            await _events.MarkFailedAsync(stripeEvent.Id, ex.Message, ct);
        }

        return Ok(new { received = true });
    }
}
