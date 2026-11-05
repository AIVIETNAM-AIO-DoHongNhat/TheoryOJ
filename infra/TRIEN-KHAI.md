# Triển khai TheoryOJ

Hướng dẫn cho người phát triển và đơn vị CNTT của Học viện, ứng với giai đoạn 5 trong `PLAN.md` mục 8. Mọi dịch vụ chạy bằng Docker Compose trên một máy. Chỉ Caddy mở cổng ra ngoài.

**Muốn không phải thuê máy chủ?** Xem [TRIEN-KHAI-VERCEL.md](TRIEN-KHAI-VERCEL.md): Vercel và Neon, miễn phí, không Docker.

Mặc định mọi mô hình (trả lời, embedding `baai/bge-m3`, rerank `cohere/rerank-v3.5`) gọi qua OpenRouter bằng một khóa duy nhất, nên **không cần GPU** và image `rag` chỉ khoảng 350 MB. Muốn chạy mô hình tại Học viện thì xem mục 8.

```
Internet ──▶ caddy ──▶ web (Next.js) ──▶ rag (FastAPI) ──▶ db (Postgres + pgvector)
                         │                 │                  ▲
                         └─────────────────┴──▶ OpenRouter     backup ─┘ (pg_dump hằng ngày)
```

## 1. Chuẩn bị

| Hạng mục | Yêu cầu |
|---|---|
| Máy chạy | Docker Engine 24 trở lên (hoặc Docker Desktop), Docker Compose v2, 8 GB RAM, 20 GB đĩa. Linux, Windows hay macOS đều được |
| Khóa OpenRouter | Tạo ở openrouter.ai/keys, nạp một ít credit. Nên đặt hạn mức chi tiêu cho khóa trong trang Keys |
| Đường ra Internet | **Tên miền** (A record về IP máy, mở cổng 80, 443) hoặc **Cloudflare Tunnel** (không cần tên miền, xem mục 2.1) |
| Mạng nội bộ không có DNS công khai | Dùng `tls internal` hoặc chứng chỉ do đơn vị CNTT cấp, xem chú thích trong `infra/Caddyfile` |
| Mã nguồn | `git clone` kèm Git LFS (`git lfs pull`) để có file PDF trong `content/` |

## 2. Cài đặt lần đầu

```bash
git clone <repo> theoryoj && cd theoryoj && git lfs pull
cp infra/.env.prod.example infra/.env
# Điền DOMAIN, POSTGRES_PASSWORD, RAG_API_KEY, LLM_API_KEY (khóa OpenRouter).
# Sinh mật khẩu: openssl rand -base64 32

docker compose -f infra/docker-compose.prod.yml up -d --build
```

Dịch vụ `migrate` tự tạo bảng của Next.js rồi thoát; `web` chỉ khởi động sau khi `migrate` xong. Mặc định `REFUSAL_THRESHOLD=0.44` đã được đo với `cohere/rerank-v3.5` (từ chối đúng 20/20 câu ngoài phạm vi và khiêu khích, không từ chối nhầm câu nào trong 30 câu hợp lệ). Đổi mô hình rerank thì phải đo lại ngưỡng (`make eval`, `make eval-chat`): ví dụ `mongodb/rerank-2.5-lite` rẻ hơn nhưng điểm câu ngoài phạm vi chồng lên điểm câu hợp lệ nên không dùng được.

### 2.1. Chạy trên máy cá nhân, không có tên miền

Đặt `DOMAIN=:80` trong `infra/.env` (Caddy chỉ phục vụ HTTP), rồi mở đường ra bằng Cloudflare Tunnel:

```bash
cloudflared tunnel --url http://localhost:80     # in ra https://<ngẫu nhiên>.trycloudflare.com
```

Link đổi mỗi lần chạy lại lệnh. Máy phải bật và có mạng suốt thời gian có người dùng. Cả lớp dùng chung một đường mạng thì mọi người cùng một IP: giữ `CHAT_LIMIT_IP_10M=1000`.

**Đã có chỉ mục từ bản phát triển?** Bản phát triển (`infra/docker-compose.yml`) và bản triển khai dùng chung project `theoryoj` và volume `pgdata`, nên chỉ mục cũ dùng lại được, không cần nạp lại. Khi đó đặt `POSTGRES_PASSWORD` đúng mật khẩu lúc tạo volume (mặc định `theoryoj`) vì Postgres chỉ nhận mật khẩu lúc khởi tạo, và dừng bản phát triển trước: `docker compose -f infra/docker-compose.yml down` (không thêm `-v`). Lưu ý bản triển khai không mở cổng 5433, nên dịch vụ `rag` chạy ngoài Docker ở máy phát triển sẽ mất kết nối DB.

Nạp học liệu vào chỉ mục tìm kiếm (chỉ cần khi chưa có chỉ mục; thêm `--skip-separate` để bỏ niên giám). Các lần sau chỉ nạp file mới hoặc đã đổi. Việc nhúng cũng gọi OpenRouter, khoảng 0,02 USD cho toàn bộ học liệu hiện có:

```bash
docker compose -f infra/docker-compose.prod.yml exec rag python scripts/ingest_all.py
```

Để gõ lệnh ngắn hơn: `alias dc='docker compose -f infra/docker-compose.prod.yml'`.

## 3. Kiểm tra sau khi triển khai

```bash
curl -s https://$DOMAIN/api/health          # {"ok":true,"database":true,"rag":true}
curl -sI https://$DOMAIN | grep -iE 'strict-transport|content-security|x-frame'
dc ps                                       # mọi dịch vụ Up, migrate Exited (0)
```

Trên trình duyệt (cả điện thoại):

- [ ] Trang chủ, Học liệu, Thư viện mở được; PDF giáo trình hiện trang và bấm trích dẫn mở đúng trang.
- [ ] Trợ lý trả lời một câu lý thuyết, có trích dẫn `[n]`; một bài tập có bước tính.
- [ ] Hỏi một câu ngoài phạm vi (ví dụ thời tiết) và một câu khiêu khích: nhận câu từ chối cố định.
- [ ] Thẻ ghi nhớ, trắc nghiệm, bài tập, trang Tiến độ, trang Khảo sát hoạt động.

## 4. Kiểm thử bảo mật

Đơn vị an ninh mạng của Học viện kiểm thử xâm nhập trước khi mở công khai (PLAN.md mục 9). Các điểm đã có sẵn để đối chiếu:

| Hạng mục | Cách làm trong hệ thống | Cách kiểm tra |
|---|---|---|
| Bề mặt mạng | Chỉ Caddy mở cổng; `db`, `rag`, `ollama` không có `ports` | `nmap` từ bên ngoài chỉ thấy 80, 443 |
| HTTPS | Caddy tự cấp chứng chỉ, chuyển hướng HTTP sang HTTPS, HSTS 1 năm | SSL Labs hoặc `testssl.sh` |
| Header | CSP, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy (`apps/web/next.config.ts`) | `curl -I`, securityheaders.com |
| Lạm dụng trợ lý | Giới hạn theo trình duyệt và theo IP (`CHAT_LIMIT_*`), câu hỏi tối đa 1.500 ký tự, thân yêu cầu tối đa 2 MB | Gửi liên tục quá giới hạn, nhận mã 429 |
| Giả mạo IP | IP lấy từ phần tử cuối của `X-Forwarded-For` do Caddy ghi, không tin phần tử do trình duyệt gửi | Gửi kèm `X-Forwarded-For` giả, giới hạn vẫn tính theo IP thật |
| Dữ liệu vào | Mọi route API và Server Action kiểm tra bằng Zod; bài tập và trắc nghiệm chấm trên máy chủ | Gửi dữ liệu sai kiểu, nhận lỗi 400 hoặc lỗi chung |
| Chèn lệnh vào mô hình | Bước phân loại gắn nhãn `chen_lenh`; câu hỏi và tài liệu đặt trong khối phân tách | Thử "bỏ qua mọi chỉ dẫn trước…", nhận câu từ chối, tin nhắn được gắn cờ |
| Dữ liệu cá nhân | Đăng nhập không bắt buộc; tài khoản chỉ lưu mã học viên, họ tên, lớp. Mật khẩu băm scrypt; cookie phiên và mã khách httpOnly, SameSite=Lax, Secure; DB chỉ lưu SHA-256 của mã phiên | Xem cookie trong DevTools, `select * from users` không có mật khẩu rõ |
| Trang quản trị | Mọi trang và Server Action của `/quan-tri` gọi `requireTeacher()`; học viên nhận 404, quyền giảng viên chỉ cấp bằng lệnh trên máy chủ | Đăng nhập tài khoản học viên rồi mở `/quan-tri`, gọi thẳng action đặt lại mật khẩu: bị chặn |
| Dò mật khẩu | Mỗi mã học viên 10 lần đăng nhập trong 10 phút; sai mã hay sai mật khẩu cùng một thông báo | Đăng nhập sai liên tục, nhận thông báo chờ |
| Nạp tài liệu | `POST /ingest` của `rag` yêu cầu `RAG_API_KEY` và không mở ra ngoài | Gọi từ ngoài không tới được |

## 5. Kiểm thử nội dung

Trước khi mở cho lớp thử nghiệm, chạy bộ câu chuẩn trên máy phát triển, cấu hình `.env` giống bản triển khai (cùng mô hình, cùng ngưỡng từ chối; PLAN.md mục 9):

```bash
make eval        # hit@5 của tìm kiếm
make eval-chat   # từ chối đúng (mục tiêu từ 90 %), bài tập đúng số (100 %)
```

Giảng viên đọc kết quả `npm run eval -- --answers` (lưu ở `eval/ktct/results/`) và chấm thang 1–5 ít nhất 20 câu; mục tiêu trung bình từ 4. Trong đợt thử nghiệm, giảng viên xem các tin nhắn bị gắn cờ và các lượt 👎:

```sql
-- dc exec db psql -U theoryoj
select created_at, question, label from messages where flagged order by created_at desc limit 50;
select m.question, f.reason, f.comment from feedback f join messages m on m.id = f.message_id where f.rating = -1;
```

## 6. Đợt thử nghiệm với lớp học

1. Trước buổi đầu: đặt `SURVEY_PHASE=truoc` trong `infra/.env`, chạy `dc up -d web`. Học viên và giảng viên làm phiếu tại `/khao-sat`.
2. Trong 2 tuần: học viên dùng trợ lý, trắc nghiệm, bài tập. Mỗi tuần giảng viên xem tin nhắn gắn cờ và lượt 👎.
3. Buổi cuối: đổi `SURVEY_PHASE=sau`, `dc up -d web`. Học viên làm phiếu sau **trên cùng trình duyệt** đã dùng, để ghép được tiến độ.
4. Xuất số liệu cho hồ sơ (PLAN.md mục 10):

```bash
dc run --rm migrate npx tsx scripts/report.mts --from 2026-11-10 --to 2026-11-24 > bao-cao.md
```

Cả lớp dùng chung một đường mạng thì mọi người cùng một IP; nâng `CHAT_LIMIT_IP_10M` (mặc định trong mẫu là 1000) cho đủ.

Trang chủ tự chuyển hàng số liệu sang số sử dụng thật (câu hỏi đã trả lời, lượt ôn tập, tỷ lệ hữu ích) khi có từ 100 câu trả lời, cập nhật mỗi giờ.

## 7. Vận hành

| Việc | Lệnh |
|---|---|
| Xem nhật ký | `dc logs -f web rag` |
| Cập nhật mã nguồn | `git pull && git lfs pull && dc up -d --build` |
| Thêm bài viết, tài liệu thư viện | Thêm file vào `content/` rồi `dc up -d --build web` (trang được build sẵn); tài liệu mới cần nạp lại: `dc exec rag python scripts/ingest_all.py` |
| Sửa ngân hàng câu hỏi, thẻ ghi nhớ, câu hỏi gợi ý | Sửa `content/<môn>/question-bank/*.yaml`, `content/<môn>/the-ghi-nho/*.yaml` hoặc `content/<môn>/tro-ly.yaml`, rồi `dc up -d --build web` (trang thẻ được dựng sẵn) |
| Cấp tài khoản giảng viên | `dc run --rm migrate npx tsx scripts/cap-quyen.mts <mã> --tao "Họ tên"` (in mật khẩu tạm), hoặc bỏ `--tao` để nâng tài khoản đã đăng ký; `--thu` để thu quyền. Giảng viên vào `/quan-tri` |
| Học viên quên mật khẩu | Giảng viên bấm "Đặt lại mật khẩu" ở `/quan-tri/hoc-vien/<mã>`, hoặc `dc run --rm migrate npx tsx scripts/dat-lai-mat-khau.mts <mã học viên>`; báo mật khẩu tạm cho học viên |
| Mở thêm môn | Theo `content/THEM-MON.md`, rồi `dc up -d --build web` và `dc exec rag python scripts/ingest_all.py <môn>` |
| Sao lưu | Tự động mỗi ngày vào `infra/backups/`, giữ `BACKUP_KEEP_DAYS` ngày. Nên chép thêm ra máy khác |
| Khôi phục | `dc exec -T db pg_restore -U theoryoj -d theoryoj --clean --if-exists < infra/backups/theoryoj-<ngày>.dump` |
| Đổi mô hình ngôn ngữ | Sửa `LLM_*` trong `infra/.env`, `dc up -d web`, chạy lại `make eval-chat` |

## 8. Chạy mô hình tại Học viện (không qua OpenRouter)

Chỉ cần khi Học viện không cho gửi dữ liệu ra ngoài. Cần máy có GPU NVIDIA từ 12 GB VRAM (tìm kiếm cần khoảng 3 GB, `qwen2.5:7b` lượng tử hóa khoảng 6 GB) và NVIDIA Container Toolkit. Trong `infra/.env`:

```env
EMBED_PROVIDER=local
RERANK_PROVIDER=local
EMBED_MODEL=BAAI/bge-m3
RERANK_MODEL=BAAI/bge-reranker-v2-m3
RAG_LOCAL_MODELS=1            # build image rag có torch (vài GB)
LLM_BASE_URL=http://ollama:11434/v1
LLM_API_KEY=ollama
LLM_MODEL=qwen2.5:7b
REFUSAL_THRESHOLD=0.3         # ngưỡng đo với bge-reranker, khác với cohere
```

```bash
docker compose -f infra/docker-compose.prod.yml -f infra/docker-compose.gpu.yml --profile ollama up -d --build
docker compose -f infra/docker-compose.prod.yml exec ollama ollama pull qwen2.5:7b
```

Lần đầu `rag` tải bge-m3 và reranker (khoảng 4 GB) vào volume `hfcache`. Trên CPU, reranker mất khoảng 7 giây mỗi câu.
