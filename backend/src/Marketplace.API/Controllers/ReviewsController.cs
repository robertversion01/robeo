using Marketplace.Application;
using Marketplace.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Marketplace.API.Controllers;

/// <summary>Post-transaction reviews (one per reviewer per order).</summary>
[ApiController]
[Authorize]
[Route("api/reviews")]
public sealed class ReviewsController : ControllerBase
{
    private readonly ReviewService _reviews;

    public ReviewsController(ReviewService reviews) => _reviews = reviews;

    public sealed record CreateReviewBody(int Rating, string? Comment);

    /// <summary>Allowed only when the order is <see cref="OrderStatus.Completed"/>.</summary>
    [HttpPost]
    public async Task<ActionResult<Review>> Create([FromBody] CreateReviewBody body, [FromQuery] Guid orderId, CancellationToken ct)
    {
        if (orderId == Guid.Empty)
            return BadRequest("orderId query parameter is required.");

        var reviewerId = GetUserId();
        var review = await _reviews.CreateAsync(reviewerId, orderId, body.Rating, body.Comment, ct);
        return Ok(review);
    }

    private Guid GetUserId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return Guid.TryParse(sub, out var id)
            ? id
            : throw new UnauthorizedAccessException("Missing user id claim.");
    }
}
