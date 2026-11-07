# Triển khai trên Vercel và Neon (miễn phí)

Cách nhẹ nhất cho bản sáng kiến: không cần máy chủ, không Docker, không GPU.

```
Trình duyệt ──▶ Vercel (Next.js, tìm kiếm chạy trong tiến trình) ──▶ Neon (Postgres + pgvector)
                         │
                         └──▶ OpenRouter (trả lời, embedding bge-m3, rerank Cohere)
```

Khi không đặt `RAG_URL`, web tự tìm kiếm trong tiến trình (`apps/web/src/lib/search/`): gọi OpenRouter để nhúng câu hỏi và xếp hạng lại, còn truy vấn vector và từ khóa chạy thẳng trên PostgreSQL. Thuật toán và câu SQL giống hệt dịch vụ `services/rag`; trên 12 câu chuẩn, hai bản cho top-5 trùng khít và điểm chênh 0,0000. Dịch vụ `services/rag` chỉ còn dùng để **nạp học liệu** vào chỉ mục, chạy trên máy phát triển.

## 1. Chuẩn bị

| Hạng mục | Ghi chú |
|---|---|
| Tài khoản | Vercel (gói Hobby), Neon (gói Free), OpenRouter có ít credit; không cần thẻ cho hai gói đầu |
| Mã nguồn trên GitHub | Có Git LFS cho `content/**/*.pdf`, `*.docx`. Người phát triển tự commit và push |
| Máy phát triển | Docker (đang chạy Postgres của bản phát triển) và Node để chạy lệnh nạp dữ liệu |
| Giới hạn | Vercel Hobby chỉ cho dự án phi thương mại, đúng với một sáng kiến giáo dục |

## 2. Neon: tạo cơ sở dữ liệu

1. Tạo project, chọn vùng **AWS Singapore (ap-southeast-1)** cho gần người dùng Việt Nam. File [vercel.json](../apps/web/vercel.json) đặt hàm chạy ở `sin1` (Singapore) cho cùng vùng.
2. Lấy **hai** chuỗi kết nối ở nút *Connect*:
   - **Pooled** (tên máy có `-pooler`): dùng cho ứng dụng trên Vercel.
   - **Direct** (không có `-pooler`): dùng cho lệnh nạp dữ liệu và migrate ở mục 3.
3. Bật pgvector trên cơ sở dữ liệu đó:

```bash
psql "<chuỗi direct>" -c "CREATE EXTENSION IF NOT EXISTS vector"
```

## 3. Đưa dữ liệu lên Neon

**a) Chỉ mục tìm kiếm** (bảng `documents`, `chunks`, khoảng 26 MB, đã thử restore thành công). Dùng lại chỉ mục có sẵn ở máy phát triển, không tốn credit nhúng lại:

```bash
docker exec theoryoj-db-1 pg_dump -U theoryoj -d theoryoj --no-owner --no-acl -t documents -t chunks -Fc -f /tmp/chi-muc.dump
docker cp theoryoj-db-1:/tmp/chi-muc.dump .
docker run --rm -v "$PWD:/d" pgvector/pgvector:pg16 pg_restore --no-owner --no-acl -d "<chuỗi direct>" /d/chi-muc.dump
```

Chưa có chỉ mục ở máy phát triển thì nạp thẳng vào Neon (nhúng qua OpenRouter, khoảng 0,02 USD):

```bash
cd services/rag
DATABASE_URL="<chuỗi direct>" EMBED_PROVIDER=openrouter EMBED_MODEL=baai/bge-m3 ../../.venv/Scripts/python scripts/ingest_all.py
```

**b) Bảng của web** (tài khoản, hội thoại, tiến độ…):

```bash
cd apps/web
DATABASE_URL="<chuỗi direct>" npm run db:migrate
```

Kiểm tra: `psql "<chuỗi direct>" -c "select index_name, count(*) from chunks group by 1"` phải ra `main 1540` và `separate 3370`.

## 4. Vercel: tạo dự án

1. *Add New > Project*, chọn repo GitHub.
2. **Root Directory**: `apps/web`. Framework Next.js tự nhận.
3. Git LFS: không cần bật gì. Nếu file `content/**/*.pdf` chỉ là con trỏ LFS, bước `prebuild` (`apps/web/scripts/copy-pdfs.mjs`) tự tải bản thật từ GitHub và kiểm tra sha256. Repo riêng thì thêm biến `GITHUB_TOKEN` (quyền đọc nội dung). Bật Git LFS trong *Settings > Git* cũng được, không ảnh hưởng.
4. Ở *Settings > General*, bật **Include source files outside of the Root Directory in the Build Step** (thư mục `content/` nằm ngoài `apps/web`).
5. *Settings > Environment Variables* (áp dụng cho Production và Preview):

| Biến | Giá trị |
|---|---|
| `DATABASE_URL` | chuỗi **pooled** của Neon (có `?sslmode=require`) |
| `LLM_BASE_URL` | `https://openrouter.ai/api/v1` |
| `LLM_API_KEY` | khóa OpenRouter (cũng dùng cho embedding và rerank) |
| `LLM_MODEL` | `qwen/qwen-2.5-7b-instruct` |
| `CHAT_LIMIT_VISITOR_DAY` | gợi ý 30 để giữ credit OpenRouter |
| `CHAT_LIMIT_IP_10M` | cả lớp chung một đường mạng thì đặt 1000 |
| `SURVEY_PHASE` | `truoc`, `sau` hoặc `dong` |
| `REGISTRATION_OPEN` | để trống (mặc định `false`): chỉ mã có trong danh sách học viên ở `/quan-tri/danh-sach` mới đăng ký được |

**Không đặt `RAG_URL`.** Không cần đặt `REFUSAL_THRESHOLD` (mặc định 0,44, đã đo với `cohere/rerank-v3.5`), `EMBED_MODEL` hay `RERANK_MODEL`.

6. *Deploy*. Từ đó mỗi lần push lên nhánh chính là tự triển khai lại.

## 5. Kiểm tra

```bash
curl -s https://<tên-dự-án>.vercel.app/api/health     # {"ok":true,"database":true,"rag":true}
```

Rồi làm theo danh sách ở mục 3 của [TRIEN-KHAI.md](TRIEN-KHAI.md): mở thư viện, đọc một PDF, đăng ký tài khoản, hỏi một câu trong phạm vi và một câu ngoài phạm vi.

## 6. Vận hành

| Việc | Cách làm |
|---|---|
| Sửa nội dung (bài viết, ngân hàng câu hỏi, thẻ ghi nhớ) | Sửa trong `content/`, commit, push. Vercel tự build lại |
| Thêm tài liệu cho trợ lý tìm | Thêm file vào `content/<môn>/` và `manifest.yaml`, chạy `ingest_all.py` với `DATABASE_URL` trỏ vào Neon (mục 3a), rồi push |
| Cấp quyền giảng viên | `DATABASE_URL="<chuỗi direct>" npm run cap-quyen -- <mã> --tao "Họ tên"` trong `apps/web` |
| Danh sách học viên | Giảng viên nhập ở `/quan-tri/danh-sach` trước khi học viên đăng ký |
| Đặt lại mật khẩu học viên | Giảng viên bấm ở `/quan-tri`, hoặc `DATABASE_URL="<chuỗi direct>" npm run dat-lai-mat-khau -- <mã>` |
| Báo cáo số liệu cho hồ sơ | `DATABASE_URL="<chuỗi direct>" npx tsx scripts/report.mts --from <ngày> --to <ngày>` |
| Sao lưu | Gói Free của Neon chỉ giữ lịch sử ngắn. Nên tự `pg_dump` bằng chuỗi direct định kỳ, nhất là trước và sau đợt thử nghiệm |
| Xem credit OpenRouter | Trang Activity của OpenRouter. Mỗi câu hỏi tốn khoảng 0,002 USD (ước tính: 0,001 USD rerank Cohere cộng tiền mô hình trả lời) |

## 7. Lưu ý

- **Build luôn bỏ bộ nhớ đệm của Next.js.** `buildCommand` trong [vercel.json](../apps/web/vercel.json) xóa `.next/cache` trước khi build: có lần Vercel build mã mới nhưng dùng lại CSS cũ từ bộ đệm (thiếu các lớp mới ở cuối `globals.css`). Bộ đệm `node_modules` vẫn giữ nên build chỉ chậm hơn ít. Vẫn thấy bản lệch thì *Deployments > ⋯ > Redeploy*, bỏ chọn *Use existing Build Cache*; hoặc thêm biến `VERCEL_FORCE_NO_BUILD_CACHE=1` để bỏ toàn bộ bộ đệm.
- **Neon tự ngủ sau 5 phút không dùng**, nên câu hỏi đầu tiên sau đó chậm thêm khoảng một giây.
- **IP người dùng** lấy từ phần tử cuối của `X-Forwarded-For`. Vercel ghi đè header này bằng IP thật, nên giới hạn theo IP vẫn đúng.
- **PDF** được chép sang `public/tai-lieu-goc/` lúc build (`apps/web/scripts/copy-pdfs.mjs`) và phục vụ qua CDN, hỗ trợ tải từng phần cho trình đọc PDF. Đường `/api/tai-lieu/<slug>` chuyển hướng sang đó.
- **Thời gian tối đa của câu trả lời** là 60 giây (`maxDuration` trong `app/api/chat/route.ts`).
- **Đổi mô hình rerank** thì phải đo lại ngưỡng từ chối bằng `make eval` và `make eval-chat`.
- Việc đã thử trên máy: build với `VERCEL=1`, chạy bản build đó với tìm kiếm trong tiến trình (health, chuyển hướng và Range của PDF, chat trong và ngoài phạm vi). **Chưa thử** trên hạ tầng Vercel và Neon thật.
