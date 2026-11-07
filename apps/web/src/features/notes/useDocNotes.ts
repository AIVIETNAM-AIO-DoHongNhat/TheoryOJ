"use client";

import { useCallback, useEffect, useState } from "react";

import { unwrap } from "@/lib/action-result";

import { editNote, myNotes, removeNote } from "./actions";
import type { NoteSource, ReaderNote } from "./types";

/** Ghi chú của học viên trên một tài liệu, tải một lần khi mở trình đọc. `source` null thì không tải (trang không ghi chú). */
export function useDocNotes(source: NoteSource | null, slug: string) {
  const [notes, setNotes] = useState<ReaderNote[]>([]);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (!source) return;
    let alive = true;
    myNotes({ source, slug })
      .then((r) => {
        if (!alive) return;
        setSignedIn(r.signedIn);
        setNotes(r.notes);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [source, slug]);

  const add = useCallback((n: ReaderNote) => setNotes((prev) => [...prev, n]), []);

  const update = useCallback(async (id: number, note: string) => {
    const saved = unwrap(await editNote({ id, note }));
    setNotes((prev) => prev.map((n) => (n.id === id ? saved : n)));
  }, []);

  const remove = useCallback(async (id: number) => {
    unwrap(await removeNote(id));
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return { notes, signedIn, add, update, remove };
}
