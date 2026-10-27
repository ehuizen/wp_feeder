import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const serverUrl = "http://localhost:3000";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
  server: {
    proxy: {
      "/api": serverUrl,
      "/login": serverUrl,
      "/logout": serverUrl,
      "/callback": serverUrl,
      "/signup": serverUrl,
    },
  },
});
