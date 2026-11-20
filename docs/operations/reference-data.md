# Dữ liệu tham khảo (#9)

Phần mềm giữ giá quốc tế theo tháng và thời tiết theo ngày ở bảng riêng, không đưa vào target giá thu mua nội địa. API `/price-series/{id}/references?start=...&end=...` trả đúng kỳ nguồn, không nội suy hoặc lặp giá tháng thành ngày. `as_of` có timezone chỉ nhận bản ghi có available_at đã biết và không sau mốc đó; unknown bị loại khỏi truy vấn point-in-time. Không tự suy công bố/khả dụng từ ngày quan sát. Thời điểm công bố/khả dụng không được trước ngày kết thúc kỳ lịch sử (so ngày UTC); truy vấn as_of cũng loại kỳ chưa kết thúc. Khi tải tham khảo thất bại, không giữ bảng cũ dưới ngữ cảnh mới.

Quản trị có thể POST JSON tới `/admin/price-series/{id}/reference-imports`; bản gốc, SHA-256, người nhập, thời điểm và lỗi từng bản ghi được giữ. Đọc audit/bản gốc ở `/admin/reference-imports/{import_id}` và `/file`. Nhập lại cùng bản ghi không nhân đôi; xung đột bị giữ ngoài tập quan sát chuẩn. Cùng nguồn/kỳ/loại/địa điểm/sản phẩm xác định một quan sát; không trộn chất lượng hoặc địa bàn.

Metadata bắt buộc: kind international_monthly hoặc weather_daily; source_name/source_url/license/attribution/dataset_kind; records gồm period_start/end, variable/value/unit, published_at và available_at nếu biết. Weather giữ latitude/longitude và product (không đổi reanalysis thành quan trắc trạm). Đơn vị hiện hỗ trợ coffee_robusta/coffee_arabica USD/kg, temperature_2m_mean C, precipitation_sum mm. Giá quốc tế phải là cả tháng lịch; weather phải đúng một ngày; số không hữu hạn hoặc sai đơn vị bị cách ly.

Nút **Nạp tham khảo thử nghiệm** chỉ cho admin, chuỗi synthetic và môi trường không production. Các giá trị tự tạo chỉ kiểm chứng phần mềm, không phải bản tải từ World Bank/Open-Meteo và không chứng minh chất lượng AI. Việc chưa có nguồn cà phê nội địa được phép dùng vẫn giữ gate dữ liệu đóng.

## Nguồn ứng viên và điều khoản

Kiểm tra ngày 20/11/2026: [catalogue World Bank](https://datacatalog.worldbank.org/search/dataset/0038238/commodity-prices-history-and-projections) ghi giấy phép CC BY 4.0 và giá hàng hóa cập nhật theo tháng. [Quy tắc giấy phép](https://datacatalog.worldbank.org/public-licenses) yêu cầu kiểm điều khoản riêng và ghi nguồn. Phần mềm chưa tải/nhập dataset này tự động.

[Điều khoản Open-Meteo](https://open-meteo.com/en/terms) tách quyền dữ liệu CC BY 4.0 khỏi điều kiện dùng Free API phi thương mại; triển khai thương mại cần đối chiếu điều kiện/gói phù hợp. [Historical Weather API](https://open-meteo.com/en/docs/historical-weather-api) mô tả dữ liệu reanalysis, không được ghi thành phép đo trạm. Chưa xác nhận tọa độ sản xuất hoặc SLA cho dự án; fixture không cấp quyền API hay chốt phạm vi địa lý.

Ticket #9 giữ phần nghiệm thu nguồn thật chưa đạt cho đến khi có đủ ba nhóm nguồn, điều khoản và hợp đồng thực. Lát cắt phần mềm có test API/PostgreSQL cho kỳ, thời điểm khả dụng, lỗi/nhập lại, raw/audit và phân quyền; E2E xác nhận bảng tham khảo tách khỏi bảng giá nội địa.
