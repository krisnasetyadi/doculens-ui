// Dummy/test-mode Stripe Checkout flow (MS-90).

export interface CreateCheckoutSessionRequest {
  plan_id: string;
}

export interface CheckoutSessionResponse {
  checkout_url: string;
  payment_id: string;
}

export type PaymentStatus = "pending" | "succeeded" | "failed" | "cancelled";

export interface PaymentRecord {
  payment_id: string;
  plan_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  created_at: string;
}

export interface PaymentResponse {
  payment: PaymentRecord;
}
