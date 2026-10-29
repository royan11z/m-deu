import { createFileRoute, Link } from "@tanstack/react-router";
import { BookA, CircleX, Images, Plus } from "lucide-react";
import { useData, fmt } from "@/lib/store";
import { PageHeader, Pill, Empty } from "@/components/kit";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "首页 · Mein Deutsch Workspace" },
      { name: "description", content: "个人德语学习工作台：单词库、错题库与截图笔记。" },
      { property: "og:title", content: "Mein Deutsch Workspace" },
      { property: "og:description", content: "个人德语学习工作台：单词库、错题库与截图笔记。" },
    ],
  }),
  component: Home,
});

function Home() {
  const { words, mistakes, notes } = useData();
  const pending = mistakes.filter((m) => m.review !== "已掌握").length;
  const recent = [
    ...words.map((w) => ({ t: w.createdAt, kind: "单词", title: `${w.word} — ${w.meaning}`, to: "/words" as const })),
    ...mistakes.map((m) => ({ t: m.createdAt, kind: "错题", title: m.question || "（截图题目）", to: "/mistakes" as const })),
    ...notes.map((n) => ({ t: n.createdAt, kind: "笔记", title: n.title, to: "/notes" as const })),
  ].sort((a, b) => b.t - a.t).slice(0, 10);

  const stats = [
    { label: "单词总数", value: words.length, icon: BookA, to: "/words" as const },
    { label: "错题总数", value: mistakes.length, extra: `待复习 ${pending}`, icon: CircleX, to: "/mistakes" as const },
    { label: "笔记总数", value: notes.length, icon: Images, to: "/notes" as const },
  ];
  return (
    <div>
      <PageHeader title="Guten Tag! 👋" sub="今天也来学一点德语吧。" />
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="rounded-lg border border-border bg-card p-5 hover:bg-accent">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><s.icon className="h-4 w-4" />{s.label}</div>
            <div className="mt-2 font-display text-3xl font-semibold">{s.value}</div>
            {s.extra && <div className="mt-1 text-sm text-tone-red-fg">{s.extra}</div>}
          </Link>
        ))}
      </div>
      <h2 className="mb-3 mt-8 text-sm font-semibold text-muted-foreground">快速添加</h2>
      <div className="flex flex-wrap gap-2">
        {[{ to: "/words", l: "添加单词" }, { to: "/mistakes", l: "添加错题" }, { to: "/notes", l: "添加截图笔记" }].map((b) => (
          <Link key={b.to} to={b.to as "/words"} search={{ new: true }} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            <Plus className="h-4 w-4" />{b.l}
          </Link>
        ))}
      </div>
      <h2 className="mb-3 mt-8 text-sm font-semibold text-muted-foreground">最近添加</h2>
      {recent.length === 0 ? <Empty text="还没有记录，从上面的按钮开始吧" /> : (
        <div className="divide-y divide-border rounded-lg border border-border bg-card">
          {recent.map((r, i) => (
            <Link key={i} to={r.to} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent">
              <Pill tone="blue">{r.kind}</Pill><span className="flex-1 truncate">{r.title}</span>
              <span className="text-xs text-muted-foreground">{fmt(r.t)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
