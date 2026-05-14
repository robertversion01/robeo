using Marketplace.Application;
using Marketplace.Domain;
using Marketplace.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Marketplace.API.Controllers;

/// <summary>Chat threads keyed by listing (pre-purchase) or order (post-payment).</summary>
[ApiController]
[Authorize]
[Route("api/conversations")]
public sealed class ConversationsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ConversationRoutingService _routing;

    public ConversationsController(AppDbContext db, ConversationRoutingService routing)
    {
        _db = db;
        _routing = routing;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<Conversation>>> Mine(CancellationToken ct)
    {
        var uid = GetUserId();
        var rows = await _db.Conversations.AsNoTracking()
            .Where(c => c.BuyerUserId == uid || c.SellerUserId == uid)
            .OrderByDescending(c => c.LastMessageAtUtc ?? c.CreatedAtUtc)
            .ToListAsync(ct);
        return Ok(rows);
    }

    /// <summary>Get or create the buyer–seller thread for a listing (<c>order_id</c> null).</summary>
    [HttpPost("listing/{productId:guid}")]
    public async Task<ActionResult<Conversation>> GetOrCreateListing(Guid productId, CancellationToken ct)
    {
        var conv = await _routing.GetOrCreateListingThreadAsync(GetUserId(), productId, ct);
        return Ok(conv);
    }

    /// <summary>Get or create the post-payment thread for an order (ties chat to <c>orders.id</c>).</summary>
    [HttpPost("order/{orderId:guid}")]
    public async Task<ActionResult<Conversation>> GetOrCreateForOrder(Guid orderId, CancellationToken ct)
    {
        var conv = await _routing.GetOrCreateOrderThreadAsync(GetUserId(), orderId, ct);
        return Ok(conv);
    }

    private Guid GetUserId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return Guid.TryParse(sub, out var id)
            ? id
            : throw new UnauthorizedAccessException("Missing user id claim.");
    }
}
