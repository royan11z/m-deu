import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/images", () => ({
  blobToDataUrl: vi.fn(async () => "data:image/png;base64,dGVzdA=="),
  clearImages: vi.fn(async () => {}),
  dataUrlToBlob: vi.fn(async () => new Blob(["test"], { type: "image/png" })),
  deleteImage: vi.fn(async () => {}),
  getImage: vi.fn(async () => new Blob(["test"], { type: "image/png" })),
  newId: () => "test-id",
  putImage: vi.fn(async () => {}),
}));

import {
  addDays, applyWordReviewResult, exportAll, gradeAnswer, importAll, isWordDue, localToday, normalizeWord, type Word,
} from "@/lib/store";

const TODAY = localToday();
const word: Word = {
  id: "w1", word: "der Hund", meaning: "狗", pos: "名词", plural: "die Hunde",
  example: "", tags: [], gender: "der", images: [], mastery: "未掌握", createdAt: 1,
  streak: 0, lastReviewed: "", nextReview: "", reviewCount: 0, history: [],
};

describe("Word flashcard spelling rules", () => {
  it("ignores leading and trailing whitespace when checking spelling", () => {
    expect(gradeAnswer("  der Hund  ", "der Hund")).toBe(true);
  });
  it("is case-sensitive and keeps umlauts and ß distinct", () => {
    expect(gradeAnswer("Der Hund", "der Hund")).toBe(false);
    expect(gradeAnswer("schon", "schön")).toBe(false);
    expect(gradeAnswer("Strasse", "Straße")).toBe(false);
    expect(gradeAnswer("Straße", "Straße")).toBe(true);
  });
});

describe("Word flashcard spaced repetition schedule", () => {
  it("new words (empty nextReview) are due today", () => {
    expect(isWordDue(word, TODAY)).toBe(true);
  });
  it("schedules 1/3/7/14/30 days after consecutive correct answers using local dates", () => {
    let w = word;
    const gaps = [1, 3, 7, 14, 30, 30];
    gaps.forEach((gap, i) => {
      w = applyWordReviewResult(w, true, TODAY);
      expect(w.streak).toBe(i + 1);
      expect(w.nextReview).toBe(addDays(TODAY, gap));
      expect(w.lastReviewed).toBe(TODAY);
    });
    expect(w.reviewCount).toBe(6);
    expect(w.history).toHaveLength(6);
    expect(w.history[0]).toEqual({ date: TODAY, answer: "der Hund", ok: true });
  });
  it("resets the streak and schedules next day after a wrong answer", () => {
    const w = applyWordReviewResult({ ...word, streak: 3 }, false, TODAY);
    expect(w.streak).toBe(0);
    expect(w.nextReview).toBe(addDays(TODAY, 1));
    expect(w.history.at(-1)?.ok).toBe(false);
  });
  it("a word reviewed today is not due again the same day", () => {
    const w = applyWordReviewResult(word, true, TODAY);
    expect(isWordDue(w, TODAY)).toBe(false);
    expect(isWordDue(word, TODAY)).toBe(true);
  });
});

describe("Word flashcard backward compatibility and backup", () => {
  it("normalizes legacy words that lack review fields without losing content", () => {
    const legacy = { id: "old", word: "gehen", meaning: "走", pos: "动词", plural: "", gender: "", images: ["img_1"], example: "", tags: ["a"], mastery: "学习中", createdAt: 2 } as Word;
    const n = normalizeWord(legacy);
    expect(n).toMatchObject({ streak: 0, lastReviewed: "", nextReview: "", reviewCount: 0, history: [], images: ["img_1"], mastery: "学习中" });
    expect(isWordDue(n, TODAY)).toBe(true); // nextReview 为空视为当天到期
  });
  it("keeps review fields through export and restores legacy backups on import", async () => {
    const reviewed = applyWordReviewResult(word, true, TODAY);
    await importAll({ data: { words: [reviewed], mistakes: [], notes: [] }, images: {} });
    const w0 = (await exportAll()).data.words[0]!;
    expect(w0).toMatchObject({ streak: 1, reviewCount: 1, nextReview: addDays(TODAY, 1) });
    expect(w0.history).toHaveLength(1);

    const legacy = { id: "old", word: "gehen", meaning: "走", pos: "动词", plural: "", gender: "", images: [], example: "", tags: [], mastery: "未掌握", createdAt: 2 };
    await importAll({ data: { words: [legacy as unknown as Word], mistakes: [], notes: [] } });
    const restored = (await exportAll()).data.words[0];
    expect(restored).toMatchObject({ streak: 0, reviewCount: 0, history: [], nextReview: "" });
  });
});
