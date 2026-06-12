const COUNTRY_FLAGS = {
  Brazil: '🇧🇷', India: '🇮🇳', Germany: '🇩🇪',
  Japan: '🇯🇵', France: '🇫🇷', Nigeria: '🇳🇬',
};

const REFLECTION_LABELS = [
  'What changed most R1 → R3?',
  'Biggest communication challenge?',
  'What would you do differently?',
];

export default function AnalyticsPanel({ data }) {
  if (!data) return null;
  const { handoffByTeam, reflectionRates, topWords, lostByEvent } = data;

  const maxWordCount = Math.max(1, ...handoffByTeam.map(t => t.avgWordCount));
  const maxFreq = topWords[0]?.count || 1;

  return (
    <div className="space-y-5">
      {/* ── Handoff note analysis ── */}
      <div className="card">
        <h3 className="font-display text-base font-bold text-gray-900 mb-1">Handoff Notes</h3>
        <p className="text-xs text-gray-500 mb-4">Average word count per team · on-time vs auto-saved</p>

        {handoffByTeam.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No handoff notes recorded.</p>
        ) : (
          <div className="space-y-3">
            {handoffByTeam
              .sort((a, b) => b.avgWordCount - a.avgWordCount)
              .map(team => (
                <HandoffTeamRow key={team.teamId} team={team} maxWordCount={maxWordCount} />
              ))}
          </div>
        )}

        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-200">
          <Legend dot="bg-emerald-500" label="Submitted on time" />
          <Legend dot="bg-amber-400" label="Auto-saved at round end" />
          <Legend dot="bg-gray-300" label="Not written" />
        </div>
      </div>

      {/* ── Reflection response rates ── */}
      <div className="card">
        <h3 className="font-display text-base font-bold text-gray-900 mb-1">Reflection Response Rate</h3>
        <p className="text-xs text-gray-500 mb-4">
          {reflectionRates.submitted} of {reflectionRates.total} participant{reflectionRates.total !== 1 ? 's' : ''} submitted reflections
        </p>

        <div className="mb-4">
          <ProgressBar
            label="Overall submissions"
            value={reflectionRates.submitted}
            total={reflectionRates.total}
            color="bg-blue-500"
            bold
          />
        </div>

        <div className="space-y-2.5">
          {REFLECTION_LABELS.map((label, i) => (
            <ProgressBar
              key={i}
              label={`Q${i + 1} — ${label}`}
              value={reflectionRates[`q${i + 1}`]}
              total={reflectionRates.total}
              color="bg-blue-300"
            />
          ))}
        </div>
      </div>

      {/* ── What got lost ── */}
      {lostByEvent && lostByEvent.length > 0 && (
        <div className="card">
          <h3 className="font-display text-base font-bold text-gray-900 mb-1">What Got Lost</h3>
          <p className="text-xs text-gray-500 mb-4">Keywords written in Round 1 that disappeared by Round 3</p>
          <div className="space-y-4">
            {lostByEvent.map(({ eventName, lostKeywords }) => (
              <div key={eventName}>
                <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider mb-2">{eventName}</p>
                <div className="flex flex-wrap gap-2">
                  {lostKeywords.map(({ word, r1Count }) => (
                    <span
                      key={word}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 border border-red-200 rounded-full text-xs text-red-700"
                      title={`Appeared ${r1Count}× in Round 1`}
                    >
                      {word}
                      <span className="text-red-400 font-mono text-[10px]">×{r1Count}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Word frequency ── */}
      <div className="card">
        <h3 className="font-display text-base font-bold text-gray-900 mb-1">Top Words in Workspace Content</h3>
        <p className="text-xs text-gray-500 mb-4">Most frequent words written across all teams and rounds</p>

        {topWords.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No workspace content recorded.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
            {topWords.map(({ word, count }) => (
              <WordRow key={word} word={word} count={count} max={maxFreq} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HandoffTeamRow({ team, maxWordCount }) {
  const barPct = maxWordCount > 0 ? (team.avgWordCount / maxWordCount) * 100 : 0;
  const totalSlots = team.totalNotes;

  return (
    <div className="flex items-center gap-3">
      <div className="w-28 flex-shrink-0 flex items-center gap-1.5">
        <span className="text-base">{COUNTRY_FLAGS[team.country]}</span>
        <div className="min-w-0">
          <div className="text-xs font-medium text-gray-900 truncate">{team.country}</div>
          {team.instanceNum > 1 && (
            <div className="text-xs text-gray-400">Inst. {team.instanceNum}</div>
          )}
        </div>
      </div>

      <div className="flex-1 flex items-center gap-2">
        <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-400 rounded-full transition-all duration-500"
            style={{ width: `${Math.max(barPct, 2)}%` }}
          />
        </div>
        <span className="text-xs font-mono text-gray-500 w-14 text-right">
          {team.avgWordCount} {team.avgWordCount === 1 ? 'word' : 'words'}
        </span>
      </div>

      <div className="flex gap-1 flex-shrink-0">
        {team.notes.map((note, i) => (
          <NoteStatusDot key={i} note={note} />
        ))}
        {Array.from({ length: Math.max(0, 2 - totalSlots) }).map((_, i) => (
          <div key={`pad-${i}`} className="w-6 h-6 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
            <span className="text-gray-300 text-xs">—</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NoteStatusDot({ note }) {
  const bg = note.onTime ? 'bg-emerald-500' : note.hasContent ? 'bg-amber-400' : 'bg-gray-300';
  const title = note.onTime
    ? `Round ${note.round}: submitted on time (${note.wordCount} words)`
    : note.hasContent
    ? `Round ${note.round}: auto-saved at round end (${note.wordCount} words)`
    : `Round ${note.round}: nothing written`;

  return (
    <div className={`w-6 h-6 rounded-full ${bg} flex items-center justify-center`} title={title}>
      <span className="text-white text-[9px] font-bold">{note.round}</span>
    </div>
  );
}

function ProgressBar({ label, value, total, color, bold = false }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs ${bold ? 'font-medium text-gray-800' : 'text-gray-500'} truncate mr-2`}>
          {label}
        </span>
        <span className={`text-xs font-mono flex-shrink-0 ${bold ? 'text-gray-900' : 'text-gray-500'}`}>
          {value}/{total} <span className="text-gray-300">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function WordRow({ word, count, max }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-mono text-gray-700 w-24 truncate">{word}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-blue-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400 font-mono w-6 text-right">{count}</span>
    </div>
  );
}

function Legend({ dot, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2.5 h-2.5 rounded-full ${dot}`} />
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}
