# Đăng nhập và tài khoản — lát cắt đầu tiên (#6)

| Thành phần | Đã triển khai |
|---|---|
| PostgreSQL | Migration users và user_sessions; token phiên chỉ lưu SHA-256 |
| Mật khẩu | Argon2; tài khoản mới tối thiểu 12 ký tự |
| Web Next.js | Đăng nhập, đăng xuất, cấp/khóa/mở tài khoản cán bộ |
| Cookie | HttpOnly, SameSite=Strict; Secure khi APP_ENV=production |
| Mobile API | transport=bearer trả token qua HTTPS để client lưu trong kho bảo mật |
| Phân quyền | API quản trị chỉ cho admin; cookie write yêu cầu Origin hợp lệ |
| Hết hiệu lực | Phiên hết hạn/đăng xuất hoặc tài khoản bị khóa mất quyền truy cập |

Không có tài khoản/mật khẩu mặc định. Lệnh tạo admin chỉ tạo tài khoản đầu tiên, không tự chạy khi server khởi động. Web chưa có giá/dự báo: hiển thị chưa đủ cơ sở, không lấy dữ liệu giả làm dữ liệu thật.

## Chạy cục bộ

1. Tạo database PostgreSQL riêng; đặt DATABASE_URL (driver postgresql+psycopg), APP_ENV và CORS_ORIGINS trong .env.
2. Cài requirements và chạy `python -m alembic upgrade head`.
3. Chạy `python -m src.manage create-admin --username <tên>`, nhập mật khẩu trong prompt kín. --password-stdin dành cho provisioning có kiểm soát/test; không truyền mật khẩu qua tham số lệnh.
4. Chạy `python -m uvicorn src.main:app --reload`.
5. Trong web: `npm ci`, `npm run dev`. API_BASE_URL mặc định http://127.0.0.1:8000; APP_ORIGIN mặc định http://localhost:3000. Backend CORS_ORIGINS phải chứa origin web thực tế.

Production dùng HTTPS, APP_ENV=production và origin cụ thể. Rate limiting đầu vào, secret management, HTTPS và đo tải phải hoàn tất trước phát hành; phiên bản này chưa được tuyên bố sẵn sàng chạy công khai.

## Docker

Compose có PostgreSQL và volume riêng. Đặt POSTGRES_PASSWORD và DATABASE_URL với host postgres cùng password tương ứng; không dùng localhost làm DB host bên trong container. Backend chạy migration trước Uvicorn. Web hiện chạy Node riêng.

Cluster data/test-postgres ở localhost:55432 trong phiên triển khai chỉ phục vụ test và bị gitignore. Trust authentication ở cluster này không phải cấu hình production; Compose dùng password riêng.

## Kiểm thử

- TEST_DATABASE_URL phải trỏ đến PostgreSQL **chỉ dùng cho test**, user được tạo schema. Mỗi test tạo schema ngẫu nhiên, migrate rồi xóa schema đó; không xóa database đang dùng.
- `python -m pytest` và `python -m ruff check src tests migrations scripts`.
- Trong web: `npm run typecheck`, `npm run build`.
- Cài browser Playwright bằng `npx playwright install chromium` hoặc đặt PLAYWRIGHT_CHANNEL=msedge nếu có Edge.
- Chạy `python scripts/run_web_e2e.py` tại root: tạo schema/admin tạm, chạy API/web cổng 8011/3001, kiểm tra đăng nhập/tạo/khóa/đăng xuất và web màn hình nhỏ.

Web màn hình nhỏ không phải bằng chứng app Android/iOS native. Chưa có iOS build/runtime acceptance.
