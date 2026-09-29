import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The front end talks to the FastAPI backend through a dev proxy, so all
// requests can use relative paths like `/api/products`. This keeps the same
// code working in dev and in production behind a single origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
