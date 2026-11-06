import { z } from "zod";

export const photoSchema = z.object({
  dataUrl: z.string().startsWith("data:image/").max(3_000_000),
});
