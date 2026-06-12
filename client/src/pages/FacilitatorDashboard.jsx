import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import socket from '../socket';
import Timer from '../components/Timer';
import { BACKEND_URL } from '../config';

const COUNTRY_FLAGS = {
  Brazil: '🇧🇷', India: '🇮🇳', Germany: '🇩🇪',
  Japan: '🇯🇵', France: '🇫🇷', Nigeria: '🇳🇬'
};

const EVENTS = ['Press Conference', 'Product Launch', 'Internal Conference'];

export default function FacilitatorDashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [showCurveball, setShowCurveball] = useState(false);
  const [curveballMsg, setCurveballMsg] = useState('');
  const [error, setError] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const [handoffStatuses, setHandoffStatuses] = useState({});
  const [notes, setNotes] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'
  const [showGuide, setShowGuide] = useState(false);
  const saveTimer = useRef(null);

  const facilitatorCode = localStorage.getItem('facilitatorCode');
  const sessionId = localStorage.getItem('sessionId');

  useEffect(() => {
    if (!facilitatorCode || !sessionId) {
      navigate('/facilitator/setup');
      return;
    }

    // Load initial state via HTTP
    fetch(`${BACKEND_URL}/api/sessions/facilitator/${facilitatorCode}`)
      .then(r => r.json())
      .then(s => {
        setSession(s);
      })
      .catch(() => setError('Could not load session'));

    socket.connect();

    socket.on('connect', () => {
      socket.emit('facilitator:join', { facilitatorCode });
    });

    socket.on('session:joined', ({ session: s, remaining: r }) => {
      setSession(s);
      setRemaining(r);
      setNotes(s.facilitator_notes || '');
    });

    socket.on('session:state', (s) => {
      setSession(s);
    });

    socket.on('timer:update', ({ remaining: r }) => {
      setRemaining(r);
    });

    socket.on('timer:paused', ({ remaining: r }) => {
      setRemaining(r);
    });

    socket.on('handoff:submitted', ({ instanceId, eventName, fromRound, teamId }) => {
      const key = `${instanceId}-${eventName}-${fromRound}`;
      setHandoffStatuses(prev => ({ ...prev, [key]: true }));
    });

    socket.on('game:debrief', () => {
      // Facilitator stays on dashboard in debrief mode
    });

    socket.on('error', ({ message }) => setError(message));

    return () => {
      socket.off('connect');
      socket.off('session:joined');
      socket.off('session:state');
      socket.off('timer:update');
      socket.off('timer:paused');
      socket.off('handoff:submitted');
      socket.off('game:debrief');
      socket.off('error');
      socket.disconnect();
    };
  }, []);

  const handleStartRound = () => {
    socket.emit('facilitator:start_round', { sessionId });
  };

  const handlePause = () => {
    socket.emit('facilitator:pause', { sessionId });
  };

  const handleResume = () => {
    socket.emit('facilitator:resume', { sessionId });
  };

  const handleTriggerHandoff = () => {
    socket.emit('facilitator:trigger_handoff', { sessionId });
  };

  const handleSkipDebrief = () => {
    socket.emit('facilitator:skip_debrief', { sessionId });
  };

  const handleNotesChange = (value) => {
    setNotes(value);
    setSaveStatus('saving');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await fetch(`${BACKEND_URL}/api/sessions/${sessionId}/notes`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: value }),
        });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('idle');
      }
    }, 1200);
  };

  const handleBroadcast = () => {
    if (!broadcastMsg.trim()) return;
    socket.emit('facilitator:broadcast', { sessionId, message: broadcastMsg });
    setBroadcastMsg('');
    setShowBroadcast(false);
  };

  const CURVEBALL_PRESETS = [
    'Budget just cut by 20% — revise your materials list immediately.',
    'Key speaker cancelled 2 hours before. Find a replacement now.',
    'Venue changed — you\'re now hosting outdoors. Adapt your plans.',
    'An executive just added themselves to the guest list unexpectedly.',
    'Social media is already reporting the event. Control the narrative.',
  ];

  const handleCurveball = (text) => {
    const msg = text || curveballMsg;
    if (!msg.trim()) return;
    socket.emit('facilitator:curveball', { sessionId, text: msg });
    setCurveballMsg('');
    setShowCurveball(false);
  };

  const getAssignments = (instance, round) => {
    if (!round || round === 0) return [];
    const events = session?.config?.customEvents || EVENTS;
    const teams = instance.teams || [];
    return teams.map((team, teamIdx) => {
      const eventIdx = (teamIdx + (round - 1)) % events.length;
      return { team, event: events[eventIdx] };
    });
  };

  const status = session?.status;
  const round = session?.current_round || 0;

  if (fullscreen && session) {
    return <ProjectorCodesView session={session} onClose={() => setFullscreen(false)} />;
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="text-navy-400 text-center">
          <div className="text-2xl mb-3 animate-pulse">⟳</div>
          <p>Loading session...</p>
          {error && <p className="text-red-400 mt-2 text-sm">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col">
      {/* Top bar */}
      <header className="bg-navy-900 border-b border-navy-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="font-display text-xl font-bold text-white">CrossWire</span>
          <span className="text-navy-500">·</span>
          <span className="text-navy-400 text-sm">Facilitator Dashboard</span>
          <span className={`tag text-xs ml-2 ${
            status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
            status === 'paused' ? 'bg-amber-500/20 text-amber-400' :
            status === 'debrief' ? 'bg-purple-500/20 text-purple-400' :
            'bg-navy-700 text-navy-400'
          }`}>
            {status === 'waiting' ? 'Waiting' :
             status === 'active' ? `Round ${round} Active` :
             status === 'paused' ? `Round ${round} Paused` :
             status === 'handoff' ? 'Handoff' :
             status === 'debrief' ? 'Debrief' : status}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {status === 'active' && (
            <Timer remaining={remaining} total={session.round_duration} compact />
          )}
          <button onClick={() => setShowGuide(!showGuide)} className="btn-ghost text-sm px-3 py-2">
            📖 Guide
          </button>
          <button onClick={() => setFullscreen(true)} className="btn-ghost text-sm px-3 py-2">
            📽 Codes
          </button>
          <button onClick={() => setShowBroadcast(!showBroadcast)} className="btn-ghost text-sm px-3 py-2">
            📢 Broadcast
          </button>
          {(status === 'active' || status === 'paused') && (
            <button onClick={() => setShowCurveball(!showCurveball)} className="btn-ghost text-sm px-3 py-2 border-red-500/40 text-red-400 hover:bg-red-500/10">
              ⚡ Curveball
            </button>
          )}
        </div>
      </header>

      {/* Facilitator Guide panel */}
      {showGuide && <FacilitatorGuide status={status} round={round} onClose={() => setShowGuide(false)} />}

      {/* Broadcast panel */}
      {showBroadcast && (
        <div className="bg-navy-800 border-b border-navy-700 px-6 py-3 flex gap-3 animate-fade-in">
          <input
            value={broadcastMsg}
            onChange={e => setBroadcastMsg(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleBroadcast()}
            placeholder="Type a message to broadcast to all participants..."
            className="input-field flex-1 text-sm py-2"
            autoFocus
          />
          <button onClick={handleBroadcast} disabled={!broadcastMsg.trim()} className="btn-primary text-sm px-4 py-2">
            Send
          </button>
          <button onClick={() => setShowBroadcast(false)} className="text-navy-400 hover:text-white px-2">✕</button>
        </div>
      )}

      {/* Curveball panel */}
      {showCurveball && (
        <div className="bg-red-950/60 border-b border-red-900/50 px-6 py-4 animate-fade-in">
          <p className="text-xs text-red-400 uppercase tracking-wider font-medium mb-3">⚡ Fire a Curveball — visible to all participants immediately</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-3">
            {CURVEBALL_PRESETS.map((preset, i) => (
              <button
                key={i}
                onClick={() => handleCurveball(preset)}
                className="text-left text-xs text-red-200 bg-red-900/40 border border-red-800/50 rounded-lg px-3 py-2 hover:bg-red-800/50 transition-colors"
              >
                {preset}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <input
              value={curveballMsg}
              onChange={e => setCurveballMsg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCurveball()}
              placeholder="Or write a custom curveball..."
              className="input-field flex-1 text-sm py-2 border-red-800/50"
            />
            <button onClick={() => handleCurveball()} disabled={!curveballMsg.trim()} className="text-sm px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium disabled:opacity-40 transition-colors">
              Fire
            </button>
            <button onClick={() => setShowCurveball(false)} className="text-navy-400 hover:text-white px-2">✕</button>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Controls sidebar */}
        <aside className="lg:w-64 bg-navy-900/50 border-b lg:border-b-0 lg:border-r border-navy-700 p-5 flex flex-col gap-5 flex-shrink-0 lg:overflow-y-auto scrollbar-thin lg:h-full">
          {/* Master timer */}
          {round > 0 && (
            <div className="card">
              <p className="text-xs text-navy-400 uppercase tracking-wider font-medium mb-3">Round Timer</p>
              <Timer remaining={remaining} total={session.round_duration} />
              <p className="text-xs text-navy-500 mt-2">Round {round} of 3</p>
            </div>
          )}

          {/* Control buttons */}
          <div className="space-y-2">
            <p className="text-xs text-navy-400 uppercase tracking-wider font-medium">Controls</p>

            {(status === 'waiting' || status === 'handoff') && (
              <button onClick={handleStartRound} className="btn-primary w-full text-sm">
                {status === 'waiting' ? '▶ Start Round 1' : `▶ Start Round ${round + 1}`}
              </button>
            )}

            {status === 'active' && (
              <>
                <button onClick={handlePause} className="btn-secondary w-full text-sm">
                  ⏸ Pause Round
                </button>
                <button onClick={handleTriggerHandoff} className="btn-ghost w-full text-sm border-amber-500/40 text-amber-400 hover:bg-amber-500/10">
                  ⏭ Trigger Handoff
                </button>
              </>
            )}

            {status === 'paused' && (
              <button onClick={handleResume} className="btn-primary w-full text-sm">
                ▶ Resume Round
              </button>
            )}

            {(status === 'active' || status === 'paused' || status === 'handoff') && round === 3 && (
              <button onClick={handleSkipDebrief} className="btn-ghost w-full text-sm border-purple-500/40 text-purple-400 hover:bg-purple-500/10">
                → Skip to Debrief
              </button>
            )}

            {status === 'debrief' && (
              <button onClick={() => navigate('/debrief')} className="btn-primary w-full text-sm">
                Open Debrief View
              </button>
            )}
          </div>

          {/* Session info */}
          <div className="card text-xs space-y-2">
            <p className="text-navy-400 uppercase tracking-wider font-medium mb-1">Session</p>
            <div className="flex justify-between">
              <span className="text-navy-500">Instances</span>
              <span className="text-white">{session.instances?.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-navy-500">Round duration</span>
              <span className="text-white">{session.round_duration / 60}m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-navy-500">Participants</span>
              <span className="text-white">
                {session.instances?.flatMap(i => i.teams).flatMap(t => t.members || []).length}
              </span>
            </div>
          </div>

          {/* Facilitator notes */}
          <div className="flex flex-col gap-1.5 flex-1 min-h-0">
            <div className="flex items-center justify-between">
              <p className="text-xs text-navy-400 uppercase tracking-wider font-medium">
                Private Notes
              </p>
              <span className={`text-xs transition-opacity duration-300 ${
                saveStatus === 'saved'  ? 'text-emerald-500 opacity-100' :
                saveStatus === 'saving' ? 'text-navy-500 opacity-100' :
                'opacity-0'
              }`}>
                {saveStatus === 'saving' ? 'Saving…' : '✓ Saved'}
              </span>
            </div>
            <textarea
              value={notes}
              onChange={e => handleNotesChange(e.target.value)}
              placeholder="Jot observations here — not visible to participants…"
              className="flex-1 min-h-32 input-field resize-none text-xs leading-relaxed scrollbar-thin"
              spellCheck={false}
            />
          </div>
        </aside>

        {/* Instance panels */}
        <main className="flex-1 p-5 overflow-y-auto scrollbar-thin">
          <div className="grid gap-5">
            {session.instances?.map(instance => {
              const assignments = getAssignments(instance, round);
              const totalParticipants = instance.teams.flatMap(t => t.members || []).length;

              return (
                <div key={instance.id} className="card">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-display font-bold text-white">Instance {instance.instance_number}</h3>
                      <p className="text-xs text-navy-400 mt-0.5">
                        {totalParticipants} participant{totalParticipants !== 1 ? 's' : ''} · {instance.teams.length} teams
                      </p>
                    </div>
                    <span className={`tag text-xs ${
                      instance.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                      'bg-navy-700 text-navy-400'
                    }`}>{instance.status}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {instance.teams.map((team, idx) => {
                      const a = assignments.find(a => a.team.id === team.id);
                      const handoffKey = a ? `${instance.id}-${a.event}-${round}` : null;
                      const handoffDone = handoffKey ? handoffStatuses[handoffKey] : false;

                      return (
                        <TeamPanel
                          key={team.id}
                          team={team}
                          assignment={a}
                          round={round}
                          handoffDone={handoffDone}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}

function TeamPanel({ team, assignment, round, handoffDone }) {
  const members = team.members || [];
  const isHandoffRound = round > 0 && round < 3;
  const [showQR, setShowQR] = useState(false);
  const joinUrl = `${window.location.origin}/join?code=${team.join_code}`;

  return (
    <div className="bg-navy-800 rounded-xl p-4 border border-navy-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{COUNTRY_FLAGS[team.country]}</span>
          <div>
            <div className="font-semibold text-white text-sm">{team.country}</div>
            <div className="text-xs text-navy-500 font-mono">{team.join_code}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isHandoffRound && (
            <div className={`w-2.5 h-2.5 rounded-full ${handoffDone ? 'bg-emerald-500' : 'bg-red-500/60'}`}
              title={handoffDone ? 'Handoff note submitted' : 'Handoff note pending'}
            />
          )}
          <button
            onClick={() => setShowQR(v => !v)}
            className="text-navy-500 hover:text-amber-400 transition-colors text-xs px-1.5 py-0.5 rounded border border-navy-700 hover:border-amber-500/50"
            title="Toggle QR code"
          >
            QR
          </button>
        </div>
      </div>

      {showQR && (
        <div className="flex flex-col items-center py-3 mb-3 bg-navy-900 rounded-xl border border-navy-700 animate-fade-in">
          <div className="bg-white p-2.5 rounded-lg mb-2">
            <QRCodeSVG value={joinUrl} size={96} level="M" />
          </div>
          <span className="font-display text-lg font-bold tracking-widest text-amber-500">{team.join_code}</span>
          <span className="text-xs text-navy-500 mt-0.5">scan to join</span>
        </div>
      )}

      {assignment && (
        <div className="text-xs text-navy-400 bg-navy-700/50 rounded-lg px-3 py-2 mb-3">
          Working on: <span className="text-white font-medium">{assignment.event}</span>
        </div>
      )}

      <div className="space-y-1">
        {members.length === 0 ? (
          <p className="text-xs text-navy-600 italic">No members yet</p>
        ) : (
          members.map(m => (
            <div key={m.id} className="flex items-center gap-2 text-xs">
              <div className={`w-1.5 h-1.5 rounded-full ${m.socket_id ? 'bg-emerald-500' : 'bg-navy-600'}`} />
              <span className="text-navy-300">{m.name}</span>
              <span className="text-navy-500">· {m.role}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ProjectorCodesView({ session, onClose }) {
  const allTeams = session.instances?.flatMap(inst =>
    inst.teams.map(team => ({ ...team, instanceNum: inst.instance_number, memberCount: (team.members || []).length }))
  ) ?? [];

  const cols = allTeams.length <= 3 ? allTeams.length : allTeams.length <= 6 ? 3 : 4;

  return (
    <div className="fixed inset-0 bg-navy-950 z-50 flex flex-col items-center justify-center p-8 overflow-auto">
      <button onClick={onClose} className="absolute top-5 right-6 text-navy-500 hover:text-white text-sm transition-colors">
        Exit ✕
      </button>

      <div className="font-display text-4xl font-bold text-white mb-1 text-center">CrossWire</div>
      <div className="text-navy-400 text-base mb-8">Scan or type your team's code to join</div>

      <div
        className="grid gap-5 w-full max-w-5xl"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {allTeams.map(team => {
          const joinUrl = `${window.location.origin}/join?code=${team.join_code}`;
          return (
            <div key={team.id} className="bg-navy-900 border border-navy-700 rounded-2xl p-5 flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{COUNTRY_FLAGS[team.country]}</span>
                <div className="text-left">
                  <div className="font-display font-bold text-white text-base">{team.country}</div>
                  {session.instances?.length > 1 && (
                    <div className="text-navy-500 text-xs">Instance {team.instanceNum}</div>
                  )}
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl">
                <QRCodeSVG value={joinUrl} size={128} level="M" />
              </div>

              <div className="font-display text-3xl font-bold tracking-widest text-amber-500">{team.join_code}</div>

              <div className="text-xs text-navy-500">
                {team.memberCount}/6 joined
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 text-navy-600 text-sm">
        {window.location.origin}/join
      </div>
    </div>
  );
}

// ── Facilitator Guide ─────────────────────────────────────────────────────────

const GUIDE_SECTIONS = [
  {
    id: 'brief',
    phase: 'Before you start',
    color: 'border-blue-500 bg-blue-50',
    headerColor: 'bg-blue-500 text-white',
    items: [
      { title: 'Welcome & framing', body: 'Tell participants: "You\'re about to experience what happens when global teams hand off work. Each team has a country persona with a distinct communication style. Your job is to stay in character."' },
      { title: 'Don\'t over-explain', body: 'Resist explaining the twist upfront. Let some confusion happen naturally — the communication breakdowns are the learning.' },
      { title: 'Team setup', body: 'Show the QR codes (📽 Codes). Have each team scan and join before starting Round 1. Wait until all teams show members in the dashboard.' },
      { title: 'Remind them', body: '"You\'ll have 3 rounds. After each round you write a handoff note for the next team. The handoff note box appears automatically near the end."' },
    ]
  },
  {
    id: 'round',
    phase: 'During each round',
    color: 'border-amber-500 bg-amber-50',
    headerColor: 'bg-amber-500 text-white',
    items: [
      { title: 'Start the round', body: 'Click "Start Round" when everyone is ready and in the app. The timer starts immediately.' },
      { title: 'Let them struggle', body: 'Don\'t help teams figure out what to write — ambiguity is the point. Watch for teams that are confused about their role or event.' },
      { title: 'Watch the dashboard', body: 'Green dots = online. Red dot next to a team = handoff note not submitted. Handoff notes unlock automatically in the final 90 seconds.' },
      { title: 'Curveballl (optional)', body: 'Use ⚡ Curveball sparingly — max 1 per round. Best mid-round when teams are in flow. Choose one that creates coordination tension (budget cut, venue change).' },
      { title: 'Trigger handoff', body: 'Once all teams\' handoff notes are submitted (or time runs out), click "Trigger Handoff". Teams see a 10-second transition screen before the next round.' },
    ]
  },
  {
    id: 'debrief',
    phase: 'Debrief (after Round 3)',
    color: 'border-purple-500 bg-purple-50',
    headerColor: 'bg-purple-500 text-white',
    items: [
      { title: 'Opening question', body: '"Look at your event from Round 1 to Round 3 — what changed? What got dropped or distorted?"' },
      { title: 'Communication question', body: '"When did you feel frustrated with the previous team\'s handoff? What were you expecting that wasn\'t there?"' },
      { title: 'Cultural angle', body: '"How did your country\'s communication style show up in what you wrote? Did any team\'s style make collaboration harder?"' },
      { title: 'Transfer question', body: '"What would you do differently in a real international project? What structures or norms would help?"' },
      { title: 'Key insight to draw out', body: 'The most common failure: teams assume the next team will understand what they left implicit. The handoff note is where assumptions live — and break.' },
    ]
  },
  {
    id: 'tips',
    phase: 'Tips & common issues',
    color: 'border-gray-400 bg-gray-50',
    headerColor: 'bg-gray-600 text-white',
    items: [
      { title: 'Teams not filling in the workspace', body: 'Remind them the workspace is collaborative — all team members can type at once. If one person is doing everything, call it out.' },
      { title: 'Participants confused about their role', body: 'Direct them to the Role Card on the left side. The character description tells them HOW to behave, not just what to do.' },
      { title: 'Handoff note too short', body: 'The app requires at least 20 words. If teams submit short notes, call it out in the debrief — "What did you leave out, and why?"' },
      { title: 'Timer management', body: 'You can pause mid-round with ⏸ Pause if you need to address the group. Use Trigger Handoff if a round is running long and teams are done.' },
    ]
  }
];

function FacilitatorGuide({ status, round, onClose }) {
  const [activeSection, setActiveSection] = useState('brief');

  const suggestedSection =
    status === 'waiting' ? 'brief' :
    status === 'active' || status === 'paused' ? 'round' :
    status === 'debrief' ? 'debrief' : 'brief';

  const section = GUIDE_SECTIONS.find(s => s.id === activeSection) || GUIDE_SECTIONS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-navy-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-display text-lg font-bold text-white">Facilitator Guide</h2>
            <p className="text-gray-400 text-xs mt-0.5">How to run CrossWire end-to-end</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-lg px-2">✕</button>
        </div>

        {/* Phase tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50 flex-shrink-0 overflow-x-auto">
          {GUIDE_SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`px-4 py-3 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 ${
                activeSection === s.id
                  ? 'border-amber-500 text-amber-700 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {s.phase}
              {s.id === suggestedSection && activeSection !== s.id && (
                <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 inline-block align-middle" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className={`rounded-xl border-l-4 px-4 py-3 mb-5 ${section.color}`}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{section.phase}</p>
          </div>
          <div className="space-y-4">
            {section.items.map((item, i) => (
              <div key={i} className="flex gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${section.headerColor}`}>
                  {i + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-0.5">{item.title}</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
