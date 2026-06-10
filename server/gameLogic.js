const db = require('./db');
const { getFullSessionState, getEventAssignment, upsertHandoffNote, EVENTS } = require('./sessionManager');

const activeTimers = new Map();

function startRound(sessionId, io) {
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
  if (!session) return;

  const round = session.current_round + 1;
  if (round > 3) return;

  db.prepare('UPDATE sessions SET current_round = ?, status = ?, round_started_at = unixepoch(), paused_elapsed = 0 WHERE id = ?')
    .run(round, 'active', sessionId);

  db.prepare('UPDATE instances SET status = ? WHERE session_id = ?').run('active', sessionId);

  clearTimerForSession(sessionId);

  const duration = session.round_duration * 1000;
  const warningAt = duration - 120000;
  const handoffSecs = Math.min(180, Math.round(session.round_duration * 0.3));
  const handoffPromptAt = duration - handoffSecs * 1000;

  const startTime = Date.now();

  const broadcastState = () => {
    const state = getFullSessionState(sessionId);
    io.to(`session:${sessionId}`).emit('session:state', state);
    io.to(`session:${sessionId}`).emit('timer:update', {
      round,
      remaining: Math.max(0, Math.ceil((duration - (Date.now() - startTime)) / 1000)),
      total: session.round_duration,
      handoffSecs
    });
  };

  const tickInterval = setInterval(broadcastState, 1000);

  const warningTimeout = setTimeout(() => {
    const warningMsg = handoffSecs >= 120
      ? '2 minutes left. Finalize your handoff note — the next team is counting on it.'
      : '2 minutes left. Start wrapping up your ideas and prepare your handoff note.';
    io.to(`session:${sessionId}`).emit('game:prompt', {
      type: 'warning',
      message: warningMsg
    });
  }, warningAt > 0 ? warningAt : 0);

  const handoffPromptTimeout = setTimeout(() => {
    io.to(`session:${sessionId}`).emit('game:prompt', {
      type: 'handoff_unlock',
      message: 'Time to hand off. What does the next team absolutely need to know?'
    });
    io.to(`session:${sessionId}`).emit('handoff:unlock');
  }, handoffPromptAt > 0 ? handoffPromptAt : 0);

  const endTimeout = setTimeout(() => {
    endRound(sessionId, io);
  }, duration);

  activeTimers.set(sessionId, {
    tickInterval,
    warningTimeout,
    handoffPromptTimeout,
    endTimeout,
    startTime,
    duration,
    elapsed: 0
  });

  broadcastState();

  const promptMsg = round === 1
    ? `You have ${session.round_duration / 60} minutes. Your goal: create a first plan for your event. Stay in character.`
    : round === 3
    ? 'Final round. You\'re completing someone else\'s work. Make it yours.'
    : null;

  if (promptMsg) {
    setTimeout(() => {
      io.to(`session:${sessionId}`).emit('game:prompt', { type: 'round_start', message: promptMsg });
    }, 1500);
  }
}

function pauseRound(sessionId, io) {
  const timer = activeTimers.get(sessionId);
  if (!timer) return;

  const elapsed = Date.now() - timer.startTime + timer.elapsed;
  clearTimerForSession(sessionId);

  db.prepare('UPDATE sessions SET status = ?, paused_at = unixepoch(), paused_elapsed = ? WHERE id = ?')
    .run('paused', elapsed, sessionId);

  const state = getFullSessionState(sessionId);
  io.to(`session:${sessionId}`).emit('session:state', state);
  io.to(`session:${sessionId}`).emit('timer:paused', { elapsed, remaining: Math.max(0, Math.ceil((timer.duration - elapsed) / 1000)) });
}

function resumeRound(sessionId, io) {
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
  if (!session || session.status !== 'paused') return;

  const elapsed = session.paused_elapsed || 0;
  const remaining = session.round_duration * 1000 - elapsed;

  db.prepare('UPDATE sessions SET status = ?, round_started_at = unixepoch(), paused_elapsed = ? WHERE id = ?')
    .run('active', elapsed, sessionId);

  const startTime = Date.now();
  const duration = session.round_duration * 1000;

  const broadcastState = () => {
    const state = getFullSessionState(sessionId);
    io.to(`session:${sessionId}`).emit('session:state', state);
    io.to(`session:${sessionId}`).emit('timer:update', {
      round: session.current_round,
      remaining: Math.max(0, Math.ceil((remaining - (Date.now() - startTime)) / 1000)),
      total: session.round_duration
    });
  };

  const tickInterval = setInterval(broadcastState, 1000);

  const resumeHandoffSecs = Math.min(180, Math.round(session.round_duration * 0.3));
  const handoffPromptAt = remaining - resumeHandoffSecs * 1000;
  const handoffPromptTimeout = handoffPromptAt > 0 ? setTimeout(() => {
    io.to(`session:${sessionId}`).emit('handoff:unlock');
  }, handoffPromptAt) : null;

  const endTimeout = setTimeout(() => {
    endRound(sessionId, io);
  }, remaining);

  activeTimers.set(sessionId, {
    tickInterval,
    warningTimeout: null,
    handoffPromptTimeout,
    endTimeout,
    startTime,
    duration,
    elapsed
  });

  broadcastState();
}

function endRound(sessionId, io) {
  clearTimerForSession(sessionId);

  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
  if (!session) return;

  const round = session.current_round;

  autoSaveHandoffNotes(sessionId, round);

  if (round >= 3) {
    db.prepare('UPDATE sessions SET status = ? WHERE id = ?').run('debrief', sessionId);
    db.prepare('UPDATE instances SET status = ? WHERE session_id = ?').run('debrief', sessionId);

    io.to(`session:${sessionId}`).emit('game:prompt', {
      type: 'round_end',
      message: 'All rounds complete. Reflect before we debrief.'
    });

    setTimeout(() => {
      const state = getFullSessionState(sessionId);
      io.to(`session:${sessionId}`).emit('session:state', state);
      io.to(`session:${sessionId}`).emit('game:debrief');
    }, 3000);
  } else {
    db.prepare('UPDATE sessions SET status = ? WHERE id = ?').run('handoff', sessionId);

    const state = getFullSessionState(sessionId);
    io.to(`session:${sessionId}`).emit('session:state', state);
    io.to(`session:${sessionId}`).emit('game:handoff', { fromRound: round, toRound: round + 1 });

    io.to(`session:${sessionId}`).emit('game:prompt', {
      type: 'round_end',
      message: 'Handoff in progress... Read carefully — what did they leave you, and what\'s missing?'
    });
  }
}

function triggerHandoff(sessionId, io) {
  clearTimerForSession(sessionId);
  endRound(sessionId, io);
}

function autoSaveHandoffNotes(sessionId, round) {
  if (round >= 3) return;

  const instances = db.prepare('SELECT * FROM instances WHERE session_id = ?').all(sessionId);

  instances.forEach(inst => {
    const assignments = getEventAssignment(inst.id, round);
    assignments.forEach(({ team, event }) => {
      const existing = db.prepare(
        'SELECT * FROM handoff_notes WHERE instance_id = ? AND event_name = ? AND from_round = ?'
      ).get(inst.id, event, round);

      if (!existing) {
        upsertHandoffNote({
          sessionId,
          instanceId: inst.id,
          eventName: event,
          fromRound: round,
          teamId: team.id,
          content: '',
          submitted: false
        });
      } else if (!existing.submitted) {
        db.prepare('UPDATE handoff_notes SET submitted = 1 WHERE id = ?').run(existing.id);
      }
    });
  });
}

function clearTimerForSession(sessionId) {
  const timer = activeTimers.get(sessionId);
  if (timer) {
    clearInterval(timer.tickInterval);
    clearTimeout(timer.warningTimeout);
    clearTimeout(timer.handoffPromptTimeout);
    clearTimeout(timer.endTimeout);
    activeTimers.delete(sessionId);
  }
}

function getRemainingTime(sessionId) {
  const timer = activeTimers.get(sessionId);
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
  if (!session) return 0;

  if (session.status === 'paused') {
    return Math.max(0, Math.ceil((session.round_duration * 1000 - (session.paused_elapsed || 0)) / 1000));
  }

  if (!timer) return session.round_duration;

  const elapsed = (Date.now() - timer.startTime) + timer.elapsed;
  return Math.max(0, Math.ceil((timer.duration - elapsed) / 1000));
}

module.exports = {
  startRound,
  pauseRound,
  resumeRound,
  endRound,
  triggerHandoff,
  getRemainingTime,
  clearTimerForSession
};
