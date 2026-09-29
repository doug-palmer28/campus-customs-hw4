// Thin API client for the Campus Customs backend.
// All paths are relative so the Vite dev proxy (see vite.config.ts) forwards
// them to FastAPI, and the same code works in production behind one origin.

import type {
  AuthResponse,
  AuthUser,
  ChatResponse,
  Coupon,
  HistoryTurn,
  Order,
  PageContext,
  ProductDetail,
  ProductSummary,
  TriviaQuestion,
  TriviaResult,
} from "./types";

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}): ${url}`);
  }
  return (await res.json()) as T;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    // Surface the backend's helpful error message when there is one.
    let detail = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.detail) detail = data.detail;
    } catch {
      /* ignore parse errors */
    }
    throw new Error(detail);
  }
  return (await res.json()) as T;
}

export interface RegisterInput {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}

export function registerAccount(input: RegisterInput): Promise<AuthResponse> {
  return postJson<AuthResponse>("/api/auth/register", input);
}

export function loginRequest(
  email: string,
  password: string,
): Promise<AuthResponse> {
  return postJson<AuthResponse>("/api/auth/login", { email, password });
}

export async function fetchCurrentUser(token: string): Promise<AuthUser> {
  const res = await fetch("/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Not authenticated");
  return (await res.json()) as AuthUser;
}

export function fetchProducts(): Promise<ProductSummary[]> {
  return getJson<ProductSummary[]>("/api/products");
}

export function fetchProduct(productId: string): Promise<ProductDetail> {
  return getJson<ProductDetail>(`/api/products/${encodeURIComponent(productId)}`);
}

export interface ChatOptions {
  token?: string | null;
  pageContext?: PageContext | null;
  screenshot?: string | null;
}

export async function sendChatMessage(
  message: string,
  opts: ChatOptions = {},
): Promise<ChatResponse> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const res = await fetch("/api/chat", {
    method: "POST",
    headers,
    body: JSON.stringify({
      message,
      page_context: opts.pageContext ?? null,
      screenshot: opts.screenshot ?? null,
    }),
  });
  if (!res.ok) {
    throw new Error(`Chat request failed (${res.status})`);
  }
  return (await res.json()) as ChatResponse;
}

export async function fetchChatHistory(token: string): Promise<HistoryTurn[]> {
  const res = await fetch("/api/chat/history", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return (await res.json()) as HistoryTurn[];
}

export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

// --- Recommendations, orders, feedback (Problem 9) ---
function authHeaders(token?: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function fetchRecommendations(
  productIds: string[],
  sizes: string[] = [],
  limit = 4,
): Promise<ProductSummary[]> {
  return postJson<ProductSummary[]>("/api/recommendations", {
    product_ids: productIds,
    sizes,
    limit,
  });
}

export async function createOrder(
  items: { product_id: string; name: string; size: string; quantity: number; price: number }[],
  cardNumber: string,
  token: string,
  couponCode?: string | null,
): Promise<Order> {
  const res = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({
      items,
      card_number: cardNumber,
      coupon_code: couponCode ?? null,
    }),
  });
  if (!res.ok) throw new Error(`Order failed (${res.status})`);
  return (await res.json()) as Order;
}

export async function fetchOrders(token: string): Promise<Order[]> {
  const res = await fetch("/api/orders", { headers: authHeaders(token) });
  if (!res.ok) return [];
  return (await res.json()) as Order[];
}

export async function requestReturn(
  itemId: number,
  details: { reason?: string; certified: boolean },
  token: string,
): Promise<{ message?: string }> {
  const res = await fetch(`/api/orders/items/${itemId}/return`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(details),
  });
  if (!res.ok) throw new Error(`Return failed (${res.status})`);
  return (await res.json()) as { message?: string };
}

// --- Coupons & trivia ---
export function fetchTriviaQuestions(): Promise<TriviaQuestion[]> {
  return getJson<TriviaQuestion[]>("/api/trivia/questions");
}

export async function submitTrivia(
  answers: Record<number, number>,
  token: string,
): Promise<TriviaResult> {
  const res = await fetch("/api/trivia/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ answers }),
  });
  if (!res.ok) throw new Error(`Trivia submit failed (${res.status})`);
  return (await res.json()) as TriviaResult;
}

export async function fetchCoupons(token: string): Promise<Coupon[]> {
  const res = await fetch("/api/coupons", { headers: authHeaders(token) });
  if (!res.ok) return [];
  return (await res.json()) as Coupon[];
}

export async function validateCoupon(code: string, token: string): Promise<Coupon> {
  return postJsonAuth<Coupon>("/api/coupons/validate", { code }, token);
}

async function postJsonAuth<T>(url: string, body: unknown, token: string): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.detail) detail = data.detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return (await res.json()) as T;
}

export async function submitItemFeedback(
  itemId: number,
  feedback: { fit_feedback?: string; rating?: number },
  token: string,
): Promise<void> {
  await fetch(`/api/orders/items/${itemId}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(feedback),
  });
}
