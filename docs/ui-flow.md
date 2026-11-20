# UI Flow & Wireframe Design — Kho Tri Thức Hỗ Trợ Học Thuật (EDU-04)

Tài liệu thiết kế danh sách các màn hình giao diện chính và sơ đồ luồng người dùng (UI Flow) cho dự án **Academic Knowledge Hub (EDU-04)**, đáp ứng các tiêu chuẩn kiểm soát bắt buộc: hỗ trợ đa vai trò, tích hợp Human-in-the-Loop (HITL), bảo vệ liêm chính học thuật và hiển thị đầy đủ các trạng thái hệ thống.

---

## 1. Danh sách màn hình bắt buộc (Wireframe Spec)

| # | Tên màn hình | Vai trò | Mô tả chi tiết giao diện & tính năng |
|---|---|---|---|
| **1** | **Giao diện 3 Trợ lý & Knowledge Hub** | Sinh viên (Primary) | Màn hình chính dành cho Sinh viên. Cho phép chuyển đổi linh hoạt giữa 3 trợ lý (Academic Assistant, Learning Assistant, Knowledge Hub). Tích hợp khung chat trung tâm, bộ lọc tài liệu theo môn học/học phần, và hiển thị câu trả lời đi kèm trích dẫn nguồn (citation) rõ ràng. |
| **2** | **Dashboard Quản lý & Duyệt tài liệu** | Giảng viên (Secondary) | Bảng điều khiển dành riêng cho Giảng viên. Cho phép tải lên giáo trình/slide/đề cương, phân quyền tài liệu theo môn học, theo dõi thống kê lượt truy vấn và quản lý danh sách tài liệu chờ kiểm duyệt. |
| **3** | **Màn hình xác nhận rủi ro (HITL)** | Giảng viên / Quản trị | Hộp thoại modal cảnh báo xuất hiện trước khi thực hiện các hành động rủi ro (đưa tài liệu mới vào hệ thống RAG/Vector DB hoặc xóa tài liệu khỏi Hub). Yêu cầu Giảng viên xác nhận nội dung và nguồn trước khi ghi nhận vào DB. |
| **4** | **Trạng thái đang xử lý (Loading State)** | Tất cả người dùng | Hiển thị khi Agent đang thực hiện truy vấn. Giao diện chứa hiệu ứng tải (loading spinner/skeleton) kèm dòng chữ thông báo trạng thái: *"Hệ thống đang truy xuất Vector DB, chạy hybrid search và kiểm chứng nguồn học thuật..."* (tránh tình trạng người dùng tưởng app bị treo trong 5–15 giây xử lý). |
| **5** | **Trạng thái lỗi & Từ chối trả lời (Guardrail State)** | Tất cả người dùng | Màn hình/thông báo xuất hiện trong 2 trường hợp: <br>1. **Bảo vệ liêm chính học thuật**: Guardrails chặn yêu cầu giải bài tập tính điểm/cho đáp án trực tiếp, tự động chuyển sang gợi ý phương pháp giải.<br>2. **Độ tin cậy thấp**: Thông báo khi dữ liệu tìm kiếm không đạt độ chính xác/độ tin cậy tối thiểu (<80%). |
| **6** | **Trạng thái rỗng (Empty State)** | Tất cả người dùng | Màn hình hiển thị khi người dùng vừa mở học phần mới chưa có lịch sử hỏi đáp hoặc thư mục tài liệu chưa có nội dung. Cung cấp danh sách các câu hỏi gợi ý mẫu (sample prompts) để hướng dẫn người dùng bắt đầu. |

---

## 2. Sơ đồ luồng giao diện (UI Flow Diagram)

```mermaid
flowchart TD
    A[Màn hình Đăng nhập / Phân quyền] --> B{Phân loại vai trò?}
    
    %% Luồng Sinh viên
    B -->|Sinh viên| C[Màn hình chính: 3 Trợ lý & Knowledge Hub]
    C --> E{Thực hiện thao tác}
    E -->|Gửi câu hỏi / Tìm tài liệu| F[Trạng thái đang xử lý: Loading State]
    
    F -->|RAG Success & Validated| G[Kết quả trả lời + Trích dẫn nguồn]
    F -->|Phát hiện vi phạm Guardrail / Thiếu dữ liệu| H[Trạng thái lỗi / Từ chối giải bài tập]
    
    G --> C
    H --> C
    
    %% Luồng Giảng viên
    B -->|Giảng viên| D[Dashboard Quản lý & Duyệt tài liệu]
    D --> I[Danh sách tài liệu chờ duyệt]
    I -->|Bấm Phê duyệt / Xóa tài liệu| J[Màn hình xác nhận rủi ro - HITL]
    
    J -->|Xác nhận OK| K[Cập nhật Knowledge Hub / Vector DB]
    J -->|Hủy bỏ| D
    K --> D