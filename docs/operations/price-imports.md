# Nhập CSV và lịch sử giá (#7)

Đây là chức năng phần mềm; không chứng minh quyền dùng nguồn, khả năng cập nhật hằng ngày hoặc chất lượng AI. Mẫu cà phê G0 vẫn no-go. Không có dữ liệu giá tự nạp, nguồn được cấp quyền mặc định hoặc ngưỡng AI.

## Luồng sử dụng

Quản trị đăng nhập web, tạo chuỗi có mặt hàng, mã/tên địa bàn theo nguồn, chất lượng, nguồn và liên kết. Chuỗi là bất biến để tránh thay metadata rồi làm đổi nghĩa lịch sử. `synthetic` là dữ liệu tự tạo kiểm thử; `authorized` chỉ dành cho nguồn mà người quản trị đã có căn cứ quyền thu thập/lưu/hiển thị, ghi căn cứ trong `rights_basis`. Nhãn này là quyết định được nhập có trách nhiệm, không phải hệ thống xác minh pháp lý hay cho phép dùng AgroInfo/Giacaphe. Khi chưa có căn cứ, không nhập dữ liệu thật. Việc kích hoạt collector theo lịch có gate riêng ở #8.

Tải mẫu CSV, điền giá không có dấu phân cách nghìn (ví dụ `95933`, không phải `95.933`). Giá dương tối đa hai chữ số thập phân; đơn vị đúng `VND/kg`. Mỗi lần nhập tối đa 2.000.000 byte UTF-8, có thể có BOM. Đây là giới hạn tài nguyên nhập, không phải ngưỡng dữ liệu/AI.

```csv
observed_on,price_vnd_per_kg,unit,published_at,collected_at,source_document_url
2025-06-23,95933,VND/kg,,2025-06-30T10:00:00Z,https://example.com/synthetic/week25
```

Dòng minh họa là **synthetic**, không phải giá thị trường hay số liệu cấp quyền. Header giữ đúng thứ tự. `observed_on` là ngày quan sát. `published_at` không biết thì để trống; không mặc định bằng ngày quan sát. `collected_at` bắt buộc timezone và không ở tương lai; ngày quan sát không sau ngày thu thập theo Asia/Ho_Chi_Minh; công bố không sau thu thập. Mốc nhập do server ghi riêng. Không suy thời điểm công bố từ tên tài liệu.

## Kết quả và truy vết

Mỗi lần nhập giữ nguyên byte gốc, SHA-256, tên tệp, thời điểm nhập, tài khoản và báo cáo từng bản ghi. File sai UTF-8/header cũng có báo cáo lỗi và giữ bản gốc; file vượt giới hạn bị từ chối trước xử lý. Dòng hợp lệ được lưu, lỗi bị cách ly. Với cùng chuỗi/ngày: cùng giá, thời điểm công bố và tài liệu nguồn là trùng; khác các giá trị đó là xung đột. Mốc thu thập mới không biến cùng quan sát thành quan sát khác. Xung đột không ghi đè giá cũ, không lấy bình quân; đề xuất mới còn trong tệp/báo cáo để người quản trị đối chiếu. Không có đường sửa/xóa lịch sử âm thầm. Cơ chế duyệt sửa dữ liệu không thuộc lát cắt này.

Mỗi lần retry có audit riêng nhưng không tạo lại quan sát. Khóa hàng chuỗi và unique constraint chuỗi/ngày bảo vệ cả lần nhập đồng thời. Báo cáo và bản gốc chỉ admin được đọc. Cán bộ đọc danh sách chuỗi và lịch sử đã chuẩn hóa sau đăng nhập.

Dashboard chọn một chuỗi tại một thời điểm, không trộn địa bàn/chất lượng/nguồn. Khoảng lọc tối đa 366 ngày lịch, có bảng và biểu đồ. Ngày thiếu giữ `null`, không điền giá và không nối đường qua khoảng thiếu. Nguồn, ngày quan sát, thời điểm công bố/thu thập và lần nhập được giữ riêng. Timestamp hiển thị theo Asia/Ho_Chi_Minh. Dữ liệu thử nghiệm luôn có nhãn rõ.

## Migration và kiểm thử

Chạy `python -m alembic upgrade head`: migration `0002` thêm price_series, price_imports, price_observations. Downgrade xóa ba bảng và dữ liệu của chúng; sao lưu trước rollback nếu đã nhập dữ liệu cần giữ. Migration không cấp quyền nguồn và không nạp giá mẫu.

```powershell
$env:TEST_DATABASE_URL='postgresql+psycopg://agtech@127.0.0.1:55433/agtech_test'
python -m pytest
python -m ruff check src tests migrations scripts
cd web
npm run typecheck
npm run build
cd ..
$env:PLAYWRIGHT_CHANNEL='msedge'
python scripts/run_web_e2e.py
```

Database trên chỉ dùng test; mỗi ca có schema ngẫu nhiên. Các ca API dùng fixture synthetic để kiểm import/audit, ngày thiếu, đơn vị/ngày/giá sai, timestamp, trùng/xung đột, retry, quyền và tách chuỗi. E2E kiểm luồng nhập và lịch sử qua web; màn hình nhỏ không phải bằng chứng mobile native.
