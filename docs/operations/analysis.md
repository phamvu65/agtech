# Snapshot, dự báo và rủi ro — #10–#13

## Phạm vi hiện có

Quản trị mở **Phòng kiểm chứng phân tích** trên web. Tạo snapshot chuỗi synthetic, nhập ba mốc train/validation/test theo UTC rồi chạy backtest fixture. Snapshot chứa giá, nguồn, thời điểm công bố/thu thập/khả dụng và hash SHA-256; nhập thêm giá không sửa snapshot hoặc kết quả cũ.

Baseline giữ giá quan sát khả dụng gần nhất tại mỗi origin. Candidate `linear_time_v1` được fit một lần trên train rồi đóng băng. Chỉ dùng quan sát đã khả dụng tại origin; target h=1…7 không vượt ranh giới split. Báo cáo riêng validation/test có MAE model/baseline trên cùng target, mẫu thực, mẫu kỳ vọng, coverage và ngày thiếu. Đây là phép kiểm tra hành vi bằng dữ liệu tự tạo, **không phải bằng chứng chất lượng AI**.

Tạo dự báo từ backtest fixture hoặc nhập rõ bảy giá tự tạo để kiểm tra luồng rủi ro/thông báo. Ngày dự báo là bảy ngày lịch UTC kế tiếp mốc as-of; giao diện ghi rõ quy ước này. API lưu lineage, artifact, phiên bản, mốc dữ liệu và lý do chưa đủ cơ sở. Không công bố xác suất tin cậy. Dự báo chính thức luôn bị chặn khi chưa có gate dữ liệu và tiêu chí model được kiểm chứng.

## Cấu hình thử nghiệm tường minh

T1, T2, tuổi dữ liệu tối đa và ngưỡng bất thường không có giá trị vận hành mặc định. Người kiểm tra nhập từng giá trị với tên phiên bản fixture; T1 < T2. Cấu hình được lưu bất biến kèm hash. Ngưỡng trong test (5%, 10%...) chỉ là ví dụ số học để kiểm tra biên.

Mức giảm = max(0, (P0 − min(F1…F7)) / P0 × 100). LOW dưới T1; MEDIUM từ T1 đến dưới T2; HIGH từ T2. Thiếu/già dữ liệu, thiếu bảy dự báo hoặc model chưa đạt → chưa đủ cơ sở, không phải LOW. Cờ bất thường từ biến động quan sát riêng, không tự tạo HIGH.

**Chấm cảnh báo fixture** lưu confusion matrix, false alarm/miss theo T1, coverage và ngày báo trước của model đóng băng. Chỉ chấm origin có đủ bảy target quan sát trong split. Thiếu một ngày cũng không coi min của sáu ngày là min cả kỳ. Báo cáo ghi gate đánh giá chính thức chưa đạt; không dùng để chọn ngưỡng sản xuất.

## Theo dõi và hộp thư riêng

Web/mobile dùng `/me/followings` và `/me/notifications`. Lần đầu LOW không báo; lần đầu MEDIUM/HIGH báo; đổi mức lên/xuống báo; HIGH giữ nguyên không lặp. Key đánh giá và unique notification ngăn retry trùng. Đánh dấu đọc là thao tác được máy chủ xác nhận, có phân quyền chủ sở hữu.

Sau trạng thái chưa đủ cơ sở, chính sách khôi phục mặc định fixture `pending` giữ quyết định chờ kiểm chứng. Chỉ fixture được chọn tường minh `compare_last_valid` mới so với mức hợp lệ trước đó. Không coi lựa chọn thử nghiệm là chính sách nghiệp vụ đã nghiệm thu. Đánh giá lịch sử không phát lại thông báo cho hiện tại.

## Lệnh kiểm chứng

```powershell
$env:TEST_DATABASE_URL='postgresql+psycopg://agtech@127.0.0.1:55433/agtech_test'
.venv/Scripts/python.exe -m pytest tests/test_analysis.py tests/test_forecasts.py tests/test_risk.py tests/test_personal.py -q
$env:PLAYWRIGHT_CHANNEL='msedge'
.venv/Scripts/python.exe scripts/run_web_e2e.py -- analysis.spec.ts
```

Chín ca API đã đạt trên PostgreSQL test riêng. Hành trình web tích hợp đã đạt trước bổ sung diagnostics; chạy lại toàn bộ khi bàn giao. Nghiệm thu nguồn thật, đóng băng tiêu chí trước test chính thức và quy tắc khôi phục vẫn còn mở tại #10–#13.
