import type { ComponentProps, ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "danger";
const variants: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-stone-800 disabled:bg-stone-400",
  secondary: "bg-white text-ink border border-line hover:bg-stone-50 disabled:text-stone-400",
  ghost: "text-muted hover:text-ink hover:bg-stone-100",
  danger: "text-bad hover:bg-red-50",
};

export function buttonClass(variant: Variant = "primary", extra?: string) {
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 h-10 text-sm font-medium transition-colors disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
    variants[variant],
    extra,
  );
}

export function Button({ variant = "primary", className, ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

export const inputClass =
  "w-full h-10 rounded-lg border border-line bg-white px-3 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent aria-[invalid=true]:border-bad";

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
  return <section className={cx("rounded-xl border border-line bg-white p-4 sm:p-5", className)} {...props} />;
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
