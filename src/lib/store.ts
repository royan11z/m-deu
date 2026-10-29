import { useSyncExternalStore } from "react";
import { blobToDataUrl, clearImages, dataUrlToBlob, deleteImage, getImage, newId, putImage } from "./images";

export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export const POS = ["名词", "动词", "形容词", "副词", "介词", "连词", "代词", "短语", "其他"];
export const MASTERY = ["未掌握", "学习中", "已掌握"] as const;
export const MISTAKE_CATS = ["语法", "词汇", "阅读", "听力", "写作", "口语"];
export const REVIEW = ["待复习", "复习中", "已掌握"] as const;

export interface Word {
  id: string; word: string; meaning: string; pos: string; plural: string;
  example: string; tags: string[]; level: string; mastery: string; createdAt: number;
}
export interface Mistake {
  id: string; question: string; wrong: string; correct: string; reason: string;
  category: string; date: string; images: string[]; review: string; createdAt: number;
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

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) data = { ...EMPTY, ...JSON.parse(raw) };
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
  const ids = [...data.mistakes, ...data.notes].flatMap((x) => x.images);
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
  set({ ...EMPTY, ...json.data });
}

export const splitTags = (s: string) => s.split(/[,，\s]+/).map((t) => t.trim()).filter(Boolean);
export const fmt = (t: number) => new Date(t).toLocaleString("zh-CN", { dateStyle: "short", timeStyle: "short" });
