# AGTECH-01 — Kế hoạch ticket triển khai

| Ticket | Đầu ra | Blocked by |
|---|---|---|
| [#4](https://github.com/phamvu65/agtech/issues/4) | G0: Kiểm chứng dữ liệu cà phê và kết luận go/no-go | Không |
| [#5](https://github.com/phamvu65/agtech/issues/5) | G0: Kiểm chứng môi trường build và kiểm thử Android/iOS | Không |
| [#6](https://github.com/phamvu65/agtech/issues/6) | Đăng nhập và phân quyền đến màn hình web | Không |
| [#7](https://github.com/phamvu65/agtech/issues/7) | Nhập giá CSV → PostgreSQL → dashboard lịch sử | #4, #6 |
| [#8](https://github.com/phamvu65/agtech/issues/8) | Thu thập giá theo lịch và màn hình theo dõi tác vụ | #7 |
| [#9](https://github.com/phamvu65/agtech/issues/9) | Bổ sung giá quốc tế và thời tiết có nguồn trên dashboard | #4, #7 |
| [#10](https://github.com/phamvu65/agtech/issues/10) | Snapshot, baseline và backtest theo thời gian | #8 |
| [#11](https://github.com/phamvu65/agtech/issues/11) | Model dự báo 7 ngày và công bố trạng thái trên web | #10 |
| [#12](https://github.com/phamvu65/agtech/issues/12) | Bất thường và mức rủi ro trên dashboard | #11 |
| [#13](https://github.com/phamvu65/agtech/issues/13) | Theo dõi cá nhân và thông báo không lặp trên web | #6, #12 |
| [#14](https://github.com/phamvu65/agtech/issues/14) | App Android/iOS: đăng nhập, dashboard, theo dõi và thông báo | #5, #13, #9 |
| [#15](https://github.com/phamvu65/agtech/issues/15) | Triển khai, phục hồi và nghiệm thu xuyên suốt | #9, #14 |

Các quan hệ phụ thuộc được tạo bằng GitHub native dependencies và các ticket là sub-issue của #1. Gate nguồn/model vẫn phải có bằng chứng; hoàn tất khảo sát không có nghĩa nguồn đã được phép dùng hoặc model đã đạt.

Không tự đóng spec cha. Theo yêu cầu người dùng, bắt đầu G0, sau đó làm các ticket sẵn sàng theo phụ thuộc.
