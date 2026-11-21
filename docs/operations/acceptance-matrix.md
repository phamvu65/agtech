# Ma trận bằng chứng AGTECH-01

Phạm vi tổng hợp: phần mềm dùng fixture theo xác nhận của người dùng. **Đạt fixture** nghĩa là hành vi đã kiểm tra trên dữ liệu tự tạo, không có nghĩa nguồn/model/ngưỡng vận hành được nghiệm thu. Backend là API + PostgreSQL thật. Web là Playwright Edge cục bộ và Chromium CI. Mobile TypeScript/lint không thay cho native runtime.

## User stories

| US | Ca kiểm chứng / artifact | Nền tảng và kết quả | Giới hạn/lỗi còn mở |
|---|---|---|---|
| 01 | `test_auth.py`, `auth.spec.ts`; mobile/session | API/web đạt; mobile có code | Native hành trình chưa đạt đủ hai nền tảng |
| 02 | `test_prices.py`, `prices.spec.ts` | API/web đạt fixture; mobile lịch sử | Không có giá thị trường đã duyệt |
| 03 | create-series + history metadata tests | API/web đạt fixture | Quyết định địa bàn thật chưa chốt |
| 04 | history/date filter tests, PriceChart | API/web đạt fixture | Mobile chưa có runtime evidence |
| 05 | missing-day history + chart tests | API/web đạt, không điền giá | — |
| 06 | CSV provenance/raw-byte download tests | API/web đạt fixture | Nguồn thật còn gate |
| 07 | `test_forecasts.py`, `analysis.spec.ts` | Bảy ngày UTC fixture đạt | Official forecast unavailable |
| 08 | immutable forecast GET/latest/history + UI | API/web đạt fixture | Mobile code, native chưa nghiệm thu |
| 09 | per-horizon payload/table assertion | API/web đạt fixture | Không chứng minh MAE thị trường |
| 10 | official forecast/stale risk tests | API/web đạt unavailable | Tuổi dữ liệu vận hành chưa kiểm chứng |
| 11 | `test_risk.py` anomaly independent; UI context | API/web đạt fixture | Phương pháp/ngưỡng thật chưa validation |
| 12 | anomaly + LOW boundary test | API/web đạt fixture | Không tự biến anomaly thành HIGH |
| 13 | exact T1/T2 arithmetic test | API/web đạt fixture | T1/T2 chỉ số kiểm thử, không operational |
| 14 | `test_personal.py`, analysis web follow | API/web đạt | Mobile dùng cùng API |
| 15 | owner filtering/pagination + shared API | API đạt; web có thao tác | Chưa có hành trình thiết bị native đồng bộ |
| 16 | LOW→MEDIUM→HIGH→LOW transitions | API/web đạt fixture | Chính sách khôi phục chính thức chờ validation |
| 17 | repeated HIGH/idempotent assessment test | API đạt fixture | — |
| 18 | saved forecast/risk API + web expand history | API/web đạt fixture | Kết quả bất biến; mobile có UI |
| 19 | private inbox/read foreign-user 404; web read | API/web đạt fixture | Native read-state journey còn thiếu |
| 20 | web forced-source failure + retry; mobile timeout | API/web lỗi/khôi phục đạt; mobile có code | Native mất mạng chưa xác minh |
| 21 | mobile useRemote last-success timestamp | Mobile có code | Chưa kiểm tra trên thiết bị |
| 22 | native build/runtime evidence | Chưa đủ hai nền tảng | iOS không có môi trường; Android đang xác minh |
| 23 | `test_auth.py`, auth admin browser journey | API/web đạt | Không có admin UI mobile |
| 24 | `test_collectors.py`, collectors web tests | Scheduler/worker fixture đạt | Nguồn thật no-go |
| 25 | `test_prices.py`, CSV upload journey | API/web đạt | — |
| 26 | invalid/duplicate/conflict/retry tests | API/web đạt | — |
| 27 | original byte/hash/provenance tests | API/web đạt | Lịch sử không overwrite |
| 28 | collector concurrent/retry/lease tests | API/web đạt fixture | Connector thật chưa được phép |
| 29 | collector failure/log/blocked UI tests | API/web đạt fixture | — |
| 30 | `test_analysis.py`, lab backtest | API/web đạt fixture | Không được suy ra chất lượng AI |
| 31 | snapshot SHA/model artifact/immutable forecast tests | API/web đạt fixture | — |
| 32 | G0 report PR16 + source decision | Điều tra hoàn tất, nguồn chưa đạt | 15 ngày/địa bàn; quyền/cập nhật chưa rõ |
| 33 | point-in-time, split/missing targets tests | API đạt fixture | Test chính thức chưa mở; tiêu chí chưa freeze |
| 34 | backend/web CI, mobile build reports | Bằng chứng cục bộ được ghi | Không có iOS native acceptance/public deployment |
| 35 | blocked official backtest/forecast/risk | API/web đạt trạng thái chưa đủ cơ sở | Chưa có model đạt nghiệm thu |

## Functional / non-functional requirements

| Mã | Ca kiểm chứng / US | Kết quả / giới hạn |
|---|---|---|
| FR-01 | US01/23, auth API/browser | Đạt API/web; native pending |
| FR-02 | US02/03/32, source-series metadata | Fixture đạt; nguồn thật no-go |
| FR-03 | US24/28, collectors + references API | Fixture đạt; chưa bật connector thật |
| FR-04 | US25/26, CSV + raw audit | Đạt API/web |
| FR-05 | US03/05/26/27, immutable observations | Đạt API/web fixture |
| FR-06 | US02/04/05/06, history/reference browser | Đạt fixture; monthly giữ tần suất riêng |
| FR-07 | US07–10/30/33/35, analysis/forecast | Hành vi fixture đạt; chất lượng AI chưa đạt |
| FR-08 | US11/12, anomaly context | Fixture đạt; ngưỡng vận hành chưa kiểm chứng |
| FR-09 | US10/12/13/35, risk boundaries/unavailable | Fixture đạt; operational disabled |
| FR-10 | US14/15, private following | API/web đạt; native journey pending |
| FR-11 | US16/17/19, personal transitions/read | API/web fixture đạt; recovery chưa chốt |
| FR-12 | US08/18/31, saved histories | API/web đạt fixture |
| FR-13 | US24/28/29/30, durable tasks/admin lab | Fixture đạt |
| FR-14 | US01/15/19/22/34, mobile | Có code; chưa nghiệm thu đủ Android/iOS |
| FR-15 | US20/21/34, retry/stale UI | Có code; native network journey chưa đủ bằng chứng |
| NFR-01 | US06/09/27/31, raw/snapshot/hash/artifact | Đạt fixture API/web |
| NFR-02 | US06/21/32/33, availability/split/UTC | API fixture đạt; native timestamp chưa runtime |
| NFR-03 | auth owner/admin + local TLS operations drill | API/web và TLS local đạt; public ingress chưa kiểm chứng |
| NFR-04 | collector lease/retry + `verify_operations.py` | Restore thực đạt, history/raw bytes/login khớp |
| NFR-05 | browser small viewport/errors/empty/missing | Web đạt; native trải nghiệm chưa đủ bằng chứng |
| NFR-06 | operations API20 requests + dashboard3 warm loads | Đạt budget cục bộ 1s API p95 /5s dashboard; không tuyên bố tải production |

## Ticket và kết luận nghiệm thu

#4–#7 đã đóng theo phạm vi kiểm chứng/phần mềm tương ứng. #8–#13 đã có phần mềm fixture nhưng không đóng thay gate nguồn thật, quality model, ngưỡng/cách khôi phục chính thức. #14 thiếu nghiệm thu native hai nền tảng; #15 thiếu deployment công khai và nghiệm thu xuyên nền tảng. Giữ #1 mở. Chi tiết lệnh, phiên bản và số đo ở [analysis](analysis.md), [mobile](mobile.md), [deployment](deployment.md); CI/PR là nguồn trạng thái cập nhật.
