import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Sparkles } from "lucide-react";
import { useData, upsert, remove, newId, POS, MASTERY, splitTags, fmt, type Word } from "@/lib/store";
import { PageHeader, Btn, Field, inputCls, Select, Modal, Pill, statusTone, SearchBox, Empty, confirmDel, ImagePicker, Thumb, Lightbox } from "@/components/kit";

export const Route = createFileRoute("/words")({
  validateSearch: (s: Record<string, unknown>): { new?: true | undefined } => ({ new: s["new"] === true || s["new"] === "true" ? true : undefined }),
  head: () => ({ meta: [{ title: "单词库 · Mein Deutsch Workspace" }, { name: "description", content: "管理德语单词、词性、复数与例句。" }, { property: "og:title", content: "德语单词库" }, { property: "og:description", content: "管理德语单词、词性、复数与例句。" }] }),
  component: Words,
});

const blank = (): Word => ({ id: newId(), word: "", meaning: "", pos: "名词", plural: "", example: "", tags: [], level: "A1", mastery: "未掌握", createdAt: Date.now() });

function Words() {
  const { words } = useData();
  const search = Route.useSearch();
  const nav = useNavigate();
  const [q, setQ] = useState(""); const [ms, setMs] = useState("");
  const [edit, setEdit] = useState<Word | null>(null);
  const [view, setView] = useState<string | null>(null);
  const [tagText, setTagText] = useState("");
  useEffect(() => { if (search.new) { open(blank()); nav({ to: "/words", search: {}, replace: true }); } }, [search.new]);
  const open = (w: Word) => { setEdit(w); setTagText(w.tags.join(", ")); };

  const list = useMemo(() => words.filter((w) =>
    (!ms || w.mastery === ms) &&
    (!q || [w.word, w.meaning, w.example, ...w.tags].join(" ").toLowerCase().includes(q.toLowerCase()))), [words, q, ms]);

  const save = () => {
    if (!edit || !edit.word.trim()) return alert("请填写德语原词");
    upsert("words", { ...edit, tags: splitTags(tagText) }); setEdit(null);
  };
  const f = (k: keyof Word) => (v: string) => setEdit((e) => e && { ...e, [k]: v });

  return (
    <div>
      <PageHeader title="德语单词库" sub={`共 ${words.length} 个单词`} action={<Btn onClick={() => open(blank())}><Plus className="h-4 w-4" />添加单词</Btn>} />
      <div className="mb-4 flex flex-wrap gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="搜索单词、释义、标签…" />
        <div className="w-32"><Select value={ms} onChange={setMs} options={MASTERY} placeholder="全部状态" /></div>
      </div>
      {list.length === 0 ? <Empty text="没有找到单词" /> : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs text-muted-foreground">
              <tr><th className="px-3 py-2">德语</th><th className="px-3 py-2">释义</th><th className="px-3 py-2">词性 / 复数</th><th className="px-3 py-2">状态</th><th className="px-3 py-2">标签</th><th className="px-3 py-2">添加时间</th><th /></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((w) => (
                <tr key={w.id} className="align-top hover:bg-accent/50">
                  <td className="px-3 py-2"><div className="font-medium">{w.word}</div>{w.example && <div className="mt-0.5 text-xs italic text-muted-foreground">{w.example}</div>}</td>
                  <td className="px-3 py-2">{w.meaning}</td>
                  <td className="px-3 py-2 text-muted-foreground">{w.pos}{w.pos === "名词" && w.plural && ` · ${w.plural}`}{w.pos === "动词" && !!w.images?.length && <div className="mt-1 flex gap-1">{w.images.map((i) => <Thumb key={i} id={i} className="h-10 w-10" onClick={() => setView(i)} />)}</div>}</td>
                                    <td className="px-3 py-2">
                    <select value={w.mastery} onChange={(e) => upsert("words", { ...w, mastery: e.target.value })} className={`rounded px-1 py-0.5 text-xs outline-none bg-tone-${statusTone(w.mastery)} text-tone-${statusTone(w.mastery)}-fg`}>
                      {MASTERY.map((m) => <option key={m}>{m}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2"><div className="flex flex-wrap gap-1">{w.tags.map((t) => <Pill key={t}>#{t}</Pill>)}</div></td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">{fmt(w.createdAt)}</td>
                  <td className="whitespace-nowrap px-2 py-2">
                    <button onClick={() => open(w)} className="rounded p-1 hover:bg-accent" title="编辑"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => confirmDel() && remove("words", w.id)} className="rounded p-1 text-destructive hover:bg-destructive/10" title="删除"><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Lightbox id={view} onClose={() => setView(null)} />
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit && words.some((w) => w.id === edit.id) ? "编辑单词" : "添加单词"}
        footer={<><Btn variant="ghost" onClick={() => setEdit(null)}>取消</Btn><Btn onClick={save}>保存</Btn></>}>
        {edit && (<>
          <div className="grid grid-cols-2 gap-3">
            <Field label="德语原词 *"><input autoFocus className={inputCls} value={edit.word} onChange={(e) => f("word")(e.target.value)} placeholder="z.B. der Apfel" /></Field>
            <Field label="中文释义">
              <div className="flex gap-1">
                <input className={inputCls} value={edit.meaning} onChange={(e) => f("meaning")(e.target.value)} />
                <Btn variant="ghost" type="button" title="AI 翻译" onClick={() => alert("AI 自动翻译功能即将上线，目前请手动填写。")}><Sparkles className="h-4 w-4" /></Btn>
              </div>
            </Field>
            <Field label="词性"><Select value={edit.pos} onChange={f("pos")} options={POS} /></Field>
            <Field label="掌握状态"><Select value={edit.mastery} onChange={f("mastery")} options={MASTERY} /></Field>
            {edit.pos === "名词" && <Field label="复数形式"><input className={inputCls} value={edit.plural} onChange={(e) => f("plural")(e.target.value)} placeholder="die Äpfel" /></Field>}
          </div>
          {edit.pos === "动词" && (
            <div><span className="mb-1 block text-xs font-medium text-muted-foreground">词形表</span>
              <ImagePicker value={edit.images ?? []} onChange={(ids) => setEdit((e) => e && { ...e, images: ids })} /></div>
          )}
          <Field label="例句"><textarea rows={2} className={inputCls} value={edit.example} onChange={(e) => f("example")(e.target.value)} /></Field>
          <Field label="标签（用逗号或空格分隔）"><input className={inputCls} value={tagText} onChange={(e) => setTagText(e.target.value)} placeholder="食物, 日常" /></Field>
        </>)}
      </Modal>
    </div>
  );
}
