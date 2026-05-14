using Marketplace.Domain;
using Marketplace.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Marketplace.API.Controllers;

[ApiController]
[Authorize]
[Route("api/messages")]
public sealed class MessagesController : ControllerBase
{
    private readonly AppDbContext _db;

    public MessagesController(AppDbContext db) => _db = db;

    [HttpGet("conversation/{conversationId:guid}")]
    public async Task<ActionResult<IReadOnlyList<Message>>> GetConversation(Guid conversationId, CancellationToken ct)
    {
        var uid = GetUserId();
        var conv = await _db.Conversations.AsNoTracking().FirstOrDefaultAsync(c => c.Id == conversationId, ct);
        if (conv is null) return NotFound();
        if (conv.BuyerUserId != uid && conv.SellerUserId != uid) return Forbid();

        var rows = await _db.Messages
            .AsNoTracking()
            .Where(x => x.ConversationId == conversationId)
            .OrderBy(x => x.SentAtUtc)
            .ToListAsync(ct);
        return Ok(rows);
    }

    /// <summary>Send a message in a conversation (sender implied from JWT).</summary>
    [HttpPost("conversations/{conversationId:guid}")]
    public async Task<ActionResult<Message>> Send(Guid conversationId, [FromBody] SendMessageBody body, CancellationToken ct)
    {
        var uid = GetUserId();
        var conv = await _db.Conversations.FirstOrDefaultAsync(c => c.Id == conversationId, ct);
        if (conv is null) return NotFound();
        if (conv.BuyerUserId != uid && conv.SellerUserId != uid) return Forbid();

        var receiverId = conv.BuyerUserId == uid ? conv.SellerUserId : conv.BuyerUserId;
        var sentAt = DateTime.UtcNow;
        var msg = new Message
        {
            Id = Guid.NewGuid(),
            ConversationId = conversationId,
            SenderUserId = uid,
            ReceiverUserId = receiverId,
            Body = body.Body.Trim(),
            SentAtUtc = sentAt
        };
        _db.Messages.Add(msg);
        conv.LastMessageAtUtc = sentAt;
        await _db.SaveChangesAsync(ct);
        return Ok(msg);
    }

    private Guid GetUserId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return Guid.TryParse(sub, out var id)
            ? id
            : throw new UnauthorizedAccessException("Missing user id claim.");
    }
}

public sealed record SendMessageBody(string Body);
