import { payments, type Payment } from "@/lib/demo-data";
import { withApiFallback } from "@/services/api";
import { makeCrudApi } from "@/services/crudApi";

export type PaymentPayload = Record<string, unknown>;
export const paymentsApi = {
  ...makeCrudApi<PaymentPayload>("/payments"),
  listWithFallback: () => withApiFallback(makeCrudApi<PaymentPayload>("/payments").list(), payments as unknown as PaymentPayload[]),
};

export type { Payment };
