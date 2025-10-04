// StatCard.tsx
import { ReactNode } from "react";

type StatCardProps = {
  icon?: ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  /** Si true, pinta verd/vermell segons el signe (quan és numèric) */
  colorize?: boolean;
  /** Si true, afegeix '+' als positius (quan és numèric) */
  showPlus?: boolean;
  /** Formatter opcional per mostrar el value (quan és number) */
  formatter?: (n: number) => string;
};

export function StatCard({
  icon,
  label,
  value,
  sub,
  colorize,
  showPlus,
  formatter,
}: StatCardProps) {
  const raw =
    typeof value === "number"
      ? value
      : parseFloat(String(value).replace(/[^0-9.-]+/g, ""));

  const isNumeric = !Number.isNaN(raw);
  const display =
    isNumeric
      ? `${raw > 0 && showPlus ? "+" : ""}${
          formatter ? formatter(raw) : raw
        }`
      : String(value);

  // Colors tipus Tailwind 400 en hex perquè no depengui del teu CSS
  const color =
    colorize && isNumeric
      ? raw > 0
        ? "#22c55e" // verd
        : raw < 0
        ? "#ef4444" // vermell
        : undefined
      : undefined;

  return (
    <div className="card">
      <div className="kpi">
        <div>
          <div className="muted" style={{ fontSize: 12 }}>{label}</div>
          <div className="value" style={{ color }}>{display}</div>
          {sub ? <div className="muted" style={{ fontSize: 12 }}>{sub}</div> : null}
        </div>
        {icon ? <div className="badge">{icon}</div> : null}
      </div>
    </div>
  );
}
