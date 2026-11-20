# Tác vụ thu thập với fixture (#8)

Phần mềm hiện chạy bằng **fixture tự tạo qua HTTP MockTransport nội bộ**. Không mở kết nối mạng tới website nguồn giá. Nguồn thật luôn `blocked`; khai báo `authorized`/`rights_basis` ở luồng nhập tay #7 không cấp quyền chạy collector. Fixture chỉ ghi vào chuỗi `synthetic` và bị chặn trong `APP_ENV=production`. Không có ngưỡng AI hoặc kết luận chất lượng dự báo.

## Chạy

Sau `python -m alembic upgrade head`, khởi động backend/web như hướng dẫn xác thực. Quản trị tạo chuỗi synthetic ở phần nhập giá, tải lại phần **Thu thập theo lịch**, đăng ký nguồn Fixture CSV nội bộ. Cấu hình là bất biến, mỗi chuỗi một nguồn; các ca fixture gồm giá hợp lệ, HTTP 503 và giá lỗi để kiểm trạng thái thất bại.

```powershell
# Worker một vòng hữu hạn: phục hồi lease hết hạn, lên lịch, xử lý tối đa 20 tác vụ.
python -m src.worker --once
# Worker chạy riêng với API; poll mặc định 5 giây, có thể đặt 1–60 giây.
python -m src.worker --poll-seconds 5
```

Worker cần DATABASE_URL cùng database/schema backend; không có API công khai để bật tiến trình worker từ trình duyệt. Nút Chạy ngay chỉ xếp hàng; chỉ khi worker xác nhận mới hiển thị kết quả. Giao diện có tải lại, phân trang, chi tiết các mốc, sự kiện, lỗi, số dòng và tải phản hồi gốc/CSV chuẩn hóa.

Lịch mặc định tắt. Bật lịch đặt lần đến hạn đầu tiên là thời điểm lưu cấu hình; chu kỳ cho phép 60–604800 giây (giới hạn vận hành, không phải ngưỡng dữ liệu/AI). Mỗi lần đã xếp lịch, lần kế tiếp tính từ thời điểm scheduler kiểm tra cộng chu kỳ; bỏ qua các mốc đã lỡ thay vì tạo hàng loạt tác vụ bù. Tắt lịch không hủy tác vụ đã xếp hàng. Source gate được kiểm cả khi xếp hàng và trước HTTP; nếu môi trường mới chặn nguồn, worker giữ kết quả blocked và không gọi connector.

## Trạng thái và retry

- `queued`: đã lưu vào PostgreSQL, chưa thu thập thành công.
- `running`: worker giữ quyền xử lý có hạn 120 giây.
- `succeeded`: HTTP 200 và không có dòng lỗi/xung đột. Chỉ các dòng trùng vẫn là chạy lại thành công, không thêm quan sát.
- `failed`: HTTP lỗi, lỗi transport/CSV hoặc có dòng lỗi/xung đột. Nếu CSV có cả dòng hợp lệ và lỗi, giữ các dòng hợp lệ với audit nhưng toàn tác vụ vẫn failed; không che lỗi nguồn.
- `blocked`: nguồn thật/chưa qua gate, fixture gắn nhầm chuỗi hoặc production; không lấy dữ liệu.
- `interrupted`: lease hết hạn do worker bị ngắt; cần retry rõ ràng hoặc lần lịch kế tiếp.

Retry tạo tác vụ mới có retry_of; chỉ nhận tác vụ failed/interrupted cùng nguồn. Không đổi lịch sử tác vụ cũ. Mỗi nguồn tối đa một queued/running bằng unique index PostgreSQL và khóa cấu hình khi xếp hàng. Nhiều worker dùng SKIP LOCKED; không giữ lock database trong lúc HTTP. Token lease kiểm lại trước ghi, ngăn worker cũ ghi đè sau phục hồi. Audit nhập và trạng thái kết thúc được commit trong cùng giao dịch; nếu database lỗi, giao dịch rollback, tiến trình có thể cần khởi động lại và lease được phục hồi ở vòng tiếp theo. Lỗi nguồn đã biết không làm dừng các tác vụ khác.

HTTP fixture trả CSV với thời điểm công bố theo từng dòng. Worker ghi thời điểm nhận HTTP thực vào fetched_at và collected_at chuẩn hóa, không tin mốc collected_at do nguồn khai báo. Published_at chưa biết vẫn rỗng; không suy từ Last-Modified/ngày quan sát. Phản hồi HTTP gốc, byte/hash, mã HTTP, thời điểm nhận, sự kiện và import_id được giữ; CSV chuẩn hóa có audit riêng. Tác vụ theo lịch ghi tài khoản đã đăng ký nguồn là người chịu trách nhiệm, đồng thời trigger=scheduled để phân biệt hành động hệ thống với bấm chạy thủ công.

## Kiểm chứng và giới hạn

```powershell
$env:TEST_DATABASE_URL='postgresql+psycopg://agtech@127.0.0.1:55433/agtech_test'
python -m pytest tests/test_collectors.py
python -m ruff check src tests migrations scripts
$env:PLAYWRIGHT_CHANNEL='msedge'
python scripts/run_web_e2e.py -- collectors.spec.ts
```

Test qua API/worker CLI với PostgreSQL thật và fixture HTTP, bao phủ gate, raw/audit, retry/chạy chồng, lỗi nguồn, phân quyền và lease bị ngắt. Fixture chứng minh hành vi phần mềm; không chứng minh điều khoản, SLA, schema hay khả năng cập nhật của nguồn thật. Migration 0003 chỉ thêm cấu hình/tác vụ, không nạp nguồn, bật lịch hoặc cấp quyền mặc định. Downgrade xóa hai bảng tác vụ, giữ các import/quan sát đã nhập; sao lưu nếu cần giữ audit tác vụ.

Ticket #8 còn mở cho kiểm chứng connector với nguồn thật khi có quyền dùng và hợp đồng dữ liệu. Các ticket phụ thuộc dữ liệu/AI không được coi là thông qua gate bởi các kết quả fixture này.
