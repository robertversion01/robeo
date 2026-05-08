import Stripe from 'stripe';

// This is a singleton pattern to ensure we only create one instance of the Stripe client
// and only when it's actually needed (not during build time)
let stripeInstance: Stripe | null = null;

export function getStripeInstance(): Stripe | null {
  // Only run on the client side, not during build
  if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
    console.log('Stripe client requested during build, returning null');
    return null;
  }

  // Check if we have the API key
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('Missing Stripe secret key');
    return null;
  }

  // If we already have an instance, return it
  if (stripeInstance) {
    return stripeInstance;
  }

  // Otherwise create a new instance
  try {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-01-27.acacia' as any,
    });
    return stripeInstance;
  } catch (error) {
    console.error('Error initializing Stripe:', error);
    return null;
  }
}