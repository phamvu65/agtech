import { test, expect } from '@playwright/test';

test('admin imports labeled synthetic CSV; history shows gaps, filters and retry report', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Tên đăng nhập', {exact: true}).fill('admin-e2e');
  await page.getByLabel('Mật khẩu', {exact: true}).fill(process.env.E2E_PASSWORD!);
  await page.getByRole('button', {name: 'Đăng nhập →'}).click();
  await expect(page.getByRole('heading', {name: 'Lịch sử giá'})).toBeVisible();
  await page.getByLabel('Mặt hàng').fill('Cà phê nhân thử nghiệm');
  await page.getByLabel('Mã địa bàn').fill('TEST-DL');
  await page.getByLabel('Tên địa bàn').fill('Địa bàn thử nghiệm');
  await page.getByLabel('Chất lượng theo nguồn').fill('unspecified');
  await page.getByLabel('Tên nguồn').fill('Fixture tự tạo');
  await page.getByLabel('Liên kết nguồn', {exact: true}).fill('https://example.com/fixture');
  await page.getByLabel('Căn cứ sử dụng').fill('Tự tạo để kiểm thử phần mềm; không phải giá thị trường');
  await page.getByRole('button', {name: 'Tạo chuỗi giá'}).click();
  await expect(page.getByLabel('Chuỗi giá đang xem')).toContainText('Địa bàn thử nghiệm');
  const csv = 'observed_on,price_vnd_per_kg,unit,published_at,collected_at,source_document_url\n' +
    '2025-06-23,95933,VND/kg,,2025-06-30T10:00:00Z,https://example.com/fixture/week25\n' +
    '2025-06-25,93733,VND/kg,2025-06-30T09:00:00Z,2025-06-30T10:00:00Z,https://example.com/fixture/week25\n' +
    '2025-06-26,-1,VND/kg,,2025-06-30T10:00:00Z,https://example.com/fixture/week25\n';
  await page.getByLabel('Tệp giá CSV').setInputFiles({name: 'synthetic.csv', mimeType: 'text/csv', buffer: Buffer.from(csv)});
  await page.getByRole('button', {name: 'Nhập tệp'}).click();
  await expect(page.getByTestId('import-counts')).toContainText('Hợp lệ: 2');
  await expect(page.getByTestId('import-counts')).toContainText('Lỗi: 1');
  await page.getByLabel('Từ ngày').fill('2025-06-23');
  await page.getByLabel('Đến ngày').fill('2025-06-25');
  await page.getByRole('button', {name: 'Xem lịch sử'}).click();
  await expect(page.getByRole('table', {name: 'Giá theo ngày'}).getByRole('row')).toHaveCount(4);
  await expect(page.getByRole('row').filter({hasText: '2025-06-24'})).toContainText('Thiếu giá');
  await expect(page.getByText('Dữ liệu thử nghiệm — không phải giá thị trường.', {exact:true})).toBeVisible();
  await expect(page.getByRole('img', {name: 'Biểu đồ giá quan sát; khoảng thiếu không được nối'})).toBeVisible();
  await page.getByRole('button', {name: 'Nhập tệp'}).click();
  await expect(page.getByTestId('import-counts')).toContainText('Trùng: 2');
  const download = page.waitForEvent('download');
  await page.getByRole('link', {name: 'Tải bản gốc'}).click();
  expect((await download).suggestedFilename()).toMatch(/^import-\d+\.csv$/);
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/price-history-mobile-web.png',fullPage:true});
});
