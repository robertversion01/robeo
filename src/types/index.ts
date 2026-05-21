// Közös TypeScript típusok a teljes projekthez
import { TransactionStatus, StripeAccount, Transaction } from './stripe';

export interface Wallet {
  user_id: string;
  available_balance: number;
  pending_balance: number;
  currency: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  condition?: string;
  brand?: string;
  image_url: string | null;
  images: string[];
  user_id: string;
  status: 'active' | 'sold' | 'deleted' | 'reserved' | 'shipped' | 'delivered';
  featured_until?: string | null;
  size?: string | null;
  color?: string;
  transaction_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Offer {
  id: string;
  product_id: string;
  buyer_id: string;
  seller_id: string;
  offered_price: number;
  message?: string;
  status:
    | 'pending'
    | 'accepted'
    | 'rejected'
    | 'countered'
    | 'cancelled'
    | 'completed'
    | 'payment_pending'
    | 'payment_completed'
    | 'shipped'
    | 'delivered';
  shipping_method?: string;
  shipping_cost?: number;
  transaction_id?: string;
  payment_intent_id?: string;
  tracking_number?: string;
  created_at: string;
  updated_at: string;
  product?: Product;
}

export interface User {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  phone?: string;
  stripe_account_id?: string;
  stripe_customer_id?: string;
  is_seller_onboarded?: boolean;
  created_at: string;
  updated_at?: string;
  stripe_account?: StripeAccount;
}

export interface Profile extends User {
  total_sales?: number;
  total_purchases?: number;
  average_rating?: number;
  followers_count?: number;
  following_count?: number;
  vacation_mode?: boolean;
  seller_verified?: boolean;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  product_id?: string;
  message_type?: 'text' | 'image' | 'system';
  media_url?: string | null;
  is_system_message?: boolean;
  created_at: string;
}

export interface Review {
  id: string;
  reviewer_id: string;
  reviewed_id: string;
  offer_id?: string;
  transaction_id?: string;
  rating: number;
  comment?: string;
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
}

// Re-export Stripe types for convenience
export * from './stripe';

