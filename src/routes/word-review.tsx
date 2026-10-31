import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, X, Zap } from "lucide-react";
import { useData, upsert, applyWordReviewResult, gradeAnswer, isWordDue, MASTERY, type Word } from "@/lib/store";
import { PageHeader, Btn, inputCls, Select, Pill, Empty, statusTone } from "@/components/kit";

export const Route = createFileRoute("/word-review")({
  head: () => ({ meta: [{ title: "单词闪卡 · Mein Deutsch Workspace" }, { name: "description", content: "按间隔重复计划复习今日到期的单词闪卡。" }, { property: "og:title", content: "单词闪卡" }, { property: "og:description", content: "按间隔重复计划复习今日到期的单词闪卡。" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: WordReview,
});

const SCOPES = [...MASTERY, "所有单词"] as const;
type Phase = "pick" | "run" | "done";

// 只打乱本次队列，不改动单词数据本身
const shuffle = <T,>(list: T[]) => [...list].sort(() => Math.random() - 0.5);

function WordReview() {
  const { words } = useData();
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>("pick");
  const [scope, setScope] = useState<string>("未掌握");
  const [practice, setPractice] = useState(false);
  const [queue, setQueue] = useState<Word[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [graded, setGraded] = useState<{ ok: boolean; note: string; nextReview: string; streak: number } | null>(null);
  const [spelling, setSpelling] = useState(false);
  const [spell, setSpell] = useState("");
  const [results, setResults] = useState<boolean[]>([]);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="py-16 text-center text-sm text-muted-foreground">载入中…</div>;

  const inScope = words.filter((w) => scope === "所有单词" || w.mastery === scope);
  const due = inScope.filter((w) => isWordDue(w));

  const start = (asPractice: boolean) => {
    setQueue(shuffle(asPractice ? inScope : due));
    setPractice(asPractice);
    setIdx(0); setFlipped(false); setGraded(null); setSpelling(false); setSpell(""); setResults([]);
    setPhase("run");
  };

  // —— 范围选择 ——
  if (phase === "pick") {
    return (
      <div className="max-w-xl">
        <PageHeader title="单词闪卡复习" sub="选择本次复习范围，单词将随机出现。"
          action={<Link to="/words"><Btn variant="ghost"><ArrowLeft className="h-4 w-4" />返回单词库</Btn></Link>} />
        <div className="space-y-4 rounded-lg border border-border bg-card p-5">
          <div>
            <span className="mb-1 block text-xs font-medium text-muted-foreground">复习范围</span>
            <Select value={scope} onChange={setScope} options={SCOPES} />
          </div>
          <p className="text-sm text-muted-foreground">
            该范围共 {inScope.length} 个单词 · 今日到期 {due.length} 个
          </p>
          {inScope.length === 0 ? (
            <Empty text="该范围内没有单词，换个范围或先去添加单词吧" />
          ) : due.length > 0 ? (
            <Btn onClick={() => start(false)}><Zap className="h-4 w-4" />开始复习 ({due.length})</Btn>
          ) : (
            <div className="space-y-3">
              <p className="rounded-md bg-tone-amber p-3 text-sm text-tone-amber-fg">今日到期的单词已全部复习完，可以继续复习全部单词。</p>
              <Btn variant="ghost" onClick={() => start(true)}>练习模式：复习全部 ({inScope.length})</Btn>
              <p className="text-xs text-muted-foreground">练习模式不计入连续答对次数，也不改变复习计划。</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // —— 本次统计 ——
  if (phase === "done") {
    const correct = results.filter(Boolean).length;
    const rate = results.length ? Math.round((correct / results.length) * 100) : 0;
    const stats = [{ label: "完成单词数", value: results.length }, { label: "认识单词数", value: correct }, { label: "正确率", value: `${rate}%` }];
    return (
      <div className="max-w-xl">
        <PageHeader title="本次复习完成" sub={practice ? "练习模式结束，本次不计入复习进度。" : "今日到期的单词都复习完啦。"} />
        <div className="grid gap-4 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-card p-5">
              <div className="text-sm text-muted-foreground">{s.label}</div>
              <div className="mt-2 font-display text-3xl font-semibold">{s.value}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Btn variant="ghost" onClick={() => setPhase("pick")}>再复习一轮</Btn>
          <Link to="/words"><Btn variant="ghost">返回单词库</Btn></Link>
          <Link to="/"><Btn variant="ghost">回到首页</Btn></Link>
        </div>
      </div>
    );
  }

  // —— 闪卡答题 ——
  const current = queue[idx];
  if (!current) return null; // 不会发生：idx 始终小于 queue.length
  const last = idx === queue.length - 1;

  // ok: 是否答对；note: 附加说明；markMastered: 「太简单」拼写正确时归类为已掌握
  const grade = (ok: boolean, note = "", markMastered = false) => {
    if (practice) {
      setGraded({ ok, note, nextReview: current.nextReview || "（练习模式不更新）", streak: current.streak });
    } else {
      let updated = applyWordReviewResult(current, ok);
      if (markMastered) updated = { ...updated, mastery: "已掌握" };
      upsert("words", updated);
      setGraded({ ok, note, nextReview: updated.nextReview, streak: updated.streak });
    }
    setResults((r) => [...r, ok]);
  };
  const submitSpelling = () => {
    if (!spell.trim()) return;
    if (gradeAnswer(spell, current.word)) grade(true, "拼写正确，已自动归类为「已掌握」", true);
    else grade(true, `拼写错误，正确拼写：${current.word}。按「认识」处理`, false);
  };
  const next = () => {
    if (last) setPhase("done");
    else { setIdx(idx + 1); setFlipped(false); setGraded(null); setSpelling(false); setSpell(""); }
  };

  return (
    <div className="max-w-2xl">
      <PageHeader title="单词闪卡复习" sub={`第 ${idx + 1} / ${queue.length} 张`}
        action={<Link to="/words"><Btn variant="ghost"><ArrowLeft className="h-4 w-4" />退出复习</Btn></Link>} />
      {practice && (
        <p className="mb-4 rounded-md bg-tone-amber p-3 text-sm text-tone-amber-fg">
          练习模式：本次复习不计入连续答对次数，不改变复习间隔与下次复习日期。
        </p>
      )}
      {/* 点击翻转的闪卡：正面德语，背面中文释义；key 随卡片 id 变化，换卡时重新挂载、直接以正面初始渲染，避免复位动画露出下一张卡的背面 */}
      <div key={current.id} className="cursor-pointer select-none [perspective:1200px]" onClick={() => !graded && setFlipped((f) => !f)}>
        <div className={`relative h-64 transition-transform duration-500 [transform-style:preserve-3d] ${flipped ? "[transform:rotateY(180deg)]" : ""}`}>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card p-6 [backface-visibility:hidden]">
            <Pill tone={statusTone(current.mastery)}>{current.mastery}</Pill>
            <div className="text-center font-display text-3xl font-semibold">{current.word}</div>
            <div className="text-xs text-muted-foreground">{current.pos}{current.gender && ` · ${current.gender}`}{current.plural && ` · ${current.plural}`}</div>
            <div className="mt-4 text-xs text-muted-foreground">点击卡片查看释义</div>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card p-6 [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <div className="text-center font-display text-3xl font-semibold">{current.meaning || "（未填写释义）"}</div>
            {current.example && <div className="text-center text-sm italic text-muted-foreground">{current.example}</div>}
            <div className="mt-4 text-xs text-muted-foreground">{current.word}</div>
          </div>
        </div>
      </div>
      <div className="mt-4 rounded-lg border border-border bg-card p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>已复习 {current.reviewCount} 次 · 连续答对 {current.streak} 次</span>
        </div>
        {!graded ? (
          !flipped ? (
            <p className="text-sm text-muted-foreground">先点击卡片翻面，回忆中文释义后再作答。</p>
          ) : spelling ? (
            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submitSpelling(); }}>
              <input autoFocus className={inputCls} placeholder="请拼写该德语单词…" value={spell} onChange={(e) => setSpell(e.target.value)} />
              <div className="flex flex-wrap gap-2">
                <Btn type="submit" disabled={!spell.trim()}>提交拼写</Btn>
                <Btn type="button" variant="ghost" onClick={() => { setSpelling(false); setSpell(""); }}>返回</Btn>
              </div>
            </form>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Btn onClick={() => grade(true)}><Check className="h-4 w-4" />认识</Btn>
              <Btn variant="ghost" onClick={() => grade(false)}><X className="h-4 w-4" />不认识</Btn>
              <Btn variant="ghost" onClick={() => setSpelling(true)}><Zap className="h-4 w-4" />太简单</Btn>
            </div>
          )
        ) : (
          <div className="space-y-3">
            <div className={`rounded-md p-3 text-sm ${graded.ok ? "bg-tone-green text-tone-green-fg" : "bg-tone-red text-tone-red-fg"}`}>
              <div className="flex items-center gap-1.5 font-medium">
                {graded.ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                {graded.ok ? "认识" : "不认识"}
              </div>
              {graded.note && <div className="mt-1">{graded.note}</div>}
            </div>
            {!practice && <p className="text-xs text-muted-foreground">下次复习：{graded.nextReview} · 连续答对 {graded.streak} 次</p>}
            <Btn onClick={next}>{last ? "查看复习统计" : "下一张"}</Btn>
          </div>
        )}
      </div>
    </div>
  );
}
