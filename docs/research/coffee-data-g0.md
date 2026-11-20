# AGTECH-01: G0 kiểm chứng nguồn giá cà phê

Ngày kiểm tra: **20/11/2026**, khoảng 09:41–09:50 UTC (16:41–16:50 Asia/Ho_Chi_Minh). Phạm vi: một lô nhỏ nguồn công khai, không đăng nhập, không quét toàn bộ lịch sử. Đối chiếu đặc tả `docs/planning/AGTECH-01-SPEC.md`, GLOSSARY.md và khảo sát trước ở `work/coffee-data-check.md` ngoài repository. G0 ở đây là bước kiểm chứng nguồn của D0 trong đặc tả, không phải gate mới đã được phê duyệt.

**Kết luận: G0 chưa đạt để chọn nguồn vận hành hoặc huấn luyện chính thức.** Đã tải thật ba PDF AgroInfo và hai trang HTML, kiểm đếm bảng và tạo được mẫu Đắk Lắk 15 ngày từ số liệu thật. Chưa có bằng chứng quyền tự động thu thập/tái sử dụng nguồn giá, chưa chứng minh lịch sử liên tục đủ dài, chưa biết chính xác thời điểm công bố gốc. Báo cáo tuần không tự chứng minh đường cập nhật giá hằng ngày. Mẫu này chỉ dùng nghiên cứu/parser trong phạm vi được phép, không được mô tả là dataset sản xuất hay dữ liệu có giấy phép mở.

## Nguồn và hiện vật đã kiểm tra

Ba URL tải trực tiếp, đều HTTP 200 `application/pdf`, không cần tài khoản:

- [A: báo cáo số 46, 02/12/2024](https://thitruongnongsan.gov.vn/images/2013/DANGNHAP/VnSAT_Ca%20phe/2024/tu%E1%BA%A7n/B%C3%A1o%20c%C3%A1o%20C%C3%A0%20ph%C3%AA%20_%20s%E1%BB%91%2046%20%2802-12-2024%29.pdf).
- [B: báo cáo số 16, 28/04/2025](https://thitruongnongsan.gov.vn/images/2013/DANGNHAP/VnSAT_Ca%20phe/2025/Tu%E1%BA%A7n/B%C3%A1o%20c%C3%A1o%20C%C3%A0%20ph%C3%AA%20s%E1%BB%91%2016_2025.pdf).
- [C: báo cáo số 25, 30/06/2025](https://thitruongnongsan.gov.vn/images/2013/DANGNHAP/VnSAT_Ca%20phe/2025/Tu%E1%BA%A7n/B%C3%A1o%20c%C3%A1o%20C%C3%A0%20ph%C3%AA%20s%E1%BB%91%2025_2025.pdf).

| PDF | Byte | SHA-256 | GET bắt đầu UTC |
|---|---:|---|---|
| A | 958091 | `33640989452d7e8e3d61fd5c7470b489795ccbf2e67431baa8d0efa18ffbc76e` | 2026-11-20T09:41:48.871530Z |
| B | 1605262 | `eed713544f61fd9283365ce64989d75d5f0eb458df568c63067ff00417f20a88` | 2026-11-20T09:41:49.277876Z |
| C | 1809560 | `7d2c985302ea868c8d96f395f4d73f6b4a5028d29954103e78b2f00929922cbf` | 2026-11-20T09:41:49.531740Z |

Hiện vật lưu cục bộ dưới **`data/research/`**, được `.gitignore` hiện hành loại trừ. Không commit PDF, HTML hay CSV nguồn. Có `manifest.json` chứa URL yêu cầu/URL cuối, mã HTTP, Content-Type, Last-Modified, byte, checksum, mốc bắt đầu GET; `fetch_g0.py` ghi lại tám GET giới hạn; `profile_g0.py` trích bảng; ba bản `.txt` và ảnh render trang bảng `.png`; `agroinfo-daklak-sample.csv`. Mốc `checked_at`/`collected_at` là thời điểm bắt đầu yêu cầu của lần khảo sát, không phải thời điểm xuất bản gốc. Có thể tái tạo hiện vật từ URL bằng script sau khi kiểm tra lại quyền và chính sách nguồn; trang động có thể cho checksum khác.

Đã dùng pypdf đọc toàn bộ ba tài liệu, pypdfium2 render trang 5 của A và trang 7 của B/C; trực quan đối chiếu hàng tỉnh Đắk Lắk, nhãn cột, đơn vị và nguồn của cả ba bảng. Parser thử nghiệm chạy thành công trên đúng ba tệp này; chưa được chứng minh cho mọi phiên bản báo cáo.

## Coverage thực đo và giới hạn

| PDF | Ngày báo cáo trên bìa | Khoảng ngày **trong phần thị trường trong nước** | Trang bảng | Hàng địa bàn | Ô giá thứ 2–6 |
|---|---|---|---:|---:|---:|
| A | 2024-12-02 | 2024-11-25 → 2024-11-29 | 5/5 | 17 | 85 |
| B | 2025-04-28 | 2025-04-21 → 2025-04-25 | 7/7 | 17 | 85 |
| C | 2025-06-30 | 2025-06-23 → 2025-06-27 | 7/7 | 17 | 85 |

Các số đếm trên tính từ ba bản tải, nguồn A/B/C. Tổng 255 ô giá ngày ở 17 địa bàn; gồm 5 hàng tỉnh (75 ô qua ba tuần) và 12 hàng địa bàn dưới tỉnh (180 ô). Trung bình tuần và tăng/giảm là cột dẫn xuất, **không** tính thành quan sát ngày bổ sung. Các hàng tỉnh/huyện có nhiều giá giống nhau; 255 ô không có nghĩa là 255 ngày hoặc 255 quan sát độc lập. Chỉ có **15 ngày phân biệt cho một địa bàn**, chia ba cụm năm ngày, trong khoảng lịch 215 ngày. Có 200 ngày không được mẫu này bao phủ; đó là thiếu trong mẫu nghiên cứu, **không** phải bằng chứng nguồn gốc thiếu 200 ngày. Chưa quét danh mục năm 2024/2025, chưa có số tuần toàn năm hoặc tỷ lệ đầy đủ toàn nguồn.

Mỗi bảng có Lâm Đồng, Đắk Lắk, Đắk Nông, Gia Lai, Kon Tum và các hàng dưới tỉnh. Giữ tên địa bàn nguyên bản và thời kỳ hiệu lực; chưa có ánh xạ địa giới/chứng minh so sánh được sau thay đổi hành chính. Không nối các tỉnh khác nhau hay tự lấy bình quân các huyện làm chuỗi của hợp tác xã.

## Loại giá và lỗi chất lượng

Nguồn A/B/C đặt tên bảng là giá cà phê nhân xô, đơn vị VNĐ/kg, ghi CTV Agroinfo và Giacaphe.com. Không thấy đặc tả độ ẩm, tạp chất, cỡ hạt, trọng số khảo sát hoặc cỡ mẫu trong các bảng được kiểm tra. Vì vậy `quality=unspecified`; không tự đổi thành hàng Robusta chuẩn cụ thể. Hàng tỉnh là giá tổng hợp/tham chiếu do nguồn công bố; chưa chứng minh là giá giao dịch hay giá thực nhận của hợp tác xã. Giữ phân biệt giá vật chất trong nước với kỳ hạn ICE ở trang khác của cùng báo cáo.

Hai kiểm tra lỗi cụ thể:

- A trang 3: phần văn bản ghi trung bình Lâm Đồng 128.000; trang 5 ghi 123.120, đúng bằng bình quân năm ô ngày. Đây là xung đột thật cần gắn cờ, không tự sửa phần văn bản hoặc coi mọi PDF sạch.
- C: trang 2 nói tuần quốc tế 16–20/06; phần trong nước trang 4 nói 23–27/06. Mẫu nội địa dùng khoảng **trong nước**, không lấy tuần quốc tế gán cho bảng. Cột bảng chỉ ghi thứ, nên parser phải có bằng chứng nối khoảng ngày và không suy từ số báo cáo/ISO week. Nếu hai bằng chứng mâu thuẫn, cách ly thay vì tự đoán.

Các hàng Đắk Lắk được giữ nguyên số nguyên VND: dấu chấm trong PDF là phân cách nghìn. Ví dụ `95.933` được chuẩn hóa thành `95933`, không phải 95,933 VND dạng thập phân. Giá tỉnh có thể đã làm tròn ở nguồn; không tính lại từ huyện rồi thay số gốc.

## Công bố và chống leakage

| PDF | Ngày bìa | HTTP Last-Modified trả về ở lần GET |
|---|---|---|
| A | 2024-12-02 | Tue, 03 Dec 2024 02:38:23 GMT |
| B | 2025-04-28 | Tue, 06 May 2025 03:55:12 GMT |
| C | 2025-06-30 | Tue, 01 Jul 2025 03:39:39 GMT |

Đây là header quan sát trên endpoint A/B/C, **không chứng minh** ngày xuất bản đầu tiên hoặc giờ dữ liệu thực sự khả dụng: có thể là tải lại/chỉnh sửa. Ngày trên bìa cũng không phải timestamp công bố đã xác thực. Chưa đủ cơ sở đo SLA/độ trễ lịch sử từ chúng. Trong mẫu, `published_at` và `available_at` để rỗng, `availability_status=original_publication_unknown`; giữ `report_date` và `collected_at` riêng. Không gán các giá thứ 2–6 là thông tin đã biết ngay trong ngày đó. Các bản hiện nay chỉ chứng minh đã lấy được vào ngày khảo sát; không dùng chúng như point-in-time feature trước công bố trong backtest.

CSV nghiên cứu gồm 15 dòng tỉnh Đắk Lắk, URL, SHA-256, trang, ngày quan sát, ngày báo cáo, mốc thu thập và trạng thái quyền. Checksum CSV: `70609e2d31d1d8a2ef38d3c8055e9f30c4a9c28bb69dad869530276fbd012c09`. Đây chưa phải hợp đồng nhập production vì thời điểm khả dụng gốc chưa biết.

Năm dòng mới nhất, đối chiếu C trang 7 và khoảng ngày nội địa trang 4:

| observed_on | locality | price_vnd_per_kg | report_date | published_at / available_at |
|---|---|---:|---|---|
| 2025-06-23 | Đắk Lắk | 95933 | 2025-06-30 | chưa biết |
| 2025-06-24 | Đắk Lắk | 98933 | 2025-06-30 | chưa biết |
| 2025-06-25 | Đắk Lắk | 94433 | 2025-06-30 | chưa biết |
| 2025-06-26 | Đắk Lắk | 92433 | 2025-06-30 | chưa biết |
| 2025-06-27 | Đắk Lắk | 93733 | 2025-06-30 | chưa biết |

## Giacaphe và Chợ Cà Phê: đường công khai và quyền

**Giacaphe.** [Trang giá nội địa](https://giacaphe.com/gia-ca-phe-noi-dia/) được GET thật HTTP 200 lúc 09:41:51 UTC, 173792 byte; SHA-256 `3ea1c3ddc56400d7ae092cc84921dc24dd6b6cdecc4c2349e791aef110581ad1`. HTML có ngày 20/11/2026 và giá trung bình chung, nhưng ô giá bốn tỉnh trong bảng nội địa trống ở HTML tĩnh. Không suy giá tỉnh từ trung bình chung. Trang giải thích phương pháp tham chiếu từ sàn kết hợp khảo sát doanh nghiệp/đại lý. [Lịch sử](https://giacaphe.com/lich-su-gia-ca-phe/) yêu cầu đăng nhập; dừng tại đó. [Điều khoản](https://giacaphe.com/gioi-thieu/dieu-khoan-su-dung/) chỉ ghi nội dung đang cập nhật, chưa có giấy phép dữ liệu được xác minh.

[robots.txt Giacaphe](https://giacaphe.com/robots.txt) GET 200 text/plain; SHA-256 `db936448cbcfe2d9533cfea9914615b54987d9a199a9a75621315a8cf37ef741`. User-agent `*` cấm các đường `/apps/`, `/media/`, `/quotes/`, `/service/`, `/services/`, `/tools/`, `/files/`, `/csdl/`, `/widgets/`, `/report/`, `/price/`, `/live-quotes/` cùng một số đường khác. Không gọi endpoint ẩn/các đường này để lấy ô giá. Chưa thấy API/export công khai có tài liệu trong phạm vi đã kiểm tra. Quyền tự động thu thập, huấn luyện, lưu và hiển thị lại: **chưa rõ**.

**Chợ Cà Phê.** [Trang Đắk Lắk](https://chocaphe.vn/gia-ca-phe-dak-lak.cfx) GET thật HTTP 200 lúc 09:41:51 UTC, 144693 byte; SHA-256 `357662e9337b2f84866d53a9d1a02bf4a22f91aca6f3d1a91d393c71e5a6371a`. Bảng HTML thực tải có năm ngày **16–20/11/2026** lần lượt 82000, 80000, 77000, 74800, 73800 VND/kg, nhãn Robusta nhân xô. Mô tả nguồn tổng hợp đại lý/thương lái/sàn; chưa có đặc tả trọng số/chất lượng. Web reader cùng buổi còn trả bản 19/11 và cửa sổ năm ngày cũ hơn: cần lưu snapshot thật và thời điểm GET, không coi kết quả cache tìm kiếm là snapshot vận hành. Nhãn biểu đồ 12 tháng không chứng minh đã có 12 tháng dữ liệu thô kiểm được.

[robots.txt Chợ Cà Phê](https://chocaphe.vn/robots.txt) GET 200 text/plain; SHA-256 `39c97fa723df1807ebc45178cae743c3b383a8dfa15d111ff68bb1409d662a2a`; User-agent `*` cho phép `/` nhưng **Disallow `/api/`**, ngoài đường quản trị/tài khoản. Không gọi API đó. [Trang điều khoản](https://chocaphe.vn/policy/dieu-khoan-su-dung) qua web reader không có nội dung cấp phép đọc được; footer giữ bản quyền công ty và ghi website thử nghiệm. Quyền tự động thu thập/lưu/huấn luyện/hiển thị lại: **chưa rõ**.

**AgroInfo.** [robots.txt](https://thitruongnongsan.gov.vn/robots.txt) trả HTTP 200 nhưng redirect tới [trang chủ HTML](https://thitruongnongsan.gov.vn/vn/default.aspx), không phải chính sách robots xác thực; SHA-256 response `237f5ffcba7426d93ac23ebc3037939b33f3ee94d58914156e7c16b6ea7a2909`. Không suy ra quyền crawl. Ba PDF ghi nguồn bên thứ ba; truy cập công khai và cơ quan công bố không mặc nhiên cấp quyền tái phân phối số liệu của bên thứ ba. Chưa tìm thấy giấy phép mở hoặc thỏa thuận dùng dữ liệu trong tài liệu/trang đã đọc. Cần xác nhận với đơn vị công bố cả phạm vi quyền của CTV/Giacaphe. Không liên hệ hay gửi thư trong đợt khảo sát này.

Robots là chỉ dẫn thu thập, **không phải giấy phép** tái sử dụng hoặc thay thế điều khoản truy cập. Một lần GET thành công chỉ chứng minh khả năng truy cập lúc khảo sát, không chứng minh ổn định, quota hoặc quyền chạy scheduler.

## Blocker và việc tiếp theo trong phạm vi an toàn

1. **Quyền dùng**: trước collector chạy định kỳ hoặc hiển thị lại, có văn bản/điều khoản rõ cho tự động thu thập, lưu, nghiên cứu/huấn luyện, công bố giá và dẫn nguồn; làm rõ thành phần bên thứ ba. Chưa cấp G0 pass bằng kết quả HTTP 200.
2. **Lịch sử**: khi quyền/phương thức cho phép, lập inventory hữu hạn 2024/2025 từ danh mục do nguồn công bố; kiểm tuần trùng, bản sửa, date gap và coverage theo từng địa bàn; không đoán URL rồi tải hàng loạt. Hiện có đúng ba tuần kiểm được.
3. **Ngữ nghĩa chuỗi**: chọn một địa bàn sau đối chiếu phương pháp, chất lượng hàng và thay đổi địa giới. Không khẳng định Đắk Lắk đã được chọn cho MVP chỉ vì CSV mẫu dùng Đắk Lắk.
4. **Khả dụng**: cần metadata công bố gốc hoặc quy ước backtest bảo thủ được chốt; giữ trạng thái chưa biết. Thu thập tiến cứu theo lịch được phép sẽ giúp chứng minh độ trễ hiện tại, nhưng không sửa được thời điểm công bố quá khứ.
5. **Parser/kiểm tra**: có thể tiếp tục thiết kế hợp đồng nhập, quarantine khi sai ngày/đơn vị, chống trùng bằng nguồn/hash/địa bàn/ngày, và fixture tự tạo gắn nhãn synthetic để kiểm phần mềm. Không dùng synthetic làm bằng chứng chất lượng dự báo. Với dữ liệu thật, giữ nguyên raw + checksum; so bảng và tường thuật; không biến trung bình tuần thành ngày.
6. **Nhịp vận hành**: tìm đường cập nhật ngày được cho phép hoặc trình phương án điều chỉnh nếu chỉ có báo cáo tuần. Nhập tệp thủ công hỗ trợ hồi phục nhưng không chứng minh FR-03 thu thập tự động.

World Bank/Open-Meteo không được kiểm chứng thêm trong đợt này; các kết luận sơ bộ trước đó không được nâng thành bằng chứng API đã chạy. Chúng không thay thế target giá thu mua nội địa hoặc tháo gỡ các blocker G0 trên.

## Tái lập kiểm đếm từ checkout sạch

Bổ sung ngày 20/11/2026: script `scripts/recheck_coffee_g0.py` thay thế phần kiểm đếm vốn chỉ có trong thư mục nghiên cứu ngoài repository. Script chỉ nhận đúng ba PDF theo SHA-256 ở trên, kiểm 17 hàng × 5 ô ngày trên trang bảng của từng PDF và dừng nếu nội dung thay đổi. Ngày quan sát vẫn phải đối chiếu thủ công với khoảng ngày **thị trường trong nước**; script không suy ngày công bố hay quyền dùng từ HTTP header.

```powershell
python -m pip install pypdf==6.6.0
python scripts/recheck_coffee_g0.py --fetch
# Chạy lại trên bản đã lưu, không gọi nguồn:
python scripts/recheck_coffee_g0.py
```

Đã chạy lại bằng Python 3.14.0/pypdf 6.6.0 trên Windows: ba checksum trùng mẫu gốc, mỗi PDF 17 hàng/85 ô ngày, tổng 255 ô; ba tuần rời nhau chỉ có 15 ngày cho một địa bàn. Kết quả JSON lưu ở `data/research/recheck.json`, vẫn bị gitignore. `--fetch` chỉ tải hữu hạn ba URL đã nêu; không phải connector, lịch thu thập hay quyết định cấp phép. Các script nghiên cứu cũ và hiện vật HTML ngoài repository chưa được khôi phục; không tuyên bố script mới tái lập phần khảo sát HTML/robots hoặc thời điểm công bố gốc.
