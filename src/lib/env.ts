import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
  },
  clientPrefix: "PUBLIC_",
  client: {},
  runtimeEnv: process.env,
});
