# AGTECH-01

Nền tảng theo dõi thị trường nông sản, dự báo giá và hỗ trợ cán bộ hợp tác xã lập kế hoạch tiêu thụ trên web và app Android/iOS.

## Trạng thái

Repository có nền FastAPI/PostgreSQL, đăng nhập/phân quyền và web Next.js cấp/khóa tài khoản. Đã có nhập CSV có audit và dashboard lịch sử; chưa nạp nguồn thị trường được duyệt, chưa có dự báo hoặc app native được nghiệm thu. Xem [nhập giá và lịch sử](docs/operations/price-imports.md). Có thêm [worker và màn hình tác vụ bằng fixture](docs/operations/collector-jobs.md); nguồn thật vẫn bị chặn. Xem [hướng dẫn chạy và kiểm thử](docs/operations/authentication.md).

## Tài liệu

- [Spec đã xuất bản](https://github.com/phamvu65/agtech/issues/1)
- [Phạm vi](docs/planning/01-BAI-TOAN-VA-PHAM-VI.md)
- [Yêu cầu và nghiệm thu](docs/planning/02-YEU-CAU-VA-NGHIEM-THU.md)
- [Dữ liệu và đánh giá AI](docs/planning/03-DU-LIEU-VA-DANH-GIA-AI.md)
- [Thiết kế](docs/planning/04-THIET-KE-HE-THONG.md)
- [Kế hoạch triển khai](docs/planning/05-KE-HOACH-TRIEN-KHAI.md)
- [Thuật ngữ](GLOSSARY.md)

## Chạy backend

Python 3.11 trở lên. Tạo môi trường ảo, kích hoạt rồi chạy:

```sh
python -m pip install -r requirements.txt
python -m uvicorn src.main:app --reload
```

Có thể sao chép `.env.example` thành `.env` để tùy chỉnh. Kiểm tra `http://localhost:8000/health`, tài liệu API tại `/docs`. `/health` không yêu cầu database; đăng nhập cần PostgreSQL và migration. Không cần API key LLM.

```sh
python -m ruff check src tests
python -m pytest
```

## Docker

```sh
docker compose up --build
```

Cổng mặc định 8000. Web Next.js và app di động sẽ dùng chung backend khi triển khai các giai đoạn kế tiếp.

## Cấu trúc

- `src/`: nền FastAPI và cấu hình ứng dụng.
- `tests/`: kiểm thử health, cấu hình, CORS và việc loại bỏ API chatbot.
- `docs/planning/`: bộ tài liệu AGTECH-01.
- `docs/agents/`: cấu hình issue tracker, nhãn và tài liệu nghiệp vụ.
- `CLAUDE.md`: hướng dẫn cho coding agent; giữ tên file đã có trong repository.

## Giấy phép

Giữ nguyên [MIT License](LICENSE) và ghi nhận bản quyền từ template gốc.
