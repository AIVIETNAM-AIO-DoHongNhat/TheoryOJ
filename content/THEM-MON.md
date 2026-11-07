# Mở thêm một môn

Hướng dẫn cho người phát triển và giảng viên của môn mới, ứng với giai đoạn 6 trong `PLAN.md` mục 8. Mở một môn chỉ cần nội dung và một mục trong `apps/web/src/config/subjects.ts`, không sửa prompt, trang hay dịch vụ tìm kiếm. Ví dụ dưới đây dùng mã môn `triet`.

## 1. Việc của giảng viên

| Nội dung | File | Ghi chú |
|---|---|---|
| Giáo trình và văn kiện | `content/triet/giao-trinh/`, `van-kien/`, `tham-khao/`, `cand/` | PDF, Markdown hoặc DOCX đã công bố. File `.doc` cần chuyển sang `.docx` trước. |
| Ranh giới chương | `content/triet/manifest.yaml` | Trang PDF đầu và cuối của từng chương, độ lệch giữa trang PDF và trang in (`page_offset`). |
| Lời dặn cho trợ lý | `content/triet/tro-ly.yaml` | Phạm vi câu hỏi hợp lệ, ví dụ câu cần từ chối, nhiệm vụ cần liên hệ, câu hỏi gợi ý. |
| Ngân hàng trắc nghiệm | `content/triet/question-bank/chuong-<n>.yaml` | Mỗi chương từ 20 câu, quy ước ở `content/ktct/question-bank/_mau.yaml`. |
| Thẻ ghi nhớ (không bắt buộc) | `content/triet/the-ghi-nho/chuong-<n>.yaml` | Khái niệm, công thức theo chương, quy ước ở `content/ktct/the-ghi-nho/_mau.yaml`. |
| Tóm tắt chương (không bắt buộc) | `content/triet/tom-tat/chuong-<n>.yaml` | Sinh bằng `npm run tom-tat -- --subject triet --all` sau khi nạp học liệu, giảng viên soát rồi đổi `status` thành `da-duyet`. Chưa có thì trợ lý tóm tắt tại chỗ. Quy ước ở `content/ktct/tom-tat/_mau.yaml`. |
| Bộ câu chuẩn | `eval/triet/golden.jsonl` | Khoảng 50 câu: câu lý thuyết kèm trang nguồn, câu ngoài phạm vi, câu khiêu khích. |

Mẫu của ba file đầu nằm ở `content/_mau-mon/`, mẫu bộ câu chuẩn ở `eval/_mau/golden.jsonl`. Phần chung cho mọi môn (trích nguồn đến trang, xưng "đồng chí", câu từ chối, chống chèn lệnh, không bình luận về lãnh đạo) đã có sẵn trong code, giảng viên không cần viết lại.

## 2. Việc của người phát triển

```bash
cp -r content/_mau-mon content/triet
mkdir -p eval/triet && cp eval/_mau/golden.jsonl eval/triet/
# Đặt học liệu vào content/triet/, sửa manifest.yaml, tro-ly.yaml theo nội dung giảng viên gửi.
```

Trong `apps/web/src/config/subjects.ts`, điền chương của môn (số và tên khớp `manifest.yaml`) và đặt `active: true`. Môn lý luận dùng `THEORY_MODES` (Hỏi đáp, Liên hệ thực tiễn, Ôn thi). Chế độ Giải bài tập cần một công cụ tính viết bằng code như `src/domain/ktct/`, nên chỉ bật khi môn có bài tập tính toán.

Kiểm tra rồi nạp học liệu:

```bash
cd apps/web && npm test            # subjects.test.ts báo file còn thiếu hoặc lệch chương
make ingest                        # nạp mọi môn có manifest.yaml, chỉ file mới hoặc đã đổi
make eval SUBJECT=triet            # hit@5 của tìm kiếm
make eval-chat SUBJECT=triet       # từ chối đúng, cần mô hình ngôn ngữ đang chạy
```

Trên máy chủ: `dc up -d --build web` rồi `dc exec rag python scripts/ingest_all.py triet` (xem `infra/TRIEN-KHAI.md`).

## 3. Sau khi mở

Môn mới tự hiện ở menu Học liệu, trang `/mon`, Thư viện, bộ chọn môn của trợ lý, trang Ôn tập và Tiến độ. Bài viết thuộc môn ghi `subject: triet` ở phần đầu file. Trước khi mở cho học viên, chạy bộ câu chuẩn và đạt các mục tiêu ở `PLAN.md` mục 9, như với KTCT.

Lời văn chung trên trang chủ (khung chat minh họa) và phiếu khảo sát vẫn viết cho đợt thử nghiệm KTCT; sửa ở `features/landing/content.ts` và `features/survey/questions.ts` nếu cần.
