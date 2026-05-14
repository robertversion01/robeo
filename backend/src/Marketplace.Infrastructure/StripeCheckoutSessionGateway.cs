using Marketplace.Application;
using Marketplace.Domain;
using Microsoft.Extensions.Configuration;
using Stripe;
using Stripe.Checkout;
using DomainProduct = Marketplace.Domain.Product;

namespace Marketplace.Infrastructure;

/// <summary>Real Stripe Checkout Sessions (HUF zero-decimal amounts).</summary>
public sealed class StripeCheckoutSessionGateway : IStripeCheckoutSessionGateway
{
    private readonly IConfiguration _configuration;

    public StripeCheckoutSessionGateway(IConfiguration configuration) =>
        _configuration = configuration;

    public async Task<StripeCheckoutSessionResult> CreateCheckoutSessionAsync(
        Order order,
        DomainProduct product,
        User seller,
        int totalAmountHuf,
        int applicationFeeHuf,
        string successUrl,
        string cancelUrl,
        CancellationToken ct)
    {
        var secret = _configuration["Stripe:SecretKey"];
        if (string.IsNullOrWhiteSpace(secret))
            throw new InvalidOperationException("Stripe:SecretKey is not configured.");

        StripeConfiguration.ApiKey = secret;

        var sessionService = new Stripe.Checkout.SessionService();

        var metadata = new Dictionary<string, string>
        {
            ["order_id"] = order.Id.ToString("D"),
            ["product_id"] = product.Id.ToString("D"),
            ["buyer_id"] = order.BuyerUserId.ToString("D"),
            ["seller_id"] = order.SellerUserId.ToString("D"),
            ["offer_id"] = order.OfferId?.ToString("D") ?? "",
            ["type"] = "marketplace_checkout",
        };

        var piData = new SessionPaymentIntentDataOptions
        {
            CaptureMethod = "manual",
            Metadata = new Dictionary<string, string>(metadata),
        };

        if (!string.IsNullOrWhiteSpace(seller.StripeConnectAccountId))
        {
            piData.ApplicationFeeAmount = applicationFeeHuf;
            piData.TransferData = new SessionPaymentIntentDataTransferDataOptions
            {
                Destination = seller.StripeConnectAccountId
            };
        }

        var options = new SessionCreateOptions
        {
            Mode = "payment",
            SuccessUrl = successUrl,
            CancelUrl = cancelUrl,
            Metadata = metadata,
            LineItems =
            [
                new SessionLineItemOptions
                {
                    Quantity = 1,
                    PriceData = new SessionLineItemPriceDataOptions
                    {
                        Currency = "huf",
                        UnitAmount = totalAmountHuf,
                        ProductData = new SessionLineItemPriceDataProductDataOptions
                        {
                            Name = product.Title,
                            Description = product.Description.Length > 120
                                ? product.Description[..120]
                                : product.Description,
                        },
                    },
                },
            ],
            PaymentIntentData = piData,
        };

        var session = await sessionService.CreateAsync(options, cancellationToken: ct);

        var piId = session.PaymentIntentId
            ?? (session.PaymentIntent as Stripe.PaymentIntent)?.Id;

        if (string.IsNullOrEmpty(session.Url))
            throw new InvalidOperationException("Stripe did not return a checkout URL.");

        return new StripeCheckoutSessionResult(session.Id, session.Url, piId);
    }

    public async Task<StripeCheckoutSessionInfo?> GetCheckoutSessionAsync(string sessionId, CancellationToken ct)
    {
        var secret = _configuration["Stripe:SecretKey"];
        if (string.IsNullOrWhiteSpace(secret))
            return null;

        StripeConfiguration.ApiKey = secret;
        var sessionService = new Stripe.Checkout.SessionService();
        try
        {
            var s = await sessionService.GetAsync(sessionId, cancellationToken: ct);
            return new StripeCheckoutSessionInfo(s.Url, s.Status ?? "");
        }
        catch (StripeException)
        {
            return null;
        }
    }
}
