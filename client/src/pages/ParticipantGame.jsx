import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../socket';
import { BACKEND_URL } from '../config';
import Timer from '../components/Timer';
import RoleCard from '../components/RoleCard';
import StructuredWorkspace from '../components/StructuredWorkspace';
import HandoffNote from '../components/HandoffNote';
import TransitionScreen from '../components/TransitionScreen';

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
      setRemaining(r);
      localStorage.setItem('participantId', p.id);
      localStorage.setItem('teamId', t.id);
    });

    socket.on('session:state', (s) => {
      setSession(s);
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
            const nextEventIdx = (myIdx + toRound - 1) % 3;
            const events = ['Press Conference', 'Product Launch', 'Internal Conference'];
            const nextEvent = events[nextEventIdx];
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

    const events = ['Press Conference', 'Product Launch', 'Internal Conference'];
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

        const teams = instance.teams;
        const myIdx = teams.findIndex(t => t.id === team?.id);
        const prevTeamIdx = ((myIdx - 1) + teams.length) % teams.length;
        setPrevTeam(teams[prevTeamIdx]?.country || '');
      }
    }).catch(() => {});
  }, [assignment?.event, assignment?.round]);

  useEffect(() => {
    if (remaining <= handoffSecs && session?.status === 'active' && assignment?.round < 3) {
      setHandoffVisible(true);
    }
  }, [remaining, session?.status]);

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
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="card text-center max-w-sm">
          <p className="text-red-400 font-medium mb-4">{error}</p>
          <button onClick={() => navigate('/join')} className="btn-primary">Back to Join</button>
        </div>
      </div>
    );
  }

  if (!participant || !session) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="text-navy-400 text-center">
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
    <div className="min-h-screen bg-navy-950 flex flex-col">
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

      {/* Broadcast banner */}
      {broadcast && (
        <div className="bg-amber-500 text-navy-950 text-center py-2.5 px-4 text-sm font-medium animate-fade-in">
          📢 {broadcast}
          <button onClick={() => setBroadcast(null)} className="ml-3 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Prompt banner */}
      {prompt && (
        <div className="bg-navy-700 border-b border-navy-600 text-center py-2.5 px-4 text-sm text-navy-200 animate-fade-in">
          {prompt}
        </div>
      )}

      {/* Top bar */}
      <header className="bg-navy-900 border-b border-navy-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xl">{COUNTRY_FLAGS[team?.country]}</span>
          <div>
            <div className="font-display font-bold text-white text-sm">{team?.country} Team</div>
            <div className="text-navy-400 text-xs">{participant?.name} · {participant?.role}</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {assignment && (
            <div className="text-right hidden sm:block">
              <div className="text-xs text-navy-400">Round {session.current_round}/3</div>
              <div className="text-xs text-navy-500">{assignment.event}</div>
            </div>
          )}
          <div className="text-right">
            {session.current_round > 0 ? (
              <Timer remaining={remaining} total={session.round_duration} compact />
            ) : (
              <span className="text-navy-400 text-sm">Waiting...</span>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      {sessionStatus === 'debrief' ? (
        <DebriefRedirect navigate={navigate} sessionId={session.id} participant={participant} assignment={assignment} socket={socket} />
      ) : assignment ? (
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr_300px] gap-0 min-h-0 overflow-hidden">
          {/* Role card */}
          <aside className="border-b lg:border-b-0 lg:border-r border-navy-700 p-4 overflow-y-auto scrollbar-thin bg-navy-900/30">
            <RoleCard
              participant={participant}
              team={team}
              round={session.current_round}
              showReflection={showReflection && sessionStatus === 'handoff'}
              onReflectionSubmit={handleReflection}
            />
          </aside>

          {/* Workspace */}
          <div className="p-4 overflow-y-auto scrollbar-thin">
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

          {/* Handoff note */}
          <aside className="border-t lg:border-t-0 lg:border-l border-navy-700 p-4 bg-navy-900/30">
            <HandoffNote
              visible={handoffVisible}
              content={handoffContent}
              onChange={handleHandoffChange}
              onSubmit={handleHandoffSubmit}
              submitted={handoffSubmitted}
              isLastRound={session.current_round === 3}
              unlockSeconds={handoffSecs}
            />
          </aside>
        </main>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-navy-400">Waiting for round to begin...</p>
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
    <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center px-6 text-center">
      <div className="animate-fade-in max-w-md">
        <div className="text-5xl mb-6">{team?.countryData?.flag || '🏳'}</div>
        <h1 className="font-display text-3xl font-bold text-white mb-2">You're in!</h1>
        <p className="text-navy-300 text-lg mb-1">
          {team?.country} Team · <span className="text-amber-500">{participant?.role}</span>
        </p>
        <p className="text-navy-400 text-sm mb-8">Waiting for the facilitator to start the session...</p>

        <div className="card mb-6">
          <p className="text-xs text-navy-400 uppercase tracking-wider font-medium mb-3">Your Role</p>
          <p className="text-sm text-navy-200 leading-relaxed italic">
            "{team?.countryData?.roles?.[participant?.role]}"
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-navy-500 text-sm">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-400'}`} />
          <span>{memberCount} member{memberCount !== 1 ? 's' : ''} in this team</span>
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
        <h2 className="font-display text-2xl font-bold text-white mb-2">All rounds complete!</h2>
        <p className="text-navy-400">Taking you to the debrief...</p>
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

