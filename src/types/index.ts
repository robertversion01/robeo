// Közös TypeScript típusok a teljes projekthez

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  condition?: string;
  brand?: string;
  image_url: string | null;
  user_id: string;
  status: 'active' | 'sold' | 'deleted';
  created_at: string;
  updated_at: string;
}

export interface Offer {
  id: string;
  product_id: string;
  buyer_id: string;
  seller_id: string;
  price: number;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed';
  created_at: string;
  updated_at: string;
  product?: Product;
}

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  product_id?: string;
  created_at: string;
}

export interface Review {
  id: string;
  reviewer_id: string;
  reviewed_id: string;
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