# PRD — ScholarHub AI: Bộ Trợ lý Học thuật & Học tập Thông minh cho Trung tâm Hỗ trợ Học thuật

**Mã đề:** EDU-04 (Khối A · AI Giáo dục)  
**Đội:** P-080  
**Ngày cập nhật:** 15/11/2026  
**Trạng thái:** Gate 1 Baseline (Tích hợp kiến trúc Cloud-Offloaded Multimodal Ingestion & Agentic RAG)

---

## 1. Bối cảnh & Mục tiêu

### 1.1 Bối cảnh thực tế
Tại các Trung tâm Hỗ trợ Học thuật (Academic Support Center) trong trường đại học, kho học liệu (giáo trình PDF có nhiều bảng biểu/công thức, slide bài giảng chứa sơ đồ, các bài giảng video/audio do giảng viên cung cấp, đề cương môn học) rất lớn nhưng phân tán:
- **Sinh viên** mất nhiều thời gian lục tìm kiến thức rải rác trong tài liệu dài hoặc không biết nên xem lại bài giảng nào khi hổng kiến thức. Khi dùng các AI đại trà, câu trả lời thường không bám sát học liệu của trường, bỏ sót thông tin nằm trong bảng biểu/sơ đồ, thiếu trích dẫn chính xác, hoặc giải hộ bài tập gây vi phạm liêm chính học thuật.
- **Giảng viên & Cố vấn học tập** tốn nhiều công sức tổng hợp nội dung bài học từ các bài giảng/tài liệu tải lên, trả lời lặp lại các câu hỏi kiến thức nền tảng, đồng thời cần một cơ chế kiểm duyệt (**Human-in-the-loop**) để đảm bảo chỉ những tài liệu và bài học chuẩn xác mới được đưa vào kho tri thức phục vụ sinh viên.

### 1.2 Mục tiêu sản phẩm & Triết lý Kiến trúc (Tối ưu Tài nguyên Server & Tốc độ Truy vấn)
Xây dựng **ScholarHub AI** — hệ thống đa tác tử (Multi-Agent) kết hợp **Cloud-Offloaded Multimodal Ingestion** và **Agentic RAG** theo nguyên lý **"Nhẹ Server — Chuẩn dữ liệu lúc nạp (Ingestion) — Siêu tốc lúc tra cứu (Query)"**:
- **Ở khâu Giảng viên đẩy học liệu lên (Ingestion Pipeline):**
  - Thay vì chạy các mô hình OCR/Layout nặng nề trực tiếp trên server gây tốn RAM/CPU, hệ thống dùng cơ chế **Smart Page Routing (`PyMuPDF` siêu nhẹ kết hợp đẩy các trang PDF khó có bảng biểu/công thức/sơ đồ lên `Vision LLM API`)** để trích xuất ra Markdown và mô tả hình ảnh chuẩn xác nhất.
  - Khi Giảng viên đẩy các **bài giảng (video/audio/tài liệu bài giảng) kèm mô tả** lên hệ thống, AI sẽ phân tích nội dung âm thanh/văn bản (qua **Voice-to-Text API** & LLM) kết hợp với mô tả của giảng viên để **tự động bóc tách dữ liệu đặc trưng (chủ đề, khái niệm cốt lõi, tóm tắt bài học)** phục vụ việc lưu trữ và đề xuất bài học cho sinh viên sau này.
  - Toàn bộ kết quả phân tích được đưa qua cổng **HITL** để Giảng viên phê duyệt trước khi ghi vào **Qdrant**.
- **Ở khâu Sinh viên Hỏi đáp & Học tập (Query Pipeline):**
  - Toàn bộ kiến thức (văn bản, bảng biểu, mô tả ảnh, dữ liệu bài giảng) đã nằm sẵn trên **Qdrant** dưới dạng Vector + Sparse BM25. Khi sinh viên đặt câu hỏi (bằng văn bản hoặc giọng nói — **Voice-to-Text**), hệ thống truy xuất Hybrid siêu tốc (`< 100ms`), trả lời có trích dẫn nguồn rõ ràng và **tự động đề xuất đúng các bài giảng/bài học liên quan** mà giảng viên đã đẩy lên.

Hệ thống điều phối 3 trợ lý chuyên biệt:
1. **Academic Assistant (Trợ lý Học thuật):** Hỏi đáp chuyên sâu theo môn học bám sát giáo trình/bài giảng với trích dẫn nguồn từng câu (`[cite:chunk_id]`).
2. **Learning Assistant (Trợ lý Học tập):** Giải thích khái niệm theo phương pháp Socratic (gợi mở tư duy), gợi ý lộ trình ôn tập và **đề xuất các bài giảng/bài học liên quan** — **tuyệt đối không giải hộ bài tập tính điểm**.
3. **Knowledge Hub (Trung tâm Tri thức):** Tìm kiếm Hybrid (BM25 + Vector + Reranker), phân tích học liệu/bài giảng do Giảng viên tải lên kèm mô tả, và cung cấp cổng **HITL** để Giảng viên duyệt nội dung.

### 1.3 Chỉ số thành công (Success Metrics / KPIs)
- **Độ chính xác học thuật (Accuracy & Groundedness):** Đạt **≥ 80%** trên bộ dữ liệu kiểm chứng học thuật có nhãn (`eval/golden_dataset.yaml`, tối thiểu 30 câu hỏi bao gồm cả dữ liệu từ bảng biểu, hình ảnh và bài giảng).
- **Chỉ số RAGAS:** Faithfulness ≥ 0.80, Answer Relevancy ≥ 0.80, Context Precision ≥ 0.80.
- **Tỷ lệ tuân thủ Liêm chính học thuật (Academic Integrity Guardrail):** **100%** các truy vấn yêu cầu giải hộ bài tập tính điểm/đề thi đều được chặn và chuyển hướng sang hướng dẫn phương pháp (Socratic hints) + đề xuất bài giảng ôn tập.
- **Hiệu năng & Tài nguyên:** Server Backend giữ mức tiêu thụ RAM thấp (`< 512MB`) nhờ đẩy tác vụ xử lý trang PDF khó/âm thanh lên Cloud API; tốc độ truy xuất Hybrid trên Qdrant `< 100ms`, tổng thời gian phản hồi trung bình `< 5 giây`.

---

## 2. User Personas (Chân dung & Phân quyền Người dùng)

Hệ thống hỗ trợ tối thiểu **2 vai trò người dùng độc lập** với quyền hạn và giao diện tách biệt:

| Vai trò | Mô tả đối tượng | Mục tiêu chính (Goals) | Quyền hạn trong hệ thống (Permissions) |
| :--- | :--- | :--- | :--- |
| **1. Sinh viên (`student`)** | Sinh viên đại học đang theo học các học phần tại trường, cần tra cứu tài liệu, xem bài giảng/bài học được đề xuất và ôn thi đúng trọng tâm. | - Đặt câu hỏi (bằng văn bản hoặc giọng nói Voice-to-Text) và nhận câu trả lời có trích dẫn chuẩn xác.<br>- Nhận **đề xuất các bài giảng/bài học liên quan** ngay khi đang hỏi về một khái niệm hoặc xem lại trong kho bài học.<br>- Nhờ giải thích khái niệm khó và gợi ý lộ trình ôn tập. | - Truy cập 3 giao diện trợ lý (Academic, Learning, Knowledge Hub) và danh mục Bài giảng/Bài học đã duyệt.<br>- Chỉ được truy xuất học liệu thuộc các môn học được phân quyền (`status = approved`).<br>- Không được xem đáp án đề thi/bài tập tính điểm.<br>- Không có quyền upload/duyệt tài liệu gốc vào kho chung. |
| **2. Giảng viên / Quản trị học thuật (`lecturer`)** | Giảng viên phụ trách môn học, Trợ giảng (TA) hoặc Cố vấn tại Trung tâm Hỗ trợ Học thuật. | - Đẩy giáo trình PDF/Slide và các bài giảng (video/audio/link bài giảng) kèm mô tả lên hệ thống để AI phân tích, bóc tách kiến thức và tạo dữ liệu đề xuất cho sinh viên.<br>- Kiểm duyệt (HITL) nội dung trước khi công bố.<br>- Theo dõi các chủ đề sinh viên gặp khó khăn. | - Toàn quyền sử dụng 3 trợ lý như Sinh viên.<br>- Đẩy học liệu & bài giảng kèm mô tả, gắn metadata (môn học, phiên bản, phân quyền).<br>- **Quyền HITL Approval:** Xem trước kết quả AI phân tích (bảng biểu, mô tả ảnh, bản tổng hợp bài học & thẻ đề xuất) và bấm `Approve` / `Reject` trước khi lưu vào Qdrant.<br>- Xem Dashboard thống kê truy vấn & chất lượng học tập. |

---

## 3. User Stories (Tính năng theo mức độ ưu tiên)

### Ưu tiên P0 — Bắt buộc cho MVP (Gate 1 → Gate 2)
- **US-01 (Multi-Assistant Routing):** Là **Sinh viên**, tôi muốn gửi câu hỏi và được hệ thống tự động điều phối đến đúng trợ lý (**Academic Assistant**, **Learning Assistant**, hoặc **Knowledge Hub**), để nhận được phản hồi đúng mục đích học tập.
- **US-02 (Agentic RAG kèm Citation chuẩn xác):** Là **Sinh viên**, tôi muốn nhận câu trả lời có gắn nhãn trích dẫn `[cite:chunk_id]` (tên tài liệu, số trang hoặc bài giảng nguồn), để kiểm chứng ngay trong học liệu gốc mà không sợ AI bịa kiến thức.
- **US-03 (Learning Assistant & Academic Integrity Guardrail):** Là **Sinh viên**, khi tôi hỏi về một bài tập tính điểm hoặc khái niệm khó, tôi muốn AI giải thích lý thuyết nền tảng và gợi mở từng bước tư duy thay vì đưa đáp án chép sẵn, để tôi hiểu bản chất và tuân thủ quy chế học thuật.
- **US-04 (Cloud-Offloaded PDF Ingestion & Hybrid Qdrant):** Là **Giảng viên**, khi tôi đẩy lên các file PDF/Slide khó có lẫn bảng biểu và hình ảnh, tôi muốn hệ thống tự động nhận diện trang khó và đẩy lên **Vision LLM API** để trích xuất chuẩn xác bảng Markdown + mô tả hình ảnh rồi lưu vào **Qdrant** (BM25 + Vector), giúp tra cứu chính xác mà không làm nặng server.
- **US-05 (HITL Phê duyệt Học liệu & Bài học):** Là **Giảng viên**, trước khi học liệu hoặc dữ liệu bài giảng do AI phân tích được đưa vào Knowledge Hub (hoặc khi thực hiện hành động rủi ro như xoá tài liệu, gửi email lớp học), tôi muốn hệ thống tạm dừng (`interrupt`) để tôi kiểm tra và bấm **Approve / Reject**.

### Ưu tiên P1 — Quan trọng (Phân tích Bài giảng, Voice-to-Text & Đề xuất Học tập)
- **US-06 (Phân tích Bài giảng kèm Mô tả & Tổng hợp Bài học):** Là **Giảng viên**, khi tôi đẩy một bài giảng (video/audio/tài liệu bài giảng) kèm theo phần mô tả lên hệ thống, tôi muốn AI tự động phân tích (kết hợp Voice-to-Text nếu có âm thanh và phân tích ngữ nghĩa mô tả/nội dung) để tổng hợp thành **Bài học (Study Note)** và bộ thẻ chủ đề (topic tags), làm dữ liệu gợi ý cho sinh viên.
- **US-07 (Tự động Đề xuất Bài học/Bài giảng liên quan cho Sinh viên):** Là **Sinh viên**, khi tôi đang đặt câu hỏi về một chủ đề hoặc khái niệm trên khung chat, tôi muốn hệ thống tự động đối chiếu và đề xuất ngay các **Bài giảng / Bài học tổng hợp** có liên quan mà giảng viên đã tải lên, đồng thời cho phép tôi lưu lại hoặc mở xem chi tiết.
- **US-08 (Hỗ trợ Voice-to-Text hai chiều):** Là **Sinh viên / Giảng viên**, tôi muốn sử dụng tính năng chuyển giọng nói thành văn bản (Voice-to-Text API) để sinh viên có thể đặt câu hỏi bằng giọng nói và hệ thống có thể bóc tách nội dung âm thanh từ bài giảng của giảng viên.
- **US-09 (Phân quyền theo môn học & vai trò):** Là **Giảng viên**, tôi muốn giới hạn phạm vi truy cập học liệu theo vai trò (`student` vs `lecturer`) và mã môn học (`course_id`) ngay trong bộ lọc Payload của Qdrant.

### Ưu tiên P2 — Mở rộng (Tối ưu hóa & Phân tích chiều sâu)
- **US-10 (Semantic Caching & Dedup):** Là **Quản trị hệ thống**, tôi muốn lưu cache các câu hỏi học thuật trùng lặp về ngữ nghĩa giữa các sinh viên trong mùa ôn thi, để tiết kiệm chi phí LLM và giảm độ trễ phản hồi.
- **US-11 (Learning Analytics Dashboard):** Là **Giảng viên**, tôi muốn xem thống kê các khái niệm sinh viên hỏi nhiều nhất và đối chiếu với bộ dữ liệu giáo dục mở (OULAD / EdNet / ASSISTments), để điều chỉnh bài giảng kịp thời.

---

## 4. Luồng chính (Happy Paths — Nhẹ Server lúc Nạp, Siêu tốc lúc Tra cứu)

### 4.1 Luồng 1: Giảng viên đẩy Học liệu / Bài giảng & AI Phân tích (Cloud-Offloaded Ingestion Pipeline)
1. **Bước 1 (Upload Học liệu + Mô tả):** Giảng viên đăng nhập (`role = lecturer`), chọn môn học (`course_id`), đẩy tài liệu (PDF, Slide) hoặc bài giảng (Video/Audio/Link bài giảng) **kèm theo mô tả của giảng viên** lên hệ thống.
2. **Bước 2 (Xử lý Đa phương thức qua Cloud API — Không gây nặng Server):**
   - **Với file PDF/Slide:** Hệ thống dùng `PyMuPDF` (siêu nhẹ trên server) quét nhanh từng trang:
     - *Trang văn bản thường:* Trích xuất trực tiếp trong vài mili-giây.
     - *Trang khó (chứa bảng biểu phức tạp, công thức, biểu đồ/hình ảnh học thuật):* Tự động chuyển trang/hình ảnh đó lên **Vision LLM API (`gpt-4o-mini`)** để bóc tách thành bảng Markdown chuẩn và sinh đoạn mô tả học thuật chi tiết cho hình ảnh.
   - **Với Bài giảng (Video/Audio) kèm mô tả:** Nếu bài giảng có âm thanh, hệ thống đẩy qua **Voice-to-Text API (Whisper)** để lấy văn bản, sau đó kết hợp cùng **mô tả của giảng viên** đưa vào LLM phân tích.
3. **Bước 3 (Tổng hợp Bài học & Trích xuất Dữ liệu Đề xuất):**
   - Từ dữ liệu đã bóc tách và mô tả của giảng viên, AI tự động tạo ra:
     - **Bản Tổng hợp Bài học (Structured Lesson Note):** Tóm tắt nội dung cốt lõi, các khái niệm chính, công thức quan trọng.
     - **Metadata phục vụ Đề xuất (Recommendation Metadata):** Các chủ đề liên quan (`key_concepts`, `learning_objectives`, `difficulty_level`) để khớp với câu hỏi của sinh viên sau này.
4. **Bước 4 (Cổng kiểm duyệt HITL — `human_review_node`):**
   - Hệ thống tạm dừng (`interrupt`), hiển thị kết quả bóc tách và Bản tổng hợp bài học cho Giảng viên kiểm tra.
5. **Bước 5 (Lưu trữ lên Qdrant):**
   - Khi Giảng viên bấm **`Approve`**, hệ thống tạo **Dense Vector** + **Sparse Vector (BM25)** và lưu vào **Qdrant** (gồm cả các đoạn kiến thức chi tiết để trả lời RAG và bản Bài học tổng hợp để đề xuất cho sinh viên).

### 4.2 Luồng 2: Sinh viên Hỏi đáp Agentic RAG & Nhận Đề xuất Bài học (Truy vấn nhanh trên Qdrant)
1. **Bước 1 (Input Text / Voice-to-Text):** Sinh viên nhập câu hỏi bằng văn bản hoặc nói qua micro (chuyển thành văn bản qua Voice-to-Text API).
2. **Bước 2 (Entry & Input Guardrail — `guardrail_check_node`):**
   - Khởi tạo `AgentState` (`max_iterations = 8`).
   - Kiểm tra qua `guardrails.check_input()`: Chặn Prompt Injection (`stage = "refusal"`) và phát hiện câu hỏi xin đáp án bài tập tính điểm để bật chế độ gợi mở `socratic_hint`.
3. **Bước 3 (Reasoning & Multi-Assistant Routing — `reason_node`):**
   - Dùng model nhẹ (`get_llm("classify")` — `gpt-4o-mini`) xác định nhánh trợ lý (**Academic**, **Learning**, hoặc **Knowledge Hub**) và sinh quyết định gọi tool theo schema Pydantic `AgentDecision`.
4. **Bước 4 (Fast Hybrid Retrieval trên Qdrant & Đề xuất Bài học — `act_node`):**
   - Thực thi tool `search_knowledge`: Truy vấn trên **Qdrant** bằng **Hybrid Search (Dense Vector + Sparse BM25)** kết hợp lọc metadata (`course_id`, `status="approved"`) và chấm điểm lại bằng **Reranker**. Vì mọi bảng biểu, hình ảnh và bài giảng đã được xử lý sạch từ Luồng 1, bước tra cứu trên Qdrant diễn ra cực nhanh (`< 100ms`).
   - Đồng thời, hệ thống đối chiếu ngữ nghĩa câu hỏi của sinh viên với kho **Bài giảng/Bài học đã được AI phân tích trên Qdrant** để lấy ra các bài học có liên quan nhất.
5. **Bước 5 (Self-Assessment — `assess_node`):**
   - Agent tự đánh giá dữ kiện trong `tool_trace` đã đủ căn cứ trả lời chưa. Nếu chưa đủ và `iteration_count < 8`, Agent tự động tinh chỉnh truy vấn để tìm bổ sung (Agentic RAG). Nếu chạm trần 8 vòng, thoát qua `finalize_with_partial`.
6. **Bước 6 (Generation & Output Guardrail — `finalize_node`):**
   - Dùng model mạnh (`get_llm("generate")` — `gpt-4o`) sinh câu trả lời bám sát tài liệu kèm trích dẫn `[cite:chunk_id]`, kiểm tra qua `guardrails.check_output_text()` và hiển thị cho sinh viên **kèm theo danh sách Bài giảng / Bài học tổng hợp được đề xuất** (sinh viên có thể bấm xem ngay hoặc lưu lại để ôn tập).

---

## 5. Human-in-the-loop (HITL)

Hệ thống sử dụng cơ chế `interrupt()` và `Command(resume=...)` của LangGraph (`src/agents/nodes/human_review_node.py` và `POST /api/v1/chat/resume`) cho các hành động rủi ro:

| Hành động rủi ro (`RISKY_TOOL_NAMES`) | Ai là người duyệt? | Thời điểm tạm dừng (Interrupt) | Thông tin hiển thị trên màn hình xác nhận | Hành vi khi Approve vs. Reject |
| :--- | :--- | :--- | :--- | :--- |
| **1. `publish_to_knowledge_hub`** (Phê duyệt đưa tài liệu/bài giảng đã phân tích & Bài học tổng hợp vào Qdrant) | Giảng viên (`lecturer`) | Sau khi AI đã phân tích xong PDF/bài giảng + mô tả của giảng viên và tạo bản nháp Bài học tổng hợp, nhưng **trước khi** ghi vào Qdrant phục vụ sinh viên. | - Tên tài liệu/bài giảng, môn học (`course_id`), mô tả gốc của giảng viên.<br>- Kết quả bóc tách bảng/ảnh và bản xem trước **Bài học tổng hợp (Study Note)** + các thẻ khái niệm đề xuất.<br>- Cảnh báo nếu phát hiện nội dung chứa đáp án đề thi/bài tập. | - **Approve:** Ghi chính thức các chunks và Bài học vào Qdrant (`status = approved`).<br>- **Reject:** Hủy ghi vào Qdrant, lưu lý do từ chối vào `human_decisions` để chỉnh sửa. |
| **2. `delete_or_archive_document`** (Xoá hoặc thu hồi tài liệu/bài giảng khỏi Knowledge Hub) | Giảng viên (`lecturer`) | Trước khi xoá hoặc đổi trạng thái các bản ghi tương ứng trong Qdrant. | - Tên tài liệu/bài giảng, mã `doc_id`, số lượng chunks bị ảnh hưởng.<br>- Lý do thu hồi. | - **Approve:** Gỡ tài liệu/bài giảng khỏi phạm vi tìm kiếm và đề xuất của sinh viên.<br>- **Reject:** Giữ nguyên dữ liệu trong Qdrant, ghi nhận vào `tool_trace`. |
| **3. `send_email`** (Gửi email thông báo bài học mới hoặc lộ trình ôn tập cho sinh viên) | Giảng viên hoặc Người dùng thực hiện lệnh | Trước khi thực thi gửi email ra bên ngoài (`src/agents/tools/risky_tools.py`). | - Người nhận (`to`), Tiêu đề (`subject`), Nội dung chi tiết (`body`). | - **Approve:** Gửi email và lưu kết quả vào `tool_trace`.<br>- **Reject:** Hủy gửi email và phản hồi xác nhận đã hủy. |

---

## 6. Xử lý lỗi & Giới hạn hệ thống (Error Handling, Guardrails & Limitations)

Hệ thống áp dụng nguyên tắc **Defence-in-Depth (Prompt + Code Guardrails)** và **Fail Loudly**:

1. **Khi Sinh viên yêu cầu giải hộ bài tập tính điểm / đề thi (Academic Integrity):**
   - **Xử lý:** Guardrail chặn việc xuất lời giải trực tiếp. Agent giải thích khái niệm liên quan từ giáo trình, gợi ý hướng tư duy (Socratic) và **đề xuất Bài giảng/Bài học tổng hợp tương ứng** để sinh viên tự ôn lại.
2. **Khi câu hỏi nằm ngoài kho tài liệu học thuật (Chống Bịa / Hallucination):**
   - **Xử lý:** Nếu điểm tương đồng trên Qdrant / Reranker thấp hơn ngưỡng cho phép, Agent **tuyệt đối không tự bịa bằng kiến thức ngoài**, mà thông báo rõ: *"Không tìm thấy thông tin này trong kho học liệu đã phê duyệt của môn học"* kèm gợi ý từ khóa hoặc liên hệ Giảng viên.
3. **Khi file PDF/Bài giảng đẩy lên bị hỏng hoặc lỗi kết nối Cloud API:**
   - **Xử lý:** Nếu trang PDF bị lỗi định dạng hoặc API Vision/Voice-to-Text gián đoạn, pipeline ghi log `FAILED` rõ ràng và báo lỗi chi tiết cho Giảng viên tại màn hình Upload (không lưu dữ liệu lỗi/rỗng vào Qdrant).
4. **Khi phát hiện tấn công Prompt Injection / Jailbreak:**
   - **Xử lý:** Node `guardrail_check` chặn ngay từ đầu bằng regex trong `src/agents/guardrails.py` (`ignore previous instructions`, `reveal system prompt`, `DAN`...) và trả về `stage = "refusal"`.
5. **Khi LLM trả sai định dạng Schema hoặc chạm giới hạn vòng lặp (`max_iterations = 8`):**
   - **Xử lý:** Mọi quyết định của Agent đều ép qua Pydantic (`guardrails.validate_output`). Nếu sau 8 bước Agentic RAG vẫn chưa gom đủ thông tin, node `assess` tự động chuyển sang nhánh thoát hiểm `finalize_with_partial`, trả về phần thông tin đã xác thực kèm cảnh báo rõ ràng.
6. **Giới hạn hệ thống (System Limitations công bố rõ với người dùng):**
   - Hệ thống chỉ trả lời và đề xuất bài học dựa trên các tài liệu/bài giảng đã được Giảng viên đẩy lên và phê duyệt trong Qdrant.
   - Không chấm điểm bài làm chính thức thay Giảng viên và không thay thế thông báo quy chế đào tạo của nhà trường.

---

## 7. Dữ liệu (Data Sources & Cấu trúc Lưu trữ trên Qdrant)

1. **Nguồn dữ liệu sử dụng:**
   - **Kho học liệu & Bài giảng mẫu (Academic Corpus):**
     - Tài liệu PDF/Slide giáo trình, đề cương môn học (Syllabus) có chứa bảng biểu, sơ đồ và công thức.
     - Các bài giảng (video/audio/nội dung bài giảng) kèm mô tả của giảng viên để AI phân tích, tổng hợp thành bài học và làm dữ liệu đề xuất cho sinh viên.
   - **Bộ dữ liệu giáo dục mở & Khung năng lực tham chiếu (Public Benchmarks):**
     - **OULAD (Open University Learning Analytics Dataset)** / **EdNet (Riiid)** / **ASSISTments**: Phục vụ kiểm chứng mô-đun theo dõi trạng thái năng lực và gợi ý lộ trình học tập.
     - **Khung kỹ năng ESCO / O*NET**: Đối chiếu chuẩn đầu ra môn học.
   - **Golden Dataset kiểm thử (`eval/golden_dataset.yaml`):** Bộ ≥ 30 câu hỏi có nhãn (bao gồm câu hỏi tra cứu văn bản, bảng biểu, hình ảnh/sơ đồ, nội dung bài giảng và câu hỏi gài bẫy xin đáp án bài tập).
2. **Tổ chức Lưu trữ trên Qdrant (Tối ưu cho cả RAG lẫn Đề xuất Bài học):**
   - **Collection 1 (`academic_chunks`):** Lưu trữ từng đoạn kiến thức chi tiết (Dense Vector + Sparse BM25 Vector) kèm Payload: `doc_id`, `course_id`, `source_type` (`pdf` | `slide` | `lecture`), `page_or_section`, `image_or_table_md`, `access_role`, `status`.
   - **Collection 2 (`synthesized_lessons`):** Lưu trữ các **Bài học tổng hợp & Bài giảng** (gồm tiêu đề, mô tả của giảng viên, bản tóm tắt bài học do AI phân tích, danh sách khái niệm chính) để sinh viên xem/lưu lại và để hệ thống đề xuất tức thì khi sinh viên hỏi các câu có liên quan.
3. **Cam kết Bảo mật & Quyền riêng tư:**
   - Chỉ sử dụng học liệu mở, dữ liệu công khai, dữ liệu mô phỏng hoặc đã ẩn danh 100% (không chứa PII của sinh viên/giảng viên thật).

---

## 8. Tech Stack

Tech stack kết hợp bộ khung chuẩn trong `src/` của repo `P-080` và kiến trúc **Cloud-Offloaded Ingestion + Qdrant** giúp bảo toàn tài nguyên server:

| Lớp kiến trúc | Công nghệ sử dụng | Trạng thái trong Repo `P-080` & Kế hoạch tích hợp |
| :--- | :--- | :--- |
| **Backend API** | Python 3.11/3.12 + FastAPI + Pydantic v2 | **Đã có sẵn** (`src/main.py`, `src/api/routes.py`). Mở rộng thêm endpoints cho Giảng viên đẩy học liệu/bài giảng, quản lý Bài học & Voice-to-Text. |
| **Agent Orchestration** | LangGraph 1.x + LangChain | **Đã có sẵn** khung ReAct loop + HITL Checkpointer (`src/agents/graph.py`). Mở rộng thêm Multi-Assistant routing và đề xuất bài học liên quan. |
| **LLM Cascade Router** | OpenAI API (`gpt-4o-mini` & `gpt-4o`) | **Đã có sẵn** (`src/services/llm.py`) tách biệt `classify` (`gpt-4o-mini`), `generate` (`gpt-4o`), và `judge` (`gpt-4o-mini`). |
| **Cloud-Offloaded Multimodal Ingestion (Nhẹ Server)** | - **Lọc trang PDF nhẹ:** `PyMuPDF` (`fitz`)<br>- **Xử lý Bảng/Ảnh/Trang khó:** `gpt-4o-mini` Vision API (hoặc Cloud Parser API)<br>- **Voice-to-Text:** OpenAI `Whisper API` | **Thiết kế mục tiêu (Triển khai ở P0/P1):** Đẩy toàn bộ tác vụ nặng (OCR bảng biểu, mô tả ảnh sơ đồ, chuyển giọng nói thành chữ) lên Cloud API, giữ cho Backend Server luôn nhẹ (`< 512MB RAM`). |
| **Vector Store & Hybrid Search** | **Qdrant** (Dense Vector + Sparse BM25) + **Reranker** | **Thiết kế mục tiêu (Thay thế mock trong `src/agents/tools/knowledge.py`):** Lưu trữ cả chunks kiến thức lẫn kho Bài học tổng hợp để sinh viên search và nhận đề xuất cực nhanh. |
| **Guardrails & Safety** | Custom 2-Layer Guardrails + Pydantic Schema | **Đã có sẵn** (`src/agents/guardrails.py`, `prompts/safeguards.md`). Mở rộng thêm luật Liêm chính học thuật (Academic Integrity). |
| **Frontend UI** | Next.js (hoặc Streamlit prototype) | Giao diện 3 trợ lý + Kho Bài học đã lưu/đề xuất + Nút Voice-to-Text + Trang Giảng viên đẩy bài giảng/duyệt HITL. |
| **Evaluation & DevOps** | Pytest + RAGAS + Docker + GitHub Actions | **Đã có sẵn** (`tests/`, `eval/`, `Dockerfile`, `.github/workflows/ci.yml`, AI Log hooks). |

---

## 9. Known Ambiguities (Những điểm chưa chốt & Ghi chú Đồng bộ Code-vs-Doc)

> **Lưu ý chống Drift (Code-vs-Doc):** Ở thời điểm nộp **Gate 1**, mã nguồn trong `src/` đang ở phiên bản **Template Baseline v2.0 (Mock-first)** để đảm bảo toàn bộ CI/CD và Pytest chạy xanh ngay lập tức. Các thành phần thuộc kiến trúc Cloud-Offloaded Ingestion & Qdrant được liệt kê minh bạch dưới đây để đội triển khai tuần tự từ Gate 1 sang Gate 2 (khi code xong mô-đun nào, nhóm sẽ cập nhật bảng này và `PROJECT_CONTEXT.md` trong cùng PR):

| # | Hạng mục / Điểm chưa chốt | Trạng thái hiện tại trong `src/` (Gate 1) | Phương án triển khai mục tiêu (Gate 2) | Hạn chót chốt |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Vector Store & Hybrid Search** | `src/config.py` đang khai báo biến mẫu `chroma_persist_dir` và `search_knowledge` trong `knowledge.py` đang trả kết quả mock. | Chuyển sang **Qdrant** (Qdrant Cloud hoặc Docker container) kết hợp Sparse BM25 + Reranker cho cả 2 collections (`academic_chunks` và `synthesized_lessons`). | Tuần 2 (Gate 2) |
| **2** | **Chiến lược Xử lý PDF khó (Bảng/Ảnh) không tốn RAM Server** | Chưa tích hợp parser vào `src/`. | Dùng `PyMuPDF` kiểm tra nhanh trên server: trang chỉ có chữ thì rút text trực tiếp; trang có bảng phức tạp hoặc ảnh biểu đồ thì đẩy qua **`gpt-4o-mini` Vision API** (hoặc `LlamaParse Cloud API`) để nhận về Markdown + mô tả ảnh chuẩn mà không tốn tài nguyên server. | Giữa tuần 2 |
| **3** | **Định dạng Bài giảng Giảng viên đẩy lên** | Chưa cài đặt. | Hỗ trợ Giảng viên đẩy lên: (1) File tài liệu/slide, (2) File ghi âm/video bài giảng (qua Whisper API), hoặc (3) Link/nội dung bài giảng kèm mô tả chi tiết để AI tổng hợp thành Bài học (`Study Note`) phục vụ đề xuất cho sinh viên. | Cuối tuần 2 |
| **4** | **Giao diện Frontend chính thức** | Hiện mới có Backend FastAPI + Swagger UI (`/docs`). | Chốt giữa **Next.js** (3 giao diện trợ lý + mục Bài học đề xuất/đã lưu cho sinh viên + trang Giảng viên đẩy bài giảng & duyệt HITL) hoặc **Streamlit** (dựng nhanh prototype). | Đầu tuần 2 |
