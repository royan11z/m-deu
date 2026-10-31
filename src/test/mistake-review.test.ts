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
  addDays, applyReviewResult, exportAll, gradeAnswer, importAll, isDue, localToday, normalizeMistake, type Mistake,
} from "@/lib/store";

const TODAY = localToday();
const mistake: Mistake = {
  id: "m1", question: "___ Hund", wrong: "der", correct: "der Hund", reason: "冠词性别",
  category: "语法", date: TODAY, images: [], review: "待复习", createdAt: 1,
  streak: 0, lastReviewed: "", nextReview: TODAY, reviewCount: 0, history: [],
};

describe("Mistake review grading rules", () => {
  it("ignores leading and trailing whitespace", () => {
    expect(gradeAnswer("  der Hund  ", "der Hund")).toBe(true);
  });
  it("is case-sensitive by default", () => {
    expect(gradeAnswer("Der Hund", "der Hund")).toBe(false);
  });
  it("keeps umlauts and ß distinct", () => {
    expect(gradeAnswer("schon", "schön")).toBe(false);
    expect(gradeAnswer("Strasse", "Straße")).toBe(false);
    expect(gradeAnswer("Straße", "Straße")).toBe(true);
  });
});

describe("Spaced repetition schedule", () => {
  it("uses local dates and schedules 1/3/7/14/30 days after consecutive correct answers", () => {
    let m = mistake;
    const gaps = [1, 3, 7, 14, 30, 30];
    gaps.forEach((gap, i) => {
      m = applyReviewResult(m, "der Hund", true, TODAY);
      expect(m.streak).toBe(i + 1);
      expect(m.nextReview).toBe(addDays(TODAY, gap));
      expect(m.lastReviewed).toBe(TODAY);
    });
    expect(m.reviewCount).toBe(6);
    expect(m.history).toHaveLength(6);
    expect(m.history[0]).toEqual({ date: TODAY, answer: "der Hund", ok: true });
  });
  it("resets the streak and schedules next day after a wrong answer", () => {
    const m = applyReviewResult({ ...mistake, streak: 3 }, "der", false, TODAY);
    expect(m.streak).toBe(0);
    expect(m.nextReview).toBe(addDays(TODAY, 1));
    expect(m.history.at(-1)?.ok).toBe(false);
  });
  it("a mistake reviewed today is not due again the same day", () => {
    const m = applyReviewResult(mistake, "der", false, TODAY);
    expect(isDue(m, TODAY)).toBe(false);
    expect(isDue(mistake, TODAY)).toBe(true);
  });
  it("addDays rolls over month and year boundaries using local time", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2025-12-31", 1)).toBe("2026-01-01");
  });
});

describe("Backward compatibility and backup", () => {
  it("normalizes legacy mistakes that lack review fields without losing content", () => {
    const legacy = { id: "old", question: "q", wrong: "w", correct: "c", reason: "r", category: "词汇", date: "2026-01-05", images: ["img_1"], review: "复习中", createdAt: 2 } as Mistake;
    const n = normalizeMistake(legacy);
    expect(n).toMatchObject({ streak: 0, lastReviewed: "", nextReview: "2026-01-05", reviewCount: 0, history: [], images: ["img_1"] });
    expect(isDue(n, TODAY)).toBe(true);
  });
  it("keeps review fields through export and restores legacy backups on import", async () => {
    const reviewed = applyReviewResult(mistake, "der Hund", true, TODAY);
    await importAll({ data: { words: [], mistakes: [reviewed], notes: [] }, images: {} });
    const m0 = (await exportAll()).data.mistakes[0]!;
    expect(m0).toMatchObject({ streak: 1, reviewCount: 1, nextReview: addDays(TODAY, 1) });
    expect(m0.history).toHaveLength(1);

    const legacy = { id: "old", question: "q", wrong: "w", correct: "c", reason: "", category: "语法", date: "2026-01-05", images: [], review: "待复习", createdAt: 2 };
    await importAll({ data: { words: [], mistakes: [legacy as unknown as Mistake], notes: [] } });
    const restored = (await exportAll()).data.mistakes[0];
    expect(restored).toMatchObject({ streak: 0, reviewCount: 0, history: [], nextReview: "2026-01-05" });
  });
});
