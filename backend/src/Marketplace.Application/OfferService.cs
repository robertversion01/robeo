using Marketplace.Domain;

namespace Marketplace.Application;

public sealed class OfferService
{
    private readonly IOfferRepository _offers;
    private readonly IProductRepository _products;

    public OfferService(IOfferRepository offers, IProductRepository products)
    {
        _offers = offers;
        _products = products;
    }

    public Task<Offer?> GetByIdAsync(Guid id, CancellationToken ct) =>
        _offers.GetByIdAsync(id, ct);

    public async Task<Offer> CreateOfferAsync(Guid buyerId, CreateOfferRequest req, CancellationToken ct)
    {
        var product = await _products.GetByIdAsync(req.ProductId, ct)
            ?? throw new InvalidOperationException("Product not found.");

        if (product.Status != ProductStatus.Available)
            throw new InvalidOperationException("Product is not available for offers.");

        if (product.SellerId == buyerId)
            throw new InvalidOperationException("Cannot negotiate on your own listing.");

        if (!OfferPricingRules.IsOfferPriceAllowed(product.PriceHuf, req.OfferedPriceHuf))
        {
            var min = OfferPricingRules.MinimumOfferPriceHuf(product.PriceHuf);
            throw new InvalidOperationException($"Offer must be at least {min} HUF (60% of listing price).");
        }

        if (req.ShippingFeeHuf < 0)
            throw new InvalidOperationException("Invalid shipping fee.");

        var offer = new Offer
        {
            Id = Guid.NewGuid(),
            ProductId = product.Id,
            BuyerUserId = buyerId,
            SellerUserId = product.SellerId,
            OfferedPriceHuf = req.OfferedPriceHuf,
            Status = OfferStatus.Pending,
            BuyerMessage = req.BuyerMessage,
            ShippingMethod = req.ShippingMethod,
            ShippingFeeHuf = req.ShippingFeeHuf,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };

        return await _offers.AddAsync(offer, ct);
    }

    public async Task<Offer?> SellerAcceptAsync(Guid sellerId, Guid offerId, CancellationToken ct)
    {
        var offer = await _offers.GetByIdAsync(offerId, ct);
        if (offer is null || offer.SellerUserId != sellerId) return null;
        OfferStateMachine.EnsureTransition(offer.Status, OfferStatus.Accepted);

        offer.Status = OfferStatus.Accepted;
        offer.UpdatedAtUtc = DateTime.UtcNow;
        return await _offers.UpdateAsync(offer, ct);
    }

    public async Task<Offer?> SellerRejectAsync(Guid sellerId, Guid offerId, CancellationToken ct)
    {
        var offer = await _offers.GetByIdAsync(offerId, ct);
        if (offer is null || offer.SellerUserId != sellerId) return null;
        OfferStateMachine.EnsureTransition(offer.Status, OfferStatus.Rejected);

        offer.Status = OfferStatus.Rejected;
        offer.UpdatedAtUtc = DateTime.UtcNow;
        return await _offers.UpdateAsync(offer, ct);
    }

    public async Task<Offer?> SellerCounterAsync(Guid sellerId, Guid offerId, SellerCounterOfferRequest req, CancellationToken ct)
    {
        var offer = await _offers.GetByIdAsync(offerId, ct);
        if (offer is null || offer.SellerUserId != sellerId) return null;
        OfferStateMachine.EnsureTransition(offer.Status, OfferStatus.Countered);

        var product = await _products.GetByIdAsync(offer.ProductId, ct)
            ?? throw new InvalidOperationException("Product not found.");

        if (!OfferPricingRules.IsOfferPriceAllowed(product.PriceHuf, req.CounterPriceHuf))
        {
            var min = OfferPricingRules.MinimumOfferPriceHuf(product.PriceHuf);
            throw new InvalidOperationException($"Counter must be at least {min} HUF (60% of listing price).");
        }

        offer.Status = OfferStatus.Countered;
        offer.CounterPriceHuf = req.CounterPriceHuf;
        offer.SellerCounterMessage = req.SellerCounterMessage;
        offer.UpdatedAtUtc = DateTime.UtcNow;
        return await _offers.UpdateAsync(offer, ct);
    }

    public async Task<Offer?> BuyerAcceptCounterAsync(Guid buyerId, Guid offerId, CancellationToken ct)
    {
        var offer = await _offers.GetByIdAsync(offerId, ct);
        if (offer is null || offer.BuyerUserId != buyerId) return null;
        if (offer.Status != OfferStatus.Countered || offer.CounterPriceHuf is null)
            throw new InvalidOperationException("No counter offer to accept.");

        OfferStateMachine.EnsureTransition(offer.Status, OfferStatus.Accepted);

        offer.Status = OfferStatus.Accepted;
        offer.OfferedPriceHuf = offer.CounterPriceHuf.Value;
        offer.UpdatedAtUtc = DateTime.UtcNow;
        return await _offers.UpdateAsync(offer, ct);
    }
}
