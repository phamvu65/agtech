# AGTECH-01 — Bản đồ tài liệu

Phiên bản trình bày 1.1 — 20/11/2026. Phạm vi nghiệp vụ giữ theo Q1–Q29 đã xác nhận.

| Bạn cần đọc gì? | Tài liệu | Điểm trực quan |
|---|---|---|
| Hiểu đề tài và giới hạn MVP | [01 — Bài toán và phạm vi](01-BAI-TOAN-VA-PHAM-VI.md) | Hành trình sử dụng, bảng phạm vi |
| Biết chức năng và cách nghiệm thu | [02 — Yêu cầu](02-YEU-CAU-VA-NGHIEM-THU.md) | Vai trò, FR/NFR, bảng chuyển trạng thái, ca nghiệm thu |
| Kiểm chứng dữ liệu và AI | [03 — Dữ liệu và AI](03-DU-LIEU-VA-DANH-GIA-AI.md) | Cổng kiểm chứng, train/validation/test, bảng rủi ro |
| Hiểu các thành phần kết nối | [04 — Thiết kế](04-THIET-KE-HE-THONG.md) | Kiến trúc, pipeline, sơ đồ đồng bộ thông báo |
| Biết thứ tự thực hiện | [05 — Kế hoạch](05-KE-HOACH-TRIEN-KHAI.md) | Giai đoạn phụ thuộc, backlog và cổng quyết định |

## Đọc theo vai trò

| Vai trò | Thứ tự gợi ý |
|---|---|
| Giảng viên hoặc người duyệt đề tài | 01 → 02 → 05 |
| Người triển khai backend/web/app | 02 → 04 → 05 |
| Người xử lý dữ liệu và AI | 01 → 03 → 04 |

## Ký hiệu trạng thái

| Nhãn | Cách hiểu |
|---|---|
| Đã chốt | Quyết định đã được người dùng xác nhận |
| Đề xuất | Phương án thiết kế cần kiểm chứng khi triển khai |
| Cần kiểm chứng | Chưa có đủ bằng chứng để kết luận đạt |

Sơ đồ Mermaid hiển thị trực tiếp khi xem trên GitHub hoặc trình đọc hỗ trợ Mermaid. Sơ đồ mô tả thiết kế mục tiêu; trạng thái mã nguồn hiện tại được ghi trong README của repository.

Tham chiếu: [spec tổng hợp](AGTECH-01-SPEC.md), [thuật ngữ](GLOSSARY.md), [nhật ký quyết định](QUYET-DINH.md). Spec đã xuất bản tại [GitHub issue #1](https://github.com/phamvu65/agtech/issues/1).
