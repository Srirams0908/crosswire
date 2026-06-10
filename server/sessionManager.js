const { v4: uuidv4 } = require('uuid');
const db = require('./db');

const COUNTRIES = {
  Brazil: {
    flag: '🇧🇷',
    style: 'Relationship-first. High-context. Values warmth, flexibility, and harmony. Communication is expressive and personal.',
    norms: 'TEAM PROTOCOL (keep this within your team): All decisions must be confirmed aloud by at least two people before anyone writes them down. If only one person agrees, keep discussing.',
    roles: {
      Manager: 'You make decisions quickly and expect others to keep up. You move fast, speak with energy, and don\'t like waiting for consensus. If the group goes quiet, you fill the silence.',
      'Person 1': 'You often talk over others when excited about ideas. You don\'t mean to be rude — you just can\'t contain your enthusiasm. You interrupt, then apologize, then interrupt again.',
      'Person 2': 'You are extremely detail-oriented and double-check everything. Before the team moves on, you want to confirm every decision. You slow things down — but you catch mistakes others miss.',
      'Person 3': 'You prefer silence and only speak when you are completely certain. In a fast-moving team, this means you often say nothing at all — even when you have a good idea.',
      'Person 4': 'You ask many clarifying questions before acting. "But what exactly do we mean by that?" is something you say a lot. Others sometimes find this frustrating. You find rushing even more frustrating.',
      'Person 5': 'You encourage debate and expect disagreement. Silence frustrates you — it feels like nobody cares. You actively push people to share opposing views even when the team wants to move on.'
    }
  },
  India: {
    flag: '🇮🇳',
    style: 'Hierarchical yet collaborative. High-context. Indirect communication. Respect for seniority. Consensus-oriented.',
    norms: 'TEAM PROTOCOL (keep this within your team): The Manager\'s word is final — but the Manager must ask every member for input before deciding. No one may be skipped.',
    roles: {
      Manager: 'You encourage open debate and expect people to speak up. Silence in your team makes you uncomfortable — you interpret it as disengagement. You check in with everyone before finalizing anything.',
      'Person 1': 'You like to multitask and switch between ideas rapidly. You jump topics quickly, connect things others don\'t see as connected, and sometimes leave conversations before they\'re finished.',
      'Person 2': 'You need instructions or ideas repeated in different ways before you fully commit to them. You\'re not slow — you\'re thorough. You ask people to explain things again, differently.',
      'Person 3': 'You always summarize what others have said before you respond. "So what I\'m hearing is..." is how you start almost every sentence. It slows the conversation but prevents misunderstanding.',
      'Person 4': 'You tend to defer to the person with perceived higher authority. If the Manager speaks, you agree — even if privately you disagree. You share your real opinion only in side conversations.',
      'Person 5': 'You focus on long-term strategy rather than immediate tasks. While others are figuring out logistics, you\'re thinking about what this event means for the organization in five years. Practical details bore you.'
    }
  },
  Germany: {
    flag: '🇩🇪',
    style: 'Direct, structured, rule-oriented. Low-context. Values accuracy, thoroughness, and clear processes. Punctuality is respect.',
    norms: 'TEAM PROTOCOL (keep this within your team): No one may move to the next task until the current one is fully documented and everyone has read it. Skipping ahead is not allowed.',
    roles: {
      Manager: 'You speak slowly and deliberately. Precision matters more than speed. You expect structured discussion — one person at a time, clear points, no rambling. You visibly lose patience with vague answers.',
      'Person 1': 'You are skeptical and question everything before agreeing. "But have we actually verified that?" is your default response. You don\'t obstruct — you just need evidence before you commit.',
      'Person 2': 'You prefer structured steps and resist improvisation. You want a clear agenda before the team starts working. If someone skips a step, you go back to it. Chaos makes you unproductive.',
      'Person 3': 'You tend to use humor and sarcasm; others may misinterpret it. What you say as a light joke sometimes lands as criticism. You\'re often surprised when people seem offended.',
      'Person 4': 'You pause before speaking, even when directly prompted for an answer. You are processing — but others interpret your silence as disagreement or discomfort. You are comfortable with silence in a way others are not.',
      'Person 5': 'You are highly organized and dislike overlapping discussions. When two people talk at once, you stop participating entirely. You\'ll wait, arms crossed, until there\'s order — however long that takes.'
    }
  },
  Japan: {
    flag: '🇯🇵',
    style: 'Harmony-preserving. Very high-context. Indirect. Group consensus (nemawashi). Silence is meaningful. Hierarchy respected.',
    norms: 'TEAM PROTOCOL (keep this within your team): Every member must give explicit verbal agreement before the handoff note can be submitted. If anyone stays silent, it counts as disagreement.',
    roles: {
      Manager: 'You value group harmony above all. You never directly disagree with anyone — instead you use phrases like "that\'s interesting" or "we might consider..." to signal concern without confrontation.',
      'Person 1': 'You communicate indirectly. You never say "no" outright. Instead you say "that could be difficult" or "we may need more time to consider." Others often miss that you\'re actually declining.',
      'Person 2': 'You speak only after others have finished — and even then, you pause. You believe interrupting is deeply disrespectful. In fast-moving teams, this means you rarely get to speak at all.',
      'Person 3': 'You focus intensely on process and presentation quality. The content of the event matters less to you than how it is structured and how it will appear to outsiders. Format is substance.',
      'Person 4': 'You check for group consensus before every small decision. You frequently ask "does everyone agree?" and wait for explicit confirmation from each person before moving forward.',
      'Person 5': 'You avoid expressing personal opinions directly. Instead you reference what "the group seems to feel" or "what seems to be emerging." Stating a clear personal view feels inappropriate to you.'
    }
  },
  France: {
    flag: '🇫🇷',
    style: 'Intellectual, debate-oriented. High-context. Disagreement is normal and healthy. Eloquence valued. Hierarchy respected but challenged.',
    norms: 'TEAM PROTOCOL (keep this within your team): Your team must challenge at least one item from the inherited plan before adding anything new. Accepting everything uncritically is considered lazy.',
    roles: {
      Manager: 'You love intellectual debate and see challenge as respect. If nobody argues with your idea, you assume nobody was engaged enough to think critically. Agreement without debate feels hollow to you.',
      'Person 1': 'You think out loud — your ideas are half-formed when you start speaking, and they evolve as you talk. Others sometimes think you\'ve made a decision when you\'re still exploring.',
      'Person 2': 'You are direct to the point of bluntness. You say exactly what you think about an idea, including what\'s wrong with it — immediately, without softening. You don\'t consider this rude; it\'s honest.',
      'Person 3': 'You have strong aesthetic opinions and care about how the event looks and feels, not just what it delivers. You will push back on plans that you find unrefined, even if they are logistically sound.',
      'Person 4': 'You frequently reference broader context — history, theory, precedent. Before solving the problem in front of you, you want to understand why the problem exists. This frustrates action-oriented teammates.',
      'Person 5': 'You are comfortable with ambiguity and resist being pinned down to specifics too early. "We\'ll figure out the details later" is something you say often. Others find this anxiety-inducing.'
    }
  },
  Nigeria: {
    flag: '🇳🇬',
    style: 'Adaptive, entrepreneurial, relationship-driven. High energy. Flexible with time. Strong oral tradition. Resilient under pressure.',
    norms: 'TEAM PROTOCOL (keep this within your team): Spend the first 2 minutes of every round connecting — no one starts writing until everyone has spoken at least once, even if just to say hello.',
    roles: {
      Manager: 'You build relationships before building plans. The first few minutes of any working session you spend connecting with people — asking how they are, making jokes, establishing warmth. Then you work.',
      'Person 1': 'You are expressive and energetic — your emotions show clearly in how you speak. Excitement sounds like excitement; frustration sounds like frustration. You don\'t separate your feelings from your work.',
      'Person 2': 'You prefer oral communication and are better at talking through ideas than writing them down. You think the handoff note is less important than a direct conversation — and you\'ll say so.',
      'Person 3': 'You value trust above process. Before you engage fully with a task, you need to feel that the people around you are genuine. With strangers, you hold back until trust is established.',
      'Person 4': 'You are highly adaptable and comfortable switching approaches mid-task if something isn\'t working. You don\'t see changing direction as failure — you see rigidity as the real problem.',
      'Person 5': 'You communicate through storytelling. When making a point, you often start with an example, an analogy, or a short story. This enriches the conversation — but sometimes buries the main point.'
    }
  }
};

const EVENTS = ['Press Conference', 'Product Launch', 'Internal Conference'];

function generateCode(length) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generateFacilitatorCode() {
  let code;
  do {
    code = generateCode(6);
  } while (db.prepare('SELECT id FROM sessions WHERE facilitator_code = ?').get(code));
  return code;
}

function generateJoinCode(countryCode, instanceNum) {
  // 4-char code: 3-letter country prefix + 1-char instance number/letter
  const suffix = instanceNum <= 9 ? String(instanceNum) : String.fromCharCode(64 + instanceNum);
  const base = countryCode.substring(0, 3) + suffix;
  if (!db.prepare('SELECT id FROM teams WHERE join_code = ?').get(base)) return base;
  // Collision: same country twice in same instance — append a letter variant
  for (const c of 'BCDFGHJKLM') {
    const alt = countryCode.substring(0, 2) + c + suffix;
    if (!db.prepare('SELECT id FROM teams WHERE join_code = ?').get(alt)) return alt;
  }
  // Final fallback
  return countryCode.substring(0, 3) + generateCode(1);
}

function calculateConfig(participantCount) {
  if (participantCount < 12) participantCount = 12;
  if (participantCount > 50) participantCount = 50;

  let instances, teamsPerInstance;

  if (participantCount <= 18) {
    instances = 1; teamsPerInstance = 3;
  } else if (participantCount <= 30) {
    instances = 1; teamsPerInstance = Math.min(5, Math.ceil(participantCount / 6));
  } else if (participantCount <= 42) {
    instances = 2; teamsPerInstance = 3;
  } else {
    instances = 3; teamsPerInstance = 3;
  }

  const totalTeams = instances * teamsPerInstance;
  const baseSize = Math.floor(participantCount / totalTeams);
  const extras = participantCount % totalTeams;

  const teamSizes = Array.from({ length: totalTeams }, (_, i) =>
    i < extras ? baseSize + 1 : baseSize
  );

  return { instances, teamsPerInstance, totalTeams, teamSizes, participantCount };
}

function createSession({ participantCount, countries, roundDuration = 300, customEvents }) {
  const config = calculateConfig(participantCount);
  const facilitatorCode = generateFacilitatorCode();
  const sessionId = uuidv4();

  const insertSession = db.prepare(`
    INSERT INTO sessions (id, facilitator_code, config, status, round_duration)
    VALUES (?, ?, ?, 'waiting', ?)
  `);

  const insertInstance = db.prepare(`
    INSERT INTO instances (id, session_id, instance_number, status)
    VALUES (?, ?, ?, 'waiting')
  `);

  const insertTeam = db.prepare(`
    INSERT INTO teams (id, instance_id, session_id, join_code, country, team_number)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  db.exec('BEGIN');
  try {
    const sessionConfig = { ...config, countries };
    if (customEvents && customEvents.length === 3 && customEvents.every(e => e && e.trim())) {
      sessionConfig.customEvents = customEvents.map(e => e.trim());
    }
    insertSession.run(sessionId, facilitatorCode, JSON.stringify(sessionConfig), roundDuration);

    const allTeams = [];

    for (let i = 0; i < config.instances; i++) {
      const instanceId = uuidv4();
      insertInstance.run(instanceId, sessionId, i + 1);

      const instanceCountries = countries[i] || countries[0];

      for (let t = 0; t < config.teamsPerInstance; t++) {
        const teamId = uuidv4();
        const country = instanceCountries[t] || instanceCountries[t % instanceCountries.length];
        const countryCode = country.substring(0, 3).toUpperCase();
        const joinCode = generateJoinCode(countryCode, i + 1);
        insertTeam.run(teamId, instanceId, sessionId, joinCode, country, t);
        allTeams.push({ teamId, instanceId, instanceNum: i + 1, country, joinCode, teamNumber: t });
      }
    }

    db.exec('COMMIT');
    return { sessionId, facilitatorCode, allTeams, config };
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

function getSessionByFacilitatorCode(code) {
  return db.prepare('SELECT * FROM sessions WHERE facilitator_code = ?').get(code);
}

function getSessionById(id) {
  return db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
}

function getTeamByJoinCode(code) {
  return db.prepare('SELECT * FROM teams WHERE join_code = ?').get(code);
}

function getTeamParticipants(teamId) {
  return db.prepare('SELECT * FROM participants WHERE team_id = ?').all(teamId);
}

const ROLE_ORDER = ['Manager', 'Person 1', 'Person 2', 'Person 3', 'Person 4', 'Person 5'];

// Returns { participant, rejoined } or null if the team is already full.
function joinTeam({ teamId, sessionId, name, socketId, participantToken }) {
  // ── 1. Token-based rejoin (most reliable — survives name changes) ──────────
  if (participantToken) {
    const byToken = db.prepare(
      'SELECT * FROM participants WHERE id = ? AND team_id = ?'
    ).get(participantToken, teamId);
    if (byToken) {
      db.prepare('UPDATE participants SET socket_id = ? WHERE id = ?').run(socketId, byToken.id);
      const refreshed = db.prepare('SELECT * FROM participants WHERE id = ?').get(byToken.id);
      return { participant: refreshed, rejoined: true };
    }
  }

  // ── 2. Name-based rejoin (fallback for different device / cleared storage) ─
  const byName = db.prepare(
    'SELECT * FROM participants WHERE team_id = ? AND name = ?'
  ).get(teamId, name);
  if (byName) {
    db.prepare('UPDATE participants SET socket_id = ? WHERE id = ?').run(socketId, byName.id);
    const refreshed = db.prepare('SELECT * FROM participants WHERE id = ?').get(byName.id);
    return { participant: refreshed, rejoined: true };
  }

  // ── 3. New join — read claimed roles and pick next available atomically ────
  // Single synchronous read+write: Node.js is single-threaded so no concurrent
  // mutation is possible between these two statements.
  const takenRoles = new Set(
    db.prepare('SELECT role FROM participants WHERE team_id = ?').all(teamId).map(r => r.role)
  );
  const role = ROLE_ORDER.find(r => !takenRoles.has(r));

  if (!role) return null; // team is full — caller sends the error

  const id = uuidv4();
  db.prepare(
    'INSERT INTO participants (id, team_id, session_id, name, role, socket_id) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, teamId, sessionId, name, role, socketId);

  return {
    participant: db.prepare('SELECT * FROM participants WHERE id = ?').get(id),
    rejoined: false,
  };
}

function getFullSessionState(sessionId) {
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
  if (!session) return null;

  const instances = db.prepare('SELECT * FROM instances WHERE session_id = ? ORDER BY instance_number').all(sessionId);

  const instancesWithTeams = instances.map(inst => {
    const teams = db.prepare('SELECT * FROM teams WHERE instance_id = ? ORDER BY team_number').all(inst.id);
    const teamsWithMembers = teams.map(team => {
      const members = db.prepare('SELECT * FROM participants WHERE team_id = ?').all(team.id);
      return { ...team, members, countryData: COUNTRIES[team.country] };
    });
    return { ...inst, teams: teamsWithMembers };
  });

  return {
    ...session,
    config: JSON.parse(session.config),
    instances: instancesWithTeams
  };
}

function getWorkspace(instanceId, eventName, round) {
  return db.prepare('SELECT * FROM workspaces WHERE instance_id = ? AND event_name = ? AND round = ?')
    .get(instanceId, eventName, round);
}

function upsertWorkspace({ sessionId, instanceId, eventName, round, teamId, content }) {
  const existing = getWorkspace(instanceId, eventName, round);
  if (existing) {
    db.prepare('UPDATE workspaces SET content = ?, updated_at = unixepoch() WHERE id = ?')
      .run(content, existing.id);
    return existing.id;
  } else {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO workspaces (id, session_id, instance_id, event_name, round, team_id, content)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, sessionId, instanceId, eventName, round, teamId, content);
    return id;
  }
}

function getHandoffNote(instanceId, eventName, fromRound) {
  return db.prepare('SELECT * FROM handoff_notes WHERE instance_id = ? AND event_name = ? AND from_round = ?')
    .get(instanceId, eventName, fromRound);
}

function upsertHandoffNote({ sessionId, instanceId, eventName, fromRound, teamId, content, submitted = false }) {
  const existing = getHandoffNote(instanceId, eventName, fromRound);
  if (existing) {
    const submitTime = submitted ? Math.floor(Date.now() / 1000) : existing.submitted_at;
    db.prepare('UPDATE handoff_notes SET content = ?, submitted = ?, submitted_at = ? WHERE id = ?')
      .run(content, submitted ? 1 : existing.submitted, submitTime, existing.id);
    return existing.id;
  } else {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO handoff_notes (id, session_id, instance_id, event_name, from_round, team_id, content, submitted, submitted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, sessionId, instanceId, eventName, fromRound, teamId, content, submitted ? 1 : 0, submitted ? Math.floor(Date.now() / 1000) : null);
    return id;
  }
}

function getInstanceEvents(instanceId) {
  const instance = db.prepare('SELECT * FROM instances WHERE id = ?').get(instanceId);
  if (!instance) return null;

  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(instance.session_id);
  const teams = db.prepare('SELECT * FROM teams WHERE instance_id = ? ORDER BY team_number').all(instanceId);

  const config = JSON.parse(session.config);
  const round = session.current_round;

  return teams.map((team, idx) => {
    const eventIdx = idx % EVENTS.length;
    return {
      team,
      event: EVENTS[eventIdx],
      eventIndex: eventIdx
    };
  });
}

function getEventAssignment(instanceId, round) {
  const instance = db.prepare('SELECT * FROM instances WHERE id = ?').get(instanceId);
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(instance.session_id);
  const config = JSON.parse(session.config);
  const events = config.customEvents || EVENTS;
  const teams = db.prepare('SELECT * FROM teams WHERE instance_id = ? ORDER BY team_number').all(instanceId);

  return teams.map((team, teamIdx) => {
    const eventIdx = (teamIdx + (round - 1)) % events.length;
    return {
      team,
      event: events[eventIdx],
      eventIndex: eventIdx
    };
  });
}

function updateFacilitatorNotes(sessionId, notes) {
  db.prepare('UPDATE sessions SET facilitator_notes = ? WHERE id = ?').run(notes, sessionId);
}

function getDebriefData(sessionId) {
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
  const config = JSON.parse(session.config);
  const events = config.customEvents || EVENTS;
  const instances = db.prepare('SELECT * FROM instances WHERE session_id = ?').all(sessionId);

  return instances.map(inst => {
    const teams = db.prepare('SELECT * FROM teams WHERE instance_id = ? ORDER BY team_number').all(inst.id);

    const eventData = events.map((eventName, eventIdx) => {
      const rounds = [1, 2, 3].map(r => {
        const assignment = getEventAssignment(inst.id, r);
        const teamForRound = assignment.find(a => a.eventIndex === eventIdx);
        const workspace = getWorkspace(inst.id, eventName, r);
        const handoff = r < 3 ? getHandoffNote(inst.id, eventName, r) : null;

        return {
          round: r,
          team: teamForRound?.team,
          content: workspace?.content || '',
          handoffNote: handoff?.content || '',
          handoffSubmitted: handoff?.submitted || false
        };
      });

      return { eventName, rounds };
    });

    const reflections = db.prepare(`
      SELECT r.*, p.name, p.role, t.country
      FROM reflections r
      JOIN participants p ON r.participant_id = p.id
      JOIN teams t ON p.team_id = t.id
      WHERE r.session_id = ? AND r.instance_id = ?
    `).all(sessionId, inst.id);

    return { instance: inst, teams, eventData, reflections };
  });
}



module.exports = {
  COUNTRIES,
  EVENTS,
  ROLE_ORDER,
  calculateConfig,
  createSession,
  getSessionByFacilitatorCode,
  getSessionById,
  getTeamByJoinCode,
  getTeamParticipants,
  joinTeam,
  getFullSessionState,
  updateFacilitatorNotes,
  getWorkspace,
  upsertWorkspace,
  getHandoffNote,
  upsertHandoffNote,
  getEventAssignment,
  getDebriefData,
  generateCode
};
