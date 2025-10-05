// vite.config.ts
import { defineConfig } from "file:///Users/francescperez/Documents/strike/strike-dashboard/node_modules/vite/dist/node/index.js";
import tailwindcss from "file:///Users/francescperez/Documents/strike/strike-dashboard/node_modules/@tailwindcss/vite/dist/index.mjs";
import react from "file:///Users/francescperez/Documents/strike/strike-dashboard/node_modules/@vitejs/plugin-react/dist/index.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
var __vite_injected_original_import_meta_url = "file:///Users/francescperez/Documents/strike/strike-dashboard/vite.config.ts";
var __dirname = path.dirname(fileURLToPath(__vite_injected_original_import_meta_url));
var vite_config_default = defineConfig({
  base: "/trading-dashboard/",
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src")
    }
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "https://api.bending.ai",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, "")
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvZnJhbmNlc2NwZXJlei9Eb2N1bWVudHMvc3RyaWtlL3N0cmlrZS1kYXNoYm9hcmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9mcmFuY2VzY3BlcmV6L0RvY3VtZW50cy9zdHJpa2Uvc3RyaWtlLWRhc2hib2FyZC92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvZnJhbmNlc2NwZXJlei9Eb2N1bWVudHMvc3RyaWtlL3N0cmlrZS1kYXNoYm9hcmQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHRhaWx3aW5kY3NzIGZyb20gJ0B0YWlsd2luZGNzcy92aXRlJ1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuaW1wb3J0IHBhdGggZnJvbSAnbm9kZTpwYXRoJ1xuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCB9IGZyb20gJ25vZGU6dXJsJ1xuXG5jb25zdCBfX2Rpcm5hbWUgPSBwYXRoLmRpcm5hbWUoZmlsZVVSTFRvUGF0aChpbXBvcnQubWV0YS51cmwpKVxuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBiYXNlOiAnL3RyYWRpbmctZGFzaGJvYXJkLycsXG4gIHBsdWdpbnM6IFt0YWlsd2luZGNzcygpLCByZWFjdCgpXSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICAnQCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMnKSxcbiAgICB9LFxuICB9LFxuICBzZXJ2ZXI6IHtcbiAgICBwb3J0OiA1MTczLFxuICAgIHByb3h5OiB7XG4gICAgJy9hcGknOiB7XG4gICAgICB0YXJnZXQ6ICdodHRwczovL2FwaS5iZW5kaW5nLmFpJyxcbiAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgIHJld3JpdGU6IHAgPT4gcC5yZXBsYWNlKC9eXFwvYXBpLywgJycpLFxuICAgIH0sXG4gIH0sXG4gIH0sICBcbn0pXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQW9WLFNBQVMsb0JBQW9CO0FBQ2pYLE9BQU8saUJBQWlCO0FBQ3hCLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFDakIsU0FBUyxxQkFBcUI7QUFKc0wsSUFBTSwyQ0FBMkM7QUFNclEsSUFBTSxZQUFZLEtBQUssUUFBUSxjQUFjLHdDQUFlLENBQUM7QUFFN0QsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsTUFBTTtBQUFBLEVBQ04sU0FBUyxDQUFDLFlBQVksR0FBRyxNQUFNLENBQUM7QUFBQSxFQUNoQyxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLEtBQUssUUFBUSxXQUFXLEtBQUs7QUFBQSxJQUNwQztBQUFBLEVBQ0Y7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE9BQU87QUFBQSxNQUNQLFFBQVE7QUFBQSxRQUNOLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLFNBQVMsT0FBSyxFQUFFLFFBQVEsVUFBVSxFQUFFO0FBQUEsTUFDdEM7QUFBQSxJQUNGO0FBQUEsRUFDQTtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
