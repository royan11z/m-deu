import { useSyncExternalStore } from "react";
import { blobToDataUrl, clearImages, dataUrlToBlob, deleteImage, getImage, newId, putImage } from "./images";

export const GENDERS = ["die", "der", "das"] as const;
const LEGACY_GENDERS: Record<string, string> = { 阴性: "die", 阳性: "der", 中性: "das" };
export const wordFields = (pos: string) => ({ gender: pos === "名词", plural: pos === "名词", images: pos === "动词" });
export const POS = ["名词", "动词", "形容词", "副词", "介词", "连词", "代词", "短语", "其他"];
export const MASTERY = ["未掌握", "学习中", "已掌握"] as const;
export const MISTAKE_CATS = ["语法", "词汇", "阅读", "听力", "写作", "口语"];
export const REVIEW = ["待复习", "复习中", "已掌握"] as const;

export interface Word {
  id: string; word: string; meaning: string; pos: string; plural: string;
  example: string; tags: string[]; gender: string; images: string[]; mastery: string; createdAt: number;
  // —— 闪卡复习字段（向后兼容：旧单词缺失时在 normalizeWord 中补默认值）——
  streak: number; lastReviewed: string; nextReview: string; reviewCount: number; history: ReviewRecord[];
}
export interface ReviewRecord {
  date: string; answer: string; ok: boolean;
}
export interface Mistake {
  id: string; question: string; wrong: string; correct: string; reason: string;
  category: string; date: string; images: string[]; review: string; createdAt: number;
  streak: number; lastReviewed: string; nextReview: string; reviewCount: number; history: ReviewRecord[];
}
export interface Note {
  id: string; title: string; category: string; tags: string[]; remark: string;
  images: string[]; createdAt: number;
}
export interface Data { words: Word[]; mistakes: Mistake[]; notes: Note[] }

const KEY = "mein-deutsch-data-v1";
const EMPTY: Data = { words: [], mistakes: [], notes: [] };
let data: Data = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

export function normalizeWord(word: Word & { level?: string }): Word {
  const { level: _level, ...record } = word;
  const gender = LEGACY_GENDERS[record.gender ?? ""] ?? record.gender ?? "";
  return {
    ...record, gender, images: record.images ?? [],
    // 旧单词没有复习字段：补默认值，nextReview 为空即视为当天到期，不丢任何已有内容
    streak: record.streak ?? 0,
    lastReviewed: record.lastReviewed ?? "",
    nextReview: record.nextReview ?? "",
    reviewCount: record.reviewCount ?? 0,
    history: record.history ?? [],
  };
}

// 旧错题没有复习字段：补默认值，下次复习日期回退到错题日期（即视为已到期），不丢任何已有内容
export function normalizeMistake(mistake: Mistake): Mistake {
  return {
    ...mistake,
    images: mistake.images ?? [],
    streak: mistake.streak ?? 0,
    lastReviewed: mistake.lastReviewed ?? "",
    nextReview: mistake.nextReview ?? mistake.date ?? "",
    reviewCount: mistake.reviewCount ?? 0,
    history: mistake.history ?? [],
  };
}

function normalizeData(value: Data): Data {
  const next = { ...EMPTY, ...value };
  return { ...next, words: next.words.map(normalizeWord), mistakes: next.mistakes.map(normalizeMistake) };
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) data = normalizeData(JSON.parse(raw));
  } catch { /* ignore */ }
}
function set(next: Data) {
  data = next;
  localStorage.setItem(KEY, JSON.stringify(data));
  listeners.forEach((l) => l());
}

export function useData(): Data {
  return useSyncExternalStore(
    (l) => { load(); listeners.add(l); return () => listeners.delete(l); },
    () => { load(); return data; },
    () => EMPTY,
  );
}

type Coll = keyof Data;
export function upsert<K extends Coll>(coll: K, item: Data[K][number]) {
  const list = data[coll] as Data[K][number][];
  const exists = list.some((x) => x.id === item.id);
  set({ ...data, [coll]: exists ? list.map((x) => (x.id === item.id ? item : x)) : [item, ...list] });
}
export function remove(coll: Coll, id: string) {
  const item = (data[coll] as { id: string; images?: string[] }[]).find((x) => x.id === id);
  item?.images?.forEach((i) => deleteImage(i).catch(() => {}));
  set({ ...data, [coll]: (data[coll] as { id: string }[]).filter((x) => x.id !== id) });
}
export { newId };

export async function exportAll() {
  const ids = [...new Set([...data.words, ...data.mistakes, ...data.notes].flatMap((x) => x.images))];
  const images: Record<string, string> = {};
  for (const id of ids) {
    const b = await getImage(id);
    if (b) images[id] = await blobToDataUrl(b);
  }
  return { app: "mein-deutsch-workspace", version: 1, exportedAt: new Date().toISOString(), data, images };
}
export async function importAll(json: { data?: Data; images?: Record<string, string> }) {
  if (!json.data) throw new Error("文件格式不正确");
  await clearImages();
  for (const [id, url] of Object.entries(json.images ?? {})) await putImage(id, await dataUrlToBlob(url));
  set(normalizeData(json.data));
}

export const splitTags = (s: string) => s.split(/[,，\s]+/).map((t) => t.trim()).filter(Boolean);
export const fmt = (t: number) => new Date(t).toLocaleString("zh-CN", { dateStyle: "short", timeStyle: "short" });

// —— 错题复习（间隔重复）：全部使用本地日期 YYYY-MM-DD，避免 UTC 时区偏移 ——
const fmtDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const localToday = () => fmtDate(new Date());
export const addDays = (date: string, days: number) => {
  const [y, m, dd] = date.split("-").map(Number);
  return fmtDate(new Date(y || 1970, (m || 1) - 1, (dd || 1) + days));
};
// 连续答对第 N 次后的间隔天数；答错则次日复习
const INTERVALS = [1, 3, 7, 14, 30];
export const gradeAnswer = (input: string, correct: string) => input.trim() === correct.trim();
// 到期且今天还没复习过的题才进入复习队列（每题每天只复习一次）
export const isDue = (m: Mistake, today = localToday()) => m.nextReview <= today && m.lastReviewed !== today;
export function applyReviewResult(m: Mistake, answer: string, ok: boolean, today = localToday()): Mistake {
  const streak = ok ? m.streak + 1 : 0;
  const interval = ok ? (INTERVALS[Math.min(streak, INTERVALS.length) - 1] ?? 30) : 1;
  return {
    ...m, streak, lastReviewed: today, nextReview: addDays(today, interval),
    reviewCount: m.reviewCount + 1, history: [...m.history, { date: today, answer, ok }],
  };
}

// —— 单词闪卡复习：与错题共用同一套间隔规则（1/3/7/14/30 天），同样基于本地日期 ——
// 到期且今天还没正式复习过的单词才进入复习队列（每词每天只计一次正式复习）
export const isWordDue = (w: Word, today = localToday()) => w.nextReview <= today && w.lastReviewed !== today;
export function applyWordReviewResult(w: Word, ok: boolean, today = localToday()): Word {
  const streak = ok ? w.streak + 1 : 0;
  const interval = ok ? (INTERVALS[Math.min(streak, INTERVALS.length) - 1] ?? 30) : 1;
  return {
    ...w, streak, lastReviewed: today, nextReview: addDays(today, interval),
    reviewCount: w.reviewCount + 1, history: [...w.history, { date: today, answer: w.word, ok }],
  };
}
