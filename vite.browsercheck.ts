import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({ base: "./", plugins: [react()], server: { allowedHosts: true }, preview: { allowedHosts: true } });
