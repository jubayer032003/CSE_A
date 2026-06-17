import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: "/",
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:5000",
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("firebase")) return "vendor_firebase";
            if (id.includes("react") || id.includes("react-dom")) return "vendor_react";
            if (id.includes("socket.io-client")) return "vendor_socket";
            return "vendor";
          }
        },
      },
    },
  },
})
