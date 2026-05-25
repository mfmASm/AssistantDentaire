import { appointments, type Appointment } from "@/lib/demo-data";
import { withApiFallback } from "@/services/api";
import { makeCrudApi } from "@/services/crudApi";

export type AppointmentPayload = Record<string, unknown>;
export const appointmentsApi = {
  ...makeCrudApi<AppointmentPayload>("/appointments"),
  listWithFallback: () => withApiFallback(makeCrudApi<AppointmentPayload>("/appointments").list(), appointments as unknown as AppointmentPayload[]),
};

export type { Appointment };
