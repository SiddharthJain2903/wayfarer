import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In dev, forward /api to the local FastAPI server. In production (Vercel) /api is same-origin.
export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": "http://localhost:8000" } },
});
