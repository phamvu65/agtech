import { execFileSync } from 'node:child_process';
import { test, expect } from '@playwright/test';

test('admin runs fixture jobs and sees blocked real sources with durable execution audit', async ({page}) => {
  await page.goto('/');
  await page.getByLabel('Tên đăng nhập', {exact:true}).fill('admin-e2e');
  await page.getByLabel('Mật khẩu', {exact:true}).fill(process.env.E2E_PASSWORD!);
  await page.getByRole('button', {name:'Đăng nhập →'}).click();
  await expect(page.getByRole('heading', {name:'Thu thập theo lịch'})).toBeVisible();
  const created = await page.request.post('/api/admin/price-series', {headers:{Origin:'http://localhost:3001'}, data:{
    commodity:'Cà phê tác vụ fixture', locality_code:'TEST-JOBS', locality_name:'Địa bàn tác vụ', quality:'unspecified',
    source_name:'HTTP fixture tự tạo', source_url:'https://example.com/collector-fixture', dataset_kind:'synthetic',
    rights_basis:'Fixture tự tạo để kiểm thử tác vụ; không phải nguồn giá thật'}});
  expect(created.status()).toBe(201);
  const series = await created.json();
  await page.getByRole('button', {name:'Tải lại tác vụ'}).click();
  await page.getByLabel('Chuỗi cho nguồn thu thập').selectOption(String(series.id));
  await page.getByRole('button', {name:'Đăng ký nguồn thu thập'}).click();
  const source = page.getByTestId('collector-source').filter({hasText:'Địa bàn tác vụ'});
  await expect(source).toContainText('Chỉ fixture');
  await source.getByRole('button', {name:'Chạy ngay'}).click();
  await expect(page.getByTestId('collector-job').first()).toContainText('Đã xếp hàng');
  execFileSync(process.env.PYTHON_EXECUTABLE!, ['-m', 'src.worker', '--once'], {cwd:'..', env:process.env, timeout:60000});
  await page.getByRole('button', {name:'Tải lại tác vụ'}).click();
  await expect(page.getByTestId('collector-job').first()).toContainText('Thành công');
  await expect(page.getByTestId('collector-job').first()).toContainText('Hợp lệ: 2');
  await page.getByTestId('collector-job').first().getByRole('button', {name:'Chi tiết'}).click();
  await expect(page.getByRole('link', {name:'Tải phản hồi gốc'})).toBeVisible();
  const second = await page.request.post('/api/admin/price-series', {headers:{Origin:'http://localhost:3001'}, data:{
    commodity:'Cà phê nguồn chưa duyệt', locality_code:'TEST-BLOCKED', locality_name:'Địa bàn bị chặn', quality:'unspecified',
    source_name:'Nguồn chưa duyệt', source_url:'https://example.com/not-approved', dataset_kind:'authorized',
    rights_basis:'Khai báo nhập thủ công không đồng nghĩa duyệt thu thập tự động'}});
  expect(second.status()).toBe(201);
  await page.getByRole('button', {name:'Tải lại tác vụ'}).click();
  await page.getByLabel('Chuỗi cho nguồn thu thập').selectOption(String((await second.json()).id));
  await page.getByLabel('Loại nguồn thu thập').selectOption('external');
  await page.getByRole('button', {name:'Đăng ký nguồn thu thập'}).click();
  const blocked = page.getByTestId('collector-source').filter({hasText:'Địa bàn bị chặn'});
  await expect(blocked).toContainText('Bị chặn');
  await expect(blocked.getByRole('button', {name:'Bật lịch'})).toBeDisabled();
  await blocked.getByRole('button', {name:'Chạy ngay'}).click();
  await expect(page.getByTestId('collector-job').first()).toContainText('Bị chặn');
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/collector-jobs-mobile-web.png', fullPage:true});
});
