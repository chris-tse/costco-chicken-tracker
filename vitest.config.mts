import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { configDefaults, defineConfig } from "vitest/config";

const integrationTestExclusions = process.env.DATABASE_URL
  ? []
  : ["src/lib/sightings.integration.test.ts"];

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    exclude: [...configDefaults.exclude, ...integrationTestExclusions],
  },
});
