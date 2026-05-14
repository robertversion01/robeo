using Marketplace.Application;
using Marketplace.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Marketplace.Infrastructure;
using System.Security.Claims;

namespace Marketplace.API.Controllers;

/// <summary>Buyer/seller order queries and shipping progression.</summary>
[ApiController]
[Authorize]
[Route("api/orders")]
public sealed class OrdersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly OrderWorkflowService _workflow;

    public OrdersController(AppDbContext db, OrderWorkflowService workflow)
    {
        _db = db;
        _workflow = workflow;
    }

    /// <summary>Orders where the current user is buyer or seller.</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<Order>>> ListMine(CancellationToken ct)
    {
        var uid = GetUserId();
        var rows = await _db.Orders.AsNoTracking()
            .Where(o => o.BuyerUserId == uid || o.SellerUserId == uid)
            .OrderByDescending(o => o.CreatedAtUtc)
            .ToListAsync(ct);
        return Ok(rows);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Order>> GetById(Guid id, CancellationToken ct)
    {
        var uid = GetUserId();
        var row = await _db.Orders.AsNoTracking().FirstOrDefaultAsync(o => o.Id == id, ct);
        if (row is null) return NotFound();
        if (row.BuyerUserId != uid && row.SellerUserId != uid) return Forbid();
        return Ok(row);
    }

    [HttpPost("{id:guid}/ship")]
    public async Task<ActionResult<Order>> Ship(Guid id, CancellationToken ct)
    {
        var row = await _workflow.MarkShippedAsync(GetUserId(), id, ct);
        return row is null ? NotFound() : Ok(row);
    }

    [HttpPost("{id:guid}/deliver")]
    public async Task<ActionResult<Order>> Deliver(Guid id, CancellationToken ct)
    {
        var row = await _workflow.MarkDeliveredAsync(GetUserId(), id, ct);
        return row is null ? NotFound() : Ok(row);
    }

    [HttpPost("{id:guid}/confirm-received")]
    public async Task<ActionResult<Order>> ConfirmReceived(Guid id, CancellationToken ct)
    {
        var row = await _workflow.ConfirmReceivedAsync(GetUserId(), id, ct);
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
