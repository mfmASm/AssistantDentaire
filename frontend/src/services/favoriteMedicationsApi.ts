import { makeCrudApi } from "@/services/crudApi";

export type FavoriteMedicationPayload = Record<string, unknown>;
export const favoriteMedicationsApi = makeCrudApi<FavoriteMedicationPayload>("/favorite-medications");
