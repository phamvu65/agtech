import { test, expect } from "@playwright/test";

test("admin logs in, provisions and disables an observer, then logs out", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Tên đăng nhập", { exact: true }).fill("admin-e2e");
  await page.getByLabel("Mật khẩu", { exact: true }).fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "Đăng nhập →" }).click();
  await expect(page.getByRole("heading", { name: "Tổng quan thị trường" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lịch sử giá", exact: true })).toBeVisible();
  await page.getByLabel("Tên đăng nhập mới").fill("reader-e2e");
  await page.getByLabel("Mật khẩu tạm").fill("Temporary-observer-2026!");
  await page.getByRole("button", { name: "Tạo tài khoản", exact: true }).click();
  const account = page.getByRole("listitem").filter({ hasText: "reader-e2e" });
  await expect(account).toBeVisible();
  await page.getByRole("button", { name: "Đăng xuất" }).click();
  await page.getByLabel("Tên đăng nhập", { exact: true }).fill("reader-e2e");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("Temporary-observer-2026!");
  await page.getByRole("button", { name: "Đăng nhập →" }).click();
  await expect(page.getByRole("heading", { name: "Tổng quan thị trường" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cấp tài khoản cán bộ" })).toHaveCount(0);
  await page.getByRole("button", { name: "Đăng xuất" }).click();
  await page.getByLabel("Tên đăng nhập", { exact: true }).fill("admin-e2e");
  await page.getByLabel("Mật khẩu", { exact: true }).fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "Đăng nhập →" }).click();
  await account.getByRole("button", { name: "Khóa", exact: true }).click();
  await expect(account.getByText(/Đã khóa/)).toBeVisible();
  await page.screenshot({ path: "test-results/auth-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Đăng xuất" }).click();
  await expect(page.getByRole("heading", { name: "Đăng nhập", exact: true })).toBeVisible();
  await page.getByLabel("Tên đăng nhập", { exact: true }).fill("reader-e2e");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("Temporary-observer-2026!");
  await page.getByRole("button", { name: "Đăng nhập →" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
});

test("mobile-sized web shows a usable login without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Đăng nhập", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/auth-mobile-web.png", fullPage: true });
});
