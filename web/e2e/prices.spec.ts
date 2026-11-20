import { readFile } from 'node:fs/promises';
import { test, expect, type Page } from '@playwright/test';

async function loginWithSeries(page: Page, code: string) {
  await page.goto('/');
  await page.getByLabel('Tên đăng nhập', {exact:true}).fill('admin-e2e');
  await page.getByLabel('Mật khẩu', {exact:true}).fill(process.env.E2E_PASSWORD!);
  await page.getByRole('button', {name:'Đăng nhập →'}).click();
  await expect(page.getByRole('heading', {name:'Lịch sử giá'})).toBeVisible();
  const created = await page.request.post('/api/admin/price-series', {headers:{Origin:'http://localhost:3001'}, data:{
    commodity:'Cà phê fixture', locality_code:code, locality_name:code, quality:'unspecified',
    source_name:'Fixture tự tạo', source_url:'https://example.com/fixture', dataset_kind:'synthetic',
    rights_basis:'Tự tạo kiểm thử phần mềm, không phải giá thật'}});
  expect(created.status()).toBe(201);
  const series = await created.json(); await page.reload();
  await expect(page.getByLabel('Chuỗi giá đang xem')).toContainText(code);
  await page.getByLabel('Chuỗi giá đang xem').selectOption(String(series.id));
}

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


test('download preserves even invalid UTF-8 original CSV bytes through the web proxy', async ({page}) => {
  await loginWithSeries(page, 'TEST-BINARY');
  const original = Buffer.from([0xff, 0xfe, 0x00]);
  await page.getByLabel('Tệp giá CSV').setInputFiles({name:'invalid.csv', mimeType:'text/csv', buffer:original});
  await page.getByRole('button', {name:'Nhập tệp'}).click();
  await expect(page.getByTestId('import-counts')).toContainText('Lỗi: 1');
  const downloading = page.waitForEvent('download');
  await page.getByRole('link', {name:'Tải bản gốc'}).click();
  const file = await downloading;
  expect(await readFile((await file.path())!)).toEqual(original);
});

test('changing series during a delayed history request does not leave filtering disabled', async ({page}) => {
  await loginWithSeries(page, 'TEST-SWITCH');
  const created = await page.request.post('/api/admin/price-series', {headers:{Origin:'http://localhost:3001'}, data:{
    commodity:'Cà phê thử race', locality_code:'TEST-RACE', locality_name:'Địa bàn race', quality:'unspecified',
    source_name:'Fixture tự tạo', source_url:'https://example.com/race', dataset_kind:'synthetic',
    rights_basis:'Tự tạo kiểm thử phần mềm, không phải giá thật'}});
  expect(created.status()).toBe(201);
  const second = await created.json();
  await page.reload();
  await expect(page.getByLabel('Chuỗi giá đang xem')).toContainText('Địa bàn race');
  let release!: () => void;
  const gate = new Promise<void>(resolve => {release = resolve;});
  let requestStarted!: () => void;
  const started = new Promise<void>(resolve => {requestStarted = resolve;});
  let first = true;
  await page.route('**/api/price-series/*/history?*', async route => {
    const response = await route.fetch();
    if (first) {first = false; requestStarted(); await gate;}
    await route.fulfill({response});
  });
  await page.getByRole('button', {name:'Xem lịch sử'}).click();
  await started;
  await page.getByLabel('Chuỗi giá đang xem').selectOption(String(second.id));
  release();
  await expect(page.getByRole('button', {name:'Xem lịch sử'})).toBeEnabled();
  await page.getByRole('button', {name:'Xem lịch sử'}).click();
  await expect(page.getByRole('table', {name:'Giá theo ngày'})).toBeVisible();
});

test('editing dates invalidates an older pending history result', async ({page}) => {
  await loginWithSeries(page, 'TEST-DATES');
  let release!: () => void;
  const gate = new Promise<void>(resolve => {release = resolve;});
  let requestStarted!: () => void;
  const started = new Promise<void>(resolve => {requestStarted = resolve;});
  await page.route('**/api/price-series/*/history?*', async route => {
    const response = await route.fetch(); requestStarted(); await gate; await route.fulfill({response});
  });
  await page.getByRole('button', {name:'Xem lịch sử'}).click(); await started;
  await page.getByLabel('Từ ngày').fill('2025-06-23');
  const oldResponse = page.waitForResponse(response => response.url().includes('/history?'));
  release(); await oldResponse;
  await expect(page.getByRole('table', {name:'Giá theo ngày'})).toHaveCount(0);
  await expect(page.getByRole('button', {name:'Xem lịch sử'})).toBeEnabled();
});

test('upload holds filter inputs stable until the server confirms the result', async ({page}) => {
  await loginWithSeries(page, 'TEST-UPLOAD-FILTER');
  await page.getByLabel('Tệp giá CSV').setInputFiles({name:'invalid.csv', mimeType:'text/csv', buffer:Buffer.from('bad,header\n')});
  let release!: () => void;
  const gate = new Promise<void>(resolve => {release = resolve;});
  let requestStarted!: () => void;
  const started = new Promise<void>(resolve => {requestStarted = resolve;});
  await page.route('**/api/admin/price-series/*/imports?*', async route => {
    const response = await route.fetch(); requestStarted(); await gate; await route.fulfill({response});
  });
  await page.getByRole('button', {name:'Nhập tệp'}).click(); await started;
  try {
    await expect(page.getByLabel('Từ ngày')).toBeDisabled();
    await expect(page.getByLabel('Đến ngày')).toBeDisabled();
    await expect(page.getByRole('button', {name:'Xem lịch sử'})).toBeDisabled();
  } finally {release();}
  await expect(page.getByTestId('import-counts')).toContainText('Lỗi: 1');
  await expect(page.getByLabel('Từ ngày')).toBeEnabled();
});
