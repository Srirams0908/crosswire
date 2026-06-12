import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../socket';
import { BACKEND_URL } from '../config';
import Timer from '../components/Timer';
import RoleCard from '../components/RoleCard';
import StructuredWorkspace from '../components/StructuredWorkspace';
import HandoffNote from '../components/HandoffNote';
import TransitionScreen from '../components/TransitionScreen';
import { playBeep, playDoubleBeep, playHandoffBeep } from '../utils/audio';

const COUNTRY_FLAGS = {
  Brazil: '🇧🇷', India: '🇮🇳', Germany: '🇩🇪',
  Japan: '🇯🇵', France: '🇫🇷', Nigeria: '🇳🇬'
};

export default function ParticipantGame() {
  const navigate = useNavigate();
  const [participant, setParticipant] = useState(null);
  const [team, setTeam] = useState(null);
  const [session, setSession] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const [workspaceContent, setWorkspaceContent] = useState('');
  const [handoffContent, setHandoffContent] = useState('');
  const [handoffSubmitted, setHandoffSubmitted] = useState(false);
  const [handoffVisible, setHandoffVisible] = useState(false);
  const [handoffSecs, setHandoffSecs] = useState(90);
  const [prompt, setPrompt] = useState(null);
  const [broadcast, setBroadcast] = useState(null);
  const [transition, setTransition] = useState(null);
  const [showReflection, setShowReflection] = useState(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [prevContent, setPrevContent] = useState('');
  const [prevHandoff, setPrevHandoff] = useState('');
  const [prevTeam, setPrevTeam] = useState('');
  const [incomingHandoff, setIncomingHandoff] = useState('');
  const wsUpdateRef = useRef(null);
  const currentAssignment = useRef(null);
  const firedBeeps = useRef(new Set());
  const sessionRef = useRef(null);
  const [curveball, setCurveball] = useState(null);

  const joinCode = localStorage.getItem('joinCode');
  const name = localStorage.getItem('participantName');
  const sessionId = localStorage.getItem('sessionId');

  useEffect(() => {
    if (!joinCode || !name) {
      navigate('/join');
      return;
    }

    socket.connect();

    socket.on('connect', () => {
      setConnected(true);
      const participantToken = localStorage.getItem('participantId') || undefined;
      socket.emit('participant:join', { joinCode, name, participantToken });
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('participant:joined', ({ participant: p, team: t, session: s, remaining: r, rejoined }) => {
      setParticipant(p);
      setTeam(t);
      setSession(s);
      sessionRef.current = s;
      setRemaining(r);
      localStorage.setItem('participantId', p.id);
      localStorage.setItem('teamId', t.id);
    });

    socket.on('session:state', (s) => {
      setSession(s);
      sessionRef.current = s;
    });

    socket.on('timer:update', ({ remaining: r, handoffSecs: hs }) => {
      setRemaining(r);
      if (hs) setHandoffSecs(hs);
    });

    socket.on('timer:paused', ({ remaining: r }) => {
      setRemaining(r);
    });

    socket.on('workspace:updated', ({ eventName, round, content, instanceId }) => {
      if (currentAssignment.current?.event === eventName &&
          currentAssignment.current?.round === round) {
        setWorkspaceContent(content);
      }
    });

    socket.on('handoff:updated', ({ content }) => {
      setHandoffContent(c => c !== content ? content : c);
    });

    socket.on('handoff:submitted', ({ teamId }) => {
      if (team && teamId === team.id) {
        setHandoffSubmitted(true);
      }
    });

    socket.on('handoff:unlock', () => {
      setHandoffVisible(true);
    });

    socket.on('game:prompt', ({ message }) => {
      setPrompt(message);
      setTimeout(() => setPrompt(null), 8000);
    });

    socket.on('game:handoff', ({ fromRound, toRound }) => {
      setShowReflection(true);
      setTransition({ fromRound, toRound });
      // Fetch the handoff note the current team is about to receive
      const sid = localStorage.getItem('sessionId');
      if (sid) {
        fetch(`${BACKEND_URL}/api/sessions/${sid}/handoffs`)
          .then(r => r.json())
          .then(handoffs => {
            const assign = currentAssignment.current;
            if (!assign) return;
            const teams = assign.instance.teams;
            const myIdx = teams.findIndex(t => t.id === localStorage.getItem('teamId'));
            const evts = sessionRef.current?.config?.customEvents || ['Press Conference', 'Product Launch', 'Internal Conference'];
            const nextEventIdx = (myIdx + toRound - 1) % evts.length;
            const nextEvent = evts[nextEventIdx];
            const hn = handoffs.find(h =>
              h.instance_id === assign.instance.id &&
              h.event_name === nextEvent &&
              h.from_round === fromRound
            );
            setIncomingHandoff(hn?.content || '');
          })
          .catch(() => {});
      }
    });

    socket.on('game:debrief', () => {
      navigate('/debrief');
    });

    socket.on('facilitator:broadcast', ({ message }) => {
      setBroadcast(message);
      setTimeout(() => setBroadcast(null), 10000);
    });

    socket.on('game:curveball', ({ text }) => {
      setCurveball(text);
    });

    socket.on('error', ({ message }) => {
      setError(message);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('participant:joined');
      socket.off('session:state');
      socket.off('timer:update');
      socket.off('timer:paused');
      socket.off('workspace:updated');
      socket.off('handoff:updated');
      socket.off('handoff:submitted');
      socket.off('handoff:unlock');
      socket.off('game:prompt');
      socket.off('game:handoff');
      socket.off('game:debrief');
      socket.off('facilitator:broadcast');
      socket.off('game:curveball');
      socket.off('error');
      socket.disconnect();
    };
  }, []);

  // Compute current assignment for this team
  const getMyAssignment = useCallback(() => {
    if (!session || !team) return null;
    const round = session.current_round;
    if (round === 0) return null;

    const myInstance = session.instances?.find(i => i.teams?.some(t => t.id === team.id));
    if (!myInstance) return null;

    const teams = myInstance.teams;
    const myIdx = teams.findIndex(t => t.id === team.id);
    if (myIdx === -1) return null;

    const events = session.config?.customEvents || ['Press Conference', 'Product Launch', 'Internal Conference'];
    const eventIdx = (myIdx + (round - 1)) % events.length;

    return { event: events[eventIdx], round, instance: myInstance };
  }, [session, team]);

  const assignment = getMyAssignment();

  useEffect(() => {
    if (assignment) {
      currentAssignment.current = assignment;
    }
  }, [assignment]);

  // Fetch workspace and handoff data when assignment changes
  useEffect(() => {
    if (!assignment || !session) return;
    const { event, round, instance } = assignment;

    setWorkspaceContent('');
    setPrevContent('');
    setPrevHandoff('');
    setPrevTeam('');
    setHandoffContent('');
    setHandoffSubmitted(false);
    setHandoffVisible(remaining <= handoffSecs && session.status === 'active');

    Promise.all([
      fetch(`${BACKEND_URL}/api/sessions/${session.id}/workspaces?round=${round}`).then(r => r.json()),
      fetch(`${BACKEND_URL}/api/sessions/${session.id}/handoffs`).then(r => r.json()),
      round > 1
        ? fetch(`${BACKEND_URL}/api/sessions/${session.id}/workspaces?round=${round - 1}`).then(r => r.json())
        : Promise.resolve([]),
    ]).then(([currWorkspaces, handoffs, prevWorkspaces]) => {
      // Current round workspace
      const currWs = currWorkspaces.find(w => w.instance_id === instance.id && w.event_name === event);
      setWorkspaceContent(currWs?.content || '');

      // Current round handoff note (for writing)
      if (round < 3) {
        const hn = handoffs.find(h => h.instance_id === instance.id && h.event_name === event && h.from_round === round);
        setHandoffContent(hn?.content || '');
        setHandoffSubmitted(hn?.submitted === 1 || hn?.submitted === true);
      }

      // Previous round data (read-only display above workspace)
      if (round > 1) {
        const prevWs = prevWorkspaces.find(w => w.instance_id === instance.id && w.event_name === event);
        setPrevContent(prevWs?.content || '');

        const prevHn = handoffs.find(h => h.instance_id === instance.id && h.event_name === event && h.from_round === round - 1);
        setPrevHandoff(prevHn?.content || '');

        // Identify the previous team from the workspace's team_id
        const prevTeamObj = prevWs ? instance.teams.find(t => t.id === prevWs.team_id) : null;
        setPrevTeam(prevTeamObj?.country || '');
      }
    }).catch(() => {});
  }, [assignment?.event, assignment?.round]);

  useEffect(() => {
    if (remaining <= handoffSecs && session?.status === 'active' && assignment?.round < 3) {
      setHandoffVisible(true);
    }
  }, [remaining, session?.status]);

  // Audio alerts at key time thresholds
  useEffect(() => {
    if (session?.status !== 'active' || !remaining) return;
    const THRESHOLDS = [
      { at: 300, fn: playDoubleBeep },
      { at: 120, fn: () => playBeep(520, 0.18, 0.3) },
      { at: 60,  fn: () => playBeep(660, 0.2, 0.35) },
    ];
    THRESHOLDS.forEach(({ at, fn }) => {
      if (remaining === at && !firedBeeps.current.has(at)) {
        firedBeeps.current.add(at);
        fn();
      }
    });
  }, [remaining, session?.status]);

  // Play handoff-unlock sound
  useEffect(() => {
    if (handoffVisible && !firedBeeps.current.has('handoff')) {
      firedBeeps.current.add('handoff');
      playHandoffBeep();
    }
  }, [handoffVisible]);

  // Reset beep tracking and curveball when round changes
  useEffect(() => {
    firedBeeps.current.clear();
    setCurveball(null);
  }, [session?.current_round]);

  const handleWorkspaceChange = useCallback((content) => {
    setWorkspaceContent(content);
    if (!assignment || !session || !team) return;
    clearTimeout(wsUpdateRef.current);
    wsUpdateRef.current = setTimeout(() => {
      socket.emit('workspace:update', {
        sessionId: session.id,
        instanceId: assignment.instance.id,
        eventName: assignment.event,
        round: assignment.round,
        teamId: team.id,
        content
      });
    }, 400);
  }, [assignment, session, team]);

  const handleHandoffChange = (content) => {
    setHandoffContent(content);
    if (!assignment || !session || !team) return;
    socket.emit('handoff:update', {
      sessionId: session.id,
      instanceId: assignment.instance.id,
      eventName: assignment.event,
      fromRound: assignment.round,
      teamId: team.id,
      content
    });
  };

  const handleHandoffSubmit = () => {
    if (!assignment || !session || !team) return;
    socket.emit('handoff:submit', {
      sessionId: session.id,
      instanceId: assignment.instance.id,
      eventName: assignment.event,
      fromRound: assignment.round,
      teamId: team.id,
      content: handoffContent
    });
    setHandoffSubmitted(true);
  };

  const handleReflection = (text) => {
    if (!participant || !session || !assignment) return;
    socket.emit('reflection:submit', {
      sessionId: session.id,
      instanceId: assignment.instance.id,
      participantId: participant.id,
      q1: text, q2: '', q3: ''
    });
  };

  const sessionStatus = session?.status;
  const isReadOnly = sessionStatus !== 'active';

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="card text-center max-w-sm">
          <p className="text-red-500 font-medium mb-4">{error}</p>
          <button onClick={() => navigate('/join')} className="btn-primary">Back to Join</button>
        </div>
      </div>
    );
  }

  if (!participant || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-center">
          <div className="text-2xl mb-3 animate-pulse">⟳</div>
          <p>Connecting to session...</p>
        </div>
      </div>
    );
  }

  if (sessionStatus === 'waiting') {
    return (
      <WaitingRoom participant={participant} team={team} session={session} connected={connected} />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Transition overlay */}
      {transition && sessionStatus === 'handoff' && (
        <TransitionScreen
          fromRound={transition.fromRound}
          toRound={transition.toRound}
          receivingTeam={getNextTeam(session, team)}
          handoffNote={incomingHandoff}
          onDone={() => setTransition(null)}
        />
      )}

      {/* Curveball banner */}
      {curveball && (
        <div className="bg-red-600 text-white text-center py-3 px-4 text-sm font-semibold animate-fade-in">
          ⚡ CURVEBALL: {curveball}
        </div>
      )}

      {/* Broadcast banner */}
      {broadcast && (
        <div className="bg-amber-500 text-white text-center py-2.5 px-4 text-sm font-medium animate-fade-in">
          📢 {broadcast}
          <button onClick={() => setBroadcast(null)} className="ml-3 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Prompt banner */}
      {prompt && (
        <div className="bg-blue-50 border-b border-blue-200 text-center py-2.5 px-4 text-sm text-blue-700 animate-fade-in">
          {prompt}
        </div>
      )}

      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-xl">{COUNTRY_FLAGS[team?.country]}</span>
          <div>
            <div className="font-display font-bold text-gray-900 text-sm">{team?.country} Team</div>
            <div className="text-gray-500 text-xs">{participant?.name} · <span className="text-amber-600 font-medium">{participant?.role}</span></div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {assignment && (
            <div className="text-right hidden sm:block">
              <div className="text-xs text-gray-400">Round {session.current_round} of 3</div>
              <div className="text-xs text-amber-600 font-semibold">{assignment.event}</div>
            </div>
          )}
          <div className="text-right">
            {session.current_round > 0 ? (
              <Timer remaining={remaining} total={session.round_duration} compact />
            ) : (
              <span className="text-gray-400 text-sm">Waiting...</span>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      {sessionStatus === 'debrief' ? (
        <DebriefRedirect navigate={navigate} sessionId={session.id} participant={participant} assignment={assignment} socket={socket} />
      ) : assignment ? (
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr_300px] gap-0 min-h-0 overflow-hidden">
          {/* Left: Role card */}
          <aside className="border-b lg:border-b-0 lg:border-r border-gray-200 overflow-y-auto scrollbar-thin bg-gray-50">
            <div className="px-3 py-2 border-b border-gray-200 bg-white">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Your Role</p>
            </div>
            <div className="p-4">
              <RoleCard
                participant={participant}
                team={team}
                round={session.current_round}
                showReflection={showReflection && sessionStatus === 'handoff'}
                onReflectionSubmit={handleReflection}
              />
            </div>
          </aside>

          {/* Centre: Workspace */}
          <div className="overflow-y-auto scrollbar-thin bg-white">
            <div className="px-4 py-2 border-b border-gray-200 bg-white sticky top-0 z-10">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Event Workspace</p>
            </div>
            <div className="p-4">
              <StructuredWorkspace
                eventName={assignment.event}
                round={session.current_round}
                content={workspaceContent}
                prevContent={prevContent}
                prevHandoff={prevHandoff}
                prevTeam={prevTeam}
                onChange={handleWorkspaceChange}
                readOnly={isReadOnly}
              />
            </div>
          </div>

          {/* Right: Handoff note */}
          <aside className="border-t lg:border-t-0 lg:border-l border-gray-200 overflow-y-auto scrollbar-thin bg-gray-50">
            <div className="px-3 py-2 border-b border-gray-200 bg-white">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Handoff Note</p>
            </div>
            <div className="p-4">
              <HandoffNote
                visible={handoffVisible}
                content={handoffContent}
                onChange={handleHandoffChange}
                onSubmit={handleHandoffSubmit}
                submitted={handoffSubmitted}
                isLastRound={session.current_round === 3}
                unlockSeconds={handoffSecs}
              />
            </div>
          </aside>
        </main>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-400">Waiting for round to begin...</p>
        </div>
      )}

      {/* Connection indicator */}
      <div className={`fixed bottom-3 right-3 w-2 h-2 rounded-full transition-colors ${connected ? 'bg-emerald-500' : 'bg-red-500'}`} title={connected ? 'Connected' : 'Disconnected'} />
    </div>
  );
}

function WaitingRoom({ participant, team, session, connected }) {
  const memberCount = session.instances
    ?.flatMap(i => i.teams)
    ?.find(t => t.id === team.id)
    ?.members?.length || 1;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <span className="font-display text-xl font-bold text-gray-900">CrossWire</span>
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <span>{connected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row items-start justify-center gap-6 px-6 py-10 max-w-5xl mx-auto w-full">
        {/* Left: Identity card */}
        <div className="w-full lg:w-80 flex-shrink-0 animate-fade-in">
          <div className="card text-center mb-4">
            <div className="text-5xl mb-4">{team?.countryData?.flag || '🏳'}</div>
            <h1 className="font-display text-2xl font-bold text-gray-900 mb-1">You're in!</h1>
            <p className="text-lg text-gray-700 mb-0.5">
              {team?.country} Team
            </p>
            <p className="text-amber-600 font-semibold mb-4">{participant?.role}</p>

            <div className="bg-gray-50 rounded-lg p-4 text-left mb-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Your Character</p>
              <p className="text-sm text-gray-700 leading-relaxed italic">
                "{team?.countryData?.roles?.[participant?.role]}"
              </p>
            </div>

            {team?.countryData?.style && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-left">
                <p className="text-xs text-amber-700 uppercase tracking-wider font-semibold mb-1">Team Style</p>
                <p className="text-xs text-amber-900 leading-relaxed">{team.countryData.style}</p>
              </div>
            )}
          </div>

          <div className="text-center text-sm text-gray-400">
            <span>{memberCount} member{memberCount !== 1 ? 's' : ''} in this team</span>
            <span className="mx-2">·</span>
            <span className="text-amber-600 font-medium">Waiting for facilitator to start…</span>
          </div>
        </div>

        {/* Right: How it works */}
        <div className="w-full animate-fade-in">
          <div className="card">
            <h2 className="font-display text-lg font-bold text-gray-900 mb-1">How CrossWire Works</h2>
            <p className="text-sm text-gray-500 mb-5">Read this before the session starts — you won't get instructions during the game.</p>

            <div className="space-y-4 mb-6">
              {[
                {
                  step: '1',
                  color: 'bg-blue-100 text-blue-700',
                  title: 'You have a country persona',
                  desc: 'Your team represents a country with its own communication style. Stay in character — HOW you communicate is part of the challenge.'
                },
                {
                  step: '2',
                  color: 'bg-amber-100 text-amber-700',
                  title: '3 rounds, 3 event types',
                  desc: 'Each round, your team works on an event: a Press Conference, Product Launch, or Internal Conference. You plan the agenda, materials, and rules.'
                },
                {
                  step: '3',
                  color: 'bg-purple-100 text-purple-700',
                  title: 'Teams hand off between rounds',
                  desc: 'After each round, a different team continues YOUR event. You\'ll also inherit another team\'s work. What you leave behind matters.'
                },
                {
                  step: '4',
                  color: 'bg-emerald-100 text-emerald-700',
                  title: 'Write a handoff note before time runs out',
                  desc: 'Near the end of each round, a handoff note box will appear. Tell the next team what you decided, what\'s unfinished, and what they should watch out for.'
                },
              ].map(({ step, color, title, desc }) => (
                <div key={step} className="flex gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${color}`}>
                    {step}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{title}</p>
                    <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gray-900 rounded-xl p-4 text-white">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">The Goal</p>
              <p className="text-sm leading-relaxed">
                By the end, you'll see what got lost or distorted as work passed between teams — and why. The debrief will reveal how different communication styles shaped every decision.
              </p>
            </div>
          </div>

          {team?.countryData?.norms && (
            <div className="mt-4 card border-purple-200 bg-purple-50">
              <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-2">Secret Protocol — only your team sees this</p>
              <p className="text-sm text-purple-900 leading-relaxed">{team.countryData.norms}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DebriefRedirect({ navigate, sessionId, participant, assignment, socket }) {
  useEffect(() => {
    setTimeout(() => {
      localStorage.setItem('debriefInstanceId', assignment?.instance?.id || '');
      navigate('/debrief');
    }, 2000);
  }, []);

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center animate-fade-in">
        <div className="text-4xl mb-4">🎉</div>
        <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">All rounds complete!</h2>
        <p className="text-gray-500">Taking you to the debrief...</p>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getNextTeam(session, myTeam) {
  if (!session || !myTeam) return null;
  const myInstance = session.instances?.find(i => i.teams?.some(t => t.id === myTeam.id));
  if (!myInstance) return null;
  const teams = myInstance.teams;
  const myIdx = teams.findIndex(t => t.id === myTeam.id);
  return teams[(myIdx + 1) % teams.length];
}

