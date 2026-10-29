import { Link, useRouterState } from "@tanstack/react-router";
import { Home, BookA, CircleX, Images, DatabaseBackup, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useState } from "react";

const items = [
  { to: "/", label: "首页", icon: Home },
  { to: "/words", label: "单词库", icon: BookA },
  { to: "/mistakes", label: "错题库", icon: CircleX },
  { to: "/notes", label: "截图笔记", icon: Images },
  { to: "/backup", label: "备份与导入", icon: DatabaseBackup },
] as const;

export function Sidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [mini, setMini] = useState(false);
  return (
    <aside className={`sticky top-0 flex h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-all ${mini ? "w-14" : "w-60"}`}>
      <div className="flex items-center justify-between px-3 py-4">
        {!mini && <span className="font-display text-base font-semibold">🇩🇪 Mein Deutsch</span>}
        <button onClick={() => setMini(!mini)} className="rounded p-1.5 text-muted-foreground hover:bg-sidebar-accent" aria-label="折叠导航">
          {mini ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>
      <nav className="space-y-0.5 px-2">
        {items.map((i) => {
          const active = i.to === "/" ? path === "/" : path.startsWith(i.to);
          return (
            <Link key={i.to} to={i.to} title={i.label}
              className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm ${active ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent"}`}>
              <i.icon className="h-4 w-4 shrink-0" />{!mini && i.label}
            </Link>
          );
        })}
      </nav>
      {!mini && <p className="mt-auto px-4 py-4 text-xs text-muted-foreground">Workspace · 数据保存在本机浏览器</p>}
    </aside>
  );
}
