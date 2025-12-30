import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const githubRepo = process.env.GITHUB_REPOSITORY;
  const repoName = githubRepo?.includes("/")
    ? githubRepo.split("/")[1]
    : undefined;
  const inferredBase = repoName ? `/${repoName}/` : "/";
  const base = mode === "production" ? inferredBase : "/";

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    base,
  };
});
