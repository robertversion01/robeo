using Marketplace.Application;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Marketplace.API.Controllers;

[ApiController]
[Authorize]
[Route("api/integrations")]
public sealed class IntegrationsController : ControllerBase
{
    private readonly LegacyStubCheckoutService _checkout;

    public IntegrationsController(LegacyStubCheckoutService checkout) => _checkout = checkout;

    [HttpPost("foxpost/label")]
    public async Task<ActionResult<object>> GenerateFoxpostLabel([FromBody] ShippingLabelRequest request, CancellationToken ct)
    {
        var label = await _checkout.GenerateFoxpostLabelAsync(request.OrderId, request.FoxpostLockerCode, ct);
        return Ok(new { request.OrderId, request.FoxpostLockerCode, labelReference = label });
    }

    [HttpPost("billingo/commission-invoice")]
    public async Task<ActionResult<object>> CreateInvoice([FromBody] InvoiceRequest request, CancellationToken ct)
    {
        var invoiceId = await _checkout.CreateCommissionInvoiceAsync(request.OrderId, request.NetAmountHuf, ct);
        return Ok(new { request.OrderId, invoiceId, currency = "HUF", vatRatePercent = 27 });
    }
}

public sealed record ShippingLabelRequest(Guid OrderId, string FoxpostLockerCode);
public sealed record InvoiceRequest(Guid OrderId, int NetAmountHuf);
