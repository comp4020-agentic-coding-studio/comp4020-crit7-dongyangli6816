import node from "@astrojs/node";
import { defineConfig, passthroughImageService } from "astro/config";

// Server-rendered output: pages render per request so they can read the
// database, and `astro build` emits the Node server the Dockerfile runs.
export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  // Images are served as committed, not resized: the default service needs
  // Sharp, a native module the Docker image doesn't carry, and without it
  // every README image was a 500 in production.
  image: { service: passthroughImageService() },
  security: {
    // Fly's proxy terminates TLS, so naming the deploy domain is what lets
    // Astro trust x-forwarded-proto and accept same-origin form POSTs.
    allowedDomains: [{ hostname: "**.fly.dev", protocol: "https" }],
  },
});
