# Domain docs

## Đọc trước khi khám phá nghiệp vụ

- Đọc GLOSSARY.md ở root và các ADR liên quan trong docs/adr/.
- Nếu sau này có GLOSSARY-MAP.md, theo map tới glossary và ADR của các context liên quan.
- Nếu file chưa có, tiếp tục công việc; domain-modeling tạo glossary/ADR khi có thuật ngữ hoặc quyết định đủ điều kiện.

## Bố cục

Dự án dùng single-context: một GLOSSARY.md ở root; ADR đặt trong docs/adr/. Không tạo ADR trống để hoàn thiện cấu trúc thư mục.

## Quy tắc sử dụng

Dùng thuật ngữ đã định nghĩa khi viết spec, issue, kiểm thử và thiết kế. Khi thiếu thuật ngữ, ghi nhận để domain-modeling làm rõ. Nếu đề xuất mâu thuẫn ADR, nêu rõ quyết định bị ảnh hưởng trước khi thay đổi.

GLOSSARY.md ở root là nguồn thuật ngữ chính thức. Cập nhật định nghĩa tại root; tài liệu lập kế hoạch nằm trong docs/planning/.
