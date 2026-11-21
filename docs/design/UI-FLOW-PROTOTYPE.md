# AGTECH — UI flow đang đề xuất

Đây là bản mẫu để trả lời: **cán bộ có thể đi từ giá mới nhất đến căn cứ dự báo, theo dõi và thông báo mà không phải đi qua các công cụ quản trị không?** Đồng thời so sánh ba cấu trúc điều hướng trước khi chọn phương án triển khai.

Nhánh riêng `codex/prototype-ui-flow`, chưa chọn phương án thắng, chưa merge main. Không có gọi API, ghi database, tài khoản thật hoặc triển khai production. Dữ liệu cố định có nhãn fixture; không dùng để kết luận chất lượng mô hình hay chọn ngưỡng AI.

## Xem bản mẫu

Chạy `npm --prefix web run dev`, mở `http://localhost:3000/prototype/ui-flow?variant=A`. Route được vô hiệu hóa trong production build. Thanh điều khiển phía dưới và URL cho phép đổi phương án, vai trò và tình huống; bản đồ luồng cho phép nhảy vào từng màn hình. Trạng thái thử nghiệm chỉ ở bộ nhớ và reset khi reload.

| Phương án | Cấu trúc | Mục đích so sánh |
|---|---|---|
| A — Không gian làm việc | Sidebar đầy đủ; số liệu → biểu đồ → căn cứ | Tìm chức năng nhanh, đủ chỗ cho quản trị; phương án đề xuất ban đầu |
| B — Tập trung thị trường | Thanh điều hướng trên; căn cứ bên trái, biểu đồ chiếm phần lớn | Ưu tiên đọc dữ liệu, giảm phần điều hướng thường trực |
| C — Theo hành trình | Sidebar icon gọn + các bước công việc ở trên | Dẫn cán bộ mới qua thứ tự giá → căn cứ → theo dõi → thông báo |

## Luồng cán bộ

1. **Đăng nhập** → tổng quan. Không thêm tự đăng ký, email/SMS hay chức năng khôi phục mật khẩu ngoài phạm vi.
2. **Tổng quan**: giá, VNĐ/kg, địa bàn/chất lượng, ngày cập nhật và trạng thái dự báo. Không dùng hero tiếp thị lớn sau đăng nhập.
3. **Chi tiết chuỗi**: biểu đồ và bảng lịch sử; ngày thiếu để trống. Chuyển tab giá/dự báo; mở nguồn và tham khảo riêng.
4. **Dự báo**: bảy ngày lịch, mốc tạo/dữ liệu, model và giới hạn; trạng thái chưa đủ cơ sở rõ ràng. Giá tháng/thời tiết không trộn vào target nội địa. Không thêm confidence band chưa hiệu chuẩn.
5. **Theo dõi**: thêm/bỏ từ chuỗi, tra lại trong danh sách cá nhân. Từ trạng thái rỗng quay về thị trường.
6. **Thông báo**: đọc → mở đánh giá liên quan đã lưu. Khi triển khai thật phải mở đúng forecast/assessment ID của sự kiện, không tự chuyển sang bản mới nhất.

Điều hướng mobile dự kiến: Tổng quan / Thị trường / Theo dõi / Thông báo; chi tiết là màn hình con có nút quay lại. Bản web responsive chỉ giúp đánh giá bố cục, không thay kiểm thử native.

## Luồng quản trị

Nguồn và điều khoản → nhập CSV theo chuỗi → kiểm tra dòng hợp lệ/lỗi/trùng/xung đột → kết quả nhập và audit → tác vụ/lịch/retry → snapshot/backtest/đánh giá model → quyết định công bố. Tài khoản ở khu vực quản trị riêng. Luồng công bố chính thức vẫn bị chặn nếu dữ liệu/model/quy tắc chưa qua gate.

Prototype chỉ minh họa màn hình/bước; không thay các API và tính năng đã triển khai. Khi áp dụng thật cần giữ quyền backend, import audit, lease/idempotency và lịch sử bất biến.

## Các trạng thái cần duyệt

| Tình huống | Cách hiển thị / hành động |
|---|---|
| Chưa có giá | Không hiển thị giá 0; gợi ý đổi khoảng ngày |
| Chưa đủ cơ sở | Có lý do; không gán LOW; giữ giá/lịch sử để tham khảo |
| Dữ liệu fixture | Nhãn rõ từ tổng quan đến từng trang phân tích |
| Mất kết nối | Giữ timestamp dữ liệu cũ; thêm/bỏ theo dõi, đánh dấu đọc và nhập giá không giả báo thành công |
| Phiên hết hạn | Yêu cầu đăng nhập lại; kết quả lưu trên server không mất |
| Nguồn chưa được duyệt | Chặn chạy thật, hiển thị căn cứ còn thiếu |

## Căn cứ thiết kế

Đã chạy tra cứu UI UX Pro Max cho analytics dashboard, agriculture palette, biểu đồ time-series và Next.js navigation. Kết quả design-system tự động gợi ý phần landing "Enterprise Gateway / Contact Sales" không phù hợp với công cụ cán bộ, nên không áp dụng phần đó. Áp dụng product pattern Analytics Dashboard, phong cách dữ liệu rõ ràng, xanh nông nghiệp và màu cảnh báo hổ phách; điều chỉnh typography theo khả năng đọc tiếng Việt. Search chart gợi ý confidence band nhưng không áp dụng vì spec chưa có hiệu chuẩn. Yêu cầu nghiệp vụ và bằng chứng luôn ưu tiên hơn gợi ý của skill.

Sau khi người dùng chọn cấu trúc, mới đưa phương án vào web thật, nối API, giữ phân quyền và bổ sung kiểm thử E2E theo các luồng đã chốt. Prototype không được dùng làm bằng chứng chức năng production.

## Kiểm tra bản mẫu

TypeScript và production build đạt. Đã bấm kiểm tra luồng theo dõi → thông báo → đánh giá lưu #17, mất mạng không đánh dấu đọc thành công, tình huống trống không giữ bảng giá/dự báo, hết phiên quay về đăng nhập, nhập CSV giả lập có dòng lỗi/trùng/xung đột, và chọn được mọi trang quản trị trên màn hình 375px. Đã xem phương án A/B/C; không có tràn ngang toàn trang ở 375px trong các màn hình đã kiểm tra. Đây là kiểm tra bản mẫu, chưa phải E2E của giao diện thật.

Review độc lập hai trục đã sửa 2 finding Standards (đường dẫn màn hình không hợp lệ; điều hướng quản trị mobile) và 3 finding Spec (đánh giá lưu riêng; trạng thái rỗng; đối chiếu nhập giá). Review lại không còn finding bắt buộc trong phần sửa. Chưa chọn phương án cuối; chưa xác nhận luồng này đã được người dùng duyệt.
