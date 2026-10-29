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

---

## 3. Kiến trúc

Giao diện phải viết bằng Next.js. Tuy nhiên, bge-m3, reranker và PyMuPDF chạy ổn định nhất trong Python, và code Python hiện có đã làm đúng phần nạp và tìm kiếm. Viết lại phần này bằng TypeScript tốn thời gian mà không nâng chất lượng. Kiến trúc vì vậy cần giữ được code Python, cho phép đổi mô hình ngôn ngữ mà không ảnh hưởng tới tìm kiếm, và chỉ dùng một cơ sở dữ liệu.

Lời giải là tách tìm kiếm thành một dịch vụ riêng, không lưu thông tin người dùng hay hội thoại. Dịch vụ này nhận câu hỏi cùng bộ lọc (`subject`, `chapter`, `kind`) và trả về danh sách đoạn kèm điểm. Toàn bộ phần còn lại do Next.js đảm nhiệm.

```
Trình duyệt ──HTTPS──▶ Caddy ──▶ apps/web (Next.js) ──────────────▶ LLM (Ollama)
                                    │  giao diện, đăng nhập,
                                    │  hội thoại, prompt
                                    ▼
                              services/rag (FastAPI)
                                 /search, /ingest
                                    │
                                    ▼
                      PostgreSQL 16 + pgvector (dữ liệu ứng dụng và vector)
```

Một câu hỏi đi qua `/api/chat` theo bảy bước.

1. Xác thực người dùng, đọc chế độ và phạm vi chương.
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
| Đăng nhập | Better Auth. Tài khoản học viên do quản trị cấp từ danh sách lớp. Vai trò gồm `guest`, `student`, `lecturer`, `admin`. |
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

### 4.2. Học liệu và quản trị (MVP)

Mỗi chương có trang riêng gồm mục tiêu, khái niệm chính, công thức và câu hỏi gợi ý mở sẵn trong chatbot. Trang quản trị cho giảng viên tải tài liệu, khai báo chương theo trang, chạy nạp lại, xem nhật ký câu hỏi và lọc các câu trả lời bị đánh giá 👎.

### 4.3. Sau MVP

- Ngân hàng trắc nghiệm theo chương, có giải thích và nguồn.
- Bài tập tính toán sinh số ngẫu nhiên, chấm tự động bằng cùng bộ công thức.
- Thẻ ghi nhớ khái niệm theo lịch lặp lại ngắt quãng.
- Bảng tiến độ cá nhân và thống kê cho giảng viên theo chương.
- Hỏi đáp số liệu trên chỉ mục niên giám riêng.

### 4.4. Landing page

Trang chủ `/` là trang đầu tiên người truy cập và hội đồng xét sáng kiến nhìn thấy. Trang phải cho biết sản phẩm là gì, của đơn vị nào, vì sao tin được, và bắt đầu dùng từ đâu.

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
- **Giao diện.** Bảng màu theo nhận diện CAND gồm đỏ, vàng, xanh lá. Biểu trưng của Học viện và của ngành chỉ được gắn sau khi đơn vị có thẩm quyền cho phép.

---

## 6. Cấu trúc thư mục

Thư mục cấp cao nhất chia theo dịch vụ. Trong Next.js, `app/` chỉ chứa định tuyến, còn logic nằm trong `features/` theo từng tính năng. Học liệu nằm ngoài code, và mọi dữ liệu gắn với môn học đều có trường `subject`.

```
TheoryOJ/
├── apps/web/                          # Next.js
│   ├── src/
│   │   ├── app/                       # Chỉ định tuyến
│   │   │   ├── (public)/              # Không cần đăng nhập
│   │   │   │   ├── page.tsx           # Landing page
│   │   │   │   ├── gioi-thieu/page.tsx
│   │   │   │   └── dang-nhap/page.tsx
│   │   │   ├── (hoc-tap)/             # Cần đăng nhập
│   │   │   │   ├── tong-quan/         # Tiến độ cá nhân
│   │   │   │   ├── mon/[mon]/chuong/[so]/
│   │   │   │   ├── tro-ly/            # Chat mới và [id] hội thoại cũ
│   │   │   │   └── on-tap/            # trac-nghiem, bai-tap
│   │   │   ├── (quan-tri)/quan-tri/   # tai-lieu, nhat-ky, danh-gia
│   │   │   ├── api/                   # chat, feedback, auth, admin/ingest
│   │   │   ├── opengraph-image.tsx, sitemap.ts, robots.ts
│   │   │   └── layout.tsx, globals.css
│   │   ├── features/
│   │   │   ├── landing/               # components/, content.ts, queries.ts
│   │   │   ├── chat/
│   │   │   │   ├── components/        # ChatWindow, CitationChip, ModeSelector…
│   │   │   │   ├── server/            # prompts, modes, rewrite-query, build-context,
│   │   │   │   │                      # guardrails, persist
│   │   │   │   └── tools/ktct-calculator.ts
│   │   │   ├── learning/  quiz/  progress/  admin/
│   │   ├── components/                # ui/ (shadcn), layout/, markdown/
│   │   ├── lib/                       # env, auth, llm, rag-client, db/schema/
│   │   ├── domain/ktct/formulas.ts    # Công thức KTCT và kiểm thử
│   │   ├── config/subjects.ts         # Danh sách môn và chương
│   │   └── proxy.ts
│   └── drizzle/, package.json, .env.example
├── services/rag/                      # FastAPI
│   ├── app/
│   │   ├── main.py, settings.py, schemas.py
│   │   ├── api/                       # search, ingest, health
│   │   ├── ingest/                    # readers, cleaning, chunking, metadata, pipeline
│   │   └── retrieval/                 # embedder, store, hybrid, reranker
│   ├── scripts/                       # ingest_all.py, evaluate.py
│   └── tests/, pyproject.toml, Dockerfile
├── content/ktct/                      # Học liệu
│   ├── manifest.yaml
│   ├── giao-trinh/  van-kien/  tham-khao/  cand/  so-lieu/
│   └── question-bank/
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
| Người dùng | `users` (role, class_code) |
| Nội dung | `subjects`, `chapters`, `documents` (kind, page_offset, sha256), `chunks` (chapter_id, page, section, `embedding vector(1024)`, tsv) |
| Hội thoại | `conversations` (mode), `messages` (citations jsonb, rewritten_query, latency_ms), `feedback` (rating, reason) |
| Học tập | `questions` (mcq, essay, calc), `attempts`, `progress` |

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
| 2. Next.js và chatbot | 4–5 | Khởi tạo `apps/web`, landing page bản tĩnh, trang `/tro-ly` với 4 chế độ, KaTeX, trích dẫn, công cụ tính toán, viết lại câu hỏi, bước phân loại câu hỏi, ngưỡng từ chối | Từ chối đúng từ 90 % câu ngoài phạm vi và câu khiêu khích, bài tập đúng 100 % về số |
| 3. Người dùng và quản trị | 6–7 | Better Auth, nhập tài khoản từ Excel, giới hạn tần suất, lưu hội thoại, đánh giá, trang quản trị và thống kê, gỡ `legacy/` | Giảng viên xem và lọc được log |
| 4. Học liệu và ôn tập | 8–10 | Trang 6 chương, trắc nghiệm, bài tập sinh số, bảng tiến độ | Mỗi chương có tối thiểu 20 câu trắc nghiệm |
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
- Giới hạn tần suất và độ dài câu hỏi ở `/api/chat` theo tài khoản và theo IP.
- Mật khẩu băm, buộc đổi ở lần đăng nhập đầu, khóa tạm khi nhập sai nhiều lần, captcha nếu mở đăng ký.
- Header CSP và HSTS. Mọi route API kiểm tra dữ liệu vào bằng Zod.
- Câu hỏi và đoạn tài liệu được đặt trong khối phân tách riêng. System prompt yêu cầu mô hình bỏ qua chỉ dẫn nằm trong hai khối này.
- Chỉ nạp văn bản đã công bố. Không đưa thông tin định danh học viên vào prompt.
- Ghi nhật ký thao tác quản trị, sao lưu Postgres hằng ngày, giám sát lỗi và tải GPU.
- Đơn vị an ninh mạng của Học viện kiểm thử xâm nhập trước khi mở công khai.

---

## 10. Hồ sơ sáng kiến chuyển đổi số

Hồ sơ thường được xét theo tính mới, hiệu quả và khả năng nhân rộng. Bằng chứng cho cả ba tiêu chí cần được thu từ đầu dự án. Mẫu hồ sơ chính thức cần đối chiếu với quy định của Học viện.

| Tiêu chí | Bằng chứng | Nguồn |
|---|---|---|
| Tính mới | Trợ lý trả lời mọi lúc, trích nguồn đến trang, liên hệ với nhiệm vụ CAND, so với hiện trạng tự tra cứu | Mô tả hiện trạng có Khoa xác nhận |
| Chất lượng trả lời | Chỉ số mục 9 của bản Streamlit so với bản mới | Kết quả `make eval` |
| Hiệu quả học tập | Điểm trắc nghiệm đầu và cuối đợt thử nghiệm, so với lớp đối chứng nếu có | Bảng `attempts` |
| Mức độ sử dụng | Số học viên, số câu hỏi theo chương, tỷ lệ 👍 | Bảng `messages`, `feedback` |
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
| 3 | Đối tượng truy cập | Đợt thử nghiệm chỉ mở chatbot cho học viên có tài khoản. Landing page và học liệu chương để công khai. |
| 4 | Tài khoản riêng hay tích hợp hệ thống sẵn có | Dùng tài khoản riêng do quản trị cấp. |
| 5 | Người soạn bộ câu chuẩn và ngân hàng trắc nghiệm | Cần ít nhất một giảng viên KTCT tham gia từ tuần 1. |
| 6 | Hiển thị toàn văn giáo trình | Mặc định chỉ hiện đoạn trích. |
| 7 | Bảng màu, biểu trưng, cách xưng hô | Khoa và đơn vị truyền thông của Học viện duyệt. |
