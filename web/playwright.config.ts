import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e", fullyParallel: false, workers: 1, timeout: 45000,
  use: { baseURL: "http://localhost:3001", channel: process.env.PLAYWRIGHT_CHANNEL || undefined, trace: "retain-on-failure" },
  webServer: [
    { command: `"${process.env.PYTHON_EXECUTABLE || "python"}" -m uvicorn src.main:app --host 127.0.0.1 --port 8011`, cwd: "..", url: "http://127.0.0.1:8011/health", reuseExistingServer: false },
    { command: "npm run dev -- --port 3001", url: "http://localhost:3001", reuseExistingServer: false,
      env: { API_BASE_URL: "http://127.0.0.1:8011", APP_ORIGIN: "http://localhost:3001" }, timeout: 120000 },
  ],
});
