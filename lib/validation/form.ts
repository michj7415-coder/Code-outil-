import type { z } from "zod";

export type FieldErrors = Record<string, string>;

export type FormState = {
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
};

/** Transforme une erreur zod en { champ: premier message }. */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
