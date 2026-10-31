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

import { GENDERS, wordFields, normalizeWord, importAll, exportAll, type Word } from "@/lib/store";
import { putImage } from "@/lib/images";

const word: Word = { id: "verb", word: "gehen", meaning: "走", pos: "动词", plural: "", gender: "", images: ["img_verb"], example: "", tags: [], mastery: "未掌握", createdAt: 1, streak: 0, lastReviewed: "", nextReview: "", reviewCount: 0, history: [] };

describe("Word part-of-speech rules", () => {
  it("offers die, der and das for nouns", () => {
    expect(GENDERS).toEqual(["die", "der", "das"]);
    expect(wordFields("名词")).toEqual({ gender: true, plural: true, images: false });
  });
  it("maps legacy Chinese genders onto articles", () => {
    expect(normalizeWord({ ...word, pos: "名词", gender: "阴性" }).gender).toBe("die");
    expect(normalizeWord({ ...word, pos: "名词", gender: "阳性" }).gender).toBe("der");
    expect(normalizeWord({ ...word, pos: "名词", gender: "中性" }).gender).toBe("das");
  });
  it("offers image tables only for verbs", () => {
    expect(wordFields("动词")).toEqual({ gender: false, plural: false, images: true });
    expect(wordFields("形容词")).toEqual({ gender: false, plural: false, images: false });
  });
  it("removes levels while preserving existing word content", () => {
    const { gender: _gender, images: _images, ...legacy } = word;
    const result = normalizeWord({ ...legacy, level: "A1" } as Word & { level: string });
    expect(result).not.toHaveProperty("level");
    expect(result).toMatchObject({ word: "gehen", meaning: "走", gender: "", images: [] });
  });
  it("includes verb table images in backup export and restores them on import", async () => {
    const backup = { data: { words: [word], mistakes: [], notes: [] }, images: { img_verb: "data:image/png;base64,dGVzdA==" } };
    await importAll(backup);
    expect(putImage).toHaveBeenCalledWith("img_verb", expect.any(Blob));
    const exported = await exportAll();
    expect(exported.data.words[0]?.images).toEqual(["img_verb"]);
    expect(exported.images["img_verb"]).toBe("data:image/png;base64,dGVzdA==");
  });
});