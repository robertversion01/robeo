// Stripe Connect & Escrow related types

export type TransactionStatus = 
  | 'payment_pending' 
  | 'payment_processing'
  | 'payment_succeeded'
  | 'fizetve'
  | 'feladva'
  | 'uton'
  | 'atvetelre_var'
  | 'sikeresen_atveve'
  | 'shipped'
  | 'delivered'
  | 'funds_released'
  | 'refunded'
  | 'cancelled';

export interface StripeAccount {
  id: string;
  user_id: string;
  stripe_account_id: string;
  is_onboarded: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  product_id: string;
  offer_id?: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  fee: number;
  shipping_cost: number;
  total: number;
  payment_intent_id: string;
  transfer_id?: string;
  status: TransactionStatus;
  shipping_method: string;
  tracking_number?: string;
  shipping_address: ShippingAddress;
  created_at: string;
  updated_at: string;
}

export interface ShippingAddress {
  name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  postal_code: string;
  country: string;
  phone?: string;
}

export interface PaymentIntent {
  id: string;
  client_secret: string;
  amount: number;
  currency: string;
  status: string;
}

export interface StripeConnectAccountLink {
  url: string;
  expires_at: number;
}