import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../socket';
import Timer from '../components/Timer';
import { extractText } from '../data/events';
import { BACKEND_URL } from '../config';

const COUNTRY_FLAGS = {
  Brazil: '🇧🇷', India: '🇮🇳', Germany: '🇩🇪',
  Japan: '🇯🇵', France: '🇫🇷', Nigeria: '🇳🇬'
};

const EVENTS = ['Press Conference', 'Product Launch', 'Internal Conference'];

export default function ObserverView() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [remaining, setRemaining] = useState(0);
  // workspaces keyed by `${instanceId}:${eventName}:${round}`
  const [workspaces, setWorkspaces] = useState({});
  const [handoffs, setHandoffs] = useState({});
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [activeInstance, setActiveInstance] = useState(0);

  const observerCode = localStorage.getItem('observerCode');
  const sessionId = localStorage.getItem('observerSessionId');

  // Load workspaces for the current round from REST, then keep live via socket
  const loadWorkspaces = async (sid, round) => {
    if (!round) return;
    try {
      const [wsRes, hnRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/sessions/${sid}/workspaces?round=${round}`),
        fetch(`${BACKEND_URL}/api/sessions/${sid}/handoffs`),
      ]);
      const wsData = await wsRes.json();
      const hnData = await hnRes.json();

      const wsMap = {};
      wsData.forEach(w => { wsMap[`${w.instance_id}:${w.event_name}:${w.round}`] = w.content; });
      setWorkspaces(wsMap);

      const hnMap = {};
      hnData.forEach(h => { hnMap[`${h.instance_id}:${h.event_name}:${h.from_round}`] = { content: h.content, submitted: !!h.submitted }; });
      setHandoffs(hnMap);
    } catch {}
  };

  useEffect(() => {
    if (!observerCode) { navigate('/observer'); return; }

    socket.connect();

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('observer:join', { facilitatorCode: observerCode });
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('observer:joined', ({ session: s, remaining: r }) => {
      setSession(s);
      setRemaining(r);
      loadWorkspaces(s.id, s.current_round);
    });

    socket.on('session:state', (s) => {
      setSession(prev => {
        // If round changed, reload all workspaces
        if (prev?.current_round !== s.current_round) {
          loadWorkspaces(s.id, s.current_round);
        }
        return s;
      });
    });

    socket.on('timer:update', ({ remaining: r }) => setRemaining(r));
    socket.on('timer:paused', ({ remaining: r }) => setRemaining(r));

    socket.on('workspace:updated', ({ instanceId, eventName, round, content }) => {
      setWorkspaces(prev => ({ ...prev, [`${instanceId}:${eventName}:${round}`]: content }));
    });

    socket.on('handoff:submitted', ({ instanceId, eventName, fromRound, teamId }) => {
      const key = `${instanceId}:${eventName}:${fromRound}`;
      setHandoffs(prev => ({ ...prev, [key]: { ...prev[key], submitted: true } }));
    });

    socket.on('handoff:updated', ({ instanceId, eventName, fromRound, content }) => {
      const key = `${instanceId}:${eventName}:${fromRound}`;
      setHandoffs(prev => ({ ...prev, [key]: { ...prev[key], content } }));
    });

    socket.on('game:debrief', () => {
      setSession(s => s ? { ...s, status: 'debrief' } : s);
    });

    socket.on('error', ({ message }) => setError(message));

    return () => {
      ['connect', 'disconnect', 'observer:joined', 'session:state', 'timer:update',
       'timer:paused', 'workspace:updated', 'handoff:submitted', 'handoff:updated',
       'game:debrief', 'error'].forEach(e => socket.off(e));
      socket.disconnect();
    };
  }, []);

  // Compute event assignment for a given instance + round
  const getAssignment = (instance, round) => {
    if (!round) return [];
    return (instance.teams || []).map((team, idx) => ({
      team,
      event: EVENTS[(idx + (round - 1)) % EVENTS.length],
    }));
  };

  if (error) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="card text-center max-w-sm">
          <p className="text-red-400 font-medium mb-4">{error}</p>
          <button onClick={() => navigate('/observer')} className="btn-primary">Back</button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="text-navy-400 text-center">
          <div className="text-2xl mb-3 animate-pulse">⟳</div>
          <p>Connecting to session...</p>
        </div>
      </div>
    );
  }

  const status = session.status;
  const round = session.current_round;
  const instances = session.instances || [];
  const currentInstance = instances[activeInstance];

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col">
      {/* Top bar */}
      <header className="bg-navy-900 border-b border-navy-700 px-5 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-display text-lg font-bold text-white">CrossWire</span>
          <span className="text-navy-600">·</span>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-navy-800 border border-navy-700">
            <span className="text-navy-400 text-xs">👁</span>
            <span className="text-navy-400 text-xs font-medium">Observer</span>
          </div>
          <StatusBadge status={status} round={round} />
        </div>

        <div className="flex items-center gap-4">
          {status === 'active' && round > 0 && (
            <Timer remaining={remaining} total={session.round_duration} compact />
          )}
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-500'}`}
            title={connected ? 'Live' : 'Disconnected'} />
        </div>
      </header>

      {/* Instance tabs (only if >1 instance) */}
      {instances.length > 1 && (
        <div className="bg-navy-900/50 border-b border-navy-700 px-5 flex gap-1 flex-shrink-0">
          {instances.map((inst, i) => (
            <button
              key={inst.id}
              onClick={() => setActiveInstance(i)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeInstance === i
                  ? 'border-amber-500 text-amber-500'
                  : 'border-transparent text-navy-400 hover:text-white'
              }`}
            >
              Instance {inst.instance_number}
            </button>
          ))}
        </div>
      )}

      {/* Waiting state */}
      {status === 'waiting' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center animate-fade-in">
            <div className="text-4xl mb-4">⏳</div>
            <h2 className="font-display text-2xl font-bold text-white mb-2">Waiting for session to start</h2>
            <p className="text-navy-400 text-sm">
              {instances.flatMap(i => i.teams).flatMap(t => t.members || []).length} participant{instances.flatMap(i => i.teams).flatMap(t => t.members || []).length !== 1 ? 's' : ''} joined so far
            </p>
            <ParticipantRoster instances={instances} />
          </div>
        </div>
      )}

      {/* Debrief state */}
      {status === 'debrief' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center animate-fade-in">
            <div className="text-4xl mb-4">✅</div>
            <h2 className="font-display text-2xl font-bold text-white mb-2">All rounds complete</h2>
            <p className="text-navy-400 text-sm">Session has moved to debrief.</p>
          </div>
        </div>
      )}

      {/* Active / handoff / paused — show workspaces */}
      {['active', 'paused', 'handoff'].includes(status) && currentInstance && (
        <main className="flex-1 overflow-auto p-5">
          {/* Round progress indicator */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex gap-2">
              {[1, 2, 3].map(r => (
                <div key={r} className={`h-1.5 w-12 rounded-full transition-colors ${
                  r < round ? 'bg-amber-500' : r === round ? 'bg-amber-500/60' : 'bg-navy-700'
                }`} />
              ))}
            </div>
            <span className="text-navy-400 text-xs">Round {round} of 3</span>
            {status === 'paused' && <span className="text-amber-400 text-xs font-medium">· Paused</span>}
            {status === 'handoff' && <span className="text-navy-400 text-xs font-medium">· Handoff in progress</span>}
          </div>

          {/* Team workspace grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {getAssignment(currentInstance, round).map(({ team, event }) => {
              const wsKey = `${currentInstance.id}:${event}:${round}`;
              const hnKey = `${currentInstance.id}:${event}:${round}`;
              const content = workspaces[wsKey] || '';
              const handoff = handoffs[hnKey];
              const members = team.members || [];
              const onlineCount = members.filter(m => m.socket_id).length;

              return (
                <WorkspaceCard
                  key={team.id}
                  team={team}
                  event={event}
                  round={round}
                  content={content}
                  handoff={handoff}
                  memberCount={members.length}
                  onlineCount={onlineCount}
                />
              );
            })}
          </div>
        </main>
      )}

      {/* No round started yet but session not waiting */}
      {status !== 'waiting' && status !== 'debrief' && !['active', 'paused', 'handoff'].includes(status) && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-navy-500 text-sm">Session status: {status}</p>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function WorkspaceCard({ team, event, round, content, handoff, memberCount, onlineCount }) {
  const plainText = extractText(content);
  const charCount = plainText.length;
  const wordCount = plainText.trim() ? plainText.trim().split(/\s+/).length : 0;
  const isHandoffRound = round < 3;
  const handoffSubmitted = handoff?.submitted;
  const handoffContent = handoff?.content || '';

  return (
    <div className="bg-navy-900 border border-navy-700 rounded-xl flex flex-col overflow-hidden">
      {/* Card header */}
      <div className="px-4 py-3 border-b border-navy-700 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">{COUNTRY_FLAGS[team.country]}</span>
          <div>
            <div className="font-semibold text-white text-sm leading-tight">{team.country}</div>
            <div className="text-navy-500 text-xs">{event}</div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          {/* Online indicator */}
          <div className="flex items-center gap-1 text-xs text-navy-500">
            <div className={`w-1.5 h-1.5 rounded-full ${onlineCount > 0 ? 'bg-emerald-500' : 'bg-navy-600'}`} />
            {onlineCount}/{memberCount}
          </div>
          {/* Handoff indicator */}
          {isHandoffRound && (
            <div
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                handoffSubmitted
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : handoffContent
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-navy-700 text-navy-500'
              }`}
              title={handoffSubmitted ? 'Handoff note submitted' : handoffContent ? 'Handoff note in progress' : 'No handoff note yet'}
            >
              {handoffSubmitted ? '✓ Handoff' : handoffContent ? '✎ Handoff…' : 'No handoff'}
            </div>
          )}
        </div>
      </div>

      {/* Workspace content — render extracted plain text for readability */}
      <div className="flex-1 p-4 min-h-40 max-h-72 overflow-y-auto scrollbar-thin">
        {plainText ? (
          <p className="text-sm text-navy-200 whitespace-pre-wrap leading-relaxed">{plainText}</p>
        ) : (
          <p className="text-sm text-navy-600 italic">Nothing written yet...</p>
        )}
      </div>

      {/* Card footer — stats */}
      <div className="px-4 py-2 border-t border-navy-800 flex items-center justify-between flex-shrink-0">
        <div className="flex gap-3 text-xs text-navy-600">
          <span>{wordCount} word{wordCount !== 1 ? 's' : ''}</span>
          <span>{charCount} char{charCount !== 1 ? 's' : ''}</span>
        </div>
        {handoffSubmitted && handoffContent && (
          <div className="max-w-[55%] text-xs text-navy-400 truncate" title={handoffContent}>
            "{handoffContent}"
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status, round }) {
  const cfg = {
    waiting:  { cls: 'bg-navy-700 text-navy-400',         label: 'Waiting' },
    active:   { cls: 'bg-emerald-500/20 text-emerald-400', label: `Round ${round} · Live` },
    paused:   { cls: 'bg-amber-500/20 text-amber-400',    label: `Round ${round} · Paused` },
    handoff:  { cls: 'bg-blue-500/20 text-blue-400',      label: 'Handoff' },
    debrief:  { cls: 'bg-purple-500/20 text-purple-400',  label: 'Debrief' },
  }[status] || { cls: 'bg-navy-700 text-navy-400', label: status };

  return (
    <span className={`tag text-xs ${cfg.cls}`}>{cfg.label}</span>
  );
}

function ParticipantRoster({ instances }) {
  const allTeams = instances.flatMap(inst =>
    (inst.teams || []).map(t => ({ ...t, instanceNum: inst.instance_number }))
  );
  if (allTeams.every(t => (t.members || []).length === 0)) return null;

  return (
    <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl text-left">
      {allTeams.map(team => {
        const members = team.members || [];
        if (members.length === 0) return null;
        return (
          <div key={team.id} className="bg-navy-800 rounded-xl p-3 border border-navy-700">
            <div className="flex items-center gap-2 mb-2">
              <span>{COUNTRY_FLAGS[team.country]}</span>
              <span className="text-sm font-medium text-white">{team.country}</span>
              {instances.length > 1 && <span className="text-xs text-navy-500">· Inst. {team.instanceNum}</span>}
            </div>
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-1.5 text-xs text-navy-400 py-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
                {m.name}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
