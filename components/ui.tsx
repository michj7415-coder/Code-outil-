import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { MarginLevel } from "@/lib/insights";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "danger";
const variants: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-strong disabled:bg-stone-300",
  secondary: "bg-white text-ink border border-line hover:bg-stone-50 disabled:text-stone-400",
  ghost: "text-muted hover:text-ink hover:bg-stone-100",
  danger: "text-bad hover:bg-red-50",
};

export function buttonClass(variant: Variant = "primary", extra?: string) {
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 h-11 text-sm font-medium transition-colors disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
    variants[variant],
    extra,
  );
}

export function Button({ variant = "primary", className, ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

export const inputClass =
  "w-full h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent aria-[invalid=true]:border-bad";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs text-bad">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function Card({ className, ...props }: ComponentProps<"section">) {
  return <section className={cx("rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(28,25,23,0.04)] sm:p-6", className)} {...props} />;
}

export function Alert({ tone = "bad", children }: { tone?: "bad" | "ok" | "warn" | "info"; children: ReactNode }) {
  const tones = {
    bad: "bg-red-50 text-bad border-red-200",
    ok: "bg-green-50 text-ok border-green-200",
    warn: "bg-amber-50 text-warn border-amber-200",
    info: "bg-accent-soft text-accent border-indigo-200",
  };
  return (
    <div role={tone === "bad" ? "alert" : "status"} className={cx("rounded-lg border px-3 py-2 text-sm", tones[tone])}>
      {children}
    </div>
  );
}

/** Couleurs du code de marge : vert (au-dessus du seuil), orange, rouge. */
export const levelStyles: Record<MarginLevel, { dot: string; text: string; soft: string; label: string }> = {
  ok: { dot: "bg-ok", text: "text-ok", soft: "bg-green-50 text-ok", label: "Au-dessus du seuil" },
  warn: { dot: "bg-warn", text: "text-warn", soft: "bg-amber-50 text-warn", label: "Un peu sous le seuil" },
  bad: { dot: "bg-bad", text: "text-bad", soft: "bg-red-50 text-bad", label: "Bien sous le seuil" },
  none: { dot: "bg-stone-300", text: "text-muted", soft: "bg-stone-100 text-muted", label: "Pas de prix" },
};

export function MarginBadge({ level, children }: { level: MarginLevel; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums", levelStyles[level].soft)}>
      <span className={cx("h-1.5 w-1.5 rounded-full", levelStyles[level].dot)} aria-hidden />
      {children}
    </span>
  );
}

export function ProgressBar({ percent, label, className }: { percent: number; label?: string; className?: string }) {
  // Couleurs neutres : le vert/orange/rouge reste réservé au code de marge.
  const tone = percent >= 100 ? "bg-ok" : "bg-accent";
  return (
    <div className={cx("flex items-center gap-2", className)}>
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-200"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Complétion de la fiche"}
      >
        <div className={cx("h-full rounded-full transition-all", tone)} style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
      </div>
      <span className="w-9 text-right text-xs text-muted tabular-nums">{percent} %</span>
    </div>
  );
}

/** État vide : une icône, un titre, une phrase et un bouton d'action. */
export function EmptyState({
  icon,
  title,
  text,
  action,
  compact,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  action?: { label: string; href?: string; onClick?: () => void };
  compact?: boolean;
}) {
  const btn = action
    ? action.href
      ? <Link href={action.href} className={buttonClass(compact ? "secondary" : "primary", "mt-4")}>{action.label}</Link>
      : <button type="button" onClick={action.onClick} className={buttonClass(compact ? "secondary" : "primary", "mt-4")}>{action.label}</button>
    : null;
  return (
    <div className={cx("flex flex-col items-center rounded-2xl border border-dashed border-stone-300 bg-stone-50/60 text-center", compact ? "px-4 py-6" : "px-6 py-12")}>
      <div className={cx("flex items-center justify-center rounded-2xl bg-accent-soft text-accent", compact ? "h-10 w-10" : "h-14 w-14")}>{icon}</div>
      <p className={cx("font-semibold", compact ? "mt-3 text-sm" : "mt-4")}>{title}</p>
      <p className={cx("mx-auto max-w-sm text-muted", compact ? "mt-1 text-xs" : "mt-1 text-sm")}>{text}</p>
      {btn}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
