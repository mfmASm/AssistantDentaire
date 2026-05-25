import { recalls, type Recall } from "@/lib/demo-data";
import { withApiFallback } from "@/services/api";
import { makeCrudApi } from "@/services/crudApi";

export type RecallPayload = Record<string, unknown>;
export const recallsApi = {
  ...makeCrudApi<RecallPayload>("/recalls"),
  listWithFallback: () => withApiFallback(makeCrudApi<RecallPayload>("/recalls").list(), recalls as unknown as RecallPayload[]),
};

export type { Recall };
