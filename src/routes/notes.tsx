import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useData, upsert, remove, newId, splitTags, fmt, type Note } from "@/lib/store";
import { PageHeader, Btn, Field, inputCls, Select, Modal, Pill, SearchBox, Empty, confirmDel, ImagePicker, Thumb, Lightbox } from "@/components/kit";

export const Route = createFileRoute("/notes")({
  validateSearch: (s: Record<string, unknown>) => ({ new: s["new"] === true || s["new"] === "true" ? true : undefined }),
  head: () => ({ meta: [{ title: "截图笔记 · Mein Deutsch Workspace" }, { name: "description", content: "用截图整理德语学习笔记。" }, { property: "og:title", content: "德语截图笔记库" }, { property: "og:description", content: "用截图整理德语学习笔记。" }] }),
  component: Notes,
});

const blank = (): Note => ({ id: newId(), title: "", category: "", tags: [], remark: "", images: [], createdAt: Date.now() });

function Notes() {
  const { notes } = useData();
  const search = Route.useSearch(); const nav = useNavigate();
  const [q, setQ] = useState(""); const [cat, setCat] = useState(""); const [tag, setTag] = useState("");
  const [edit, setEdit] = useState<Note | null>(null); const [tagText, setTagText] = useState("");
  const [view, setView] = useState<string | null>(null);
  const open = (n: Note) => { setEdit(n); setTagText(n.tags.join(", ")); };
  useEffect(() => { if (search.new) { open(blank()); nav({ to: "/notes", search: { new: undefined }, replace: true }); } }, [search.new]);

  const cats = [...new Set(notes.map((n) => n.category).filter(Boolean))];
  const tags = [...new Set(notes.flatMap((n) => n.tags))];
  const list = useMemo(() => notes.filter((n) => (!cat || n.category === cat) && (!tag || n.tags.includes(tag)) &&
    (!q || [n.title, n.remark, n.category, ...n.tags].join(" ").toLowerCase().includes(q.toLowerCase()))), [notes, q, cat, tag]);
  const save = () => {
    if (!edit || !edit.title.trim()) return alert("请填写标题");
    upsert("notes", { ...edit, tags: splitTags(tagText) }); setEdit(null);
  };

  return (
    <div>
      <PageHeader title="截图笔记库" sub={`共 ${notes.length} 条笔记`} action={<Btn onClick={() => open(blank())}><Plus className="h-4 w-4" />新建笔记</Btn>} />
      <div className="mb-4 flex flex-wrap gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="搜索标题、备注…" />
        <div className="w-36"><Select value={cat} onChange={setCat} options={cats} placeholder="全部分类" /></div>
        <div className="w-36"><Select value={tag} onChange={setTag} options={tags} placeholder="全部标签" /></div>
      </div>
      {list.length === 0 ? <Empty text="没有找到笔记" /> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((n) => (
            <div key={n.id} className="flex flex-col rounded-lg border border-border bg-card">
              {n.images.length > 0 && (
                <div className="flex gap-1 overflow-x-auto p-2">{n.images.map((id) => <Thumb key={id} id={id} onClick={() => setView(id)} className="h-28 w-36" />)}</div>
              )}
              <div className="flex-1 p-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium">{n.title}</h3>
                  <div className="flex shrink-0">
                    <button onClick={() => open(n)} className="rounded p-1 hover:bg-accent" title="编辑"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => confirmDel() && remove("notes", n.id)} className="rounded p-1 text-destructive hover:bg-destructive/10" title="删除"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                {n.remark && <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">{n.remark}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  {n.category && <Pill tone="blue">{n.category}</Pill>}
                  {n.tags.map((t) => <Pill key={t}>#{t}</Pill>)}
                  <span className="ml-auto text-xs text-muted-foreground">{fmt(n.createdAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Lightbox id={view} onClose={() => setView(null)} />
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit && notes.some((n) => n.id === edit.id) ? "编辑笔记" : "新建笔记"}
        footer={<><Btn variant="ghost" onClick={() => setEdit(null)}>取消</Btn><Btn onClick={save}>保存</Btn></>}>
        {edit && (<>
          <Field label="标题 *"><input autoFocus className={inputCls} value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="分类">
              <input list="note-cats" className={inputCls} value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })} placeholder="如：语法、课堂笔记" />
              <datalist id="note-cats">{cats.map((c) => <option key={c} value={c} />)}</datalist>
            </Field>
            <Field label="标签（逗号分隔）"><input className={inputCls} value={tagText} onChange={(e) => setTagText(e.target.value)} /></Field>
          </div>
          <Field label="截图"><ImagePicker value={edit.images} onChange={(images) => setEdit((e) => e && { ...e, images })} /></Field>
          <Field label="备注"><textarea rows={3} className={inputCls} value={edit.remark} onChange={(e) => setEdit({ ...edit, remark: e.target.value })} /></Field>
        </>)}
      </Modal>
    </div>
  );
}
