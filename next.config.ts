import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Les pages et le webhook Telegram lisent les briefs et la watchlist depuis
  // le dépôt : ces fichiers doivent accompagner les fonctions déployées.
  outputFileTracingIncludes: {
    "/**": ["./data/**/*.json", "./config/*.json"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
