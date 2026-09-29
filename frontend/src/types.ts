// Shared types mirroring the FastAPI backend responses.

export interface ProductSummary {
  product_id: string;
  name: string;
  garment_type: string;
  category: string;
  price: number;
  short_description: string;
  colors: string[];
  primary_color: string;
  image_url: string;
  any_in_stock: boolean;
}

export interface SizeStock {
  size: string;
  quantity: number;
  in_stock: boolean;
}

export interface ProductDetail extends ProductSummary {
  description: string;
  search_tags: string[];
  sizes: SizeStock[];
  any_in_stock: boolean;
}

export interface ChatResponse {
  reply: string;
  products: ProductSummary[];
}

export interface PageProduct {
  product_id: string;
  name: string;
  price: number | null;
}

export interface PageContext {
  path: string;
  title?: string;
  products: PageProduct[];
  focused_product_id?: string | null;
}

export interface HistoryTurn {
  role: "user" | "assistant";
  content: string;
  products: ProductSummary[];
}

export interface AuthUser {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface OrderItem {
  id: number;
  product_id: string;
  name: string;
  size: string;
  quantity: number;
  price: number;
  status: string;
  fit_feedback: string | null;
  rating: number | null;
  image_url: string | null;
}

export interface Order {
  id: number;
  created_at: string;
  total: number;
  status: string;
  card_last4: string | null;
  discount_percent: number;
  coupon_code: string | null;
  items: OrderItem[];
}

export interface Coupon {
  code: string;
  discount_percent: number;
  status: string;
}

export interface TriviaQuestion {
  id: number;
  difficulty: string;
  question: string;
  options: string[];
}

export interface TriviaResult {
  passed: boolean;
  correct_count: number;
  total: number;
  coupon: Coupon | null;
}

export interface CartItem {
  product_id: string;
  name: string;
  price: number;
  size: string;
  quantity: number;
  image_url: string;
}
