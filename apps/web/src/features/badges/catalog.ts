import { STREAK_MILESTONES } from "@/features/progress/today";
import { PASS_RATIO, QUIZ_SIZE } from "@/features/quiz/types";

// Danh mục huy hiệu và cách tính, tách khỏi DB để kiểm thử được. Thêm huy hiệu: thêm một dòng vào ACHIEVEMENTS;
// mã (`id`) đã phát cho học viên thì không đổi nữa, vì bảng user_badges lưu theo mã.

export type Tier = "dong" | "bac" | "vang";

export const TIER_LABELS: Record<Tier, string> = { dong: "Đồng", bac: "Bạc", vang: "Vàng" };

/** Tên biểu tượng, đổi sang biểu tượng lucide ở components/BadgeMedal.tsx. */
export type BadgeIcon =
  | "flame" | "calendar" | "list" | "target" | "crosshair" | "calculator" | "cards" | "brain" | "pen"
  | "message" | "notebook" | "graduation" | "chapter" | "award";

export type CategoryId = "chuong" | "chuoi" | "luyen-tap" | "lap-luan" | "ghi-nho" | "tim-toi";

export const CATEGORIES: { id: CategoryId; title: string; description: string }[] = [
  { id: "chuong", title: "Chương học", description: "Đạt trắc nghiệm để nhận huy chương của chương. Thuộc thẻ, làm đúng bài tập và đạt điểm tuyệt đối để thêm sao." },
  { id: "chuoi", title: "Chuỗi ngày học", description: "Tính theo chuỗi dài nhất đồng chí từng giữ, chuỗi đứt cũng không mất huy hiệu." },
  { id: "luyen-tap", title: "Trắc nghiệm và bài tập", description: "Luyện đề đều đặn và làm đúng bài tập tính toán." },
  { id: "lap-luan", title: "Tự luận và phản bác", description: "Viết bài tự luận đạt từ 7 điểm và phản bác đúng lập trường các luận điệu sai trái." },
  { id: "ghi-nho", title: "Thẻ ghi nhớ", description: "Ôn thẻ đúng hẹn. Thẻ có khoảng ôn từ 21 ngày trở lên tính là đã thuộc." },
  { id: "tim-toi", title: "Hỏi và ghi chép", description: "Hỏi trợ lý khi băn khoăn, ghi chú khi đọc giáo trình." },
];

/** Số liệu học tập của một học viên, đủ để xét mọi huy hiệu. */
export interface BadgeStats {
  /** Chuỗi ngày học dài nhất từng có. */
  bestStreak: number;
  quizAttempts: number;
  /** Số lượt trắc nghiệm đúng hết. */
  perfectQuizzes: number;
  /** Số lượt bài tập đúng mọi đại lượng. */
  exercisesSolved: number;
  /** Tổng số lần chấm thẻ. */
  cardReviews: number;
  /** Thẻ có khoảng ôn từ MASTERED_DAYS trở lên, kể cả thẻ tự tạo. */
  cardsMastered: number;
  ownCards: number;
  questions: number;
  /** Ghi chú trong trình đọc cộng trang sổ ghi chép có nội dung. */
  notes: number;
  /** Số câu tự luận khác nhau đạt từ ESSAY_PASS điểm (thang 10), tính điểm giảng viên nếu có. */
  essaysPassed: number;
  /** Số luận điệu khác nhau đã phản bác đúng lập trường, đạt từ REBUTTAL_PASS điểm. */
  rebuttalsPassed: number;
  subjects: SubjectStats[];
}

export interface SubjectStats {
  id: string;
  shortName: string;
  /** Chỉ chương có ngân hàng trắc nghiệm. */
  chapters: ChapterStats[];
}

export interface ChapterStats {
  number: number;
  title: string;
  /** Tỷ lệ đúng cao nhất, null nếu chưa làm. */
  quizBest: number | null;
  /** Số thẻ trong bộ thẻ của chương (không tính thẻ tự tạo) và số thẻ trong đó đã thuộc. */
  cardTotal: number;
  cardsMastered: number;
  /** Chương có bài tập tính toán không, và số lượt làm đúng hết. */
  hasExercises: boolean;
  exercisesSolved: number;
}

export interface Badge {
  id: string;
  /** Các huy hiệu cùng chỉ số (chuỗi 3, 7, 14 ngày...) chung một series; huy chương chương học mỗi cái một series. */
  series: string;
  category: CategoryId;
  name: string;
  /** Điều kiện đạt, viết như lời dặn. */
  description: string;
  tier: Tier;
  icon: BadgeIcon;
  current: number;
  target: number;
  /** Đơn vị cho dòng tiến độ, ví dụ "ngày", "lượt". */
  unit: string;
  earned: boolean;
  /** Huy chương chương học: số chương để in lên mặt huy chương và các tiêu chí sao. */
  chapter?: { subject: string; number: number; criteria: { label: string; met: boolean }[] };
}

interface Achievement {
  id: string;
  series: string;
  category: CategoryId;
  name: string;
  description: string;
  tier: Tier;
  icon: BadgeIcon;
  unit: string;
  target: number;
  metric: (s: BadgeStats) => number;
  /** Ẩn khi không áp dụng được, ví dụ chưa môn nào có bài tập tính toán. */
  when?: (s: BadgeStats) => boolean;
}

const STREAK_BADGES: Record<(typeof STREAK_MILESTONES)[number], { name: string; tier: Tier }> = {
  3: { name: "Nhóm lửa", tier: "dong" },
  7: { name: "Tròn một tuần", tier: "dong" },
  14: { name: "Bền bỉ", tier: "bac" },
  30: { name: "Một tháng kiên trì", tier: "bac" },
  60: { name: "Lửa không tắt", tier: "vang" },
  100: { name: "Trăm ngày rèn luyện", tier: "vang" },
};

/** Ngưỡng đạt (thang 10) của bài tự luận và bài phản bác khi xét huy hiệu. */
export const ESSAY_PASS = 7;
export const REBUTTAL_PASS = 6;

const hasExercises = (s: BadgeStats) => s.subjects.some((x) => x.chapters.some((c) => c.hasExercises));

const ACHIEVEMENTS: Achievement[] = [
  ...STREAK_MILESTONES.map((days): Achievement => ({
    id: `chuoi-${days}`,
    series: "chuoi",
    category: "chuoi",
    ...STREAK_BADGES[days],
    description: `Học ${days} ngày liên tiếp.`,
    icon: days >= 30 ? "calendar" : "flame",
    unit: "ngày",
    target: days,
    metric: (s) => s.bestStreak,
  })),

  { id: "tn-1", series: "tn", category: "luyen-tap", name: "Bước đầu", description: "Nộp lượt trắc nghiệm đầu tiên.", tier: "dong", icon: "list", unit: "lượt", target: 1, metric: (s) => s.quizAttempts },
  { id: "tn-10", series: "tn", category: "luyen-tap", name: "Chăm luyện đề", description: "Nộp 10 lượt trắc nghiệm.", tier: "bac", icon: "list", unit: "lượt", target: 10, metric: (s) => s.quizAttempts },
  { id: "tn-50", series: "tn", category: "luyen-tap", name: "Luyện đề không mỏi", description: "Nộp 50 lượt trắc nghiệm.", tier: "vang", icon: "list", unit: "lượt", target: 50, metric: (s) => s.quizAttempts },
  { id: "tn-tuyet-doi", series: "tuyet-doi", category: "luyen-tap", name: "Điểm tuyệt đối", description: `Đúng ${QUIZ_SIZE}/${QUIZ_SIZE} trong một lượt trắc nghiệm.`, tier: "bac", icon: "target", unit: "lượt", target: 1, metric: (s) => s.perfectQuizzes },
  { id: "tn-tuyet-doi-5", series: "tuyet-doi", category: "luyen-tap", name: "Bách phát bách trúng", description: `Năm lượt trắc nghiệm đúng ${QUIZ_SIZE}/${QUIZ_SIZE}.`, tier: "vang", icon: "crosshair", unit: "lượt", target: 5, metric: (s) => s.perfectQuizzes },
  { id: "bt-1", series: "bt", category: "luyen-tap", name: "Tính đúng bài đầu", description: "Làm đúng hết một bài tập tính toán.", tier: "dong", icon: "calculator", unit: "bài", target: 1, metric: (s) => s.exercisesSolved, when: hasExercises },
  { id: "bt-10", series: "bt", category: "luyen-tap", name: "Tay tính vững", description: "Làm đúng hết 10 bài tập tính toán.", tier: "bac", icon: "calculator", unit: "bài", target: 10, metric: (s) => s.exercisesSolved, when: hasExercises },
  { id: "bt-30", series: "bt", category: "luyen-tap", name: "Thạo công thức", description: "Làm đúng hết 30 bài tập tính toán.", tier: "vang", icon: "calculator", unit: "bài", target: 30, metric: (s) => s.exercisesSolved, when: hasExercises },

  { id: "tl-1", series: "tl", category: "lap-luan", name: "Ngòi bút vững", description: `Một câu tự luận đạt từ ${ESSAY_PASS} điểm.`, tier: "dong", icon: "pen", unit: "câu", target: 1, metric: (s) => s.essaysPassed },
  { id: "tl-6", series: "tl", category: "lap-luan", name: "Sẵn sàng thi viết", description: `Sáu câu tự luận khác nhau đạt từ ${ESSAY_PASS} điểm.`, tier: "bac", icon: "pen", unit: "câu", target: 6, metric: (s) => s.essaysPassed },
  { id: "pb-1", series: "pb", category: "lap-luan", name: "Lá chắn đầu tiên", description: "Phản bác đúng lập trường một luận điệu sai trái.", tier: "bac", icon: "award", unit: "luận điệu", target: 1, metric: (s) => s.rebuttalsPassed },
  { id: "pb-5", series: "pb", category: "lap-luan", name: "Bảo vệ nền tảng tư tưởng", description: "Phản bác đúng lập trường năm luận điệu sai trái.", tier: "vang", icon: "award", unit: "luận điệu", target: 5, metric: (s) => s.rebuttalsPassed },

  { id: "the-50", series: "the", category: "ghi-nho", name: "Lật thẻ đều tay", description: "Chấm 50 lượt thẻ ghi nhớ.", tier: "dong", icon: "cards", unit: "lượt", target: 50, metric: (s) => s.cardReviews },
  { id: "the-300", series: "the", category: "ghi-nho", name: "Ôn không bỏ hẹn", description: "Chấm 300 lượt thẻ ghi nhớ.", tier: "bac", icon: "cards", unit: "lượt", target: 300, metric: (s) => s.cardReviews },
  { id: "thuoc-10", series: "thuoc", category: "ghi-nho", name: "Nhớ lâu", description: "Thuộc 10 thẻ ghi nhớ.", tier: "bac", icon: "brain", unit: "thẻ", target: 10, metric: (s) => s.cardsMastered },
  { id: "thuoc-50", series: "thuoc", category: "ghi-nho", name: "Kho kiến thức", description: "Thuộc 50 thẻ ghi nhớ.", tier: "vang", icon: "brain", unit: "thẻ", target: 50, metric: (s) => s.cardsMastered },
  { id: "tu-tao-the", series: "tu-tao-the", category: "ghi-nho", name: "Tự soạn thẻ", description: "Tự tạo một thẻ ghi nhớ từ đoạn bôi đen trong giáo trình.", tier: "dong", icon: "pen", unit: "thẻ", target: 1, metric: (s) => s.ownCards },

  { id: "hoi-1", series: "hoi", category: "tim-toi", name: "Câu hỏi đầu tiên", description: "Hỏi trợ lý học tập một câu.", tier: "dong", icon: "message", unit: "câu", target: 1, metric: (s) => s.questions },
  { id: "hoi-20", series: "hoi", category: "tim-toi", name: "Ham hiểu biết", description: "Hỏi trợ lý học tập 20 câu.", tier: "bac", icon: "message", unit: "câu", target: 20, metric: (s) => s.questions },
  { id: "hoi-100", series: "hoi", category: "tim-toi", name: "Hỏi đến cùng", description: "Hỏi trợ lý học tập 100 câu.", tier: "vang", icon: "message", unit: "câu", target: 100, metric: (s) => s.questions },
  { id: "ghi-1", series: "ghi", category: "tim-toi", name: "Người ghi chép", description: "Viết ghi chú đầu tiên trong giáo trình hoặc sổ ghi chép.", tier: "dong", icon: "notebook", unit: "ghi chú", target: 1, metric: (s) => s.notes },
  { id: "ghi-20", series: "ghi", category: "tim-toi", name: "Sổ tay dày dặn", description: "Có 20 ghi chú hoặc trang sổ ghi chép.", tier: "bac", icon: "notebook", unit: "ghi chú", target: 20, metric: (s) => s.notes },
];

/** Thuộc từ tỷ lệ này số thẻ của chương thì được sao thẻ ghi nhớ. */
export const CHAPTER_CARD_RATIO = 0.8;
/** Số câu đúng tối thiểu để đạt trắc nghiệm một chương. */
export const PASS_SCORE = Math.ceil(PASS_RATIO * QUIZ_SIZE);

const passed = (c: ChapterStats) => (c.quizBest ?? 0) >= PASS_RATIO;

/** Tiêu chí sao của một chương. Tiêu chí đầu (đạt trắc nghiệm) là điều kiện nhận huy chương. */
export function chapterCriteria(c: ChapterStats): { label: string; met: boolean }[] {
  const criteria = [{ label: `Đạt trắc nghiệm (từ ${PASS_SCORE}/${QUIZ_SIZE})`, met: passed(c) }];
  if (c.cardTotal) {
    criteria.push({ label: `Thuộc ${Math.round(CHAPTER_CARD_RATIO * 100)} % thẻ ghi nhớ`, met: c.cardsMastered >= Math.ceil(c.cardTotal * CHAPTER_CARD_RATIO) });
  }
  if (c.hasExercises) criteria.push({ label: "Làm đúng hết một bài tập", met: c.exercisesSolved > 0 });
  criteria.push({ label: `Đúng ${QUIZ_SIZE}/${QUIZ_SIZE} trắc nghiệm`, met: (c.quizBest ?? 0) >= 1 });
  return criteria;
}

/** Hạng huy chương chương theo số tiêu chí đạt: đủ hết là vàng, từ hai là bạc. */
function chapterTier(criteria: { met: boolean }[]): Tier {
  const met = criteria.filter((c) => c.met).length;
  return met === criteria.length ? "vang" : met >= 2 ? "bac" : "dong";
}

/** Mọi huy hiệu kèm tiến độ hiện tại, theo thứ tự hiển thị. */
export function evaluateBadges(stats: BadgeStats): Badge[] {
  const chapters = stats.subjects.flatMap((subject) => {
    const prefix = stats.subjects.length > 1 ? `${subject.shortName}: ` : "";
    const list = subject.chapters.map((c): Badge => {
      const criteria = chapterCriteria(c);
      return {
        id: `chuong:${subject.id}:${c.number}`,
        series: `chuong:${subject.id}:${c.number}`,
        category: "chuong",
        name: `${prefix}Chương ${c.number}`,
        description: c.title,
        tier: chapterTier(criteria),
        icon: "chapter",
        // Tiến độ tới lúc đạt là số câu đúng của lượt tốt nhất.
        current: Math.round((c.quizBest ?? 0) * QUIZ_SIZE),
        target: PASS_SCORE,
        unit: "câu đúng",
        earned: passed(c),
        chapter: { subject: subject.id, number: c.number, criteria },
      };
    });
    if (!list.length) return [];
    const done = subject.chapters.filter(passed).length;
    const whole: Badge = {
      id: `mon:${subject.id}`,
      series: `mon:${subject.id}`,
      category: "chuong",
      name: `Hoàn thành môn ${subject.shortName}`,
      description: "Đạt trắc nghiệm mọi chương của môn.",
      tier: "vang",
      icon: "graduation",
      current: done,
      target: list.length,
      unit: "chương",
      earned: done === list.length,
    };
    return [...list, whole];
  });

  const others = ACHIEVEMENTS.filter((a) => a.when?.(stats) ?? true).map((a): Badge => {
    const current = a.metric(stats);
    return { id: a.id, series: a.series, category: a.category, name: a.name, description: a.description, tier: a.tier, icon: a.icon, unit: a.unit, target: a.target, current, earned: current >= a.target };
  });

  return [...chapters, ...others];
}

/**
 * Huy hiệu chưa đạt mà gần đạt nhất (tỷ lệ cao nhất, rồi còn thiếu ít nhất), để luôn có mục tiêu gần.
 * Mỗi series chỉ lấy mốc kế tiếp, để không gợi ý cùng lúc chuỗi 7 và 14 ngày.
 */
export function closestBadges(badges: Badge[], n = 3): Badge[] {
  const next = new Map<string, Badge>();
  for (const b of badges) {
    const seen = next.get(b.series);
    if (!b.earned && (!seen || b.target < seen.target)) next.set(b.series, b);
  }
  return [...next.values()]
    .sort((a, b) => b.current / b.target - a.current / a.target || a.target - a.current - (b.target - b.current))
    .slice(0, n);
}
