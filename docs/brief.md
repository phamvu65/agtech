 # Brief

**Mã đề:** EDU-04 · **Đội:** T-080 · **Ngày:** 15/11/2026  
**Lĩnh vực:** A — AI Giáo dục · **Tên sản phẩm:** Pinky

## Bài toán

Khi tìm hiểu một chủ đề, người học thường phải tự tổng hợp kiến thức từ giáo trình, tài liệu PDF, bài blog và video YouTube. Các nguồn có thể trùng lặp, khác cách giải thích hoặc chưa được kiểm chứng, khiến việc tìm ý chính và sắp xếp thành bài học dễ hiểu mất nhiều thời gian. Người quản lý học liệu cũng khó theo dõi nguồn gốc, phiên bản, chất lượng và quyền sử dụng của tài liệu đến từ nhiều nơi.

## Người dùng mục tiêu

- **Người học:** Học sinh, sinh viên, người đi làm hoặc người tự học; muốn tìm hiểu theo chủ đề, nhận giải thích dễ hiểu và có nguồn để kiểm tra. Thành công được đo bằng độ đúng của câu trả lời và chất lượng bài học.
- **Người kiểm duyệt học liệu:** Giảng viên, chuyên gia hoặc nhân sự hỗ trợ học thuật; cần kiểm tra nguồn gốc, chất lượng, quyền sử dụng và quyết định tài liệu nào được công bố, ai được xem. Thành công được đo bằng tỷ lệ học liệu được duyệt trước khi công bố và kết quả kiểm thử phân quyền.

## Giải pháp

**Pinky là một website giúp người dùng tìm hiểu kiến thức từ nhiều nguồn đã được chọn lọc, đặt câu hỏi có dẫn nguồn và tạo bài học từ chính những tài liệu đó.**

1. **Knowledge Hub:** Tiếp nhận tài liệu (PDF, slide), bài blog và video có transcript được phép xử lý. Lưu loại nguồn, chủ đề, tác giả/đơn vị phát hành, đường dẫn, ngày hoặc phiên bản, thông tin quyền sử dụng và trạng thái duyệt. Chỉ người kiểm duyệt mới có thể duyệt nguồn; chỉ nguồn đã duyệt và được phép sử dụng mới xuất hiện trong kết quả cho người học.
2. **Academic Assistant:** Tìm và tổng hợp kiến thức chỉ từ nguồn đã duyệt mà người dùng có quyền xem. Câu trả lời dẫn đến đúng trang tài liệu, đoạn bài viết hoặc mốc thời gian video; nếu nguồn không đủ, trợ lý phải nói rõ chưa đủ thông tin thay vì suy đoán.
3. **Learning Assistant:** Tạo **bản nháp** bài học từ các nguồn liên quan, gồm mục tiêu, nội dung theo từng phần, ví dụ, câu hỏi tự luyện và tài liệu tham khảo. Người học có thể hỏi tiếp dựa trên những nguồn họ được phép xem. Bản nháp chỉ được chia sẻ hoặc xuất bản sau khi người kiểm duyệt kiểm tra.
4. **Điều phối và kiểm soát:** Có thể phân loại yêu cầu thành tìm kiếm, hỏi đáp hoặc tạo bài học; việc xác thực danh tính, phân quyền, duyệt nguồn và duyệt bài học do quy tắc phần mềm và người có trách nhiệm quyết định, không do AI tự thực hiện. Ghi nhận trạng thái duyệt và các lần truy cập để phục vụ kiểm tra.

**Phạm vi thí điểm:** Web app với hai vai trò (người học/người kiểm duyệt), hai chủ đề được nhóm dự án xác định trước khi thu thập học liệu, ba loại nguồn (tài liệu gồm PDF/slide, blog, video có transcript được phép xử lý) và chức năng tạo bài học dạng văn bản. Không tìm kiếm Internet ngoài kho học liệu đã duyệt.

## Vì sao cần AI

- **Cần LLM + RAG:** Hiểu câu hỏi tự nhiên, tổng hợp và giải thích kiến thức theo cấu trúc bài học. RAG giúp câu trả lời dựa trên các đoạn trích được truy xuất và gắn với nguồn; việc này hỗ trợ kiểm chứng nhưng không tự bảo đảm thông tin đúng, nên vẫn cần đánh giá và kiểm duyệt.
- **Không cần AI:** Đăng nhập, phân quyền, kiểm duyệt nguồn, quản lý phiên bản, lưu lịch sử và kiểm tra quyền sử dụng là những phần có quy tắc rõ ràng trong phần mềm.
- **Agent/router:** Chỉ hỗ trợ nhận biết yêu cầu là tìm kiếm, hỏi đáp hay tạo bài học; AI không tự cấp quyền xem hoặc tự phê duyệt nội dung.

## Không làm (Non-goals)

- Không tìm và dùng trực tiếp nguồn Internet chưa được kiểm duyệt để trả lời hoặc tạo bài học.
- Không bao phủ mọi lĩnh vực ngay từ đầu; chỉ thử nghiệm trên hai chủ đề có học liệu hợp lệ.
- Không làm hộ bài thi, bài tập về nhà hoặc sinh bài nộp hoàn chỉnh cho người học.

## Đo thành công bằng gì

Các ngưỡng dưới đây là tiêu chí nghiệm thu cho bộ kiểm thử thí điểm, không phải cam kết về mọi tình huống sử dụng:

1. **Trả lời đúng ≥80%:** Ít nhất **24/30** câu hỏi đại diện cho hai chủ đề được giảng viên/chuyên gia chuẩn bị đáp án và rubric trước khi thử nghiệm phải đạt yêu cầu. Câu trả lời đạt khi đúng trọng tâm, không có sai sót kiến thức đáng kể và có căn cứ từ nguồn được phép; với câu hỏi không đủ nguồn, đạt nếu trợ lý nêu rõ giới hạn và không suy đoán. Chấm theo rubric đã thống nhất trước khi thử nghiệm.
2. **Trích dẫn đúng ≥90%, không lộ quyền truy cập:** Chấm toàn bộ trích dẫn trong 30 câu trả lời; ít nhất **90%** phải dẫn đúng nguồn và đúng vị trí (trang/đoạn/mốc thời gian), đồng thời hỗ trợ cho nhận định đi kèm. Trong **20/20** tình huống kiểm thử phân quyền, người dùng không được phép xem tài liệu không nhận được nội dung hoặc trích dẫn từ tài liệu đó.
3. **Bài học dùng được:** Ít nhất **4/5** bài học mẫu, gồm bài từ cả hai chủ đề, được người kiểm duyệt chấm đạt ở cả ba tiêu chí: độ đúng kiến thức, cách trình bày và trích dẫn. Dùng thang điểm 1–4; đạt khi mỗi tiêu chí được chấm ít nhất **3/4**.
4. **Kiểm duyệt trước khi công bố:** **100%** nguồn và bài học được công bố trong thí điểm có trạng thái đã duyệt, thông tin nguồn gốc và quyền sử dụng được ghi nhận. Nội dung chưa duyệt chỉ hiển thị trong luồng kiểm duyệt, không hiển thị cho người học.
