export default function Timer({ remaining, total, compact = false }) {
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const pct = total > 0 ? (remaining / total) * 100 : 0;

  const color = remaining <= 60
    ? 'text-red-600'
    : remaining <= 120
    ? 'text-amber-600'
    : 'text-gray-900';

  const barColor = remaining <= 60
    ? 'bg-red-500'
    : remaining <= 120
    ? 'bg-amber-500'
    : 'bg-emerald-500';

  if (compact) {
    return (
      <span className={`font-display font-bold tabular-nums ${color}`}>
        {mins}:{String(secs).padStart(2, '0')}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className={`font-display text-4xl font-bold tabular-nums ${color}`}>
        {mins}:{String(secs).padStart(2, '0')}
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
