/**
 * Request-validation schemas shared by the API routes.
 *
 * Kept apart from lib/buttons.ts so that module stays dependency-free — it runs
 * inside the flow engine on the webhook path, which has no business importing a
 * validation library.
 */
import { z } from "zod";
import { MAX_BUTTONS } from "./buttons";

/** Link buttons on the final message. Instagram allows at most three. */
export const buttonsSchema = z
  .array(z.object({ title: z.string(), url: z.string() }))
  .max(MAX_BUTTONS);
