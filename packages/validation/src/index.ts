import { z } from "zod";

export const ScanRequestSchema = z.object({
  repositoryUrl: z
    .string()
    .url({ message: "Provide a valid repository URL structure." })
    .regex(
      /^(https:\/\/github\.com\/|https:\/\/gitlab\.com\/)[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/,
      {
        message:
          "Only public instances of GitHub or GitLab are allowed at this tier.",
      },
    ),
  branch: z
    .string()
    .min(1, { message: "Branch locator identifier required." })
    .default("main"),
});

export type ScanRequestInput = z.infer<typeof ScanRequestSchema>;
