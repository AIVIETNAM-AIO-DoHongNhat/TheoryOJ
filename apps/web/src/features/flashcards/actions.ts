"use server";

import { z } from "zod";

import { getDoc } from "@/features/library/server/catalog";
import { getSubject } from "@/config/subjects";
import { type DataResult, UserError } from "@/lib/action-result";
import { requireStudent } from "@/lib/auth/session";
import { run } from "@/lib/run-action";

import { GRADES, schedule } from "./schedule";
import { getDeck } from "./server/deck";
import { getStates, saveState, toDTO } from "./server/states";
import { countUserCards, deleteUserCard, findUserCard, insertUserCard, isUserCardId, updateUserCard } from "./server/user-cards";
import { CARD_BACK_MAX, CARD_FRONT_MAX, type CardStateDTO, type Flashcard, USER_CARDS_MAX } from "./types";

const ReviewInput = z.object({
  subject: z.string().max(32),
  chapter: z.number().int().positive(),
  cardId: z.string().max(32),
  grade: z.enum(GRADES),
});

/** Chấm một thẻ. Lịch ôn tính trên máy chủ từ trạng thái đã lưu, không tin trạng thái trình duyệt gửi lên. */
export async function reviewCard(input: z.input<typeof ReviewInput>): Promise<DataResult<CardStateDTO>> {
  return run(async () => {
    const { visitorId } = await requireStudent();
    const { subject, chapter, cardId, grade } = ReviewInput.parse(input);
    const exists = isUserCardId(cardId)
      ? (await findUserCard(visitorId, cardId))?.subject === subject
      : getDeck(subject, chapter)?.cards.some((c) => c.id === cardId);
    if (!exists) throw new UserError("Không có thẻ này.");

    const prev = (await getStates(visitorId, subject)).get(cardId) ?? null;
    const next = schedule(prev, grade, new Date());
    await saveState({ visitorId, subject, chapter, cardId }, next);
    return toDTO(next);
  });
}

const Face = {
  front: z.string().trim().min(1, "Cần mặt trước.").max(CARD_FRONT_MAX),
  back: z.string().trim().min(1, "Cần mặt sau.").max(CARD_BACK_MAX),
};

const CreateInput = z.object({
  subject: z.string().max(32),
  chapter: z.number().int().positive(),
  ...Face,
  sourceSlug: z.string().max(200).nullable().default(null),
  pdfPage: z.number().int().min(1).max(5000).nullable().default(null),
});

/** Tạo thẻ từ đoạn bôi đen trong trình đọc. */
export async function createCard(input: z.input<typeof CreateInput>): Promise<DataResult<Flashcard>> {
  return run(async () => {
    const { visitorId } = await requireStudent();
    const data = CreateInput.parse(input);
    if (!getSubject(data.subject)?.chapters.some((c) => c.number === data.chapter)) throw new UserError("Không có chương này.");
    const doc = data.sourceSlug ? getDoc(data.sourceSlug) : undefined;
    if ((await countUserCards(visitorId)) >= USER_CARDS_MAX) throw new UserError(`Mỗi tài khoản tạo tối đa ${USER_CARDS_MAX} thẻ.`);
    return insertUserCard({
      visitorId,
      subject: data.subject,
      chapter: data.chapter,
      front: data.front,
      back: data.back,
      sourceSlug: doc?.slug ?? null,
      pdfPage: doc?.format === "pdf" ? data.pdfPage : null,
    });
  });
}

const EditInput = z.object({ id: z.string().max(32), ...Face });

export async function editCard(input: z.input<typeof EditInput>): Promise<DataResult<Flashcard>> {
  return run(async () => {
    const { visitorId } = await requireStudent();
    const { id, front, back } = EditInput.parse(input);
    const card = isUserCardId(id) ? await updateUserCard(visitorId, Number(id.slice(2)), front, back) : null;
    if (!card) throw new UserError("Không có thẻ này.");
    return card;
  });
}

export async function removeCard(id: string): Promise<DataResult<void>> {
  return run(async () => {
    const { visitorId } = await requireStudent();
    if (typeof id === "string" && isUserCardId(id)) await deleteUserCard(visitorId, Number(id.slice(2)));
  });
}
