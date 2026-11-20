# AGTECH-01 — Bản tổng hợp để xác nhận phạm vi

Trạng thái: phạm vi Q1–Q29 đã được người dùng xác nhận; đã cho phép soạn bộ tài liệu. Đây là bản ghi phạm vi, không phải bằng chứng triển khai hoàn tất.

MVP gồm web và app Android/iOS, dùng chung backend FastAPI và dữ liệu. Triển khai backend và web trước, rồi kết nối app.

## 1. Mục tiêu

Xây dựng nền tảng tập trung dữ liệu thị trường nông sản, dự báo giá và cảnh báo để cán bộ hợp tác xã tham khảo khi lập kế hoạch tiêu thụ. Người dùng tự quyết định bán; hệ thống không đưa ra cam kết về giá tương lai.

Thực hiện cá nhân, thời gian linh hoạt, không có công nghệ bắt buộc. Chưa có mẫu báo cáo hoặc tiêu chí chấm của trường.

## 2. Phạm vi thị trường và dữ liệu

- Một mặt hàng, ưu tiên cà phê; chỉ chốt sau khi kiểm chứng dữ liệu.
- Giá thu mua cà phê nhân trong nước, VNĐ/kg; phân biệt chất lượng khi nguồn có thông tin.
- Một tỉnh hoặc vùng giá; địa bàn cụ thể được chọn sau khảo sát. Chưa so sánh nhiều địa bàn trong MVP.
- Thu thập ba nhóm: giá trong nước, giá quốc tế, thời tiết. Mô hình MVP chỉ bắt buộc sử dụng lịch sử giá; biến bổ sung chỉ đưa vào khi đánh giá cho thấy hữu ích.
- Thu thập theo lịch khi nguồn hỗ trợ; có nhập tệp theo mẫu để khởi tạo hoặc bổ sung lịch sử. Cả hai đường kiểm tra định dạng, trùng lặp và lưu nguồn.
- Nhập tệp không được xem là thu thập tự động. Nguồn được nhắc trong đề chưa mặc nhiên có lịch sử, quyền sử dụng hoặc giao diện truy cập đáp ứng yêu cầu.

## 3. Dự báo và đánh giá

- Dự báo từng ngày trong bảy ngày lịch tới, cập nhật hằng ngày khi có dữ liệu mới.
- Ngày thiếu giá quan sát được đánh dấu rõ; chỉ tính sai số trên ngày có quan sát thật.
- Đánh giá theo thứ tự thời gian, so sánh với dự báo giữ nguyên giá quan sát gần nhất.
- MAE là chỉ số chính; báo cáo sai số theo từng ngày dự báo.
- Chỉ dùng mô hình trong cảnh báo khi cải thiện so với baseline trên dữ liệu kiểm thử. Mức cải thiện yêu cầu được chốt sau khảo sát, trước đánh giá chính thức.
- Khi dữ liệu thiếu, quá cũ hoặc mô hình chưa qua đánh giá: vẫn xem được lịch sử kèm nguồn và ngày cập nhật; phần dự báo/cảnh báo hiển thị chưa đủ cơ sở, không gán LOW thay thế.

## 4. Rủi ro, bất thường và thông báo

- LOW/MEDIUM/HIGH phân loại rủi ro giá giảm, dựa trên giá dự báo thấp nhất trong kỳ so với giá quan sát mới nhất. Đây không phải xác suất giảm giá.
- Ngưỡng phân loại sẽ được kiểm tra trên lịch sử; chưa tự đặt số trong bản phạm vi.
- Bất thường giá quan sát được đánh dấu trên dashboard, kèm nguồn và ngày để kiểm tra. Không tự đồng nhất bất thường với rủi ro HIGH; MVP chưa gửi thông báo bất thường riêng.
- Lưu kết quả của mọi lần đánh giá rủi ro; thông báo mới khi mức rủi ro thay đổi. Lần đánh giá hợp lệ đầu tiên chỉ thông báo nếu MEDIUM/HIGH.
- HIGH không đổi nhiều ngày không tạo lại cùng thông báo mỗi ngày. Chưa đủ cơ sở là trạng thái riêng.
- Kênh MVP: thông báo và lịch sử trên web và trong app khi người dùng mở app. Thông báo đẩy khi app đóng để giai đoạn sau.

## 5. Chức năng và vai trò

- Cán bộ hợp tác xã: đăng nhập; xem dashboard giá, dự báo, bất thường và rủi ro; quản lý theo dõi cá nhân; xem thông báo và lịch sử.
- Quản trị viên: quản lý tài khoản và nguồn; kiểm tra dữ liệu lỗi; nhập tệp; theo dõi các lần chạy thu thập/dự báo.
- Dữ liệu thị trường dùng chung. Chưa quản lý kho hàng, giao dịch hoặc dữ liệu nội bộ riêng của nhiều hợp tác xã.
- Web có đầy đủ chức năng người dùng và quản trị. App dành cho cán bộ hợp tác xã; quản trị và nhập dữ liệu chỉ thực hiện trên web.
- MVP cần kết nối mạng: mất kết nối thì báo lỗi và cho thử lại, chưa có chế độ offline. Dữ liệu còn trên màn hình phải có thời điểm cập nhật và không được trình bày như dự báo mới.
- Bàn giao bản Android/iOS chạy được cùng bằng chứng kiểm thử trên cả hai nền tảng; chưa bắt buộc phát hành công khai lên store. Kế hoạch phải kiểm chứng điều kiện thiết bị, công cụ build và tài khoản phân phối cần thiết.

## 6. Hướng công nghệ

Next.js cho giao diện web, Python/FastAPI cho backend dùng chung và các tác vụ AI, PostgreSQL cho lưu trữ. Không dùng Spring Boot. Công nghệ app chưa chốt; tài liệu thiết kế sẽ đưa phương án đề xuất, ghi rõ trạng thái này.

Lựa chọn thuật toán, thư viện tác vụ, cơ chế xác thực, công cụ triển khai và cấu trúc lưu trữ chi tiết sẽ được ghi là đề xuất thiết kế nếu chưa có quyết định riêng. Không mặc nhiên triển khai các đề xuất đó trong giai đoạn lập tài liệu.

## 7. Ngoài MVP

Dự báo sản lượng, SHAP, bản đồ, Kafka, email/SMS, push notification, chế độ offline và so sánh nhiều địa bàn. Phát hành công khai lên Google Play/App Store là giai đoạn riêng. Chưa có yêu cầu dùng TimescaleDB.

## 8. Bước kiểm chứng bắt buộc

Trước huấn luyện chính thức, kiểm chứng quyền sử dụng nguồn, số quan sát và khoảng trống lịch sử, tính nhất quán địa bàn/chất lượng, thời điểm công bố và khả năng thu thập.

Sau bước này mới chốt địa bàn, ngưỡng dữ liệu quá cũ, ngưỡng rủi ro và mức cải thiện mô hình cần đạt. Nếu dữ liệu không đủ, trình phương án điều chỉnh trước khi thay mặt hàng hoặc kỳ dự báo. Không dùng dữ liệu giả để chứng minh chất lượng dự báo thực tế.

Khảo sát sơ bộ đã tìm được bảng giá ngày trong một số PDF AgroInfo; chưa xác nhận độ liên tục hoặc đủ dữ liệu huấn luyện. Chi tiết nguồn được ghi trong QUYET-DINH.md.

## 9. Bộ tài liệu sẽ soạn sau xác nhận

1. Bài toán và phạm vi.
2. Đặc tả yêu cầu và tiêu chí nghiệm thu.
3. Kế hoạch dữ liệu và đánh giá AI.
4. Thiết kế hệ thống.
5. Kế hoạch triển khai theo giai đoạn.

Toàn bộ bằng tiếng Việt, dạng Markdown, kèm GLOSSARY.md và QUYET-DINH.md. Các điểm phụ thuộc khảo sát được ghi rõ điều kiện chốt và bước kiểm chứng; không được trình bày như kết quả đã đạt.
