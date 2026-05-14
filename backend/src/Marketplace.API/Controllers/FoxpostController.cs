using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Marketplace.API.Controllers;

[ApiController]
[Authorize]
[Route("api/foxpost")]
public sealed class FoxpostController : ControllerBase
{
    private static readonly IReadOnlyList<FoxpostLockerDto> Lockers =
    [
        new("BP-ALLEE-001", "Budapest XI., Allee", "Budapest"),
        new("BP-ARKAD-002", "Budapest X., Arkad", "Budapest"),
        new("DE-FORUM-003", "Debrecen, Forum", "Debrecen"),
        new("SZ-ARKAD-004", "Szeged, Arkad", "Szeged")
    ];

    [HttpGet("lockers")]
    public ActionResult<IReadOnlyList<FoxpostLockerDto>> GetLockers([FromQuery] string? city = null)
    {
        if (string.IsNullOrWhiteSpace(city))
            return Ok(Lockers);

        var filtered = Lockers
            .Where(x => x.City.Equals(city, StringComparison.OrdinalIgnoreCase))
            .ToList();
        return Ok(filtered);
    }

    [HttpPost("labels")]
    public ActionResult<FoxpostLabelResponse> GenerateLabel([FromBody] FoxpostLabelRequest request)
    {
        if (!Lockers.Any(x => x.Code == request.LockerCode))
            return BadRequest(new { error = "Ismeretlen Foxpost automata kód." });

        var reference = $"FXP-LBL-{request.OrderId:N}".ToUpperInvariant();
        var tracking = $"FXP-{DateTime.UtcNow:yyyyMMdd}-{request.OrderId.ToString("N")[..8]}".ToUpperInvariant();

        return Ok(new FoxpostLabelResponse(
            request.OrderId,
            request.LockerCode,
            reference,
            tracking,
            DateTime.UtcNow));
    }
}

public sealed record FoxpostLockerDto(string Code, string Name, string City);
public sealed record FoxpostLabelRequest(Guid OrderId, string LockerCode);
public sealed record FoxpostLabelResponse(Guid OrderId, string LockerCode, string LabelReference, string TrackingNumber, DateTime CreatedAtUtc);
