import { z } from "zod";

export const FEEDBACK_QUESTION = "Qu'est-ce qui t'aiderait le plus dans l'app ?";

export const feedbackSchema = z.object({
  rating: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z
      .number({ error: "Choisis une note de 1 à 5." })
      .int({ error: "Choisis une note de 1 à 5." })
      .min(1, { error: "Choisis une note de 1 à 5." })
      .max(5, { error: "Choisis une note de 1 à 5." }),
  ),
  message: z.string().trim().max(2000, { error: "2000 caractères maximum." }).default(""),
  page: z.string().max(200).default(""),
});

export type FeedbackData = z.output<typeof feedbackSchema>;
