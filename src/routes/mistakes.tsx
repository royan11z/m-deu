import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useData, upsert, remove, newId, MISTAKE_CATS, REVIEW, type Mistake } from "@/lib/store";
import { PageHeader, Btn, Field, inputCls, Select, Modal, Pill, statusTone, SearchBox, Empty, confirmDel, ImagePicker, Thumb, Lightbox } from "@/components/kit";

export const Route = createFileRoute("/mistakes")({
  validateSearch: (s: Record<string, unknown>) => ({ new: s["new"] === true || s["new"] === "true" ? true : undefined }),
  head: () => ({ meta: [{ title: "错题库 · Mein Deutsch Workspace" }, { name: "description", content: "记录德语错题、错误原因与复习状态。" }, { property: "og:title", content: "德语错题库" }, { property: "og:description", content: "记录德语错题、错误原因与复习状态。" }] }),
  component: Mistakes,
});

const today = () => new Date().toISOString().slice(0, 10);
const blank = (): Mistake => ({ id: newId(), question: "", wrong: "", correct: "", reason: "", category: "语法", date: today(), images: [], review: "待复习", createdAt: Date.now() });

function Mistakes() {
  const { mistakes } = useData();
  const search = Route.useSearch(); const nav = useNavigate();
  const [q, setQ] = useState(""); const [cat, setCat] = useState(""); const [rv, setRv] = useState("");
  const [edit, setEdit] = useState<Mistake | null>(null);
  const [view, setView] = useState<string | null>(null);
  useEffect(() => { if (search.new) { setEdit(blank()); nav({ to: "/mistakes", search: { new: undefined }, replace: true }); } }, [search.new]);

  const list = useMemo(() => mistakes.filter((m) => (!cat || m.category === cat) && (!rv || m.review === rv) &&
    (!q || [m.question, m.wrong, m.correct, m.reason].join(" ").toLowerCase().includes(q.toLowerCase()))), [mistakes, q, cat, rv]);
  const f = (k: keyof Mistake) => (v: string) => setEdit((e) => e && { ...e, [k]: v });
  const save = () => {
    if (!edit || (!edit.question.trim() && edit.images.length === 0)) return alert("请填写题目或添加截图");
    upsert("mistakes", edit); setEdit(null);
  };

  return (
    <div>
      <PageHeader title="德语错题库" sub={`共 ${mistakes.length} 题 · 待复习 ${mistakes.filter((m) => m.review !== "已掌握").length}`} action={<Btn onClick={() => setEdit(blank())}><Plus className="h-4 w-4" />添加错题</Btn>} />
      <div className="mb-4 flex flex-wrap gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="搜索题目、答案、原因…" />
        <div className="w-32"><Select value={cat} onChange={setCat} options={MISTAKE_CATS} placeholder="全部分类" /></div>
        <div className="w-32"><Select value={rv} onChange={setRv} options={REVIEW} placeholder="全部状态" /></div>
      </div>
      {list.length === 0 ? <Empty text="没有找到错题" /> : (
        <div className="space-y-3">
          {list.map((m) => (
            <div key={m.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Pill tone="blue">{m.category}</Pill>
                    <select value={m.review} onChange={(e) => upsert("mistakes", { ...m, review: e.target.value })} className={`rounded px-1 py-0.5 text-xs outline-none bg-tone-${statusTone(m.review)} text-tone-${statusTone(m.review)}-fg`}>
                      {REVIEW.map((r) => <option key={r}>{r}</option>)}
                    </select>
                    <span>{m.date}</span>
                  </div>
                  {m.question && <p className="whitespace-pre-wrap font-medium">{m.question}</p>}
                  <div className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                    <div><span className="text-muted-foreground">错误答案：</span><span className="text-tone-red-fg line-through">{m.wrong}</span></div>
                    <div><span className="text-muted-foreground">正确答案：</span><span className="text-tone-green-fg">{m.correct}</span></div>
                  </div>
                  {m.reason && <p className="mt-1 text-sm"><span className="text-muted-foreground">错误原因：</span>{m.reason}</p>}
                  {m.images.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{m.images.map((id) => <Thumb key={id} id={id} onClick={() => setView(id)} className="h-20 w-28" />)}</div>}
                </div>
                <div className="flex">
                  <button onClick={() => setEdit(m)} className="rounded p-1 hover:bg-accent" title="编辑"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => confirmDel() && remove("mistakes", m.id)} className="rounded p-1 text-destructive hover:bg-destructive/10" title="删除"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Lightbox id={view} onClose={() => setView(null)} />
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit && mistakes.some((m) => m.id === edit.id) ? "编辑错题" : "添加错题"}
        footer={<><Btn variant="ghost" onClick={() => setEdit(null)}>取消</Btn><Btn onClick={save}>保存</Btn></>}>
        {edit && (<>
          <Field label="题目"><textarea rows={3} autoFocus className={inputCls} value={edit.question} onChange={(e) => f("question")(e.target.value)} /></Field>
          <Field label="题目截图"><ImagePicker value={edit.images} onChange={(images) => setEdit((e) => e && { ...e, images })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="错误答案"><input className={inputCls} value={edit.wrong} onChange={(e) => f("wrong")(e.target.value)} /></Field>
            <Field label="正确答案"><input className={inputCls} value={edit.correct} onChange={(e) => f("correct")(e.target.value)} /></Field>
            <Field label="知识点分类"><Select value={edit.category} onChange={f("category")} options={MISTAKE_CATS} /></Field>
            <Field label="日期"><input type="date" className={inputCls} value={edit.date} onChange={(e) => f("date")(e.target.value)} /></Field>
            <Field label="复习状态"><Select value={edit.review} onChange={f("review")} options={REVIEW} /></Field>
          </div>
          <Field label="错误原因"><textarea rows={2} className={inputCls} value={edit.reason} onChange={(e) => f("reason")(e.target.value)} /></Field>
        </>)}
      </Modal>
    </div>
  );
}
