# Triển khai TheoryOJ

Hướng dẫn cho người phát triển và đơn vị CNTT của Học viện, ứng với giai đoạn 5 trong `PLAN.md` mục 8. Mọi dịch vụ chạy bằng Docker Compose trên một máy chủ. Chỉ Caddy mở cổng 80 và 443 ra ngoài.

```
Internet ──443──▶ caddy ──▶ web (Next.js) ──▶ rag (FastAPI) ──▶ db (Postgres + pgvector)
                              │                                  ▲
                              └──▶ ollama (tùy chọn)     backup ─┘ (pg_dump hằng ngày)
```

## 1. Chuẩn bị

| Hạng mục | Yêu cầu |
|---|---|
| Máy chủ | Linux 64-bit, Docker Engine 24 trở lên, Docker Compose v2, 16 GB RAM, 60 GB đĩa |
| GPU (nên có) | NVIDIA, từ 12 GB VRAM nếu chạy cả tìm kiếm và `qwen2.5:7b`; cài NVIDIA Container Toolkit |
| Không có GPU | Tìm kiếm chạy được trên CPU nhưng chậm hơn (vài giây mỗi câu); mô hình ngôn ngữ nên dùng API ngoài nếu Học viện cho phép |
| Tên miền | Bản ghi A trỏ về IP máy chủ; mở cổng 80, 443 (TCP) và 443 (UDP) trên tường lửa |
| Mạng nội bộ không có DNS công khai | Dùng `tls internal` hoặc chứng chỉ do đơn vị CNTT cấp, xem chú thích trong `infra/Caddyfile` |
| Mã nguồn | `git clone` kèm Git LFS (`git lfs pull`) để có file PDF trong `content/` |

## 2. Cài đặt lần đầu

```bash
git clone <repo> theoryoj && cd theoryoj && git lfs pull
cp infra/.env.prod.example infra/.env
# Điền DOMAIN, ACME_EMAIL, POSTGRES_PASSWORD, RAG_API_KEY, mô hình ngôn ngữ.
# Sinh mật khẩu: openssl rand -base64 32

# Có GPU, chạy mô hình tại chỗ:
docker compose -f infra/docker-compose.prod.yml -f infra/docker-compose.gpu.yml --profile ollama up -d --build
docker compose -f infra/docker-compose.prod.yml exec ollama ollama pull qwen2.5:7b

# Không có GPU, dùng API ngoài (đặt LLM_BASE_URL, LLM_API_KEY, LLM_MODEL trong infra/.env):
docker compose -f infra/docker-compose.prod.yml up -d --build
```

Dịch vụ `migrate` tự tạo bảng của Next.js rồi thoát; `web` chỉ khởi động sau khi `migrate` xong. Lần đầu, `rag` tải mô hình bge-m3 và reranker (khoảng 4 GB) vào volume `hfcache`, mất vài phút.

Nạp học liệu vào chỉ mục tìm kiếm, gồm cả niên giám thống kê ở chỉ mục riêng (lần đầu vài phút trên GPU, lâu hơn nhiều trên CPU; thêm `--skip-separate` để bỏ niên giám). Các lần sau chỉ nạp file mới hoặc đã đổi:

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
- [ ] Trắc nghiệm, bài tập, trang Tiến độ, trang Khảo sát hoạt động.

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
| Dữ liệu cá nhân | Không đăng nhập, không thu thập họ tên; mã khách ngẫu nhiên trong cookie httpOnly, SameSite=Lax, Secure | Xem cookie trong DevTools |
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
| Sửa ngân hàng câu hỏi, câu hỏi gợi ý | Sửa `content/<môn>/question-bank/*.yaml` hoặc `content/<môn>/tro-ly.yaml`, khởi động lại `dc restart web` |
| Mở thêm môn | Theo `content/THEM-MON.md`, rồi `dc up -d --build web` và `dc exec rag python scripts/ingest_all.py <môn>` |
| Sao lưu | Tự động mỗi ngày vào `infra/backups/`, giữ `BACKUP_KEEP_DAYS` ngày. Nên chép thêm ra máy khác |
| Khôi phục | `dc exec -T db pg_restore -U theoryoj -d theoryoj --clean --if-exists < infra/backups/theoryoj-<ngày>.dump` |
| Đổi mô hình ngôn ngữ | Sửa `LLM_*` trong `infra/.env`, `dc up -d web`, chạy lại `make eval-chat` |
