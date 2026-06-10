import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateSessionPDF } from '../utils/exportPDF';
import AnalyticsPanel from '../components/AnalyticsPanel';
import { parseContent, EVENTS_DATA } from '../data/events';
import socket from '../socket';
import { BACKEND_URL } from '../config';

const COUNTRY_FLAGS = {
  Brazil: '🇧🇷', India: '🇮🇳', Germany: '🇩🇪',
  Japan: '🇯🇵', France: '🇫🇷', Nigeria: '🇳🇬'
};

const REFLECTION_QUESTIONS = [
  'What changed most between Round 1 and Round 3 of your event?',
  'What was the biggest communication challenge your team faced?',
  'What would you do differently in a real international project?'
];

export default function Debrief() {
  const navigate = useNavigate();
  const [debriefData, setDebriefData] = useState(null);
  const [activeInstance, setActiveInstance] = useState(0);
  const [reflections, setReflections] = useState({ q1: '', q2: '', q3: '' });
  const [reflectionSaved, setReflectionSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isFacilitator, setIsFacilitator] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [facilitatorNotes, setFacilitatorNotes] = useState('');
  const [analytics, setAnalytics] = useState(null);

  const sessionId = localStorage.getItem('sessionId');
  const participantId = localStorage.getItem('participantId');
  const facilitatorCode = localStorage.getItem('facilitatorCode');
  const instanceId = localStorage.getItem('debriefInstanceId');

  useEffect(() => {
    const isFac = Boolean(facilitatorCode);
    setIsFacilitator(isFac);

    if (!sessionId) {
      navigate('/');
      return;
    }

    fetch(`${BACKEND_URL}/api/sessions/${sessionId}/debrief`)
      .then(r => r.json())
      .then(({ instances, facilitatorNotes }) => {
        setDebriefData(instances);
        setFacilitatorNotes(facilitatorNotes || '');
        if (instanceId && !isFac) {
          const idx = instances.findIndex(d => d.instance.id === instanceId);
          setActiveInstance(Math.max(0, idx));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));

    if (isFac) {
      fetch(`${BACKEND_URL}/api/sessions/${sessionId}/analytics`)
        .then(r => r.json())
        .then(setAnalytics)
        .catch(() => {});
    }

    // Participants listen for session close
    if (!isFac) {
      socket.connect();
      socket.on('connect', () => {
        const joinCode = localStorage.getItem('joinCode');
        const name = localStorage.getItem('participantName');
        if (joinCode && name) socket.emit('participant:join', { joinCode, name });
      });
      socket.on('game:end', () => navigate('/end'));
      return () => {
        socket.off('game:end');
        socket.off('connect');
        socket.disconnect();
      };
    }
  }, []);

  const handleReflectionChange = (key, val) => {
    setReflections(prev => ({ ...prev, [key]: val }));
  };

  const handleReflectionSubmit = async () => {
    if (!participantId || !sessionId) return;

    const instData = debriefData?.[activeInstance];
    if (!instData) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/sessions/${sessionId}/reflections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId,
          instanceId: instData.instance.id,
          ...reflections
        })
      });
      if (res.ok) setReflectionSaved(true);
    } catch {}

    setReflectionSaved(true);
  };

  const handleExportPDF = async () => {
    if (!debriefData || exporting) return;
    setExporting(true);
    try {
      generateSessionPDF(debriefData, sessionId, facilitatorNotes);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="text-navy-400">Loading debrief...</div>
      </div>
    );
  }

  if (fullscreen && isFacilitator && debriefData) {
    return <MasterDebriefView data={debriefData} onClose={() => setFullscreen(false)} onExport={handleExportPDF} exporting={exporting} />;
  }

  const currentInstData = debriefData?.[activeInstance];

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col">
      {/* Header */}
      <header className="bg-navy-900 border-b border-navy-700 px-6 py-4 flex items-center justify-between">
        <div>
          <span className="font-display text-xl font-bold text-white">CrossWire</span>
          <span className="text-navy-500 mx-2">·</span>
          <span className="text-navy-400 text-sm">Debrief</span>
        </div>
        <div className="flex gap-3">
          {isFacilitator && (
            <>
              <button onClick={() => setFullscreen(true)} className="btn-ghost text-sm px-4 py-2">
                📊 Master View
              </button>
              <button
                onClick={() => {
                  if (confirm('Close the session? All participants will see the end card.')) {
                    socket.connect();
                    socket.on('connect', () => socket.emit('facilitator:join', { facilitatorCode }));
                    socket.emit('session:close', { sessionId });
                    navigate('/end');
                  }
                }}
                className="btn-ghost text-sm px-4 py-2 border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                ✕ Close Session
              </button>
            </>
          )}
          <button
            onClick={handleExportPDF}
            disabled={exporting || !debriefData}
            className="btn-primary text-sm px-4 py-2 flex items-center gap-2"
          >
            {exporting ? (
              <>
                <span className="inline-block w-3.5 h-3.5 border-2 border-navy-950/30 border-t-navy-950 rounded-full animate-spin" />
                Generating…
              </>
            ) : (
              '↓ Export PDF'
            )}
          </button>
        </div>
      </header>

      {/* Instance tabs */}
      {debriefData && debriefData.length > 1 && (
        <div className="bg-navy-900/50 border-b border-navy-700 px-6 flex gap-1">
          {debriefData.map((d, i) => (
            <button
              key={i}
              onClick={() => setActiveInstance(i)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeInstance === i
                  ? 'border-amber-500 text-amber-500'
                  : 'border-transparent text-navy-400 hover:text-white'
              }`}
            >
              Instance {d.instance.instance_number}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-8 space-y-8">
        {/* Event evolution */}
        {currentInstData?.eventData.map(({ eventName, rounds }) => (
          <EventEvolution key={eventName} eventName={eventName} rounds={rounds} />
        ))}

        {/* Reflection section (participants only) */}
        {!isFacilitator && !reflectionSaved && (
          <div className="card border-amber-500/30 animate-fade-in">
            <h3 className="font-display text-lg font-bold text-white mb-5">Individual Reflection</h3>
            <div className="space-y-5">
              {REFLECTION_QUESTIONS.map((q, i) => (
                <div key={i}>
                  <label className="block text-sm font-medium text-navy-300 mb-2">{q}</label>
                  <textarea
                    value={reflections[`q${i + 1}`]}
                    onChange={e => handleReflectionChange(`q${i + 1}`, e.target.value)}
                    rows={2}
                    className="input-field resize-none text-sm"
                    placeholder="Your answer..."
                    maxLength={500}
                  />
                </div>
              ))}
            </div>
            <button
              onClick={handleReflectionSubmit}
              disabled={!reflections.q1 || !reflections.q2 || !reflections.q3}
              className="btn-primary w-full mt-5"
            >
              Submit Reflections
            </button>
          </div>
        )}

        {reflectionSaved && (
          <div className="card border-emerald-500/30 bg-emerald-500/5 text-center animate-fade-in">
            <div className="text-2xl mb-2">✓</div>
            <p className="font-medium text-emerald-400">Reflections submitted. Thank you!</p>
          </div>
        )}

        {/* Analytics panel — facilitator only */}
        {isFacilitator && analytics && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="font-display text-xl font-bold text-white">Session Analytics</h2>
              <div className="h-px flex-1 bg-navy-700" />
            </div>
            <AnalyticsPanel data={analytics} />
          </div>
        )}

        {/* Facilitator reflections view */}
        {isFacilitator && currentInstData?.reflections?.length > 0 && (
          <div className="card">
            <h3 className="font-display text-lg font-bold text-white mb-4">Participant Reflections</h3>
            <div className="space-y-4">
              {currentInstData.reflections.map((r, i) => (
                <div key={i} className="bg-navy-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span>{COUNTRY_FLAGS[r.country]}</span>
                    <span className="font-medium text-white text-sm">{r.name}</span>
                    <span className="text-navy-500 text-xs">· {r.role}</span>
                  </div>
                  {r.q1 && <p className="text-xs text-navy-400 mb-0.5">Change observed</p>}
                  {r.q1 && <p className="text-sm text-navy-200 mb-2">{r.q1}</p>}
                  {r.q2 && <p className="text-xs text-navy-400 mb-0.5">Biggest challenge</p>}
                  {r.q2 && <p className="text-sm text-navy-200 mb-2">{r.q2}</p>}
                  {r.q3 && <p className="text-xs text-navy-400 mb-0.5">Would do differently</p>}
                  {r.q3 && <p className="text-sm text-navy-200">{r.q3}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EventEvolution({ eventName, rounds }) {
  const eventDef = EVENTS_DATA[eventName];
  return (
    <div className="card">
      <h3 className="font-display text-xl font-bold text-amber-500 mb-6">{eventName}</h3>
      <div className="space-y-4">
        {rounds.map(({ round, team, content, handoffNote, handoffSubmitted }) => {
          const parsed = parseContent(content);
          const hasContent = content && content.trim();
          return (
            <div key={round} className="relative">
              {round < 3 && (
                <div className="absolute left-4 top-14 bottom-0 w-px bg-navy-700 z-0" />
              )}
              <div className="relative z-10 flex gap-4">
                <div className="w-8 h-8 rounded-full bg-navy-800 border border-navy-600 flex items-center justify-center text-sm font-display font-bold text-navy-300 flex-shrink-0 mt-1">
                  {round}
                </div>
                <div className="flex-1 pb-4">
                  {team && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{COUNTRY_FLAGS[team.country]}</span>
                      <span className="font-semibold text-white text-sm">{team.country} Team</span>
                      <span className="text-navy-500 text-xs">Round {round}</span>
                    </div>
                  )}

                  {!hasContent ? (
                    <div className="bg-navy-800 rounded-xl p-4 border border-navy-700">
                      <p className="text-sm text-navy-600 italic">No content was written.</p>
                    </div>
                  ) : eventDef ? (
                    <div className="space-y-2">
                      {eventDef.tasks.map(task => (
                        <DebriefTaskBlock key={task.id} task={task} content={parsed} />
                      ))}
                    </div>
                  ) : (
                    <div className="bg-navy-800 rounded-xl p-4 border border-navy-700">
                      <p className="text-sm text-navy-200 whitespace-pre-wrap leading-relaxed">{content}</p>
                    </div>
                  )}

                  {handoffNote && round < 3 && (
                    <div className="mt-2 ml-4 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-amber-400 font-medium uppercase tracking-wider">Handoff Note</span>
                        {!handoffSubmitted && <span className="text-xs text-red-400">(auto-saved)</span>}
                      </div>
                      <p className="text-sm text-navy-200 italic">"{handoffNote}"</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DebriefTaskBlock({ task, content }) {
  if (task.type === 'table') {
    const rows = (content[task.id] || []).filter(r => r.c0 || r.c1 || r.c2);
    if (!rows.length) return null;
    return (
      <div className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden">
        <div className="px-3 py-1.5 bg-navy-800 border-b border-navy-700">
          <span className="text-xs font-bold text-amber-500/80 uppercase tracking-wider">{task.label}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-navy-700">
                {task.columns.map(col => (
                  <th key={col} className="px-3 py-1.5 text-left text-navy-400 font-medium">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-navy-700/50 last:border-b-0">
                  {['c0','c1','c2'].map(col => (
                    <td key={col} className="px-3 py-2 text-navy-200 whitespace-pre-wrap">{row[col] || '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
  if (!content.task3?.trim()) return null;
  return (
    <div className="bg-navy-800 rounded-xl border border-navy-700 p-3">
      <p className="text-xs font-bold text-amber-500/80 uppercase tracking-wider mb-1">{task.label}</p>
      <p className="text-sm text-navy-200 whitespace-pre-wrap leading-relaxed">{content.task3}</p>
    </div>
  );
}

function MasterDebriefView({ data, onClose, onExport, exporting }) {
  return (
    <div className="fixed inset-0 bg-navy-950 z-50 overflow-auto">
      <div className="sticky top-0 bg-navy-900 border-b border-navy-700 px-6 py-3 flex items-center justify-between z-10">
        <span className="font-display text-lg font-bold text-white">Master Debrief — All Instances</span>
        <div className="flex gap-3">
          <button onClick={onExport} disabled={exporting} className="btn-primary text-sm px-4 py-2 flex items-center gap-2">
            {exporting ? <><span className="inline-block w-3 h-3 border-2 border-navy-950/30 border-t-navy-950 rounded-full animate-spin" />Generating…</> : '↓ Export PDF'}
          </button>
          <button onClick={onClose} className="text-navy-400 hover:text-white px-2">✕ Close</button>
        </div>
      </div>
      <div className="p-6">
        <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
          {data.map((instData, i) => (
            <div key={i}>
              <h2 className="font-display text-lg font-bold text-amber-500 mb-4">
                Instance {instData.instance.instance_number}
              </h2>
              {instData.eventData.map(({ eventName, rounds }) => (
                <div key={eventName} className="mb-6">
                  <h3 className="font-semibold text-white text-sm mb-2">{eventName}</h3>
                  {rounds.map(({ round, team, content }) => (
                    <div key={round} className="mb-2 bg-navy-800 rounded-lg p-3 text-xs">
                      {team && (
                        <div className="text-navy-400 mb-1">
                          R{round} · {COUNTRY_FLAGS[team.country]} {team.country}
                        </div>
                      )}
                      <p className="text-navy-200 line-clamp-3">{content || <span className="text-navy-600 italic">Empty</span>}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
