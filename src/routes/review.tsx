import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, X } from "lucide-react";
import { useData, upsert, applyReviewResult, gradeAnswer, isDue, type Mistake } from "@/lib/store";
import { PageHeader, Btn, inputCls, Pill, Empty, FullImage, Lightbox } from "@/components/kit";

export const Route = createFileRoute("/review")({
  head: () => ({ meta: [{ title: "错题复习 · Mein Deutsch Workspace" }, { name: "description", content: "按间隔重复计划重做今日到期的错题。" }, { property: "og:title", content: "错题复习" }, { property: "og:description", content: "按间隔重复计划重做今日到期的错题。" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Review,
});

function Review() {
  const { mistakes } = useData();
  const [mounted, setMounted] = useState(false);
  const [frozen, setFrozen] = useState<Mistake[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [graded, setGraded] = useState<{ ok: boolean; updated: Mistake } | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [finished, setFinished] = useState(false);
  const [view, setView] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);
  // 队列实时取自当前数据（挂载后 localStorage 已加载）；首次提交判定后冻结，保证答题过程中队列稳定
  const due = mistakes.filter((m) => isDue(m)).sort((a, b) => a.nextReview.localeCompare(b.nextReview));
  const queue = frozen ?? due;

  if (!mounted) return <div className="py-16 text-center text-sm text-muted-foreground">载入中…</div>;

  if (queue.length === 0)
    return (
      <div className="max-w-xl">
        <PageHeader title="错题复习" sub="按间隔重复计划，重做今日到期的错题。" />
        <Empty text="今日没有待复习的错题，明天再来吧" />
        <div className="mt-4">
          <Link to="/mistakes"><Btn variant="ghost"><ArrowLeft className="h-4 w-4" />返回错题库</Btn></Link>
        </div>
      </div>
    );

  if (finished) {
    const correct = results.filter(Boolean).length;
    const rate = results.length ? Math.round((correct / results.length) * 100) : 0;
    const stats = [{ label: "完成题数", value: results.length }, { label: "答对题数", value: correct }, { label: "正确率", value: `${rate}%` }];
    return (
      <div className="max-w-xl">
        <PageHeader title="本次复习完成" sub="今日到期的错题都复习完啦。" />
        <div className="grid gap-4 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-card p-5">
              <div className="text-sm text-muted-foreground">{s.label}</div>
              <div className="mt-2 font-display text-3xl font-semibold">{s.value}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex gap-2">
          <Link to="/mistakes"><Btn variant="ghost">返回错题库</Btn></Link>
          <Link to="/"><Btn variant="ghost">回到首页</Btn></Link>
        </div>
      </div>
    );
  }

  const current = queue[idx];
  if (!current) return null; // 不会发生：idx 始终小于 queue.length
  const last = idx === queue.length - 1;
  // 判定/改判都基于复习前的快照重新计算，保证复习状态与历史记录一致
  const grade = (ok: boolean) => {
    setFrozen((f) => f ?? queue);
    const updated = applyReviewResult(current, answer, ok);
    upsert("mistakes", updated);
    setResults((r) => (graded ? [...r.slice(0, -1), ok] : [...r, ok]));
    setGraded({ ok, updated });
  };
  const submit = () => { if (answer.trim() && !graded) grade(gradeAnswer(answer, current.correct)); };
  const next = () => { if (last) setFinished(true); else { setIdx(idx + 1); setAnswer(""); setGraded(null); } };

  return (
    <div className="max-w-2xl">
      <PageHeader title="错题复习" sub={`第 ${idx + 1} / ${queue.length} 题`}
        action={<Link to="/mistakes"><Btn variant="ghost"><ArrowLeft className="h-4 w-4" />退出复习</Btn></Link>} />
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Pill tone="blue">{current.category}</Pill>
          <span>错题日期：{current.date}</span>
          <span>已复习 {current.reviewCount} 次 · 连续答对 {current.streak} 次</span>
        </div>
        {current.question && <p className="whitespace-pre-wrap font-medium">{current.question}</p>}
        {current.images.length > 0 && (
          <div className="mt-3 flex flex-wrap items-start gap-2">
            {current.images.map((id) => <FullImage key={id} id={id} onClick={() => setView(id)} />)}
          </div>
        )}
        <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); graded ? next() : submit(); }}>
          <input autoFocus className={inputCls} placeholder="输入你的答案…" value={answer}
            onChange={(e) => setAnswer(e.target.value)} disabled={!!graded} />
          {!graded ? (
            <Btn type="submit" disabled={!answer.trim()}>提交答案</Btn>
          ) : (
            <div className="space-y-3">
              <div className={`rounded-md p-3 text-sm ${graded.ok ? "bg-tone-green text-tone-green-fg" : "bg-tone-red text-tone-red-fg"}`}>
                <div className="flex items-center gap-1.5 font-medium">
                  {graded.ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  {graded.ok ? "回答正确" : "回答错误"}
                </div>
                {/* 判错才展示答案对比与错误原因；判对（含改判为正确）立即隐藏 */}
                {!graded.ok && (
                  <div className="mt-2 grid gap-1 sm:grid-cols-2">
                    <div><span className="opacity-70">你的答案：</span>{answer}</div>
                    <div><span className="opacity-70">正确答案：</span>{current.correct}</div>
                  </div>
                )}
              </div>
              {!graded.ok && current.reason && <p className="text-sm"><span className="text-muted-foreground">错误原因：</span>{current.reason}</p>}
              <p className="text-xs text-muted-foreground">下次复习：{graded.updated.nextReview} · 连续答对 {graded.updated.streak} 次</p>
              <div className="flex flex-wrap items-center gap-2">
                <Btn type="submit">{last ? "查看复习统计" : "下一题"}</Btn>
                <Btn type="button" variant="ghost" onClick={() => grade(!graded.ok)}>改判为{graded.ok ? "错误" : "正确"}</Btn>
              </div>
            </div>
          )}
        </form>
      </div>
      <Lightbox id={view} onClose={() => setView(null)} />
    </div>
  );
}
