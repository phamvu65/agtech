import { test, expect } from "@playwright/test";
test("fixture analysis, risk transitions and private read state integrate on web", async ({
  page,
}) => {
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
      commodity: "Cà phê analysis web",
      locality_code: "WEB-ANALYSIS",
      locality_name: "WEB-ANALYSIS",
      quality: "unspecified",
      source_name: "Synthetic",
      source_url: "https://example.com/analysis-web",
      dataset_kind: "synthetic",
      rights_basis: "Tự tạo để kiểm thử toàn luồng",
    },
  });
  expect(created.status()).toBe(201);
  const series = await created.json();
  let csv =
    "observed_on,price_vnd_per_kg,unit,published_at,collected_at,source_document_url\n";
  for (let i = 0; i < 35; i++) {
    const day = new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10);
    csv += `${day},${100000 + 10 * i},VND/kg,${day}T08:00:00Z,${day}T09:00:00Z,https://example.com/analysis-web\n`;
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
  await page.getByLabel("Chuỗi kiểm chứng").selectOption(String(series.id));
  await page.getByRole("button", { name: "Tạo snapshot" }).click();
  await expect(page.getByText(/Snapshot #/)).toBeVisible();
  await page.getByLabel("Kết thúc train (UTC)").fill("2025-01-10");
  await page.getByLabel("Kết thúc validation (UTC)").fill("2025-01-20");
  await page.getByLabel("Kết thúc test (UTC)").fill("2025-02-04");
  await page.getByRole("button", { name: "Chạy backtest fixture" }).click();
  await expect(
    page.getByRole("table", { name: "Kết quả backtest fixture" }),
  ).toBeVisible();
  await page.getByLabel("Mốc dự báo UTC").fill("2025-02-04T23:59");
  await page
    .getByRole("button", { name: "Tạo dự báo từ model fixture" })
    .click();
  await page.getByLabel("Phiên bản quy tắc thử nghiệm").fill("web-fixture-v1");
  await page.getByLabel("T1 thử nghiệm (%)", { exact: true }).fill("5");
  await page.getByLabel("T2 thử nghiệm (%)", { exact: true }).fill("10");
  await page.getByLabel("Tuổi dữ liệu tối đa thử nghiệm (giờ)").fill("24");
  await page.getByLabel("Ngưỡng bất thường thử nghiệm (%)").fill("2");
  await page
    .getByLabel("Quy tắc khôi phục thử nghiệm")
    .selectOption("compare_last_valid");
  await page.getByRole("button", { name: "Lưu quy tắc fixture" }).click();
  await page.getByLabel("Chuỗi muốn theo dõi").selectOption(String(series.id));
  await page.getByRole("button", { name: "Thêm theo dõi" }).click();
  await page
    .getByLabel("Bảy giá tự tạo, phân cách bằng dấu phẩy")
    .fill(Array(7).fill("95323").join(","));
  await page.getByRole("button", { name: "Lưu dự báo tự tạo" }).click();
  await page.getByRole("button", { name: "Đánh giá rủi ro fixture" }).click();
  await expect(page.getByTestId("lab-risk")).toContainText("MEDIUM");
  await page.getByRole("button", { name: "Tải lại hộp thư" }).click();
  const notice = page.getByTestId("notification").filter({ hasText: "MEDIUM" });
  await expect(notice).toBeVisible();
  await notice.getByRole("button", { name: "Đánh dấu đã đọc" }).click();
  await expect(notice).toContainText("Đã đọc");
});
