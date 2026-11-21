# AGTECH-01

Nền tảng theo dõi thị trường nông sản, dự báo giá và hỗ trợ cán bộ hợp tác xã lập kế hoạch tiêu thụ trên web và app Android/iOS.

## Trạng thái

Đã triển khai API FastAPI/PostgreSQL, web Next.js và app TypeScript/React Native/Expo dùng chung backend. Có đăng nhập/phân quyền, nhập CSV và audit, lịch sử giá, tham khảo quốc tế/thời tiết, worker fixture, snapshot/backtest, dự báo/rủi ro thử nghiệm và hộp thư riêng. Dữ liệu tổng hợp chỉ kiểm tra hành vi; nguồn thật, chất lượng AI và ngưỡng vận hành chưa qua gate nên không công bố kết quả chính thức.

Xem [chạy backend/web](docs/operations/authentication.md), [nhập giá](docs/operations/price-imports.md), [collector](docs/operations/collector-jobs.md), [tham khảo](docs/operations/reference-data.md), [phân tích](docs/operations/analysis.md), [mobile](docs/operations/mobile.md), [vận hành/restore](docs/operations/deployment.md) và [ma trận nghiệm thu](docs/operations/acceptance-matrix.md). Chưa nghiệm thu iOS native hoặc web triển khai công khai.

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

Cổng mặc định 8000. Web và app dùng chung backend. Template HTTPS tại `deploy/compose.production.yml` cần host/DNS/secret riêng; không có deployment công khai sẵn.

## Cấu trúc

- `src/`: nền FastAPI và cấu hình ứng dụng.
- `tests/`: kiểm thử API nghiệp vụ với PostgreSQL test riêng.
- `web/`: Next.js và Playwright.
- `mobile/`: app Expo Router/React Native.
- `docs/planning/`: bộ tài liệu AGTECH-01.
- `docs/agents/`: cấu hình issue tracker, nhãn và tài liệu nghiệp vụ.
- `CLAUDE.md`: hướng dẫn cho coding agent; giữ tên file đã có trong repository.

## Giấy phép

Giữ nguyên [MIT License](LICENSE) và ghi nhận bản quyền từ template gốc.
