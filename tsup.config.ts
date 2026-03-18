import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"], // Support both old and new projects
  dts: true, // Automatically generate types
  splitting: false,
  sourcemap: true,
  clean: true, // Clean dist folder before each build
  external: ["react"], // Don't bundle React
});
