import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tagger from "@dhiwise/component-tagger";
import { fileURLToPath } from "node:url";

const srcPath = (dir) =>
  fileURLToPath(new URL(`./src/${dir}`, import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  // This changes the out put dir from dist to build
  // comment this out if that isn't relevant for your project
  build: {
    outDir: "build",
    chunkSizeWarningLimit: 2000,
  },
  plugins: [tsconfigPaths(), react(), tagger()],

  // Bare-root imports — `components/AppIcon`, `utils/permission`, and ~236
  // others — are declared only as `baseUrl: "./src"` in jsconfig.json, which
  // vite-tsconfig-paths 3.6.0 does not reliably pick up from a jsconfig (as
  // opposed to a tsconfig). With a warm node_modules/.vite cache the project
  // still started, so the gap stayed hidden; on a cold cache BOTH `vite` and
  // `vite build` fail on the first such import with "Rollup failed to resolve
  // import components/ScrollToTop".
  //
  // Declaring the roots here resolves them independently of the plugin, so a
  // fresh clone and CI behave the same as a warm local checkout. The plugin is
  // left in place: it still handles anything added to jsconfig later.
  resolve: {
    alias: {
      components: srcPath("components"),
      hooks: srcPath("hooks"),
      pages: srcPath("pages"),
      routes: srcPath("routes"),
      services: srcPath("services"),
      styles: srcPath("styles"),
      utils: srcPath("utils"),
      // Root-level modules reached bare, which `baseUrl` also allowed.
      // NotificationContext is the only one; checked by scanning every bare
      // import in src against the files at src root.
      NotificationContext: srcPath("NotificationContext.jsx"),
    },
  },

  server: {
    port: "4001",
    host: "0.0.0.0",
    strictPort: true,
    allowedHosts: ['.amazonaws.com', '.builtwithrocket.new'],
  }
});