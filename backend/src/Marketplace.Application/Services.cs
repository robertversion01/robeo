using Marketplace.Domain;

namespace Marketplace.Application;

public sealed class ProductService
{
    private readonly IProductRepository _repo;

    public ProductService(IProductRepository repo) => _repo = repo;

    public Task<IReadOnlyList<Product>> GetAsync(ProductFilter filter, CancellationToken ct) =>
        _repo.GetProductsAsync(filter, ct);

    public Task<Product?> GetByIdAsync(Guid id, CancellationToken ct) =>
        _repo.GetByIdAsync(id, ct);

    public Task<Product> CreateAsync(Guid sellerId, CreateProductRequest req, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var product = new Product
        {
            Id = Guid.NewGuid(),
            SellerId = sellerId,
            Title = req.Title,
            Description = req.Description,
            Category = req.Category,
            Brand = req.Brand,
            Size = req.Size,
            Condition = req.Condition,
            PriceHuf = req.PriceHuf,
            Status = ProductStatus.Available,
            ViewCount = 0,
            FavoriteCount = 0,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };
        return _repo.CreateAsync(product, ct);
    }

    public Task<IReadOnlyList<Product>> GetFeaturedAsync(int take, CancellationToken ct) =>
        _repo.GetFeaturedAsync(take, ct);

    public Task<IReadOnlyList<Product>> GetPopularAsync(int take, CancellationToken ct) =>
        _repo.GetPopularAsync(take, ct);

    public Task RecordViewAsync(Guid productId, CancellationToken ct) =>
        _repo.IncrementViewCountAsync(productId, ct);

    public async Task<Product?> UpdateAsync(Guid sellerId, Guid productId, UpdateProductRequest req, CancellationToken ct)
    {
        var current = await _repo.GetByIdAsync(productId, ct);
        if (current is null || current.SellerId != sellerId) return null;

        current.Title = req.Title;
        current.Description = req.Description;
        current.Category = req.Category;
        current.Brand = req.Brand;
        current.Size = req.Size;
        current.Condition = req.Condition;
        current.PriceHuf = req.PriceHuf;
        current.Status = req.Status;
        current.UpdatedAtUtc = DateTime.UtcNow;
        return await _repo.UpdateAsync(current, ct);
    }

    public Task<bool> DeleteAsync(Guid sellerId, Guid productId, CancellationToken ct) =>
        _repo.DeleteAsync(productId, sellerId, ct);
}

public sealed class AuthService
{
    private readonly IUserRepository _users;
    private readonly IJwtTokenService _jwt;

    public AuthService(IUserRepository users, IJwtTokenService jwt)
    {
        _users = users;
        _jwt = jwt;
    }

    public async Task<AuthResponse?> LoginAsync(AuthRequest req, CancellationToken ct)
    {
        var user = await _users.GetByEmailAsync(req.Email, ct);
        if (user is null) return null;
        if (!BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash)) return null;
        return _jwt.CreateToken(user);
    }

    public async Task<AuthResponse> RegisterAsync(AuthRequest req, CancellationToken ct)
    {
        var existing = await _users.GetByEmailAsync(req.Email, ct);
        if (existing is not null) throw new InvalidOperationException("User already exists.");

        var now = DateTime.UtcNow;
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = req.Email.Trim().ToLowerInvariant(),
            DisplayName = req.Email.Split('@')[0],
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };
        user = await _users.CreateAsync(user, ct);
        return _jwt.CreateToken(user);
    }
}

/// <summary>Legacy stub orchestration (Foxpost / escrow intent demos). Prefer <see cref="MarketplaceCheckoutOrchestrator"/> for card checkout.</summary>
public sealed class LegacyStubCheckoutService
{
    private readonly IStripeConnectService _stripe;
    private readonly IShippingService _shipping;
    private readonly IInvoicingService _invoicing;

    public LegacyStubCheckoutService(IStripeConnectService stripe, IShippingService shipping, IInvoicingService invoicing)
    {
        _stripe = stripe;
        _shipping = shipping;
        _invoicing = invoicing;
    }

    public Task<string> CreateEscrowIntentAsync(Guid orderId, int amountHuf, CancellationToken ct) =>
        _stripe.CreateEscrowIntentAsync(orderId, amountHuf, "HUF", ct);

    public Task<string> GenerateFoxpostLabelAsync(Guid orderId, string lockerCode, CancellationToken ct) =>
        _shipping.GenerateShippingLabelAsync(orderId, lockerCode, ct);

    public Task<string> CreateCommissionInvoiceAsync(Guid orderId, int netAmountHuf, CancellationToken ct)
    {
        var vatAmount = (int)Math.Round(netAmountHuf * 0.27m, MidpointRounding.AwayFromZero);
        return _invoicing.CreateCommissionInvoiceAsync(orderId, netAmountHuf + vatAmount, 27, ct);
    }
}
