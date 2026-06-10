import { useState } from 'react';

const COUNTRY_FLAGS = {
  Brazil: '🇧🇷', India: '🇮🇳', Germany: '🇩🇪',
  Japan: '🇯🇵', France: '🇫🇷', Nigeria: '🇳🇬'
};

export default function RoleCard({ participant, team, round, showReflection, onReflectionSubmit }) {
  const [reflection, setReflection] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const countryData = team?.countryData;
  const roleInstruction = countryData?.roles?.[participant?.role] || '';

  const handleSubmit = () => {
    if (!reflection.trim()) return;
    onReflectionSubmit?.(reflection);
    setSubmitted(true);
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="card flex-1">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <span className="text-3xl flex-shrink-0">{COUNTRY_FLAGS[team?.country] || '🏳'}</span>
          <div className="min-w-0">
            <div className="font-display font-bold text-white text-lg leading-tight truncate">{participant?.name}</div>
            <div className="text-amber-500 font-semibold text-sm">{participant?.role}</div>
            <div className="text-navy-400 text-xs mt-0.5">{team?.country} Team</div>
          </div>
        </div>

        {/* Behavior instruction — the main content */}
        <div className="border-t border-navy-700 pt-4">
          <p className="text-xs text-navy-400 uppercase tracking-wider font-medium mb-2">Your Character</p>
          <p className="text-navy-100 text-sm leading-relaxed">{roleInstruction}</p>
        </div>

        {/* Team communication style */}
        {countryData?.style && (
          <div className="mt-4 bg-navy-800 rounded-lg p-3">
            <p className="text-xs text-navy-500 uppercase tracking-wider font-medium mb-1">Team Style</p>
            <p className="text-navy-400 text-xs leading-relaxed">{countryData.style}</p>
          </div>
        )}

        {/* Hidden cultural norms — visible only to this team */}
        {countryData?.norms && (
          <div className="mt-3 bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
            <p className="text-xs text-purple-400 uppercase tracking-wider font-medium mb-1">Secret Protocol</p>
            <p className="text-purple-200 text-xs leading-relaxed">{countryData.norms}</p>
          </div>
        )}

        <p className="text-xs text-navy-600 italic mt-4 border-t border-navy-800 pt-3">
          Stay in character throughout the round.
        </p>
      </div>

      {/* Post-round reflection */}
      {showReflection && (
        <div className="card border-amber-500/30 bg-amber-500/5 animate-fade-in">
          <p className="text-xs text-amber-400 uppercase tracking-wider font-medium mb-2">Round Reflection</p>
          <p className="text-sm text-navy-200 mb-3">
            In one sentence — how did your communication style affect your team this round?
          </p>
          {submitted ? (
            <div className="text-sm text-emerald-400 font-medium">✓ Reflection saved</div>
          ) : (
            <>
              <textarea
                value={reflection}
                onChange={e => setReflection(e.target.value)}
                placeholder="Type your reflection..."
                rows={2}
                className="input-field resize-none text-sm mb-2"
                maxLength={200}
              />
              <button
                onClick={handleSubmit}
                disabled={!reflection.trim()}
                className="btn-primary text-sm px-4 py-2 w-full"
              >
                Submit
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
