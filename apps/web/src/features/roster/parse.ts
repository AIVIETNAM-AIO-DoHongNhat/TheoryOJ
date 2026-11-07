import { normalizeClassName, normalizeStudentCode, STUDENT_CODE } from "./normalize";

// Đọc danh sách học viên giảng viên dán vào: mỗi dòng "mã, họ tên, lớp". Chép thẳng ba cột từ Excel thì các cột cách nhau
// bằng tab; gõ tay thì dùng dấu chấm phẩy, dấu phẩy hoặc dấu |. Dòng tiêu đề (có chữ "mã") và dòng trống được bỏ qua.

export const ROSTER_MAX = 2000;
const NAME_MAX = 80;
const CLASS_MAX = 40;

export interface RosterRow {
  studentCode: string;
  fullName: string;
  className: string;
}

export type ParsedLine = { line: number; data: RosterRow; error?: undefined } | { line: number; data?: undefined; error: string };

function splitLine(line: string): string[] {
  const sep = line.includes("\t") ? "\t" : line.includes(";") ? ";" : line.includes("|") ? "|" : ",";
  return line.split(sep).map((c) => c.trim());
}

const isHeader = (cells: string[]) => /^(mã|ma)(\s|$)/i.test(cells[0] ?? "") || /^stt$/i.test(cells[0] ?? "");

export function parseRosterText(text: string): ParsedLine[] {
  const out: ParsedLine[] = [];
  const seen = new Map<string, number>();
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = i + 1;
    if (!raw.trim()) return;
    let cells = splitLine(raw);
    if (isHeader(cells)) return;
    // Bảng chép từ Excel hay có cột số thứ tự ở đầu.
    if (cells.length === 4 && /^\d+$/.test(cells[0])) cells = cells.slice(1);
    if (cells.length < 3) return out.push({ line, error: "Cần đủ ba cột: mã học viên, họ tên, lớp." });
    if (cells.length > 3) return out.push({ line, error: "Thừa cột. Mỗi dòng chỉ gồm mã học viên, họ tên, lớp." });

    const studentCode = normalizeStudentCode(cells[0]);
    const fullName = cells[1].replace(/\s+/g, " ");
    const className = normalizeClassName(cells[2]);
    if (!STUDENT_CODE.test(studentCode)) return out.push({ line, error: `Mã "${cells[0]}" không hợp lệ: 3–32 ký tự gồm chữ, số, dấu chấm, gạch nối.` });
    if (fullName.length < 2 || fullName.length > NAME_MAX) return out.push({ line, error: `Họ tên cần 2–${NAME_MAX} ký tự.` });
    if (!className || className.length > CLASS_MAX) return out.push({ line, error: `Tên lớp cần 1–${CLASS_MAX} ký tự.` });
    const dup = seen.get(studentCode);
    if (dup) return out.push({ line, error: `Mã ${studentCode} trùng với dòng ${dup}.` });
    seen.set(studentCode, line);
    out.push({ line, data: { studentCode, fullName, className } });
  });
  return out;
}
