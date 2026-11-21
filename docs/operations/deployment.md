# Vận hành và bàn giao cục bộ — #15

## Trạng thái bàn giao

Người dùng xác nhận chưa có nơi triển khai web HTTPS và chưa có môi trường iOS, tiếp tục hoàn thiện phần mềm/bằng chứng cục bộ. Các cấu hình triển khai dưới đây là template đã chuẩn bị, không phải web đã công khai. Spec #1 và các gate chưa đủ bằng chứng vẫn mở. Ma trận tại [acceptance-matrix.md](acceptance-matrix.md).

## Kiểm chứng thực đã chạy

Thực hiện ngày 20/11/2026, tổng hợp ngày 21/11 theo UTC+7; Windows 11 build 26200, PostgreSQL 18 test riêng `127.0.0.1:55433/agtech_test`:

- Uvicorn HTTPS trên loopback với chứng thư SAN localhost, client xác minh chứng thư bằng CA test riêng; không tắt TLS verification, không cài trust root hệ thống.
- API không đăng nhập trả 401; đăng nhập cookie có HttpOnly/Secure trong production; logout thu hồi bearer; production từ chối nạp fixture tham khảo.
- Nhập 365 quan sát tự tạo; `pg_dump` custom của schema riêng, tạo database mới, `pg_restore --exit-on-error`; đăng nhập vào ứng dụng dùng bản phục hồi, lịch sử và toàn bộ bytes CSV gốc khớp.
- Backup SHA-256: `738dc43cda66c754b37f4445fbf45e188e38da22f6ef24dd2d1e1c22b1a9d2d8`.
- API history HTTPS: một người dùng, 365 ngày, 20 request tuần tự; p50 **32.38 ms**, p95 **33.64 ms**. Ngân sách kỹ thuật cục bộ khai báo trước phép đo: p95 ≤ 1.000 ms, đạt. Không suy ra tải đồng thời hoặc SLO production.
- Dashboard Edge + Next dev, một người dùng, 365 quan sát, ba lượt tải history sau warm-up: **1.396 / 1.202 / 1.037 ms**, đạt ngân sách cục bộ tối đa 5.000 ms mỗi lượt. Không đại diện tốc độ cold load hoặc thiết bị di động.

Bằng chứng chi tiết ở `data/operations/ops_b63f9c143527449fb158d9f49b820641/report.json`, backup/cert/log cùng thư mục (gitignored). Dashboard có attachment `dashboard-latency.json` từ Playwright `operations.spec.ts`. Không đưa backup hoặc khóa TLS vào Git; backup drill chứa tài khoản/hash và dữ liệu synthetic.

Chạy lại trên cụm test riêng đang hoạt động:

```powershell
$env:TEST_DATABASE_URL='postgresql+psycopg://agtech@127.0.0.1:55433/agtech_test'
python scripts/verify_operations.py
$env:PLAYWRIGHT_CHANNEL='msedge'
python scripts/run_web_e2e.py -- operations.spec.ts
```

Script chỉ chấp nhận DB loopback tên kết thúc `_test`, tạo schema và database phục hồi có UUID riêng, chỉ dọn tài nguyên đã tạo. Không dùng URL này cho production. Linux truyền `--pg-bin` và `--openssl` tương ứng. Script không in mật khẩu/URL kết nối đầy đủ.

## Template triển khai HTTPS

`deploy/compose.production.yml` gồm PostgreSQL có volume, backend migration, Next web, Caddy TLS. Chỉ Caddy publish 80/443. Web cookie đi qua proxy `/api`; app dùng `https://<domain>/backend`. Trong môi trường bí mật riêng cấu hình `AGTECH_DOMAIN`, `POSTGRES_PASSWORD`, `DATABASE_URL` (host `postgres`, password URL-encoded). Template không chứa tài khoản mặc định.

1. Chuẩn bị host/DNS/chứng thư và secret store của môi trường; chốt chính sách truy cập và rate limit tại ingress trước công khai.
2. Kiểm tra cấu hình bằng `docker compose -f deploy/compose.production.yml config --quiet`; không in bản render có secret vào log công khai.
3. Sao lưu trước nâng cấp. Chạy `docker compose -f deploy/compose.production.yml up -d --build` trên host đích.
4. Tạo admin đầu tiên bằng prompt kín: `docker compose -f deploy/compose.production.yml exec backend python -m src.manage create-admin --username <admin>`.
5. Kiểm tra HTTPS, cookie Secure, phân quyền observer/admin, restart, volume và backup/restore tại chính môi trường đó. Chưa làm các bước này trên host công khai vì chưa có môi trường.

Worker hiện phục vụ connector fixture. Không tự bật nguồn thật hoặc huấn luyện chính thức. Chỉ bật sau khi quyền sử dụng/hợp đồng nguồn và tiêu chí dữ liệu/model đã qua gate.

## Sao lưu, phục hồi và rollback trên môi trường đích

Với PostgreSQL cùng major version, dùng `pg_dump --format=custom --no-owner` qua biến môi trường hoặc secret file được bảo vệ. Lưu backup có kiểm soát truy cập, mã hóa tại nơi lưu; chốt retention/RPO/RTO với chủ môi trường. Chưa có RPO/RTO production đã nghiệm thu.

Phục hồi vào database **mới**, dùng `pg_restore --exit-on-error --no-owner`, kiểm tra đăng nhập, số liệu/ngày thiếu, bản thô/hash, lịch sử model/quy tắc và dữ liệu cá nhân qua API. Chỉ chuyển URL khi kiểm tra đạt. Giữ database cũ để rollback. Tránh downgrade migration xóa bảng chứa audit/lịch sử; rollback code cần kiểm tra tương thích schema. Không xóa volume để xử lý lỗi khởi động.

Theo dõi `/health` (process health, không chứng minh DB), đăng nhập/API đọc có xác thực, task status/error/lease, log reverse proxy/backend và dung lượng backup. Tác vụ lỗi cần nguyên nhân và retry có kiểm soát. Chỉ coi phục hồi đạt sau đối chiếu nội dung, không chỉ exit code công cụ.
