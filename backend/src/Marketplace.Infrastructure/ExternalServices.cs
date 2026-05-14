using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Marketplace.Application;
using Marketplace.Domain;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace Marketplace.Infrastructure;

public sealed class JwtTokenService : IJwtTokenService
{
    private readonly IConfiguration _configuration;

    public JwtTokenService(IConfiguration configuration) => _configuration = configuration;

    public AuthResponse CreateToken(User user)
    {
        var issuer = _configuration["Jwt:Issuer"] ?? "robeo-api";
        var audience = _configuration["Jwt:Audience"] ?? "robeo-web";
        var key = _configuration["Jwt:SigningKey"] ?? "THIS_IS_A_LOCAL_DEV_ONLY_CHANGE_ME_123456";
        var expires = DateTime.UtcNow.AddHours(8);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new("display_name", user.DisplayName)
        };

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(issuer, audience, claims, expires: expires, signingCredentials: credentials);
        var serialized = new JwtSecurityTokenHandler().WriteToken(token);
        return new AuthResponse(serialized, expires);
    }
}

public sealed class ImageStorageServiceStub : IImageStorageService
{
    public Task<string> UploadImageAsync(Stream stream, string fileName, CancellationToken ct)
    {
        // Stub: Azure Blob / S3 integration point
        var fakeUrl = $"https://cdn.local/{Guid.NewGuid()}-{fileName}";
        return Task.FromResult(fakeUrl);
    }
}

public sealed class ShippingServiceStub : IShippingService
{
    public Task<string> GenerateShippingLabelAsync(Guid orderId, string foxpostLockerCode, CancellationToken ct)
    {
        // Stub: Foxpost API locker + label flow
        return Task.FromResult($"FOXPOST-LABEL-{orderId:N}-{foxpostLockerCode}");
    }
}

public sealed class InvoicingServiceStub : IInvoicingService
{
    public Task<string> CreateCommissionInvoiceAsync(Guid orderId, int amountHuf, int vatRatePercent, CancellationToken ct)
    {
        // Stub: Billingo / Szamlazz.hu invoice creation
        return Task.FromResult($"INV-{orderId:N}-HUF-{amountHuf}-VAT{vatRatePercent}");
    }
}

public sealed class StripeConnectServiceStub : IStripeConnectService
{
    public Task<string> CreateEscrowIntentAsync(Guid orderId, int amountHuf, string currencyCode, CancellationToken ct)
    {
        // Stub: Stripe Connect escrow / transfer_group orchestration
        return Task.FromResult($"pi_stub_{orderId:N}_{amountHuf}_{currencyCode}");
    }
}
