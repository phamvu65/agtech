import { test, expect } from "@playwright/test";

test("local dashboard budget: one user, 365 fixture observations, three warm loads", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.getByLabel("Tên đăng nhập", { exact: true }).fill("admin-e2e");
  await page
    .getByLabel("Mật khẩu", { exact: true })
    .fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "Đăng nhập →" }).click();
  await expect(
    page.getByRole("heading", { name: "Phòng kiểm chứng phân tích" }),
  ).toBeVisible();
  const created = await page.request.post("/api/admin/price-series", {
    headers: { Origin: "http://localhost:3001" },
    data: {
      commodity: "Coffee performance fixture",
      locality_code: "PERF",
      locality_name: "Local performance",
      quality: "synthetic",
      source_name: "Synthetic",
      source_url: "https://example.com/perf",
      dataset_kind: "synthetic",
      rights_basis: "Self-created fixture for local timing only",
    },
  });
  expect(created.status()).toBe(201);
  const series = await created.json();
  let csv =
    "observed_on,price_vnd_per_kg,unit,published_at,collected_at,source_document_url\n";
  for (let i = 0; i < 365; i++) {
    const d = new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10);
    csv += `${d},${100000 + i},VND/kg,${d}T08:00:00Z,${d}T09:00:00Z,https://example.com/perf\n`;
  }
  expect(
    (
      await page.request.post(`/api/admin/price-series/${series.id}/imports`, {
        headers: {
          Origin: "http://localhost:3001",
          "Content-Type": "text/csv",
        },
        data: csv,
      })
    ).status(),
  ).toBe(201);
  await page.reload();
  await page.getByLabel("Chuỗi giá đang xem").selectOption(String(series.id));
  await page.getByLabel("Từ ngày", { exact: true }).fill("2025-01-01");
  await page.getByLabel("Đến ngày", { exact: true }).fill("2025-12-31");
  const button = page.getByRole("button", { name: "Xem lịch sử", exact: true });
  const table = page.getByRole("table", { name: "Giá theo ngày" });
  await button.click();
  await expect(table.locator("tbody tr")).toHaveCount(365);
  // Engineering budget fixed before measuring; warm dev server, no production/concurrency claim.
  const budgetMs = 5000,
    durations: number[] = [];
  for (let i = 0; i < 3; i++) {
    const started = Date.now();
    const response = page.waitForResponse(
      (r) =>
        r.url().includes(`/price-series/${series.id}/history?`) &&
        r.status() === 200,
    );
    await button.click();
    await response;
    await expect(table.locator("tbody tr")).toHaveCount(365);
    await expect(button).toBeEnabled();
    durations.push(Date.now() - started);
  }
  const report = {
    scope:
      "local Edge/Next dev, one user, 365 synthetic observations, three warm dashboard history loads",
    budgetMs,
    durationsMs: durations,
    maxMs: Math.max(...durations),
  };
  await testInfo.attach("dashboard-latency.json", {
    body: JSON.stringify(report, null, 2),
    contentType: "application/json",
  });
  console.log(JSON.stringify(report));
  expect(report.maxMs).toBeLessThanOrEqual(budgetMs);
});
