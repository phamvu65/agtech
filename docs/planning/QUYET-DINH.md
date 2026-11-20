# AGTECH-01 — Ghi nhận phạm vi và quyết định

Trạng thái: phạm vi Q1–Q29 đã được xác nhận; bộ tài liệu kế hoạch phiên bản 1.0 đã được soạn. Các đề xuất thiết kế và ngưỡng chờ kiểm chứng chưa được xem là kết quả thực nghiệm.

## Đã xác nhận

- Ranh giới kiểm thử cho spec: kiểm thử chính qua API/backend với database thử; bổ sung backtest AI theo thời gian và các hành trình web/Android/iOS. Tập trung hành vi quan sát được thay vì cấu trúc hàm nội bộ.

- Q27–Q29: thông báo và lịch sử trong app khi mở app, push để sau. Bàn giao bản Android/iOS chạy được và bằng chứng kiểm thử hai nền tảng; phát hành công khai lên store để giai đoạn riêng. MVP cần mạng, báo mất kết nối và cho thử lại; dữ liệu còn trên màn hình ghi rõ thời điểm cập nhật, chưa có chế độ offline.

- Bổ sung Q24–Q26: MVP bao gồm web và app di động Android/iOS, dùng chung backend FastAPI và dữ liệu. Triển khai backend và luồng web trước, sau đó kết nối app.
- Web có chức năng người dùng và quản trị. App phục vụ cán bộ hợp tác xã xem giá, dự báo, rủi ro, theo dõi và lịch sử thông báo. Quản trị và nhập dữ liệu chỉ trên web.

- Đầu ra: bộ tài liệu đồ án, bắt đầu bằng chốt bài toán và phạm vi MVP, sau đó đến đặc tả và kế hoạch triển khai.
- Người dùng chính: cán bộ hợp tác xã theo dõi thị trường để hỗ trợ lập kế hoạch tiêu thụ.
- Tình huống trọng tâm: xem diễn biến giá, dự báo và cảnh báo rủi ro trước khi tự quyết định kế hoạch tiêu thụ. Hệ thống không tự quyết định bán thay người dùng.
- MVP bắt đầu với một mặt hàng; ưu tiên khảo sát cà phê. Việc chốt cà phê phụ thuộc kết quả kiểm chứng dữ liệu.
- Loại giá mục tiêu: giá thu mua cà phê nhân trong nước, đơn vị VNĐ/kg; phân biệt chất lượng khi nguồn cung cấp thông tin.
- Địa lý: bắt đầu với một tỉnh hoặc vùng giá; chọn địa bàn cụ thể sau khi khảo sát nguồn. Chưa chốt chức năng so sánh nhiều địa bàn.
- Dự báo mục tiêu: từng ngày trong 7 ngày tới, cập nhật hằng ngày khi có dữ liệu mới. Chỉ dùng kết quả dự báo trong cảnh báo sau khi đánh giá trên lịch sử; tính khả thi chưa được xác nhận.
- LOW/MEDIUM/HIGH biểu thị rủi ro giá giảm trong kỳ dự báo; biến động bất thường và chất lượng dữ liệu hiển thị riêng.
- Khi dữ liệu thiếu, quá cũ hoặc mô hình chưa vượt qua đánh giá: vẫn xem được lịch sử kèm nguồn và thời điểm cập nhật, nhưng dự báo/cảnh báo có trạng thái chưa đủ cơ sở; không gán LOW thay thế.
- Kênh cảnh báo MVP: thông báo và lịch sử trên web; email để bổ sung sau.
- Kỳ dự báo là 7 ngày lịch. Ngày không có giá quan sát được đánh dấu; chỉ đánh giá sai số trên ngày có quan sát, không coi giá điền thêm là dữ liệu thật.
- Đánh giá mô hình theo thứ tự thời gian; so sánh với baseline giữ nguyên giá quan sát gần nhất. MAE là chỉ số chính, báo cáo riêng theo từng ngày dự báo. Chỉ dùng mô hình cho cảnh báo khi cải thiện so với baseline; mức cải thiện yêu cầu chờ khảo sát dữ liệu.
- Quy tắc rủi ro dựa trên mức giảm của giá dự báo thấp nhất trong kỳ so với giá quan sát mới nhất. Đây là phân loại theo quy tắc, không phải xác suất giảm giá. Ngưỡng LOW/MEDIUM/HIGH chờ kiểm tra lịch sử.
- Giữ mục tiêu thu thập 3 nhóm dữ liệu: giá trong nước, giá quốc tế và thời tiết. Mô hình MVP chỉ bắt buộc dùng lịch sử giá; dữ liệu bổ sung dùng để tham khảo và chỉ đưa vào mô hình khi đánh giá cho thấy hữu ích. Khả năng truy cập và quyền sử dụng nguồn vẫn cần xác minh.
- Chức năng MVP: đăng nhập, dashboard giá và dự báo, phát hiện bất thường, phân loại rủi ro, theo dõi mặt hàng/địa bàn, thông báo web và lịch sử.
- Để sau MVP: dự báo sản lượng, SHAP, bản đồ, Kafka, email/SMS và so sánh nhiều địa bàn.
- Hai vai trò: cán bộ hợp tác xã xem dữ liệu và quản lý theo dõi cá nhân; quản trị viên quản lý tài khoản, nguồn dữ liệu, kiểm tra dữ liệu lỗi và theo dõi các lần chạy thu thập/dự báo.
- Dữ liệu thị trường dùng chung; MVP chưa quản lý kho hàng, giao dịch hay dữ liệu nội bộ riêng của nhiều hợp tác xã.
- Thu thập theo lịch khi nguồn hỗ trợ, kèm nhập tệp theo mẫu để khởi tạo/bổ sung lịch sử. Cả hai đường phải kiểm tra định dạng, trùng lặp và lưu nguồn; nhập tệp không được tính là thu thập tự động.
- Mỗi lần chạy đều lưu kết quả đánh giá rủi ro; chỉ tạo thông báo mới khi mức rủi ro thay đổi. Lần đánh giá hợp lệ đầu tiên chỉ thông báo nếu MEDIUM/HIGH. Trạng thái chưa đủ cơ sở được báo riêng. HIGH không đổi nhiều ngày không tạo lại cùng thông báo mỗi ngày.
- Bất thường giá quan sát được đánh dấu riêng trên dashboard, kèm nguồn và ngày ghi nhận, cho quản trị viên kiểm tra. MVP chưa gửi thông báo bất thường riêng và không tự nâng rủi ro giá giảm lên HIGH vì xuất hiện bất thường.
- Bắt buộc kiểm chứng nguồn và mẫu dữ liệu trước khi chốt địa bàn, ngưỡng dữ liệu quá cũ, ngưỡng rủi ro và mức cải thiện mô hình. Kiểm tra quyền sử dụng, lịch sử liên tục, địa bàn/chất lượng, độ trễ công bố, khả năng thu thập. Nếu không đủ dữ liệu, trình phương án điều chỉnh trước khi đổi mặt hàng hoặc kỳ dự báo.
- Bộ tài liệu tiếng Việt dạng Markdown: bài toán và phạm vi; đặc tả yêu cầu và tiêu chí nghiệm thu; kế hoạch dữ liệu và đánh giá AI; thiết kế hệ thống; kế hoạch triển khai theo giai đoạn. Kèm glossary và nhật ký quyết định. Chưa theo mẫu trường vì chưa có mẫu.
- Hướng công nghệ đã chọn: Next.js + Python/FastAPI + PostgreSQL; bỏ Spring Boot. Các lựa chọn chi tiết về triển khai và thuật toán sẽ được phân biệt rõ giữa đề xuất thiết kế và quyết định đã xác nhận.
- Nhân lực: làm cá nhân.
- Năng lực kỹ thuật: người thực hiện tự đánh giá thành thạo các mảng kỹ thuật; chưa chọn công nghệ.
- Công nghệ: không có yêu cầu bắt buộc.
- Thời gian: linh hoạt; chưa có ngày nộp hoặc bảo vệ cụ thể.

## Chưa xác nhận

- Chưa chốt công nghệ app; tài liệu thiết kế đề xuất React Native/Expo. Phạm vi Q1–Q29 đã được xác nhận. Điều kiện build, thiết bị kiểm thử và tài khoản phân phối cần được kiểm chứng trong kế hoạch.

- Mẫu báo cáo và tiêu chí chấm của giảng viên.
- Tình huống nghiệp vụ trọng tâm và tiêu chí thành công.
- Mặt hàng, loại giá, khu vực, kỳ dự báo và nguồn dữ liệu khả dụng.
- Phạm vi chức năng, đánh giá mô hình, kiến trúc và kế hoạch triển khai.

## Nguyên tắc ghi nhận

Các gợi ý trong đề bài và các đề xuất khi phỏng vấn chưa được xem là quyết định đã chốt. Khả năng truy cập và độ phù hợp của nguồn dữ liệu chưa được kiểm chứng.

## Kết quả khảo sát sơ bộ — chưa phải quyết định chọn nguồn

- AgroInfo có PDF báo cáo tuần chứa bảng giá cà phê nhân xô VNĐ/kg theo địa bàn và ngày thứ Hai–thứ Sáu. Đã kiểm tra các mẫu tuần 46/2024, 16/2025 và 25/2025; chưa kiểm đếm lịch sử liên tục, chưa xác nhận đủ dữ liệu huấn luyện. Cần kiểm tra chênh lệch giữa bảng và phần tường thuật, thời điểm công bố và tên địa bàn qua thời gian.
- Mẫu: https://thitruongnongsan.gov.vn/images/2013/DANGNHAP/VnSAT_Ca%20phe/2025/Tu%E1%BA%A7n/B%C3%A1o%20c%C3%A1o%20C%C3%A0%20ph%C3%AA%20s%E1%BB%91%2016_2025.pdf
- World Bank có dữ liệu giá hàng hóa theo tháng; không thay thế chuỗi giá nội địa theo ngày. Nguồn: https://www.worldbank.org/en/research/commodity-markets
- Open-Meteo có API thời tiết lịch sử; khi đánh giá mô hình phải xét độ trễ và thời điểm dữ liệu thực sự khả dụng. Nguồn: https://open-meteo.com/en/docs/historical-weather-api
- Chưa xác minh đầy đủ quyền khai thác, tính liên tục và khả năng thu thập tự động của nguồn giá nội địa. Chưa chốt địa bàn.
