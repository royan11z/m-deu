import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Upload } from "lucide-react";
import { exportAll, importAll, useData } from "@/lib/store";
import { PageHeader, Btn } from "@/components/kit";

export const Route = createFileRoute("/backup")({
  head: () => ({ meta: [{ title: "备份与导入 · Mein Deutsch Workspace" }, { name: "description", content: "导出或导入全部学习数据。" }, { property: "og:title", content: "备份与导入" }, { property: "og:description", content: "导出或导入全部学习数据。" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Backup,
});

function Backup() {
  const d = useData();
  const [busy, setBusy] = useState(false);
  const doExport = async () => {
    setBusy(true);
    try {
      const json = await exportAll();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([JSON.stringify(json)], { type: "application/json" }));
      a.download = `mein-deutsch-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
    } finally { setBusy(false); }
  };
  const doImport = async (file?: File) => {
    if (!file || !confirm("导入会覆盖当前所有数据（包括图片），确定继续吗？")) return;
    setBusy(true);
    try { await importAll(JSON.parse(await file.text())); alert("导入成功！"); }
    catch (e) { alert("导入失败：" + (e as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <div className="max-w-xl">
      <PageHeader title="备份与导入" sub="所有数据保存在当前浏览器中。建议定期导出备份。" />
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-medium">导出数据</h2>
          <p className="mt-1 text-sm text-muted-foreground">包含 {d.words.length} 个单词、{d.mistakes.length} 道错题、{d.notes.length} 条笔记及所有截图，保存为一个文件。</p>
          <Btn className="mt-3" onClick={doExport} disabled={busy}><Download className="h-4 w-4" />导出备份文件</Btn>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-medium">导入数据</h2>
          <p className="mt-1 text-sm text-muted-foreground">选择之前导出的备份文件，恢复到本浏览器（会替换当前数据）。</p>
          <label className={`mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent ${busy ? "pointer-events-none opacity-50" : ""}`}>
            <Upload className="h-4 w-4" />选择备份文件
            <input type="file" accept="application/json,.json" className="hidden" onChange={(e) => { doImport(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
        </div>
      </div>
    </div>
  );
}
