const COUNTRY_FLAGS = {
  Brazil: '🇧🇷', India: '🇮🇳', Germany: '🇩🇪',
  Japan: '🇯🇵', France: '🇫🇷', Nigeria: '🇳🇬'
};

export default function DebriefView({ instanceData }) {
  if (!instanceData) return null;
  const { eventData, reflections } = instanceData;

  return (
    <div className="space-y-8">
      {eventData.map(({ eventName, rounds }) => (
        <div key={eventName} className="card">
          <h3 className="font-display text-lg font-bold text-amber-600 mb-5">{eventName}</h3>
          <div className="space-y-4">
            {rounds.map(({ round, team, content, handoffNote }) => (
              <div key={round} className="relative pl-6">
                <div className="absolute left-0 top-0 w-5 h-5 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center text-xs text-gray-600 font-mono">
                  {round}
                </div>
                {round < 3 && (
                  <div className="absolute left-2 top-5 w-px h-full bg-gray-200" />
                )}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  {team && (
                    <div className="flex items-center gap-2 mb-2">
                      <span>{COUNTRY_FLAGS[team.country]}</span>
                      <span className="text-sm font-semibold text-gray-900">{team.country} Team</span>
                      <span className="text-xs text-gray-400">Round {round}</span>
                    </div>
                  )}
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {content || <span className="text-gray-400 italic">No content written.</span>}
                  </p>
                  {handoffNote && (
                    <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-xs text-amber-700 font-semibold mb-1">Handoff Note →</p>
                      <p className="text-sm text-amber-900 italic">"{handoffNote}"</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {reflections && reflections.length > 0 && (
        <div className="card">
          <h3 className="font-display text-lg font-bold text-gray-900 mb-4">Team Reflections</h3>
          <div className="space-y-4">
            {reflections.map((r, i) => (
              <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span>{COUNTRY_FLAGS[r.country]}</span>
                  <span className="font-medium text-gray-900 text-sm">{r.name}</span>
                  <span className="text-gray-400 text-xs">· {r.role}</span>
                </div>
                {r.q1 && <ReflectionItem q="What changed most between Round 1 and Round 3?" a={r.q1} />}
                {r.q2 && <ReflectionItem q="What was the biggest communication challenge?" a={r.q2} />}
                {r.q3 && <ReflectionItem q="What would you do differently in a real international project?" a={r.q3} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ReflectionItem({ q, a }) {
  return (
    <div className="mb-2">
      <p className="text-xs text-gray-500 mb-0.5">{q}</p>
      <p className="text-sm text-gray-800">{a}</p>
    </div>
  );
}
