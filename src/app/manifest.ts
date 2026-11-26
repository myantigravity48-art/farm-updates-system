import type { MetadataRoute } from "next";

/**
 * Colours mirror the --bg token in src/app/globals.css. A manifest cannot
 * follow the in-app theme toggle, so it uses the default dark background.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Farm updates system",
    short_name: "Farm updates",
    start_url: "/",
    display: "standalone",
    background_color: "#0A110D",
    theme_color: "#0A110D",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512-maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
