using Marketplace.Application;
using Marketplace.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Marketplace.API.Controllers;

[ApiController]
[Route("api/products")]
public sealed class ProductsController : ControllerBase
{
    private readonly ProductService _products;
    private readonly IImageStorageService _imageStorageService;

    public ProductsController(ProductService products, IImageStorageService imageStorageService)
    {
        _products = products;
        _imageStorageService = imageStorageService;
    }

    /// <summary>Active featured listings (<c>featured_until_utc</c> in the future).</summary>
    [HttpGet("featured")]
    public async Task<ActionResult<IReadOnlyList<Product>>> Featured([FromQuery] int take = 24, CancellationToken ct = default)
    {
        take = Math.Clamp(take, 1, 100);
        return Ok(await _products.GetFeaturedAsync(take, ct));
    }

    /// <summary>Popularity by views + weighted favorites (slice heuristic).</summary>
    [HttpGet("popular")]
    public async Task<ActionResult<IReadOnlyList<Product>>> Popular([FromQuery] int take = 24, CancellationToken ct = default)
    {
        take = Math.Clamp(take, 1, 100);
        return Ok(await _products.GetPopularAsync(take, ct));
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<Product>>> Get(
        [FromQuery] string? category,
        [FromQuery] string? brand,
        [FromQuery] string? size,
        [FromQuery] int? minPriceHuf,
        [FromQuery] int? maxPriceHuf,
        [FromQuery] ProductStatus? status,
        CancellationToken ct)
    {
        var filter = new ProductFilter(category, brand, size, minPriceHuf, maxPriceHuf, status);
        return Ok(await _products.GetAsync(filter, ct));
    }

    /// <summary>Bump listing view counter (catalog UX / popular ranking).</summary>
    [HttpPost("{id:guid}/view")]
    public async Task<IActionResult> RecordView(Guid id, CancellationToken ct)
    {
        var p = await _products.GetByIdAsync(id, ct);
        if (p is null) return NotFound();
        await _products.RecordViewAsync(id, ct);
        return NoContent();
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Product>> GetById(Guid id, CancellationToken ct)
    {
        var row = await _products.GetByIdAsync(id, ct);
        return row is null ? NotFound() : Ok(row);
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<Product>> Create([FromBody] CreateProductRequest request, CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        var created = await _products.CreateAsync(userId, request, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [Authorize]
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<Product>> Update(Guid id, [FromBody] UpdateProductRequest request, CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        var updated = await _products.UpdateAsync(userId, id, request, ct);
        return updated is null ? NotFound() : Ok(updated);
    }

    [Authorize]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        var deleted = await _products.DeleteAsync(userId, id, ct);
        return deleted ? NoContent() : NotFound();
    }

    [Authorize]
    [HttpPost("{id:guid}/images")]
    public async Task<ActionResult<string>> UploadImage(Guid id, IFormFile file, CancellationToken ct)
    {
        await using var stream = file.OpenReadStream();
        var url = await _imageStorageService.UploadImageAsync(stream, file.FileName, ct);
        return Ok(new { productId = id, imageUrl = url });
    }

    private Guid GetCurrentUserId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return Guid.TryParse(sub, out var id)
            ? id
            : throw new UnauthorizedAccessException("Missing user id claim.");
    }
}
