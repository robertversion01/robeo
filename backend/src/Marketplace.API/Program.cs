using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Text.Json.Serialization;
using Marketplace.Application;
using Marketplace.Infrastructure;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

static bool IsAllowedDevCorsOrigin(string origin)
{
    if (string.IsNullOrWhiteSpace(origin)) return false;
    if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri)) return false;
    if (string.Equals(uri.Host, "localhost", StringComparison.OrdinalIgnoreCase)) return true;
    if (uri.Host == "127.0.0.1") return true;
    if (!IPAddress.TryParse(uri.Host, out var ip)) return false;
    if (ip.AddressFamily != AddressFamily.InterNetwork) return false;
    var b = ip.GetAddressBytes();
    if (b[0] == 10) return true;
    if (b[0] == 172 && b[1] >= 16 && b[1] <= 31) return true;
    if (b[0] == 192 && b[1] == 168) return true;
    return false;
}

builder.Services.AddControllers().AddJsonOptions(o =>
{
    o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

if (builder.Environment.IsDevelopment())
{
    builder.Services.AddCors(options =>
    {
        options.AddDefaultPolicy(policy =>
            policy.SetIsOriginAllowed(IsAllowedDevCorsOrigin)
                .AllowAnyHeader()
                .AllowAnyMethod());
    });
}
else
{
    var corsOrigins = builder.Configuration["Cors:Origins"]?.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        ?? new[] { "http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000" };
    builder.Services.AddCors(options =>
    {
        options.AddDefaultPolicy(policy =>
            policy.WithOrigins(corsOrigins).AllowAnyHeader().AllowAnyMethod());
    });
}

builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddScoped<ProductService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<LegacyStubCheckoutService>();
builder.Services.AddScoped<OfferService>();
builder.Services.AddScoped<MarketplaceCheckoutOrchestrator>();
builder.Services.AddScoped<PaymentWebhookService>();
builder.Services.AddScoped<OrderWorkflowService>();
builder.Services.AddScoped<ReviewService>();

var signingKey = builder.Configuration["Jwt:SigningKey"] ?? "THIS_IS_A_LOCAL_DEV_ONLY_CHANGE_ME_123456";
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "robeo-api",
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "robeo-web",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey)),
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

app.Use(async (context, next) =>
{
    context.Request.EnableBuffering();
    await next();
});

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
