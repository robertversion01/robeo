using Marketplace.Application;
using EFCore.NamingConventions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Marketplace.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Postgres");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "ConnectionStrings:Postgres is not configured. Set ConnectionStrings__Postgres, user secrets, or appsettings (see .env.example).");
        }

        services.AddDbContext<AppDbContext>(opt =>
            opt.UseNpgsql(connectionString).UseSnakeCaseNamingConvention());

        services.AddScoped<IProductRepository, ProductRepository>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IOfferRepository, OfferRepository>();
        services.AddScoped<IOrderRepository, OrderRepository>();
        services.AddScoped<IReviewRepository, ReviewRepository>();
        services.AddScoped<IStripeWebhookEventRepository, StripeWebhookEventRepository>();
        services.AddScoped<INotificationRepository, NotificationRepository>();
        services.AddScoped<IConversationRepository, ConversationRepository>();
        services.AddScoped<IMarketplaceNotifications, MarketplaceNotificationService>();
        services.AddScoped<ConversationRoutingService>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<IImageStorageService, ImageStorageServiceStub>();
        services.AddScoped<IShippingService, ShippingServiceStub>();
        services.AddScoped<IInvoicingService, InvoicingServiceStub>();
        services.AddScoped<IStripeConnectService, StripeConnectServiceStub>();
        services.AddScoped<IStripeCheckoutSessionGateway, StripeCheckoutSessionGateway>();

        return services;
    }
}
