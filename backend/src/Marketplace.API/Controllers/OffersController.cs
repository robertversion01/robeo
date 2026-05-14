using Marketplace.Application;
using Marketplace.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Marketplace.API.Controllers;

/// <summary>Negotiation lifecycle (buyer offer → seller accept/reject/counter → buyer accepts counter).</summary>
[ApiController]
[Authorize]
[Route("api/offers")]
public sealed class OffersController : ControllerBase
{
    private readonly OfferService _offers;

    public OffersController(OfferService offers) => _offers = offers;

    /// <summary>Create a pending offer (60% minimum rule enforced).</summary>
    [HttpPost]
    public async Task<ActionResult<Offer>> Create([FromBody] CreateOfferRequest request, CancellationToken ct)
    {
        var buyerId = GetUserId();
        var offer = await _offers.CreateOfferAsync(buyerId, request, ct);
        return CreatedAtAction(nameof(GetById), new { id = offer.Id }, offer);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Offer>> GetById(Guid id, CancellationToken ct)
    {
        var offer = await _offers.GetByIdAsync(id, ct);
        return offer is null ? NotFound() : Ok(offer);
    }

    /// <summary>Seller accepts the buyer's listed price.</summary>
    [HttpPost("{id:guid}/accept")]
    public async Task<ActionResult<Offer>> Accept(Guid id, CancellationToken ct)
    {
        var row = await _offers.SellerAcceptAsync(GetUserId(), id, ct);
        return row is null ? NotFound() : Ok(row);
    }

    [HttpPost("{id:guid}/reject")]
    public async Task<ActionResult<Offer>> Reject(Guid id, CancellationToken ct)
    {
        var row = await _offers.SellerRejectAsync(GetUserId(), id, ct);
        return row is null ? NotFound() : Ok(row);
    }

    [HttpPost("{id:guid}/counter")]
    public async Task<ActionResult<Offer>> Counter(Guid id, [FromBody] SellerCounterOfferRequest body, CancellationToken ct)
    {
        var row = await _offers.SellerCounterAsync(GetUserId(), id, body, ct);
        return row is null ? NotFound() : Ok(row);
    }

    [HttpPost("{id:guid}/accept-counter")]
    public async Task<ActionResult<Offer>> AcceptCounter(Guid id, CancellationToken ct)
    {
        var row = await _offers.BuyerAcceptCounterAsync(GetUserId(), id, ct);
        return row is null ? NotFound() : Ok(row);
    }

    private Guid GetUserId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return Guid.TryParse(sub, out var id)
            ? id
            : throw new UnauthorizedAccessException("Missing user id claim.");
    }
}
