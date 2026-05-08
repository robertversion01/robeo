import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;
let stripeInitAttempted = false;

export function getStripeInstance(): Stripe | null {
  if (stripeInstance) {
    return stripeInstance;
  }

  if (stripeInitAttempted) {
    return null;
  }

  stripeInitAttempted = true;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.warn('Missing STRIPE_SECRET_KEY. Stripe client is unavailable.');
    return null;
  }

  try {
    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2025-01-27.acacia' as any,
    });
    return stripeInstance;
  } catch (error) {
    console.error('Error initializing Stripe:', error);
    return null;
  }
}