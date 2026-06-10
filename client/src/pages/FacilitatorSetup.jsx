import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';

const COUNTRY_LIST = ['Brazil', 'India', 'Germany', 'Japan', 'France', 'Nigeria'];

const COUNTRY_FLAGS = {
  Brazil: '🇧🇷', India: '🇮🇳', Germany: '🇩🇪',
  Japan: '🇯🇵', France: '🇫🇷', Nigeria: '🇳🇬'
};

const COUNTRY_STYLES = {
  Brazil: 'Relationship-first, high-context, expressive.',
  India: 'Hierarchical, indirect, consensus-oriented.',
  Germany: 'Direct, structured, precision-focused.',
  Japan: 'Harmony-preserving, very high-context, group consensus.',
  France: 'Intellectual, debate-oriented, eloquence valued.',
  Nigeria: 'Adaptive, entrepreneurial, relationship-driven.'
};

const DEFAULT_SUGGESTIONS = [
  ['Brazil', 'India', 'Germany'],
  ['Japan', 'France', 'Nigeria'],
  ['Brazil', 'Japan', 'Germany']
];

export default function FacilitatorSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [participantCount, setParticipantCount] = useState(18);
  const [config, setConfig] = useState(null);
  const [roundDuration, setRoundDuration] = useState(300);
  const [instanceCountries, setInstanceCountries] = useState([]);
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (participantCount >= 12 && participantCount <= 50) {
      fetch(`/api/config-preview?count=${participantCount}`)
        .then(r => r.json())
        .then(c => {
          setConfig(c);
          const suggestions = Array.from({ length: c.instances }, (_, i) =>
            DEFAULT_SUGGESTIONS[i] || DEFAULT_SUGGESTIONS[0]
          );
          setInstanceCountries(suggestions);
        })
        .catch(() => {});
    }
  }, [participantCount]);

  const handleCountryChange = (instanceIdx, teamIdx, country) => {
    setInstanceCountries(prev => {
      const next = prev.map(arr => [...arr]);
      if (!next[instanceIdx]) next[instanceIdx] = [];
      next[instanceIdx][teamIdx] = country;
      return next;
    });
  };

  const handleLaunch = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantCount,
          countries: instanceCountries,
          roundDuration
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSessionData(data);
      setStep(3);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const openDashboard = () => {
    localStorage.setItem('facilitatorCode', sessionData.facilitatorCode);
    localStorage.setItem('sessionId', sessionData.sessionId);
    navigate('/facilitator/dashboard');
  };

  if (fullscreen && sessionData) {
    return <ProjectorView sessionData={sessionData} onClose={() => setFullscreen(false)} onDashboard={openDashboard} />;
  }

  return (
    <div className="min-h-screen bg-navy-950 px-6 py-12">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <button onClick={() => navigate('/')} className="text-navy-400 hover:text-white text-sm flex items-center gap-2 mb-6 transition-colors">
            ← Back
          </button>
          <div className="flex items-center gap-3 mb-2">
            <span className="font-display text-2xl font-bold text-white">CrossWire</span>
            <span className="text-navy-500">·</span>
            <span className="text-navy-400">Facilitator Setup</span>
          </div>
          {/* Step indicators */}
          <div className="flex items-center gap-2 mt-4">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  step === s ? 'bg-amber-500 text-navy-950' :
                  step > s ? 'bg-navy-700 text-navy-300' :
                  'bg-navy-800 text-navy-500'
                }`}>{s}</div>
                {s < 3 && <div className={`h-px w-12 transition-colors ${step > s ? 'bg-amber-500/50' : 'bg-navy-800'}`} />}
              </div>
            ))}
            <span className="ml-3 text-navy-400 text-sm">
              {step === 1 ? 'Session Configuration' : step === 2 ? 'Country Selection' : 'Launch'}
            </span>
          </div>
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="animate-fade-in">
            <div className="card mb-6">
              <h2 className="font-display text-xl font-semibold text-white mb-1">Session Configuration</h2>
              <p className="text-navy-400 text-sm mb-6">Set the total number of participants and round duration.</p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-navy-300 mb-2">
                  Total participants <span className="text-navy-500">(12–50)</span>
                </label>
                <input
                  type="number"
                  min={12}
                  max={50}
                  value={participantCount}
                  onChange={e => setParticipantCount(Math.min(50, Math.max(12, parseInt(e.target.value) || 12)))}
                  className="input-field w-32 text-2xl font-display font-bold text-center"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-navy-300 mb-2">Round duration</label>
                <div className="flex gap-3 mb-4">
                  {[300, 600, 900].map(d => (
                    <button
                      key={d}
                      onClick={() => setRoundDuration(d)}
                      className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-all ${
                        roundDuration === d
                          ? 'bg-amber-500 text-navy-950'
                          : 'bg-navy-800 text-navy-300 hover:bg-navy-700'
                      }`}
                    >
                      {d / 60} min
                    </button>
                  ))}
                </div>
                <RoundTimeline duration={roundDuration} />
              </div>

              {config && (
                <div className="bg-navy-800 rounded-xl p-5 mt-4">
                  <p className="text-xs text-navy-400 uppercase tracking-wider font-medium mb-4">Suggested Configuration</p>
                  <ConfigDiagram config={config} />
                  <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-display font-bold text-amber-500">{config.instances}</div>
                      <div className="text-xs text-navy-400 mt-1">Parallel Instance{config.instances !== 1 ? 's' : ''}</div>
                    </div>
                    <div>
                      <div className="text-2xl font-display font-bold text-white">{config.teamsPerInstance}</div>
                      <div className="text-xs text-navy-400 mt-1">Teams / Instance</div>
                    </div>
                    <div>
                      <div className="text-2xl font-display font-bold text-white">{config.totalTeams}</div>
                      <div className="text-xs text-navy-400 mt-1">Total Teams</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button onClick={() => setStep(2)} disabled={!config} className="btn-primary w-full">
              Continue to Country Selection →
            </button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && config && (
          <div className="animate-fade-in">
            <div className="card mb-6">
              <h2 className="font-display text-xl font-semibold text-white mb-1">Country Selection</h2>
              <p className="text-navy-400 text-sm mb-6">Assign a country to each team slot across all instances.</p>

              {Array.from({ length: config.instances }).map((_, instIdx) => (
                <div key={instIdx} className={`${instIdx > 0 ? 'mt-8 pt-8 border-t border-navy-700' : ''}`}>
                  <p className="text-xs text-navy-400 uppercase tracking-wider font-medium mb-3">
                    Instance {instIdx + 1}
                  </p>
                  <div className="grid gap-3">
                    {Array.from({ length: config.teamsPerInstance }).map((_, teamIdx) => {
                      const selected = instanceCountries[instIdx]?.[teamIdx] || '';
                      return (
                        <div key={teamIdx} className="bg-navy-800 rounded-xl p-4">
                          <p className="text-xs text-navy-500 mb-2">Team {teamIdx + 1}</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {COUNTRY_LIST.map(c => (
                              <button
                                key={c}
                                onClick={() => handleCountryChange(instIdx, teamIdx, c)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                  selected === c
                                    ? 'bg-amber-500 text-navy-950'
                                    : 'bg-navy-700 text-navy-300 hover:bg-navy-600'
                                }`}
                              >
                                <span>{COUNTRY_FLAGS[c]}</span>
                                <span>{c}</span>
                              </button>
                            ))}
                          </div>
                          {selected && (
                            <p className="text-xs text-navy-400 mt-2">{COUNTRY_STYLES[selected]}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="btn-ghost flex-1">← Back</button>
              <button onClick={handleLaunch} disabled={loading} className="btn-primary flex-[2]">
                {loading ? 'Creating session...' : 'Generate Session Codes →'}
              </button>
            </div>
            {error && <p className="text-red-400 text-sm mt-3 text-center">{error}</p>}
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && sessionData && (
          <div className="animate-fade-in">
            <div className="card mb-6">
              <h2 className="font-display text-xl font-semibold text-white mb-1">Session Ready</h2>
              <p className="text-navy-400 text-sm mb-6">Share the join codes with participants. Session starts when you click "Start Session" in the dashboard.</p>

              <div className="bg-navy-800 rounded-xl p-5 mb-5">
                <p className="text-xs text-navy-400 uppercase tracking-wider font-medium mb-2">Facilitator Code</p>
                <div className="font-display text-4xl font-bold tracking-widest text-amber-500">
                  {sessionData.facilitatorCode}
                </div>
                <p className="text-xs text-navy-500 mt-1">Keep this private — use to access the facilitator dashboard</p>
              </div>

              <div>
                <p className="text-xs text-navy-400 uppercase tracking-wider font-medium mb-3">Team Join Codes</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {sessionData.allTeams.map(t => (
                    <div key={t.teamId} className="bg-navy-800 rounded-xl p-4 text-center">
                      <div className="text-xs text-navy-500 mb-1">
                        {COUNTRY_FLAGS[t.country]} {t.country} · Inst. {t.instanceNum}
                      </div>
                      <div className="font-display text-2xl font-bold tracking-widest text-white">
                        {t.joinCode}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setFullscreen(true)} className="btn-ghost flex-1">
                📽 Projector View
              </button>
              <button onClick={openDashboard} className="btn-primary flex-[2]">
                Open Dashboard →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function fmt(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s === 0 ? `${m}:00` : `${m}:${String(s).padStart(2, '0')}`;
}

function RoundTimeline({ duration }) {
  const handoffSecs = Math.min(180, Math.round(duration * 0.3));
  const warningSecs = 120;

  // Events ordered from earliest (most time remaining = earliest in the round)
  const events = [
    {
      label: 'Round starts',
      sublabel: `"You have ${duration / 60} minutes. Create your first plan."`,
      at: duration,
      icon: '▶',
      color: 'text-emerald-400',
    },
    // Insert handoff or warning depending on which comes first
    ...(handoffSecs > warningSecs
      ? [
          {
            label: 'Handoff notes open',
            sublabel: `${fmt(handoffSecs)} remaining — ${Math.round(handoffSecs / 60)} min to write`,
            at: handoffSecs,
            icon: '✎',
            color: 'text-amber-400',
          },
          {
            label: '"2 minutes left" warning',
            sublabel: 'Prompt to finalize handoff note',
            at: warningSecs,
            icon: '⚠',
            color: 'text-orange-400',
          },
        ]
      : [
          {
            label: '"2 minutes left" warning',
            sublabel: 'Prompt to wrap up and prepare handoff note',
            at: warningSecs,
            icon: '⚠',
            color: 'text-orange-400',
          },
          {
            label: 'Handoff notes open',
            sublabel: `${fmt(handoffSecs)} remaining`,
            at: handoffSecs,
            icon: '✎',
            color: 'text-amber-400',
          },
        ]
    ),
    {
      label: 'Round ends · handoff begins',
      sublabel: 'Work is locked, passed to next team',
      at: 0,
      icon: '⏹',
      color: 'text-navy-400',
    },
  ];

  return (
    <div className="bg-navy-800/60 rounded-xl border border-navy-700 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-navy-700">
        <p className="text-xs text-navy-400 uppercase tracking-wider font-medium">Round timeline</p>
      </div>
      <div className="px-4 py-3 space-y-0">
        {events.map((ev, i) => (
          <div key={i} className="flex items-start gap-3 relative">
            {/* Connector line */}
            {i < events.length - 1 && (
              <div className="absolute left-[13px] top-6 bottom-0 w-px bg-navy-700" />
            )}
            {/* Icon */}
            <div className={`w-6 h-6 flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5 relative z-10 ${ev.color}`}>
              {ev.icon}
            </div>
            {/* Text */}
            <div className="flex-1 pb-3">
              <div className="flex items-baseline gap-2">
                <span className={`text-sm font-medium ${ev.color}`}>{ev.label}</span>
                <span className="text-xs text-navy-600 font-mono">
                  {ev.at > 0 ? `(${fmt(ev.at)} left)` : `(${fmt(duration)} elapsed)`}
                </span>
              </div>
              <p className="text-xs text-navy-500 mt-0.5 italic">{ev.sublabel}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConfigDiagram({ config }) {
  return (
    <div className="flex gap-3 justify-center flex-wrap">
      {Array.from({ length: config.instances }).map((_, i) => (
        <div key={i} className="bg-navy-900 rounded-lg p-3 border border-navy-700">
          <p className="text-xs text-navy-500 text-center mb-2">Instance {i + 1}</p>
          <div className="flex gap-1.5 flex-wrap justify-center">
            {Array.from({ length: config.teamsPerInstance }).map((_, t) => (
              <div key={t} className="w-8 h-8 rounded bg-navy-700 flex items-center justify-center text-xs text-navy-300 font-medium">
                T{t + 1}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ProjectorView({ sessionData, onClose, onDashboard }) {
  const cols = sessionData.allTeams.length <= 3 ? sessionData.allTeams.length : 3;

  return (
    <div className="fixed inset-0 bg-navy-950 z-50 flex flex-col items-center justify-center p-8 overflow-auto">
      <button onClick={onClose} className="absolute top-5 right-6 text-navy-500 hover:text-white text-sm transition-colors">
        Exit Fullscreen ✕
      </button>

      <div className="font-display text-5xl font-bold text-white mb-1 text-center">CrossWire</div>
      <div className="text-navy-400 text-lg mb-10">Scan or type your team's code to join</div>

      <div
        className="grid gap-5 w-full max-w-4xl mb-10"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {sessionData.allTeams.map(t => {
          const joinUrl = `${window.location.origin}/join?code=${t.joinCode}`;
          return (
            <div key={t.teamId} className="bg-navy-900 border border-navy-700 rounded-2xl p-5 flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{COUNTRY_FLAGS[t.country]}</span>
                <div className="text-left">
                  <div className="font-display font-bold text-white text-base">{t.country}</div>
                  {sessionData.allTeams.some(x => x.instanceNum !== t.instanceNum) && (
                    <div className="text-navy-500 text-xs">Instance {t.instanceNum}</div>
                  )}
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl">
                <QRCodeSVG value={joinUrl} size={128} level="M" />
              </div>

              <div className="font-display text-3xl font-bold tracking-widest text-amber-500">{t.joinCode}</div>
            </div>
          );
        })}
      </div>

      <div className="text-navy-600 text-sm mb-6">{window.location.origin}/join</div>

      <button onClick={onDashboard} className="btn-primary text-lg px-10 py-4">
        Start Session →
      </button>
    </div>
  );
}
