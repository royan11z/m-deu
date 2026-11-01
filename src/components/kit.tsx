import { useEffect, useState, type ReactNode } from "react";
import { getImage, saveImage } from "@/lib/images";
import { X, ImagePlus } from "lucide-react";

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Btn({ variant = "primary", className = "", ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const v = { primary: "bg-primary text-primary-foreground hover:opacity-90", ghost: "border border-border bg-card hover:bg-accent", danger: "text-destructive hover:bg-destructive/10" }[variant];
  return <button {...p} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${v} ${className}`} />;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>{children}</label>;
}
export const inputCls = "w-full rounded-md border border-input bg-card px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring";

export function Select({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: readonly string[]; placeholder?: string }) {
  return (
    <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

export function Modal({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-foreground/30 p-4 pt-16" onMouseDown={onClose}>
      <div className="w-full max-w-2xl rounded-xl border border-border bg-background shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3 p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-border px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Pill({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "red" | "amber" | "green" | "blue" }) {
  const t = { muted: "bg-muted text-muted-foreground", red: "bg-tone-red text-tone-red-fg", amber: "bg-tone-amber text-tone-amber-fg", green: "bg-tone-green text-tone-green-fg", blue: "bg-tone-blue text-tone-blue-fg" }[tone];
  return <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs ${t}`}>{children}</span>;
}
export const statusTone = (s: string) => (s === "已掌握" ? "green" : s === "学习中" || s === "复习中" ? "amber" : "red") as "green" | "amber" | "red";

export function useImageUrl(id: string) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    let u: string | undefined;
    getImage(id).then((b) => { if (b) { u = URL.createObjectURL(b); setUrl(u); } });
    return () => { if (u) URL.revokeObjectURL(u); };
  }, [id]);
  return url;
}

export function Thumb({ id, onClick, onRemove, className = "h-24 w-24" }: { id: string; onClick?: () => void; onRemove?: () => void; className?: string }) {
  const url = useImageUrl(id);
  return (
    <div className={`group relative shrink-0 overflow-hidden rounded-md border border-border bg-muted ${className}`}>
      {url && <img src={url} alt="截图" onClick={onClick} className="h-full w-full cursor-zoom-in object-cover" />}
      {onRemove && (
        <button type="button" onClick={onRemove} className="absolute right-1 top-1 rounded bg-background/90 p-0.5 opacity-0 group-hover:opacity-100"><X className="h-3 w-3" /></button>
      )}
    </div>
  );
}

/** 按原始宽高比完整显示截图：宽不超过容器、高度自适应（长图不裁切），小图不放大失真 */
export function FullImage({ id, onClick, className = "" }: { id: string; onClick?: () => void; className?: string }) {
  const url = useImageUrl(id);
  if (!url) return <div className={`h-20 w-full animate-pulse rounded-md border border-border bg-muted ${className}`} />;
  return <img src={url} alt="截图" onClick={onClick} className={`h-auto max-w-full cursor-zoom-in rounded-md border border-border ${className}`} />;
}

export function Lightbox({ id, onClose }: { id: string | string[] | null; onClose: () => void }) {
  if (!id) return null;
  const ids = Array.isArray(id) ? id : [id];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/80 p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-full w-full max-w-5xl flex-col items-center gap-4 overflow-y-auto rounded-lg py-2"
        onClick={(e) => e.stopPropagation()}
      >
        {ids.map((i) => (
          <LightboxImage key={i} id={i} />
        ))}
      </div>
    </div>
  );
}

function LightboxImage({ id }: { id: string }) {
  const url = useImageUrl(id);
  if (!url) {
    return (
      <div className="h-24 w-full max-w-md animate-pulse rounded-md border border-border bg-muted" />
    );
  }
  return (
    <img
      src={url}
      alt="词形表"
      className="h-auto max-w-full rounded-md border border-border bg-background shadow-2xl"
    />
  );
}

/** Upload or Ctrl+V paste images while mounted. */
export function ImagePicker({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const [view, setView] = useState<string | null>(null);
  const add = async (files: File[]) => {
    const imgs = files.filter((f) => f.type.startsWith("image/"));
    const ids = await Promise.all(imgs.map(saveImage));
    if (ids.length) onChange([...value, ...ids]);
  };
  useEffect(() => {
    const h = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.some((f) => f.type.startsWith("image/"))) { e.preventDefault(); add(files); }
    };
    window.addEventListener("paste", h);
    return () => window.removeEventListener("paste", h);
  });
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {value.map((id) => <Thumb key={id} id={id} onClick={() => setView(id)} onRemove={() => onChange(value.filter((x) => x !== id))} />)}
        <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:bg-accent">
          <ImagePlus className="h-5 w-5" />上传图片
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { add(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
        </label>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">提示：可直接按 Ctrl+V 粘贴截图</p>
      <Lightbox id={view} onClose={() => setView(null)} />
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return <input className={`${inputCls} max-w-xs`} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />;
}

export function Empty({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-border py-16 text-center text-sm text-muted-foreground">{text}</div>;
}

export const confirmDel = () => window.confirm("确定要删除吗？此操作无法撤销。");
