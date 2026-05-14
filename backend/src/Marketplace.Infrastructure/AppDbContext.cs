using Marketplace.Domain;
using Marketplace.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Marketplace.Infrastructure;

public sealed class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductImage> ProductImages => Set<ProductImage>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<Offer> Offers => Set<Offer>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<StripeWebhookEvent> StripeWebhookEvents => Set<StripeWebhookEvent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(e =>
        {
            e.HasIndex(x => x.Email).IsUnique();
        });

        modelBuilder.Entity<Product>(e =>
        {
            e.Property(p => p.Condition)
                .HasConversion(
                    v => PgEnums.ProductConditionToPg(v),
                    v => PgEnums.ProductConditionFromPg(v))
                .HasColumnType("product_condition");

            e.Property(p => p.Status)
                .HasConversion(
                    v => PgEnums.ProductStatusToPg(v),
                    v => PgEnums.ProductStatusFromPg(v))
                .HasColumnType("product_status");

            e.Property(p => p.Category).HasColumnName("category_slug");
            e.Property(p => p.FeaturedUntilUtc).HasColumnName("featured_until_utc");
            e.Property(p => p.ViewCount).HasColumnName("view_count");
            e.Property(p => p.FavoriteCount).HasColumnName("favorite_count");
        });

        modelBuilder.Entity<ProductImage>(e =>
        {
            e.Property(x => x.Url).HasColumnName("image_url");
        });

        modelBuilder.Entity<Order>(e =>
        {
            e.Property(o => o.Status)
                .HasConversion(
                    v => PgEnums.OrderStatusToPg(v),
                    v => PgEnums.OrderStatusFromPg(v))
                .HasColumnType("order_status");

            e.Property(o => o.ShippingLabelExternalId).HasColumnName("foxpost_label_reference");
        });

        modelBuilder.Entity<Offer>(e =>
        {
            e.Property(o => o.Status)
                .HasConversion(
                    v => PgEnums.OfferStatusToPg(v),
                    v => PgEnums.OfferStatusFromPg(v))
                .HasColumnType("text");
        });

        modelBuilder.Entity<Review>(e =>
        {
            e.HasIndex(x => new { x.OrderId, x.ReviewerUserId }).IsUnique();
        });

        modelBuilder.Entity<Conversation>(e =>
        {
            e.HasIndex(x => new { x.BuyerUserId, x.SellerUserId, x.ProductId })
                .IsUnique()
                .HasFilter("order_id IS NULL AND product_id IS NOT NULL");

            e.HasIndex(x => x.OrderId)
                .IsUnique()
                .HasFilter("order_id IS NOT NULL");
        });

        modelBuilder.Entity<Notification>(e =>
        {
            e.HasIndex(x => new { x.UserId, x.CreatedAtUtc });
        });

        modelBuilder.Entity<StripeWebhookEvent>(e =>
        {
            e.HasKey(x => x.StripeEventId);
            e.Property(x => x.StripeEventId).HasColumnName("stripe_event_id");
            e.Property(x => x.PayloadJson).HasColumnName("payload_json");
            e.Property(x => x.ReceivedAtUtc).HasColumnName("received_at_utc");
            e.Property(x => x.ProcessedAtUtc).HasColumnName("processed_at_utc");
        });
    }
}
