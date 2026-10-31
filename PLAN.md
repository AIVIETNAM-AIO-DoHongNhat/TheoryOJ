# Kế hoạch phát triển TheoryOJ

Web học tập có chatbot cố vấn cho Khoa Lý luận chính trị, Học viện An ninh nhân dân. Giai đoạn 1 làm cho môn Kinh tế chính trị Mác – Lênin (KTCT). Sản phẩm phục vụ sáng kiến chuyển đổi số của Học viện.

> Cập nhật 29/10/2026 sau khi đo điểm nền ở giai đoạn 0 (mục 2.3). Đây là bản đề xuất, các quyết định còn mở nằm ở mục 11.

---

## 1. Mục tiêu và bối cảnh

Hiện nay học viên tự tra cứu giáo trình và chỉ hỏi được giảng viên trong giờ học. TheoryOJ bổ sung một trợ lý trả lời mọi lúc, chỉ dựa trên giáo trình và văn kiện chính thống, trích nguồn đến số trang in, và hướng dẫn giải bài tập từng bước. Bốn môn còn lại (Triết học, Chủ nghĩa xã hội khoa học, Tư tưởng Hồ Chí Minh, Lịch sử Đảng) được thêm vào bằng nội dung mà không phải sửa code.

Web được công khai trên Internet và xây dựng theo định hướng Công an nhân dân (CAND). Bối cảnh này đặt ra ba yêu cầu thiết kế.

- **An toàn khi công khai.** Hệ thống phải chống spam câu hỏi, dò mật khẩu và chèn lệnh vào prompt, đồng thời phải qua kiểm thử bảo mật trước khi mở.
- **An toàn nội dung.** Web mang danh nghĩa một học viện CAND, nên một câu trả lời sai về quan điểm, đường lối gây hậu quả nặng hơn nhiều so với một câu trả lời chậm. Chatbot phải bám tài liệu, từ chối câu hỏi ngoài phạm vi, và cho phép giảng viên rà soát.
- **Chủ quyền dữ liệu.** Máy chủ, cơ sở dữ liệu và mô hình ngôn ngữ ưu tiên đặt tại hạ tầng do Học viện quản lý. Câu hỏi của học viên không được gửi sang dịch vụ AI bên ngoài khi chưa có phép.

---

## 2. Đánh giá code hiện tại

Code hiện có là một chatbot RAG viết bằng Python với giao diện Streamlit. Với mỗi câu hỏi, hệ thống nhúng câu hỏi bằng `BAAI/bge-m3`, lấy 5 đoạn gần nhất trong ChromaDB, rồi gửi các đoạn này cùng system prompt tới `qwen2.5:7b` chạy trên Ollama.

### 2.1. Phần dùng lại

| File | Chức năng | Hướng xử lý |
|---|---|---|
| `ingest.py` | Đọc PDF, DOCX, MD, làm sạch, cắt đoạn 1000 ký tự chồng lấn 200, nhúng và lưu | Giữ `read_pdf`, `clean`, `chunk`, chuyển vào `services/rag/app/ingest/`. Bổ sung metadata chương, trang in, loại tài liệu. |
| `rag.py` | Nạp bge-m3, truy vấn top-5 | Giữ `embed()`. Thay Chroma bằng pgvector, thêm tìm theo từ khóa và reranker. |
| `config.py` | Hằng số cấu hình, đọc `.env` | Chuyển sang `pydantic-settings`. |
| `app.py` | Giao diện Streamlit, hai chế độ, ghi log CSV | Giữ hai prompt `SYSTEM_QA` và `SYSTEM_EX`, chuyển sang `prompts.ts`. Giao diện được thay bằng Next.js. |
| `data/*.md` | Năm văn kiện dạng Markdown, có dòng nguồn và ngày tải | Giữ nguyên. |
| `logs.csv` | Hai câu hỏi thử | Dùng làm hai ca kiểm thử đầu tiên. |

### 2.2. Vấn đề phát hiện

Số liệu trong bảng lấy trực tiếp từ `db/chroma.sqlite3`.

| # | Vấn đề | Hệ quả | Hướng xử lý |
|---|---|---|---|
| 1 | Niên giám thống kê chiếm 3.815 trong 4.649 đoạn (82 %), giáo trình chỉ có 413 đoạn | Nạp lại tốn thời gian và có nguy cơ lẫn bảng số vào kết quả. Đo ở giai đoạn 0 (mục 2.3) cho thấy niên giám không xuất hiện trong top 5 của câu hỏi lý thuyết nào, nên lần trả lời sai đầu tiên trong log là do mô hình (vấn đề 7), không do tìm kiếm. Chưa đo với câu hỏi có số liệu. | Tách niên giám thành chỉ mục riêng với `kind = so_lieu`. |
| 2 | `READERS` không đọc `.doc` | Báo cáo tổng kết 40 năm đổi mới có 0 đoạn mà không có cảnh báo | Chuyển file sang `.docx` hoặc `.md`, in cảnh báo cho mọi file bị bỏ qua. |
| 3 | Số trang lưu là thứ tự trang trong file PDF | Trích dẫn lệch với số trang in trong sách | Khai báo `page_offset` cho từng tài liệu. |
| 4 | Không có metadata chương | Không lọc được theo chương, không thống kê được chương nào hay được hỏi | Gắn chương theo bảng trang ở mục 6. |
| 5 | File `.md` luôn có `page = 1` | Mọi trích dẫn văn kiện đều ghi tr. 1 | Dùng tiêu đề mục làm vị trí trích dẫn. |
| 6 | Lịch sử hội thoại không được gửi cho mô hình | Câu hỏi nối tiếp được tìm kiếm nguyên văn nên trượt | Viết lại câu hỏi thành câu độc lập trước khi tìm kiếm. |
| 7 | Mô hình trả lời "Giáo trình không đề cập" rồi vẫn tự định nghĩa sai | Thông tin sai xuất hiện ngay sau lời từ chối | Đặt ngưỡng điểm liên quan. Dưới ngưỡng thì trả câu từ chối cố định và không gọi mô hình. Ngưỡng chỉ chặn được câu ngoài phạm vi. Câu khiêu khích dùng đúng thuật ngữ của môn nên điểm cao, cần bước phân loại riêng (mục 3). |
| 8 | Chỉ tìm bằng vector | Thuật ngữ như tư bản bất biến hay ký hiệu `m'` dễ bị trượt | Kết hợp tìm vector với tìm từ khóa, xếp hạng lại bằng `bge-reranker-v2-m3`. |
| 9 | Mô hình 7B tự làm phép tính | Đáp số bài tập có thể sai | Tính W, m', p', c/v, M bằng code. Mô hình chỉ gọi công cụ và diễn giải kết quả. |
| 10 | Streamlit không render LaTeX | Công thức hiện thành mã thô | Dùng KaTeX ở giao diện mới. |
| 11 | Mỗi lần nạp đều xóa toàn bộ chỉ mục | Thêm một file phải nhúng lại toàn bộ 4.649 đoạn | Nạp tăng dần theo mã băm SHA-256 của file. |
| 12 | `.idea/`, `.DS_Store` chưa bị bỏ qua, `.env` rỗng, 20 MB PDF sắp vào git | Repo lẫn file cấu hình cá nhân và file lớn | Sửa `.gitignore`, thêm `.env.example`, dùng Git LFS hoặc lưu file gốc ngoài repo. |

Giáo trình do Bộ GD&ĐT phát hành. Web mặc định chỉ hiển thị đoạn trích dùng để trả lời. Việc hiển thị toàn văn cần Khoa cho phép.

### 2.3. Điểm nền của bản Streamlit

Đo ngày 29/10/2026 bằng `legacy/streamlit/evaluate_baseline.py` trên chỉ mục cũ (4.649 đoạn, bge-m3, top 5) với bộ 50 câu nháp trong `eval/ktct/golden.jsonl`. Kết quả chi tiết lưu ở `eval/ktct/results/`.

| Chỉ số | Kết quả |
|---|---|
| hit@5 trên 30 câu trong phạm vi | 30/30 (100 %), đủ cả 6 chương |
| Nguồn của 150 đoạn trong top 5 | 149 đoạn giáo trình, 1 đoạn Nghị quyết 11, không có đoạn niên giám |
| Điểm cao nhất của câu lý thuyết và bài tính | 0,58 – 0,89 |
| Điểm cao nhất của câu ngoài phạm vi | 0,43 – 0,60 |
| Điểm cao nhất của câu khiêu khích | 0,43 – 0,64 |
| Từ chối đúng, tính toán đúng | Chưa đo, cần khóa OpenRouter (`--llm`) |

Kết quả này dẫn tới ba điều chỉnh.

- **Bộ câu nháp quá dễ.** Câu hỏi được diễn đạt gần với câu chữ giáo trình, nên bản cũ đã vượt mục tiêu hit@5 của giai đoạn 1. Khi duyệt, giảng viên bổ sung câu diễn đạt khác giáo trình, câu hỏi nối tiếp, câu hỏi về văn kiện, câu dùng ký hiệu (`m'`, `c/v`) và câu hỏi số liệu. Mục tiêu hit@5 ở mục 9 tính trên bộ câu đã bổ sung.
- **Ngưỡng điểm không tách được câu khiêu khích.** Câu khiêu khích đạt tới 0,64, cao hơn bài tính thấp nhất (0,58). Ngay cả câu ngoài phạm vi (cao nhất 0,60) cũng chồng lên vùng điểm của bài tính. Ngưỡng chỉ là lớp chặn đầu, phải kết hợp với bước phân loại ở mục 3.
- **Tách niên giám vẫn giữ,** nhưng với lý do giảm kích thước chỉ mục và chuẩn bị chế độ hỏi số liệu, không còn là lý do sửa lỗi tìm kiếm.

### 2.4. Kết quả của dịch vụ tìm kiếm mới

Đo ngày 29/10/2026 bằng `services/rag/scripts/evaluate.py` trên cùng 50 câu nháp. Chỉ mục mới có 1.540 đoạn (chưa nạp niên giám), cắt theo câu, gắn chương, trang in và mục. Kết quả lưu ở `eval/ktct/results/rag-20261029-1919.json`. Máy đo chỉ dùng CPU.

| Chỉ số | Streamlit | vector | vector + từ khóa | + reranker |
|---|---|---|---|---|
| hit@5 trên 30 câu | 30/30 | 30/30 | 30/30 | 30/30 |
| hit@1 | 30/30 | 30/30 | 25/30 | 23/30 |
| Điểm cao nhất, câu lý thuyết và bài tính | 0,58 – 0,89 | 0,57 – 0,87 | như vector | 0,66 – 1,00 |
| Điểm cao nhất, câu ngoài phạm vi | 0,43 – 0,60 | 0,36 – 0,55 | như vector | 0,00 – 0,11 |
| Điểm cao nhất, câu khiêu khích | 0,43 – 0,64 | 0,42 – 0,67 | như vector | 0,00 – 0,97 |
| Thời gian tìm, trung vị | – | 0,07 s | 0,10 s | 6,9 s (CPU), 0,53 s (RTX 4060) |

Kết quả này dẫn tới ba nhận xét.

- **hit@5 không còn phân biệt được các phương án,** vì bộ câu nháp quá dễ (mục 2.3). Chưa thể kết luận tìm từ khóa hay reranker giúp tăng độ phủ cho đến khi có câu khó.
- **Reranker tách được câu ngoài phạm vi.** Với ngưỡng 0,3 trên điểm reranker, cả 30 câu trong phạm vi được giữ và cả 10 câu ngoài phạm vi bị chặn. Câu khiêu khích vẫn đạt tới 0,97, nên bước phân loại ở mục 3 là bắt buộc.
- **hit@1 giảm khi thêm reranker,** vì điểm reranker bão hòa gần 1,0 và trang đứng đầu thường là trang lân cận hoặc một đoạn văn kiện cùng chủ đề (ví dụ `ktct-021`, `ktct-024`). Giảng viên cần xem bảy câu này để quyết định đây là lỗi tìm kiếm hay `gold` khoanh quá hẹp. Reranker trên CPU mất khoảng 7 giây mỗi câu, vượt mục tiêu độ trễ ở mục 9. Trên GPU (RTX 4060 Laptop, torch 2.15.0+cu132) còn 0,53 giây với cùng kết quả, nên máy chủ triển khai cần GPU.

### 2.5. Chatbot trên Next.js

Làm ngày 29/10/2026. Chưa có số đo vì máy phát triển chưa có Ollama và `.env` chưa có khóa OpenRouter. Luồng đầu–cuối đã được thử với một mô hình giả lập API OpenAI: câu bài tập gọi `tinh_ktct` và nhận đúng m = 400, W = 1.200, p' = 50 %; câu ngoài phạm vi nhận câu từ chối cố định mà không gọi mô hình trả lời.

- **Phân loại hai lớp.** Luật bắt mẫu chèn lệnh rõ ràng (`bỏ qua mọi hướng dẫn`, `system prompt`, khối `TÀI LIỆU:` giả) mà không tốn lệnh gọi. Các câu còn lại do mô hình gán một trong bốn nhãn. Mô hình trả lời lạc đề thì câu được cho qua, vì ngưỡng điểm vẫn chặn câu ngoài phạm vi. Phân loại và tìm kiếm chạy song song để giảm độ trễ.
- **Trích dẫn bằng số thứ tự.** Mô hình ghi `[n]` theo khối tài liệu thay cho `[tên tài liệu, tr. X]`, nên không thể bịa số trang. Giao diện đổi `[n]` thành thẻ hiện đoạn gốc, chương và trang in.
- **Chế độ Ôn thi không dùng ngưỡng,** vì tin nhắn thường là dàn ý trả lời hoặc lời đề nghị "hãy hỏi tôi", điểm reranker thấp dù hợp lệ. Chế độ này chỉ dựa vào bước phân loại.
- **Lưu hội thoại và cờ.** Ban đầu câu bị từ chối chỉ ghi vào log máy chủ; từ giai đoạn 3 mọi lượt được lưu vào bảng `messages` (mục 2.6).

### 2.6. Lưu hội thoại, đánh giá, giới hạn tần suất

Làm ngày 30/10/2026, thử đầu–cuối trên máy phát triển với mô hình giả lập. Bản sáng kiến chưa cần đăng nhập và trang quản trị: bản đầu của giai đoạn 3 có Better Auth, nhập tài khoản từ Excel và `/quan-tri`, nhưng đã gỡ cùng ngày để giữ sản phẩm gọn. Khi cần quản lý theo lớp có thể làm lại trên cùng bảng dữ liệu.

- **Không đăng nhập.** Ai cũng dùng được trợ lý. Mỗi trình duyệt nhận một mã khách ngẫu nhiên trong cookie httpOnly `theoryoj_khach` (`lib/visitor.ts`), cấp ở câu hỏi đầu tiên. Mã này giữ lịch sử hội thoại và chỉ cho trình duyệt đã tạo hội thoại mở lại hay ghi tiếp; trình duyệt khác nhận 404. Xóa cookie thì mất lịch sử ở phía người dùng, dữ liệu trong DB vẫn còn.
- **Giới hạn tần suất.** `/api/chat`: 20 câu trong 10 phút và 200 câu mỗi ngày theo mã khách, 120 câu trong 10 phút theo IP. Mã khách có thể bị xóa nên giới hạn theo IP mới là chốt chặn chính. Đếm trong bảng `chat_rate_limits` nên vẫn đúng khi chạy nhiều tiến trình. Ngưỡng đổi bằng biến môi trường `CHAT_LIMIT_*`.
- **Lưu hội thoại.** Mỗi câu trả lời lưu cả `parts` (để mở lại có trích dẫn), câu hỏi, chế độ, chương, nhãn phân loại, lý do từ chối, cờ, câu tìm kiếm đã viết lại, điểm cao nhất, trích dẫn, thời gian từng bước. Câu bị dừng giữa chừng hoặc lỗi được đánh dấu `incomplete`. Người dùng xem lại và xóa hội thoại ở bảng Lịch sử; địa chỉ `/tro-ly/[id]` mở đúng hội thoại.
- **Đánh giá.** 👍/👎 dưới mỗi câu trả lời; 👎 chọn một trong sáu lý do (`features/chat/feedback.ts`) và ghi chú tùy ý.
- **Xem lại.** Chưa có giao diện. Giảng viên xem câu bị 👎, câu gắn cờ và câu bị từ chối bằng truy vấn trên bảng `messages`, `feedback`, ví dụ `select question, content, refused, flagged from messages where role = 'assistant' and (flagged or refused is not null)`.
- **Chưa làm.** Chưa gỡ `legacy/`: bản Streamlit vẫn cần để đo điểm nền trên bộ câu chuẩn sau khi giảng viên duyệt (giai đoạn 0 và tiêu chí giai đoạn 1); gỡ sau lần đo đó.

---

## 3. Kiến trúc

Giao diện phải viết bằng Next.js. Tuy nhiên, bge-m3, reranker và PyMuPDF chạy ổn định nhất trong Python, và code Python hiện có đã làm đúng phần nạp và tìm kiếm. Viết lại phần này bằng TypeScript tốn thời gian mà không nâng chất lượng. Kiến trúc vì vậy cần giữ được code Python, cho phép đổi mô hình ngôn ngữ mà không ảnh hưởng tới tìm kiếm, và chỉ dùng một cơ sở dữ liệu.

Lời giải là tách tìm kiếm thành một dịch vụ riêng, không lưu thông tin người dùng hay hội thoại. Dịch vụ này nhận câu hỏi cùng bộ lọc (`subject`, `chapter`, `kind`) và trả về danh sách đoạn kèm điểm. Toàn bộ phần còn lại do Next.js đảm nhiệm.

```
Trình duyệt ──HTTPS──▶ Caddy ──▶ apps/web (Next.js) ──────────────▶ LLM (Ollama)
                                    │  giao diện, hội thoại,
                                    │  hội thoại, prompt
                                    ▼
                              services/rag (FastAPI)
                                 /search, /ingest
                                    │
                                    ▼
                      PostgreSQL 16 + pgvector (dữ liệu ứng dụng và vector)
```

Một câu hỏi đi qua `/api/chat` theo bảy bước.

1. Đọc mã khách, kiểm tra giới hạn tần suất, đọc chế độ và phạm vi chương.
2. Phân loại câu hỏi thành `hop_le`, `ngoai_pham_vi`, `khieu_khich` hoặc `chen_lenh`, bằng một lệnh gọi mô hình ngắn có đầu ra cố định. Ba nhãn sau nhận câu từ chối cố định, nhãn `khieu_khich` và `chen_lenh` được gắn cờ để giảng viên xem. Bước này cần vì câu khiêu khích dùng đúng thuật ngữ của môn nên vượt ngưỡng điểm (mục 2.3).
3. Viết lại câu hỏi nối tiếp thành câu độc lập.
4. Gọi `/search` với bộ lọc nguồn của chế độ đang chọn.
5. Nếu điểm cao nhất thấp hơn ngưỡng, trả câu từ chối cố định. Ngưỡng chọn bằng `make eval` trên bộ câu chuẩn.
6. Gọi mô hình bằng `streamText`, kèm công cụ tính toán KTCT.
7. Lưu câu trả lời và trích dẫn, gửi trích dẫn về client để hiển thị.

| Lớp | Công nghệ |
|---|---|
| Web | Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui. Route được bảo vệ bằng `proxy.ts` (Next.js 15 gọi là `middleware.ts`). |
| Chat | Vercel AI SDK (`ai`, `@ai-sdk/react`, `@ai-sdk/openai-compatible`), `react-markdown` + `remark-math` + `rehype-katex` |
| Cơ sở dữ liệu | PostgreSQL 16 + pgvector, Drizzle ORM |
| Đăng nhập | Chưa có ở bản sáng kiến. Mã khách ẩn danh trong cookie thay cho tài khoản (mục 2.6). |
| Tìm kiếm | FastAPI, `sentence-transformers` (bge-m3, bge-reranker-v2-m3), PyMuPDF, python-docx, `uv` |
| Mô hình ngôn ngữ | Ollama qua API tương thích OpenAI. Đổi mô hình bằng biến môi trường. |
| Triển khai | Docker Compose gồm `caddy`, `web`, `rag`, `db`, `ollama`. Chỉ cổng 443 mở ra Internet. |

---

## 4. Tính năng

### 4.1. Chatbot (MVP)

| Chế độ | Hành vi | Nguồn ưu tiên |
|---|---|---|
| Hỏi đáp lý thuyết | Trả lời ngắn theo `SYSTEM_QA`, trích nguồn sau mỗi ý | Giáo trình |
| Hướng dẫn giải bài tập | Giải theo bốn bước của `SYSTEM_EX`, phép tính do công cụ thực hiện | Giáo trình |
| Liên hệ thực tiễn | Nối lý thuyết với văn kiện và nhiệm vụ của lực lượng CAND (mục 5) | Văn kiện, văn bản CAND, giáo trình |
| Ôn thi | Đặt câu hỏi theo chương, nhận xét dàn ý học viên trả lời | Giáo trình theo chương đã chọn |

Mọi chế độ đều có streaming, trích dẫn bấm được (hiện đoạn gốc, tài liệu, chương, trang in), bộ lọc chương, nút đánh giá 👍/👎 kèm lý do, và lưu lịch sử hội thoại.

### 4.2. Học liệu, thư viện, bài viết và quản trị (MVP)

Trang web là cổng học tập; trợ lý là một tính năng trong đó.

Giao diện không gắn với một môn: menu Học liệu, trang `/mon`, trang chủ, thư viện, bài viết và trợ lý đều đọc danh sách môn từ `config/subjects.ts`. Môn chưa mở vẫn hiện với nhãn "Sắp triển khai". Mở một môn mới cần: học liệu và `manifest.yaml` trong `content/<môn>/`, đặt `active: true` kèm chương, mô tả và các chế độ hỗ trợ trong `subjects.ts`, câu hỏi gợi ý trong `features/learning/content.ts`, và prompt riêng của môn trong `features/chat/server/prompts.ts` (hiện prompt và bộ phân loại còn viết cho KTCT, công cụ tính chỉ dùng cho KTCT).

- **Học liệu theo chương** (`/mon/[mon]`, `/mon/[mon]/chuong/[so]`): mỗi chương có nút đọc chương trong giáo trình, văn kiện liên quan (theo `related_chapters`), bài viết ôn tập và câu hỏi gợi ý mở sẵn trong trợ lý (`features/learning/content.ts`). Sẽ bổ sung mục tiêu, khái niệm chính, công thức.
- **Thư viện** (`/thu-vien`, `/thu-vien/[slug]`): danh mục đọc trực tiếp từ `manifest.yaml`, lọc theo loại, tìm không dấu. PDF mở trong trình đọc pdf.js (`react-pdf`) có mục lục chương, số trang in, phóng to, tải về; `?trang=n` mở đúng trang PDF. Văn kiện `.md` và `.docx` (qua `mammoth`) hiển thị dạng văn bản. File gốc phục vụ qua `/api/tai-lieu/[slug]` có hỗ trợ Range. Trích dẫn của trợ lý có liên kết "Mở trong thư viện" tới đúng trang.
- **Bài viết** (`/bai-viet`): mỗi bài là một file Markdown trong `content/bai-viet/` (mẫu ở `_mau.md`), giảng viên gửi bài, người phát triển đăng. Khi có giai đoạn 3 có thể chuyển sang trang quản trị.
- **Ôn tập** (`/on-tap`, `/mon/[mon]/chuong/[so]/trac-nghiem`, `/mon/[mon]/chuong/[so]/bai-tap`, `/tien-do`): xem mục 4.3.
- **Quản trị**: chưa làm ở bản sáng kiến. Dữ liệu hỏi đáp và đánh giá đã lưu đủ (mục 2.6) để làm trang nhật ký, tải tài liệu và chạy nạp lại khi cần.

### 4.3. Ôn tập và tiến độ

Đã làm ở giai đoạn 4:

- **Trắc nghiệm theo chương.** Ngân hàng câu hỏi là file YAML trong `content/<môn>/question-bank/chuong-<n>.yaml` (quy ước ở `_mau.yaml`), mỗi câu có giải thích và trang in giáo trình. KTCT có 164 câu (23–31 câu mỗi chương), do người phát triển soạn từ giáo trình, gắn `status: nhap` cho tới khi giảng viên duyệt; trang hiện nhãn "chờ giảng viên duyệt" trong lúc đó. Mỗi đề lấy ngẫu nhiên 10 câu và trộn thứ tự phương án; đáp án không gửi xuống trình duyệt, máy chủ chấm khi nộp. `src/features/quiz/bank.test.ts` kiểm tra mọi file (ít nhất 20 câu, đáp án hợp lệ, giải thích không nhắc chữ cái phương án).
- **Bài tập tính toán sinh số** (chương 3, `src/domain/ktct/exercises.ts`): 5 dạng bài, đáp án và lời giải từng bước tính bằng `solve` của công cụ trợ lý, chấp nhận sai số làm tròn 0,5 %.
- **Tiến độ cá nhân** (`/tien-do`): mỗi lượt làm lưu vào bảng `practice_attempts` theo mã khách; trang tổng hợp điểm cao nhất, lượt gần nhất, bài tập, số câu đã hỏi trợ lý theo chương và gợi ý chương nên ôn tiếp.

Chưa làm: thẻ ghi nhớ theo lịch lặp lại ngắt quãng; thống kê cho giảng viên theo chương (dữ liệu đã có trong `practice_attempts`, cần trang quản trị); bài tập cho các chương ngoài chương 3.
- Hỏi đáp số liệu trên chỉ mục niên giám riêng.

### 4.4. Trang chủ

Trang chủ `/` là trang đầu tiên người truy cập và hội đồng xét sáng kiến nhìn thấy. Trang phải cho biết sản phẩm là gì, của đơn vị nào, vì sao tin được, và bắt đầu dùng từ đâu.

Bản hiện tại (dạng cổng thông tin): đầu trang một dòng dính ở đầu màn hình (logo, menu Trang chủ, Học liệu ▾, Thư viện, Bài viết, Giới thiệu), nút Trợ lý học tập nổi ở góc phải, hero có ô ảnh của Khoa, số liệu lấy từ dữ liệu thật, bốn lối vào nhanh, giáo trình và văn kiện, bài viết mới, giới thiệu trợ lý, ảnh hoạt động của Khoa. Nguyên tắc hoạt động và hỏi đáp chuyển sang `/gioi-thieu`. Bảng dưới là danh sách ban đầu, giữ để đối chiếu.

| # | Phần | Nội dung |
|---|---|---|
| 1 | Đầu trang | Tên Học viện, Khoa, menu Giới thiệu, Học liệu, Trợ lý, Đăng nhập |
| 2 | Hero | Tiêu đề, một câu mô tả, nút "Bắt đầu hỏi" và "Xem học liệu", khung chat minh họa có trích dẫn |
| 3 | Câu hỏi mẫu | 4 đến 6 thẻ, bấm vào thì mở trợ lý với câu hỏi điền sẵn |
| 4 | Chế độ | Bốn chế độ ở mục 4.1 |
| 5 | Sáu chương | Thẻ chương dẫn tới `/mon/ktct/chuong/[so]` |
| 6 | Độ tin cậy | Nguồn chính thống, trích dẫn đến trang, từ chối ngoài phạm vi, giảng viên rà soát, dữ liệu trên máy chủ Học viện |
| 7 | Cách hoạt động | Ba bước gồm đặt câu hỏi, tra cứu tài liệu, trả lời kèm nguồn |
| 8 | Nguồn tài liệu | Danh sách lấy từ bảng `documents` |
| 9 | Con số | Số học viên, số câu hỏi, tỷ lệ đánh giá hữu ích. Chỉ hiện khi có số liệu thật. |
| 10 | Lộ trình môn | KTCT đang hoạt động, bốn môn còn lại sắp có |
| 11 | Hỏi đáp | Ai được dùng, có thay giáo trình được không, dữ liệu câu hỏi được dùng thế nào |
| 12 | Cuối trang | Nút kêu gọi, chân trang có liên hệ và dòng lưu ý về AI |

Trang được sinh tĩnh. Phần 8 và 9 làm mới mỗi giờ bằng `revalidate`. Toàn bộ câu chữ nằm trong `features/landing/content.ts` để Khoa sửa lời văn mà không chạm vào bố cục. Trang cần đạt Lighthouse từ 90 điểm trên điện thoại và có `metadata`, `opengraph-image.tsx`, `sitemap.ts`, `robots.ts`.

---

## 5. Định hướng Công an nhân dân

- **Nguồn tài liệu.** Bổ sung nhóm `kind = cand` gồm các văn bản đã công bố, ví dụ Luật Công an nhân dân, Luật An ninh quốc gia, Luật An ninh mạng bản hiện hành, Nghị quyết 12-NQ/TW (2022) về xây dựng lực lượng CAND. Khoa duyệt danh mục cuối cùng.
- **Liên hệ nghiệp vụ.** Chế độ Liên hệ thực tiễn nối nội dung từng chương với nhiệm vụ của lực lượng. Chương 4 về cạnh tranh và độc quyền gắn với bảo vệ an ninh kinh tế và phòng chống gian lận thương mại. Chương 5 và Nghị quyết 68 gắn với bảo đảm môi trường kinh doanh an toàn. Chương 6 gắn với an ninh kinh tế đối ngoại và an ninh mạng. Mọi liên hệ đều phải trích nguồn văn kiện.
- **Quy tắc trả lời.** Trợ lý dùng văn phong trang trọng và gọi người học là "đồng chí" (Khoa chốt cách xưng hô). Trợ lý không bình luận cá nhân về chủ trương, đường lối hay lãnh đạo, và không trả lời về nghiệp vụ, tổ chức nội bộ của lực lượng. Câu hỏi xuyên tạc hoặc khiêu khích nhận câu từ chối cố định và được gắn cờ để giảng viên xem.
- **Giao diện.** Tối giản kiểu cổng thông tin cơ quan: nền trắng, màu chủ đạo xanh lá (`#15803d`), khối xanh đậm, đường kẻ mảnh. Tiêu đề dùng Roboto Condensed đậm (chữ đứng, cứng cáp), nội dung dùng Roboto. Trợ lý học tập là nút nổi góc phải, phía trên nút về đầu trang. Component dựng trên shadcn/ui (Base UI, style `base-nova`), bảng màu map vào token của shadcn trong `apps/web/src/app/globals.css`. Logo Học viện lấy từ hvannd.edu.vn (`apps/web/public/brand/logo-hvannd.png`, 110 × 110 px); trước khi công khai cần đơn vị có thẩm quyền cho phép và xin file gốc độ phân giải cao. Ảnh hoạt động của Khoa trên trang chủ và trang giới thiệu cũng lấy từ hvannd.edu.vn (nguồn từng ảnh ở `apps/web/public/anh-khoa/NGUON.md`), cần xin phép tương tự.

---

## 6. Cấu trúc thư mục

Thư mục cấp cao nhất chia theo dịch vụ. Trong Next.js, `app/` chỉ chứa định tuyến, còn logic nằm trong `features/` theo từng tính năng. Học liệu nằm ngoài code, và mọi dữ liệu gắn với môn học đều có trường `subject`.

```
TheoryOJ/
├── apps/web/                          # Next.js
│   ├── src/
│   │   ├── app/                       # Chỉ định tuyến
│   │   │   ├── (public)/              # Layout có header và footer
│   │   │   │   ├── page.tsx           # Trang chủ
│   │   │   │   ├── gioi-thieu/page.tsx
│   │   │   │   ├── mon/[mon]/chuong/[so]/
│   │   │   │   ├── thu-vien/[slug]/   # Trình đọc tài liệu
│   │   │   │   ├── bai-viet/[slug]/
│   │   │   │   ├── mon/[mon]/chuong/[so]/trac-nghiem/, bai-tap/
│   │   │   │   ├── on-tap/, tien-do/  # Ôn tập theo chương, tiến độ cá nhân
│   │   │   ├── (hoc-tap)/             # Trợ lý toàn màn hình
│   │   │   │   └── tro-ly/            # Chat mới và [id] hội thoại cũ
│   │   │   ├── api/                   # chat, tai-lieu
│   │   │   ├── opengraph-image.tsx, sitemap.ts, robots.ts
│   │   │   └── layout.tsx, globals.css
│   │   ├── features/
│   │   │   ├── landing/               # components/, content.ts, queries.ts
│   │   │   ├── library/               # Danh mục từ manifest, trình đọc PDF, render MD/DOCX
│   │   │   ├── blog/                  # Đọc content/bai-viet/*.md
│   │   │   ├── learning/              # Câu hỏi gợi ý theo chương
│   │   │   ├── chat/
│   │   │   │   ├── components/        # ChatWindow, CitationChip, ModeSelector…
│   │   │   │   ├── server/            # prompts, modes, rewrite-query, build-context,
│   │   │   │   │                      # guardrails, persist
│   │   │   │   └── tools/ktct-calculator.ts
│   │   │   ├── quiz/  exercise/  progress/   # Trắc nghiệm, bài tập, tiến độ
│   │   ├── components/                # ui/ (shadcn), layout/, markdown/
│   │   ├── lib/                       # env, visitor, rate-limit, llm, rag-client, db/schema/
│   │   ├── domain/ktct/formulas.ts    # Công thức KTCT và kiểm thử
│   │   ├── config/subjects.ts         # Danh sách môn và chương
│   │   └── proxy.ts
│   └── drizzle/ (migration), package.json
├── services/rag/                      # FastAPI
│   ├── app/
│   │   ├── main.py, settings.py, schemas.py
│   │   ├── api/                       # search, ingest, health
│   │   ├── ingest/                    # readers, cleaning, chunking, metadata, pipeline
│   │   └── retrieval/                 # embedder, store, hybrid, reranker
│   ├── scripts/                       # ingest_all.py, evaluate.py
│   └── tests/, pyproject.toml, Dockerfile
├── content/bai-viet/                  # Bài viết Markdown, _mau.md là mẫu
├── content/ktct/                      # Học liệu
│   ├── manifest.yaml
│   ├── giao-trinh/  van-kien/  tham-khao/  cand/  so-lieu/
│   └── question-bank/                 # chuong-<n>.yaml, _mau.yaml
├── eval/ktct/golden.jsonl             # Bộ câu hỏi chuẩn
├── legacy/streamlit/                  # Code cũ, xóa sau giai đoạn 3
├── infra/                             # docker-compose.yml, db/init.sql
├── PLAN.md
├── Makefile                           # make dev, make ingest, make eval
└── README.md
```

Ranh giới chương của `GT_KTCT.pdf` tính theo trang PDF như sau.

| Chương | Tên | Trang PDF |
|---|---|---|
| 1 | Đối tượng, phương pháp nghiên cứu và chức năng của KTCT Mác – Lênin | 5–18 |
| 2 | Hàng hóa, thị trường và vai trò của các chủ thể tham gia thị trường | 19–49 |
| 3 | Giá trị thặng dư trong nền kinh tế thị trường | 50–75 |
| 4 | Cạnh tranh và độc quyền trong nền kinh tế thị trường | 76–103 |
| 5 | Kinh tế thị trường định hướng XHCN và các quan hệ lợi ích kinh tế ở Việt Nam | 104–135 |
| 6 | Công nghiệp hóa, hiện đại hóa và hội nhập kinh tế quốc tế của Việt Nam | 136–175 |

Trang PDF 1–4 là bìa và lời nói đầu, 176–178 là mục lục. Số trang in ở chân trang bằng trang PDF trừ 1 trên cả 178 trang (`page_offset: -1`). PDF này được dàn trang lại bằng LibreOffice nên số trang có thể lệch với sách in. Mục lục trong PDF cũng ghi số trang khác với chân trang. Bản đầy đủ nằm ở `content/ktct/manifest.yaml`.

```yaml
# content/ktct/manifest.yaml
subject: ktct
documents:
  - file: giao-trinh/GT_KTCT.pdf
    kind: giao_trinh
    page_offset: -1         # trang in = trang PDF − 1
    chapters: [{number: 1, pages: [5, 18]}, {number: 2, pages: [19, 49]}]   # …
  - file: van-kien/14-NQ-68-NQ-TW-2025.md
    kind: van_kien
    related_chapters: [5]
  - file: so-lieu/19-Nien-giam-thong-ke-2025.pdf
    kind: so_lieu
    index: separate
```

---

## 7. Dữ liệu và giao tiếp giữa hai dịch vụ

| Nhóm | Bảng |
|---|---|
| Người dùng | Chưa có; hội thoại và đánh giá gắn với `visitor_id` |
| Nội dung | `subjects`, `chapters`, `documents` (kind, page_offset, sha256), `chunks` (chapter_id, page, section, `embedding vector(1024)`, tsv) |
| Hội thoại | `conversations` (visitor_id), `messages` (citations jsonb, rewritten_query, latency_ms), `feedback` (rating, reason) |
| Học tập | `practice_attempts` (trắc nghiệm và bài tập, theo mã khách); câu hỏi nằm trong file YAML, không lưu DB |

```json
// POST {RAG_URL}/search
{ "query": "tỷ suất giá trị thặng dư là gì", "subject": "ktct",
  "chapters": [3], "kinds": ["giao_trinh"], "top_k": 5 }
// → { "hits": [{ "text": "…", "document": "…", "chapter": 3, "page": 56, "score": 0.83 }],
//     "max_score": 0.83 }
```

Dịch vụ rag tự tạo và sở hữu hai bảng `documents`, `chunks`. Bảng `chunks` lưu số chương (`chapter`) thay cho khóa ngoại `chapter_id`, vì danh sách chương nằm trong `manifest.yaml`. Next.js chỉ đọc hai bảng này. `score` là điểm reranker trong khoảng 0–1, kèm `vector_score` để so với điểm nền.

`POST /ingest` nhận `{ "subject": "ktct", "force": false }` và trả về số đoạn của từng file cùng danh sách file bị bỏ qua kèm lý do.

---

## 8. Lộ trình

Lộ trình giả định một người phát triển chính trong khoảng 12 tuần.

| Giai đoạn | Tuần | Việc chính | Tiêu chí hoàn thành |
|---|---|---|---|
| 0. Dữ liệu và mức nền | 1 | Đã xong: sửa repo, chuyển file `.doc`, đo `page_offset`, viết `manifest.yaml`, tách niên giám vào `so-lieu/`, soạn 50 câu nháp, đo hit@5 của bản Streamlit (mục 2.3). Còn lại: giảng viên duyệt và bổ sung câu khó vào bộ câu chuẩn, đo từ chối và tính toán bằng `--llm`, đối chiếu số trang với sách in, chốt mẫu hồ sơ sáng kiến. | `golden.jsonl` được giảng viên duyệt, có đủ điểm nền ở mục 9 cho bản Streamlit |
| 1. Dịch vụ tìm kiếm | 2–3 | Đã xong: Postgres + pgvector, `services/rag` (FastAPI `/search`, `/ingest`, `/health`), metadata chương, trang in, mục, tìm kết hợp, reranker, nạp tăng dần, `evaluate.py`, 19 kiểm thử (mục 2.4). Niên giám đã nạp vào chỉ mục riêng (3.370 đoạn, 114 giây trên GPU), chỉ tìm khi gọi với `kinds: ["so_lieu"]`. Còn lại: đo lại trên bộ câu đã duyệt. | hit@5 từ 85 % trên bộ câu đã duyệt và không thấp hơn bản Streamlit trên cùng bộ câu |
| 2. Next.js và chatbot | 4–5 | Đã xong: `apps/web` (Next.js 16.4, AI SDK 7), landing page bản tĩnh, `/tro-ly` với 4 chế độ, KaTeX, trích dẫn `[n]` bấm được, công cụ `tinh_ktct` tính bằng code, viết lại câu hỏi, phân loại bằng luật và mô hình, ngưỡng từ chối 0,3, `npm run eval` (mục 2.5). Giao diện chuyển sang shadcn/ui, khung chat dùng `MessageScroller`, `Message`, `Bubble`, `Trace`. Còn lại: đo bằng mô hình thật, chỉnh prompt phân loại theo kết quả. | Từ chối đúng từ 90 % câu ngoài phạm vi và câu khiêu khích, bài tập đúng 100 % về số |
| 3. Lưu dữ liệu và giới hạn | 6–7 | Đã xong: lưu hội thoại và lịch sử theo mã khách, đánh giá 👍/👎 kèm lý do, giới hạn tần suất `/api/chat` (mục 2.6). Đăng nhập và trang quản trị để sau bản sáng kiến. Còn lại: gỡ `legacy/` sau khi đo lại điểm nền trên bộ câu đã duyệt. | Mọi lượt hỏi đáp và đánh giá được lưu, truy vấn được |
| 4. Học liệu và ôn tập | 8–10 | Đã xong: trang 6 chương, 164 câu trắc nghiệm (23–31 câu mỗi chương) có giải thích và trang giáo trình, bài tập sinh số chương 3, trang tiến độ, bảng `practice_attempts` (mục 4.3). Còn lại: giảng viên duyệt ngân hàng câu hỏi và đổi `status` thành `da-duyet`. | Mỗi chương có tối thiểu 20 câu trắc nghiệm |
| 5. Thử nghiệm và triển khai | 11–12 | Triển khai với tên miền và HTTPS, kiểm thử bảo mật và nội dung, thử với một lớp khoảng 50 học viên trong 2 tuần, khảo sát trước và sau, bật số liệu thật trên landing page | Đạt các chỉ số ở mục 9 |
| 6. Mở rộng môn | Sau 12 | Thêm `content/<mon>/`, một dòng trong `subjects.ts`, bộ câu chuẩn riêng | Không phải sửa code lõi |

---

## 9. Chất lượng và bảo mật

`make eval` chạy lại bộ câu chuẩn sau mỗi thay đổi về cắt đoạn, mô hình nhúng, prompt hoặc mô hình ngôn ngữ. Các mục tiêu dưới đây chỉ có ý nghĩa khi bộ câu chuẩn đủ khó: bộ nháp hiện tại cho bản cũ đạt hit@5 100 % (mục 2.3).

| Chỉ số | Cách đo | Mục tiêu |
|---|---|---|
| hit@5 | Trang nguồn đúng nằm trong 5 đoạn tìm được | Từ 85 % |
| Từ chối đúng | Câu ngoài phạm vi và câu khiêu khích nhận câu từ chối | Từ 90 % |
| Trích dẫn đúng | Trang được trích chứa ý đã nêu, chấm tay 20 câu | Từ 90 % |
| Tính toán | Bài tập có đáp số | 100 % |
| Chất lượng chung | Giảng viên chấm thang 1–5 | Trung bình từ 4 |
| Độ trễ | Thời gian tới token đầu tiên | Dưới 3 giây |

Các biện pháp bảo mật gồm:

- Chỉ cổng 443 qua Caddy mở ra ngoài. `rag`, `db`, `ollama` nằm trong mạng nội bộ Docker.
- Giới hạn tần suất và độ dài câu hỏi ở `/api/chat` theo mã khách và theo IP.
- Header CSP và HSTS. Mọi route API kiểm tra dữ liệu vào bằng Zod.
- Câu hỏi và đoạn tài liệu được đặt trong khối phân tách riêng. System prompt yêu cầu mô hình bỏ qua chỉ dẫn nằm trong hai khối này.
- Chỉ nạp văn bản đã công bố. Không đưa thông tin định danh học viên vào prompt.
- Sao lưu Postgres hằng ngày, giám sát lỗi và tải GPU.
- Đơn vị an ninh mạng của Học viện kiểm thử xâm nhập trước khi mở công khai.

---

## 10. Hồ sơ sáng kiến chuyển đổi số

Hồ sơ thường được xét theo tính mới, hiệu quả và khả năng nhân rộng. Bằng chứng cho cả ba tiêu chí cần được thu từ đầu dự án. Mẫu hồ sơ chính thức cần đối chiếu với quy định của Học viện.

| Tiêu chí | Bằng chứng | Nguồn |
|---|---|---|
| Tính mới | Trợ lý trả lời mọi lúc, trích nguồn đến trang, liên hệ với nhiệm vụ CAND, so với hiện trạng tự tra cứu | Mô tả hiện trạng có Khoa xác nhận |
| Chất lượng trả lời | Chỉ số mục 9 của bản Streamlit so với bản mới | Kết quả `make eval` |
| Hiệu quả học tập | Điểm trắc nghiệm đầu và cuối đợt thử nghiệm, so với lớp đối chứng nếu có | Bảng `practice_attempts` |
| Mức độ sử dụng | Số trình duyệt dùng trợ lý, số câu hỏi theo chương, tỷ lệ 👍 | Bảng `messages`, `feedback` |
| Mức độ hài lòng | Khảo sát học viên và giảng viên thang 5 điểm trước và sau | Form khảo sát trên web |
| An toàn | Sơ đồ triển khai, kết quả kiểm thử bảo mật và kiểm thử nội dung | Mục 3, 5, 9 |
| Nhân rộng | Thêm môn Triết học chỉ bằng nội dung, có thể dùng chung cho các trường CAND khác | Giai đoạn 6 |

Nghị quyết 57-NQ/TW về đột phá phát triển khoa học, công nghệ, đổi mới sáng tạo và chuyển đổi số quốc gia đã có trong bộ tài liệu và dùng được làm căn cứ cho phần lý do đề xuất.

---

## 11. Quyết định cần chốt

| # | Vấn đề | Đề xuất |
|---|---|---|
| 1 | Mô hình ngôn ngữ chạy tại Học viện hay qua API bên ngoài | Ưu tiên chạy tại Học viện. Trước giai đoạn 5, so sánh `qwen2.5:7b` với vài mô hình mở lớn hơn bằng `make eval` và chọn mô hình nhỏ nhất đạt mục 9. Chỉ dùng API ngoài khi Học viện cho phép. Riêng việc đo trên bộ câu chuẩn (không chứa dữ liệu học viên) tạm dùng `qwen/qwen-2.5-7b-instruct` qua OpenRouter, cấu hình trong `.env`. |
| 2 | Máy chủ, GPU, dung lượng VRAM, tên miền | Hỏi đơn vị CNTT của Học viện trong tuần 1. Quyết định 1 phụ thuộc vào câu trả lời này. |
| 3 | Đối tượng truy cập | Đã chốt 30/10/2026: bản sáng kiến mở trợ lý cho mọi người, không cần đăng nhập, chặn lạm dụng bằng giới hạn tần suất theo IP. |
| 4 | Tài khoản riêng hay tích hợp hệ thống sẵn có | Chưa cần ở bản sáng kiến. Khi cần, dùng tài khoản riêng do quản trị cấp. |
| 5 | Người soạn bộ câu chuẩn và ngân hàng trắc nghiệm | Cần ít nhất một giảng viên KTCT tham gia từ tuần 1. |
| 6 | Hiển thị toàn văn giáo trình | Đã chốt 29/10/2026: mọi tài liệu trong Thư viện đọc toàn văn công khai. Trước khi mở công khai, Khoa cần xác nhận quyền phát hành giáo trình, sách của NXB Chính trị quốc gia Sự thật và bài tạp chí; văn kiện của Đảng không vướng. |
| 7 | Bảng màu, biểu trưng, cách xưng hô | Khoa và đơn vị truyền thông của Học viện duyệt. |
