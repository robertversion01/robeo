// src/lib/stripe.ts
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2026-04-22.dahlia', // frissítsd erre a legújabb stabil verzióra
  typescript: true,
});

// Default export is recommended for easier imports
export default stripe;