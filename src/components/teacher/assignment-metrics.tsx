// Top-of-page metrics for a teacher's assignment view.
// Shows: total students enrolled, in-progress, submitted, published.

export function AssignmentMetrics({
  totalStudents,
  inProgress,
  submitted,
  published,
  lessonType,
}: {
  totalStudents: number;
  inProgress: number;
  submitted: number;
  published: number;
  lessonType: string;
}) {
  const pct = (n: number) =>
    totalStudents === 0 ? 0 : Math.round((n / totalStudents) * 100);
  const isJunior = lessonType === "junior_books";
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Metric label="alunos" value={totalStudents} />
      <Metric label="em andamento" value={inProgress} pct={pct(inProgress)} tone="amber" />
      <Metric
        label={isJunior ? "publicados" : "entregues"}
        value={isJunior ? published : submitted}
        pct={pct(isJunior ? published : submitted)}
        tone="magic"
      />
      <Metric
        label="sem começar"
        value={Math.max(0, totalStudents - inProgress - submitted)}
        pct={pct(Math.max(0, totalStudents - inProgress - submitted))}
        tone="faint"
      />
    </div>
  );
}

function Metric({
  label,
  value,
  pct,
  tone = "ink",
}: {
  label: string;
  value: number;
  pct?: number;
  tone?: "ink" | "magic" | "amber" | "faint";
}) {
  const color =
    tone === "magic"
      ? "var(--magic)"
      : tone === "amber"
        ? "var(--amber)"
        : tone === "faint"
          ? "var(--ink-faint)"
          : "var(--ink)";
  return (
    <div
      className="rounded-[14px] border-2 p-4 flex flex-col gap-1"
      style={{
        borderColor: "var(--paper-edge)",
        background: "var(--paper)",
      }}
    >
      <p className="body-serif italic text-[0.78rem] tracking-wide text-[var(--ink-faint)]">
        {label}
      </p>
      <p
        className="display text-[1.8rem] leading-none tabular-nums"
        style={{ color }}
      >
        {value}
        {pct !== undefined && (
          <span className="display-italic text-[0.55em] ml-2 align-middle text-[var(--ink-faint)]">
            {pct}%
          </span>
        )}
      </p>
    </div>
  );
}
