const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');
const {
  COUNTRIES, EVENTS, calculateConfig, createSession,
  getSessionByFacilitatorCode, getSessionById, getTeamByJoinCode,
  getTeamParticipants, joinTeam, getFullSessionState,
  upsertWorkspace, getWorkspace, upsertHandoffNote, getHandoffNote,
  getEventAssignment, getDebriefData, updateFacilitatorNotes
} = require('./sessionManager');
const {
  startRound, pauseRound, resumeRound, triggerHandoff, getRemainingTime
} = require('./gameLogic');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

// ── REST API ──────────────────────────────────────────────────────────────────

app.get('/api/countries', (req, res) => {
  res.json(COUNTRIES);
});

app.post('/api/sessions', (req, res) => {
  try {
    const { participantCount, countries, roundDuration, customEvents } = req.body;
    if (!participantCount || !countries) {
      return res.status(400).json({ error: 'participantCount and countries required' });
    }
    const result = createSession({ participantCount, countries, roundDuration, customEvents });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sessions/facilitator/:code', (req, res) => {
  const session = getSessionByFacilitatorCode(req.params.code.toUpperCase());
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const full = getFullSessionState(session.id);
  res.json(full);
});

app.get('/api/sessions/:id', (req, res) => {
  const full = getFullSessionState(req.params.id);
  if (!full) return res.status(404).json({ error: 'Session not found' });
  res.json(full);
});

app.get('/api/join/:code', (req, res) => {
  const team = getTeamByJoinCode(req.params.code.toUpperCase());
  if (!team) return res.status(404).json({ error: 'Invalid join code' });
  const members = getTeamParticipants(team.id);
  const isFull = members.length >= 6;
  res.json({ team, members, isFull, spotsLeft: Math.max(0, 6 - members.length), countryData: COUNTRIES[team.country] });
});

app.get('/api/config-preview', (req, res) => {
  const count = parseInt(req.query.count);
  if (!count || count < 12 || count > 50) {
    return res.status(400).json({ error: 'Count must be 12–50' });
  }
  res.json(calculateConfig(count));
});

app.get('/api/sessions/:sessionId/debrief', (req, res) => {
  const session = getSessionById(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const data = getDebriefData(req.params.sessionId);
  res.json({ instances: data, facilitatorNotes: session.facilitator_notes || '' });
});

app.post('/api/sessions/:sessionId/reflections', (req, res) => {
  const { sessionId } = req.params;
  const { participantId, instanceId, q1, q2, q3 } = req.body;
  if (!participantId || !instanceId) return res.status(400).json({ error: 'Missing fields' });

  const existing = db.prepare('SELECT * FROM reflections WHERE participant_id = ?').get(participantId);
  if (existing) {
    db.prepare('UPDATE reflections SET q1 = ?, q2 = ?, q3 = ?, submitted = 1 WHERE id = ?')
      .run(q1 || '', q2 || '', q3 || '', existing.id);
  } else {
    db.prepare(`INSERT INTO reflections (id, session_id, instance_id, participant_id, q1, q2, q3, submitted)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)`)
      .run(uuidv4(), sessionId, instanceId, participantId, q1 || '', q2 || '', q3 || '');
  }
  res.json({ ok: true });
});

app.get('/api/sessions/:sessionId/analytics', (req, res) => {
  const { sessionId } = req.params;

  // ── Handoff note stats per team ───────────────────────────────────────────
  const handoffRows = db.prepare(`
    SELECT hn.team_id, hn.from_round, hn.content, hn.submitted,
           hn.submitted_at,
           t.country, t.join_code,
           i.instance_number
    FROM handoff_notes hn
    JOIN teams t ON hn.team_id = t.id
    JOIN instances i ON hn.instance_id = i.id
    WHERE hn.session_id = ?
    ORDER BY i.instance_number, t.team_number, hn.from_round
  `).all(sessionId);

  const wordCount = text => (text || '').trim().split(/\s+/).filter(w => w.length > 0).length;

  const byTeam = {};
  handoffRows.forEach(row => {
    const key = row.team_id;
    if (!byTeam[key]) {
      byTeam[key] = {
        teamId: key,
        country: row.country,
        joinCode: row.join_code,
        instanceNum: row.instance_number,
        notes: [],
      };
    }
    byTeam[key].notes.push({
      round: row.from_round,
      wordCount: wordCount(row.content),
      hasContent: (row.content || '').trim().length > 0,
      onTime: row.submitted_at !== null,  // null = auto-saved at round end
    });
  });

  const handoffByTeam = Object.values(byTeam).map(t => ({
    ...t,
    avgWordCount: t.notes.length
      ? Math.round(t.notes.reduce((s, n) => s + n.wordCount, 0) / t.notes.length)
      : 0,
    onTimeCount: t.notes.filter(n => n.onTime).length,
    totalNotes: t.notes.length,
  }));

  // ── Reflection response rates ─────────────────────────────────────────────
  const totalParticipants = db.prepare(
    'SELECT COUNT(*) AS n FROM participants WHERE session_id = ?'
  ).get(sessionId).n;

  const reflRows = db.prepare(
    'SELECT q1, q2, q3 FROM reflections WHERE session_id = ?'
  ).all(sessionId);

  const reflectionRates = {
    total: totalParticipants,
    submitted: reflRows.length,
    q1: reflRows.filter(r => (r.q1 || '').trim()).length,
    q2: reflRows.filter(r => (r.q2 || '').trim()).length,
    q3: reflRows.filter(r => (r.q3 || '').trim()).length,
  };

  // ── Word frequency from all workspace content ─────────────────────────────
  const STOP = new Set([
    'the','a','an','and','or','but','in','on','at','to','for','of','with',
    'by','from','is','are','was','were','be','been','being','have','has',
    'had','do','does','did','will','would','could','should','may','might',
    'must','can','this','that','these','those','i','we','you','he','she',
    'it','they','me','us','him','her','them','my','our','your','his','its',
    'their','what','which','who','not','so','if','as','up','out','about',
    'into','than','also','just','how','all','any','both','each','more',
    'most','other','some','such','no','only','same','then','there','when',
    'where','while','very','get','got','like','new','use','one','two',
    'need','want','make','go','going','will','s','t','re','ve','ll','d',
  ]);

  // Extract plain text from both legacy (plain) and structured (JSON v2) workspace content
  const extractWorkspaceText = (raw) => {
    if (!raw || !raw.trim()) return '';
    try {
      const obj = JSON.parse(raw);
      if (obj && obj.v === 2) {
        const rows = [...(obj.task1 || []), ...(obj.task2 || [])];
        return [
          rows.map(r => [r.c0, r.c1, r.c2].filter(Boolean).join(' ')).join(' '),
          obj.task3 || ''
        ].join(' ');
      }
    } catch {}
    return raw;
  };

  const allContent = db.prepare(
    "SELECT content FROM workspaces WHERE session_id = ? AND content != ''"
  ).all(sessionId).map(r => extractWorkspaceText(r.content)).join(' ');

  const freq = {};
  allContent.toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP.has(w))
    .forEach(w => { freq[w] = (freq[w] || 0) + 1; });

  const topWords = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word, count]) => ({ word, count }));

  // ── "What got lost": keywords in R1 absent in R3 per event ──────────────────
  const eventNames = db.prepare(
    'SELECT DISTINCT event_name FROM workspaces WHERE session_id = ?'
  ).all(sessionId).map(r => r.event_name);

  const lostByEvent = eventNames.map(eventName => {
    const r1Rows = db.prepare(
      "SELECT content FROM workspaces WHERE session_id = ? AND event_name = ? AND round = 1 AND content != ''"
    ).all(sessionId, eventName);
    const r3Rows = db.prepare(
      "SELECT content FROM workspaces WHERE session_id = ? AND event_name = ? AND round = 3 AND content != ''"
    ).all(sessionId, eventName);

    const toFreqMap = (rows) => {
      const freq = {};
      rows.map(r => extractWorkspaceText(r.content)).join(' ')
        .toLowerCase()
        .replace(/[^a-z\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !STOP.has(w))
        .forEach(w => { freq[w] = (freq[w] || 0) + 1; });
      return freq;
    };

    const r1Freq = toFreqMap(r1Rows);
    const r3Keys = new Set(Object.keys(toFreqMap(r3Rows)));

    const lostKeywords = Object.entries(r1Freq)
      .filter(([w]) => !r3Keys.has(w))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, r1Count]) => ({ word, r1Count }));

    return { eventName, lostKeywords };
  }).filter(e => e.lostKeywords.length > 0);

  res.json({ handoffByTeam, reflectionRates, topWords, lostByEvent });
});

app.get('/api/sessions/:sessionId/instances/:instanceId/assignments', (req, res) => {
  const { sessionId, instanceId } = req.params;
  const session = getSessionById(sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const assignments = getEventAssignment(instanceId, session.current_round);
  res.json(assignments);
});

app.post('/api/sessions/by-codes', (req, res) => {
  const { codes } = req.body;
  if (!Array.isArray(codes) || codes.length === 0) return res.json([]);
  const placeholders = codes.map(() => '?').join(',');
  const rows = db.prepare(
    `SELECT id, facilitator_code, config, status, current_round, created_at FROM sessions WHERE facilitator_code IN (${placeholders})`
  ).all(...codes.map(c => c.toUpperCase()));
  res.json(rows.map(s => ({
    ...s,
    config: JSON.parse(s.config),
  })));
});

app.patch('/api/sessions/:sessionId/notes', (req, res) => {
  const { sessionId } = req.params;
  const { notes } = req.body;
  if (notes === undefined) return res.status(400).json({ error: 'notes required' });
  updateFacilitatorNotes(sessionId, notes);
  res.json({ ok: true });
});

// Observer: look up session by facilitator code without exposing it as a control endpoint
app.get('/api/observe/:facilitatorCode', (req, res) => {
  const session = getSessionByFacilitatorCode(req.params.facilitatorCode.toUpperCase());
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const full = getFullSessionState(session.id);
  res.json({ session: full, remaining: getRemainingTime(session.id) });
});

// Observer: fetch all workspaces for a given session + round
app.get('/api/sessions/:sessionId/workspaces', (req, res) => {
  const { sessionId } = req.params;
  const round = parseInt(req.query.round) || 0;
  if (!round) return res.json([]);
  const rows = db.prepare(
    'SELECT * FROM workspaces WHERE session_id = ? AND round = ?'
  ).all(sessionId, round);
  res.json(rows);
});

// Observer: fetch all submitted handoff notes for a session
app.get('/api/sessions/:sessionId/handoffs', (req, res) => {
  const { sessionId } = req.params;
  const rows = db.prepare(
    'SELECT * FROM handoff_notes WHERE session_id = ?'
  ).all(sessionId);
  res.json(rows);
});

// ── SOCKET.IO ─────────────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Facilitator joins session room
  socket.on('facilitator:join', ({ facilitatorCode }) => {
    const session = getSessionByFacilitatorCode(facilitatorCode?.toUpperCase());
    if (!session) {
      socket.emit('error', { message: 'Invalid facilitator code' });
      return;
    }
    socket.join(`session:${session.id}`);
    socket.join(`facilitator:${session.id}`);
    socket.data.sessionId = session.id;
    socket.data.role = 'facilitator';
    const state = getFullSessionState(session.id);
    socket.emit('session:joined', { session: state, remaining: getRemainingTime(session.id) });
  });

  // Participant joins
  socket.on('participant:join', ({ joinCode, name, participantToken }) => {
    const team = getTeamByJoinCode(joinCode?.toUpperCase());
    if (!team) {
      socket.emit('error', { message: 'Invalid join code' });
      return;
    }

    // joinTeam handles fullness check, token rejoin, name rejoin, and new slot
    // atomically — no separate pre-check needed.
    const result = joinTeam({
      teamId: team.id,
      sessionId: team.session_id,
      name,
      socketId: socket.id,
      participantToken,
    });

    if (!result) {
      socket.emit('error', { message: 'This team is full. Please check your join code with your facilitator.' });
      return;
    }

    const { participant, rejoined } = result;

    socket.join(`session:${team.session_id}`);
    socket.join(`team:${team.id}`);
    socket.data.sessionId = team.session_id;
    socket.data.teamId = team.id;
    socket.data.participantId = participant.id;
    socket.data.role = 'participant';

    const session = getFullSessionState(team.session_id);
    socket.emit('participant:joined', {
      participant,
      team: { ...team, countryData: COUNTRIES[team.country] },
      session,
      remaining: getRemainingTime(team.session_id),
      rejoined
    });

    io.to(`session:${team.session_id}`).emit('session:state', session);
  });

  // Observer joins (read-only)
  socket.on('observer:join', ({ facilitatorCode }) => {
    const session = getSessionByFacilitatorCode(facilitatorCode?.toUpperCase());
    if (!session) {
      socket.emit('error', { message: 'Invalid session code' });
      return;
    }
    socket.join(`session:${session.id}`);
    socket.data.sessionId = session.id;
    socket.data.role = 'observer';
    const state = getFullSessionState(session.id);
    socket.emit('observer:joined', { session: state, remaining: getRemainingTime(session.id) });
  });

  // Workspace update (collaborative)
  socket.on('workspace:update', ({ sessionId, instanceId, eventName, round, teamId, content }) => {
    upsertWorkspace({ sessionId, instanceId, eventName, round, teamId, content });
    socket.to(`session:${sessionId}`).emit('workspace:updated', {
      instanceId, eventName, round, content
    });
  });

  // Handoff note update
  socket.on('handoff:update', ({ sessionId, instanceId, eventName, fromRound, teamId, content }) => {
    upsertHandoffNote({ sessionId, instanceId, eventName, fromRound, teamId, content });
    socket.to(`team:${teamId}`).emit('handoff:updated', {
      instanceId, eventName, fromRound, content
    });
  });

  // Handoff note submit
  socket.on('handoff:submit', ({ sessionId, instanceId, eventName, fromRound, teamId, content }) => {
    upsertHandoffNote({ sessionId, instanceId, eventName, fromRound, teamId, content, submitted: true });
    io.to(`session:${sessionId}`).emit('handoff:submitted', {
      instanceId, eventName, fromRound, teamId
    });
    const state = getFullSessionState(sessionId);
    io.to(`session:${sessionId}`).emit('session:state', state);
  });

  // Reflection submit
  socket.on('reflection:submit', ({ sessionId, instanceId, participantId, q1, q2, q3 }) => {
    const existing = db.prepare('SELECT * FROM reflections WHERE participant_id = ?').get(participantId);
    if (existing) {
      db.prepare('UPDATE reflections SET q1 = ?, q2 = ?, q3 = ?, submitted = 1 WHERE id = ?')
        .run(q1, q2, q3, existing.id);
    } else {
      db.prepare(`INSERT INTO reflections (id, session_id, instance_id, participant_id, q1, q2, q3, submitted)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)`)
        .run(uuidv4(), sessionId, instanceId, participantId, q1, q2, q3);
    }
    socket.emit('reflection:saved');
  });

  // Facilitator controls
  socket.on('facilitator:start_round', ({ sessionId }) => {
    const session = getSessionById(sessionId);
    if (!session) return;
    if (session.current_round === 0 || session.status === 'handoff') {
      startRound(sessionId, io);
    } else if (session.status === 'paused') {
      resumeRound(sessionId, io);
    }
  });

  socket.on('facilitator:pause', ({ sessionId }) => {
    pauseRound(sessionId, io);
  });

  socket.on('facilitator:resume', ({ sessionId }) => {
    resumeRound(sessionId, io);
  });

  socket.on('facilitator:trigger_handoff', ({ sessionId }) => {
    triggerHandoff(sessionId, io);
  });

  socket.on('facilitator:skip_debrief', ({ sessionId }) => {
    db.prepare('UPDATE sessions SET status = ? WHERE id = ?').run('debrief', sessionId);
    db.prepare('UPDATE instances SET status = ? WHERE session_id = ?').run('debrief', sessionId);
    const state = getFullSessionState(sessionId);
    io.to(`session:${sessionId}`).emit('session:state', state);
    io.to(`session:${sessionId}`).emit('game:debrief');
  });

  socket.on('facilitator:broadcast', ({ sessionId, message }) => {
    io.to(`session:${sessionId}`).emit('facilitator:broadcast', { message });
  });

  socket.on('facilitator:curveball', ({ sessionId, text }) => {
    io.to(`session:${sessionId}`).emit('game:curveball', { text, timestamp: Date.now() });
  });

  socket.on('session:close', ({ sessionId }) => {
    db.prepare("UPDATE sessions SET status = 'closed' WHERE id = ?").run(sessionId);
    io.to(`session:${sessionId}`).emit('game:end');
  });

  socket.on('disconnect', () => {
    if (socket.data.participantId) {
      db.prepare('UPDATE participants SET socket_id = NULL WHERE id = ?').run(socket.data.participantId);
    }
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`CrossWire server running on port ${PORT}`);
});
