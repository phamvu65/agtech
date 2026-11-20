# AGTECH-01 — Nền tảng theo dõi thị trường và dự báo giá nông sản trên web và mobile

Ngày: 20/11/2026. Trạng thái: phạm vi và ranh giới kiểm thử đã được xác nhận; cấu hình GitHub tracker đã hoàn tất. Spec sẵn sàng cho bước kiểm chứng dữ liệu và triển khai theo các cổng quyết định bên dưới.

## Problem Statement

Cán bộ hợp tác xã cần thông tin đáng tin cậy để tham khảo khi lập kế hoạch tiêu thụ nông sản. Giá, thời tiết và giá quốc tế phân tán ở nhiều nguồn, khác đơn vị, địa bàn và nhịp cập nhật. Theo dõi thủ công khó nhận biết xu hướng và phân biệt tín hiệu thị trường với dữ liệu lỗi hoặc quá cũ.

Người dùng cần truy cập trên web và điện thoại, thấy nguồn và thời điểm dữ liệu, dự báo ngắn hạn cùng giới hạn của nó, và được thông báo khi rủi ro giá giảm thay đổi. Quyết định tiêu thụ vẫn thuộc cán bộ hợp tác xã.

## Solution

Xây dựng web và app Android/iOS dùng chung backend và dữ liệu. MVP tập trung một mặt hàng, ưu tiên cà phê nhân trong nước, đơn vị VNĐ/kg, tại một địa bàn được chọn sau kiểm chứng nguồn.

Hệ thống thu thập ba nhóm dữ liệu: giá nội địa, giá quốc tế và thời tiết; chuẩn hóa và lưu nguồn, thời điểm, chất lượng. Mô hình dự báo từng ngày trong bảy ngày lịch tới; chỉ dùng lịch sử giá là yêu cầu bắt buộc cho mô hình MVP. Dữ liệu bổ sung chỉ đưa vào khi đánh giá cho thấy hữu ích.

Dashboard hiển thị lịch sử, dự báo, cờ bất thường và mức rủi ro LOW/MEDIUM/HIGH. Rủi ro phản ánh mức giảm dự báo, không phải xác suất giảm. Khi chưa đủ dữ liệu hoặc mô hình chưa đạt, hiển thị chưa đủ cơ sở thay vì LOW. Web cung cấp chức năng người dùng và quản trị; app phục vụ cán bộ hợp tác xã. Thông báo được xem trong web/app, không yêu cầu push.

## User Stories

1. Là cán bộ hợp tác xã, tôi muốn đăng nhập trên web hoặc app để truy cập thông tin và danh sách theo dõi của mình.
2. Là cán bộ hợp tác xã, tôi muốn xem giá thu mua gần nhất cùng đơn vị và loại hàng để hiểu đúng giá tham khảo.
3. Là cán bộ hợp tác xã, tôi muốn biết địa bàn và chất lượng hàng theo nguồn để tránh so sánh giá không tương đương.
4. Là cán bộ hợp tác xã, tôi muốn xem giá lịch sử theo thời gian để nhận biết diễn biến thị trường.
5. Là cán bộ hợp tác xã, tôi muốn thấy ngày thiếu giá để không nhầm dữ liệu điền thêm là giao dịch thực.
6. Là cán bộ hợp tác xã, tôi muốn thấy nguồn, ngày quan sát và thời điểm cập nhật để đánh giá độ mới của thông tin.
7. Là cán bộ hợp tác xã, tôi muốn xem dự báo cho từng ngày trong bảy ngày lịch tới để tham khảo kế hoạch tiêu thụ.
8. Là cán bộ hợp tác xã, tôi muốn biết thời điểm tạo dự báo và dữ liệu được dùng đến ngày nào để tránh sử dụng dự báo cũ như hiện hành.
9. Là cán bộ hợp tác xã, tôi muốn xem sai số lịch sử và giới hạn dự báo để hiểu mức độ tin cậy có căn cứ.
10. Là cán bộ hợp tác xã, tôi muốn thấy trạng thái chưa đủ cơ sở cùng lý do để không hiểu nhầm thiếu dữ liệu thành rủi ro thấp.
11. Là cán bộ hợp tác xã, tôi muốn thấy cờ bất thường trên giá quan sát để chú ý đến điểm cần kiểm tra.
12. Là cán bộ hợp tác xã, tôi muốn phân biệt bất thường dữ liệu với rủi ro giá giảm để diễn giải đúng tín hiệu.
13. Là cán bộ hợp tác xã, tôi muốn xem mức LOW/MEDIUM/HIGH và căn cứ phân loại để tham khảo trước khi quyết định bán.
14. Là cán bộ hợp tác xã, tôi muốn đăng ký hoặc bỏ theo dõi mặt hàng–địa bàn để quản lý thông tin quan tâm.
15. Là cán bộ hợp tác xã, tôi muốn danh sách theo dõi nhất quán trên web và app để tiếp tục công việc giữa các thiết bị.
16. Là cán bộ hợp tác xã, tôi muốn nhận thông báo khi mức rủi ro thay đổi để biết có diễn biến mới.
17. Là cán bộ hợp tác xã, tôi muốn tránh nhận lặp cùng cảnh báo HIGH mỗi ngày để không bỏ qua thông báo hữu ích.
18. Là cán bộ hợp tác xã, tôi muốn xem lịch sử dự báo và đánh giá rủi ro để hiểu thông tin đã thay đổi ra sao.
19. Là cán bộ hợp tác xã, tôi muốn đọc và đánh dấu thông báo trên web/app để quản lý những nội dung đã xem.
20. Là cán bộ hợp tác xã, tôi muốn biết khi mất mạng và có thể thử lại để không nhầm thao tác thất bại là thành công.
21. Là cán bộ hợp tác xã, tôi muốn dữ liệu còn trên màn hình có thời điểm cập nhật để nhận biết dữ liệu cũ.
22. Là cán bộ hợp tác xã, tôi muốn dùng app trên Android hoặc iOS để truy cập bằng điện thoại của mình.
23. Là quản trị viên, tôi muốn quản lý tài khoản và quyền truy cập để duy trì đúng vai trò sử dụng.
24. Là quản trị viên, tôi muốn quản lý nguồn và lịch thu thập để cập nhật dữ liệu phù hợp nhịp công bố.
25. Là quản trị viên, tôi muốn nhập tệp theo mẫu để khởi tạo hoặc bổ sung lịch sử khi cần.
26. Là quản trị viên, tôi muốn xem các dòng hợp lệ, lỗi, trùng và xung đột để kiểm soát dữ liệu nhập.
27. Là quản trị viên, tôi muốn truy vết bản nguồn và thay đổi dữ liệu để kiểm tra sai lệch.
28. Là quản trị viên, tôi muốn chạy lại tác vụ thất bại mà không nhân đôi dữ liệu để khôi phục vận hành.
29. Là quản trị viên, tôi muốn theo dõi trạng thái, thời gian và lỗi từng lần chạy để biết hệ thống đang hoạt động ra sao.
30. Là quản trị viên, tôi muốn xem kết quả đánh giá model so với baseline để quyết định model có đủ điều kiện sử dụng.
31. Là quản trị viên, tôi muốn giữ phiên bản model và dữ liệu gắn với dự báo để tái kiểm tra kết quả đã công bố.
32. Là người thực hiện đồ án, tôi muốn kiểm chứng nguồn, lịch sử và quyền sử dụng trước huấn luyện để xác định tính khả thi thực tế.
33. Là người thực hiện đồ án, tôi muốn đánh giá theo thời gian và từng horizon để phát hiện sai số hoặc rò rỉ thông tin tương lai.
34. Là người thực hiện đồ án, tôi muốn lưu bằng chứng kiểm thử web, Android và iOS để chứng minh đầu ra hoạt động trên các nền tảng đã cam kết.
35. Là người thực hiện đồ án, tôi muốn công bố cả trường hợp model không đạt để báo cáo phản ánh đúng kết quả thực nghiệm.

## Implementation Decisions

### Phạm vi đã xác nhận

- Next.js cho web, Python/FastAPI cho backend chung và AI, PostgreSQL cho dữ liệu; bỏ Spring Boot.
- MVP gồm web và app Android/iOS; triển khai backend và luồng web hoàn chỉnh trước, sau đó kết nối app. Kiểm chứng môi trường build mobile sớm.
- Hai vai trò: cán bộ hợp tác xã và quản trị viên. Quản trị, nhập dữ liệu chỉ thực hiện trên web; dữ liệu thị trường dùng chung.
- Một mặt hàng và một địa bàn; ưu tiên cà phê, nhưng lựa chọn cuối phụ thuộc kiểm chứng dữ liệu. Thay mặt hàng hoặc kỳ dự báo cần trình phương án điều chỉnh.
- Thu thập theo lịch khi nguồn hỗ trợ, kèm nhập tệp có kiểm tra. Nhập tệp không thay bằng chứng thu thập tự động.
- Giữ ngày quan sát, thời điểm công bố/thu thập, đơn vị, loại hàng, địa bàn và nguồn. Không trộn các chuỗi khác chất lượng hoặc địa bàn không tương đương.
- Dự báo bảy ngày lịch, đánh giá trên ngày có quan sát thật. Không coi target điền thêm là dữ liệu thật.
- Risk Engine dùng mức giảm của giá dự báo thấp nhất trong kỳ so với giá hợp lệ mới nhất. Ngưỡng LOW/MEDIUM/HIGH chốt sau kiểm chứng; trạng thái chưa đủ cơ sở tách biệt.
- Lưu mọi lần đánh giá; thông báo khi mức thay đổi. Lần hợp lệ đầu tiên chỉ thông báo nếu MEDIUM/HIGH. Bất thường hiển thị riêng và không tự nâng rủi ro lên HIGH.
- App xem thông báo khi mở, cần mạng. Bàn giao bản chạy được và bằng chứng kiểm thử hai nền tảng; chưa bắt buộc phát hành công khai lên store.

### Thiết kế đề xuất, chưa mặc nhiên là quyết định đã duyệt

- React Native/Expo cho app; chốt sau spike build, biểu đồ, xác thực và kết nối API.
- Backend chia module: danh tính, dữ liệu thị trường, ingestion/chất lượng, dự báo/đánh giá, bất thường, rủi ro, theo dõi và thông báo.
- Worker Python chạy tác vụ dài riêng khỏi HTTP request; scheduler kích hoạt có khóa tránh chạy chồng. Chưa cần microservice AI riêng.
- Schema bao gồm quan sát và phiên bản, tài liệu thô, lần chạy, model/evaluation, forecast/points, anomaly/risk, subscription và notification. Giữ lịch sử công bố có thể truy vết.
- Hợp đồng dự báo gồm trạng thái, lý do, mốc tạo, dữ liệu đến ngày nào, phiên bản model và bảy điểm dự báo khi đủ điều kiện. API kiểm tra quyền độc lập với giao diện.
- Dùng khóa chống trùng và giao dịch để retry không tạo lại quan sát hoặc sự kiện; đồng bộ trạng thái đọc thông báo qua backend.
- Chi tiết cấp tài khoản, xác thực, thông báo khôi phục sau thiếu dữ liệu và ngân sách hiệu năng được kiểm chứng trong giai đoạn nền tảng, không được coi là yêu cầu người dùng đã xác nhận riêng.

## Testing Decisions

### Ranh giới kiểm thử đã xác nhận

Ranh giới chính là backend ứng dụng: đưa dữ liệu qua đường nhập/thu thập và tương tác qua API công khai, kiểm tra kết quả quan sát được như giá chuẩn hóa, dự báo, trạng thái rủi ro, thông báo và phân quyền. Kiểm thử dùng database thử thực thay vì phụ thuộc cấu trúc hàm nội bộ.

Hai kiểm chứng bổ sung cần thiết: backtest AI trên snapshot lịch sử theo thời gian để đánh giá chất lượng dự báo; một tập hành trình đầu cuối trên web/Android/iOS để xác minh tích hợp, hiển thị và mất mạng. Kiểm thử đơn vị chỉ bổ sung cho các biên quy tắc khó bao phủ, không khóa cứng triển khai nội bộ.

### Những hành vi phải kiểm tra

- Ingestion: định dạng, đơn vị, dữ liệu thiếu, xung đột, retry và truy vết nguồn.
- Quyền: cán bộ không truy cập API quản trị hoặc dữ liệu theo dõi/thông báo của người khác.
- Dự báo: đúng bảy ngày lịch, mốc dữ liệu và version; chặn sử dụng khi dữ liệu cũ hoặc model chưa đạt.
- Rủi ro: biên hai ngưỡng, thiếu giá đầu vào, không đồng nhất anomaly với HIGH.
- Thông báo: lần đầu LOW/MEDIUM/HIGH, tăng/giảm mức, HIGH lặp, trạng thái chưa đủ cơ sở, retry không trùng.
- Web/app: cùng dữ liệu và theo dõi, đọc thông báo, trạng thái tải/rỗng/lỗi, mất mạng và thử lại.
- Vận hành: tác vụ thất bại có dấu vết; sao lưu/phục hồi có bằng chứng.

### Đánh giá AI

Train/validation/test theo thời gian; mọi feature chỉ dùng thông tin khả dụng tại mốc dự báo. Không dùng giá trong báo cáo tuần trước ngày báo cáo được công bố. Loại mẫu có target vượt ranh giới tập huấn luyện.

Baseline giữ nguyên giá gần nhất được đánh giá cùng model trên cùng target. MAE là chỉ số chính, báo cáo theo horizon và số mẫu; RMSE/MAPE và độ đúng chiều là bổ sung khi phù hợp. Đóng băng ngưỡng cải thiện, tiêu chí từng horizon và ngưỡng rủi ro trước mở test cuối.

Đánh giá cảnh báo riêng về false alarm/miss, độ bao phủ và thời gian báo trước. Khi thiếu ground truth một phần kỳ, không giả định đã quan sát mức giá thấp nhất thực của cả kỳ. Không dùng dữ liệu tổng hợp để chứng minh chất lượng AI.

### Prior art

Workspace hiện có tài liệu lập kế hoạch và khảo sát nguồn; chưa có mã ứng dụng hoặc bộ kiểm thử để tái sử dụng. Các kịch bản nghiệm thu đã soạn là cơ sở thiết kế kiểm thử, không phải bằng chứng test đã chạy.

## Out of Scope

Dự báo sản lượng; SHAP; bản đồ; Kafka; email/SMS; push khi app đóng; offline; so sánh nhiều địa bàn; quản lý kho/giao dịch; dữ liệu nội bộ riêng theo hợp tác xã; quyết định bán tự động; phát hành công khai lên Google Play/App Store. Chưa yêu cầu TimescaleDB.

## Further Notes

- Giai đoạn đầu bắt buộc kiểm chứng nguồn, quyền sử dụng, độ liên tục lịch sử, địa bàn/chất lượng, độ trễ và đường cập nhật vận hành. Nguồn lịch sử đủ không mặc nhiên đáp ứng cập nhật hằng ngày.
- Chưa chốt địa bàn, số mẫu tối thiểu, tuổi dữ liệu tối đa, ngưỡng cải thiện model, ngưỡng rủi ro và cách hiệu chuẩn khoảng dự báo. Các quyết định này phải có bằng chứng và được chốt trước đánh giá chính thức.
- Thể hiện độ tin cậy bằng bằng chứng đánh giá; không tự đặt xác suất hay kết luận nhân quả từ tương quan.
- Người thực hiện làm cá nhân, thời gian linh hoạt; chưa có mẫu báo cáo của trường.
- Model không đạt thì giữ trạng thái chưa đủ cơ sở; hoàn thành phần mềm không đồng nghĩa phần AI đạt nghiệm thu.
- Issue tracker: GitHub phamvu65/agtech; dùng năm nhãn triage mặc định. Ranh giới kiểm thử đã được xác nhận. Nhãn xuất bản: ready-for-agent; các điểm phụ thuộc dữ liệu vẫn phải qua cổng kiểm chứng trước triển khai chính thức.
