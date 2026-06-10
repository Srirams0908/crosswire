# CrossWire

**Where communication gets real.**

CrossWire is a live intercultural communication simulation used in business schools and corporate workshops. Teams from different "countries" collaborate on structured event planning across three rounds, handing their work off to the next team after each round — surfacing the communication breakdowns, style clashes, and coordination failures that occur in real global organizations.

---

## How the simulation works

### The core loop

Each session has 3 rounds. Each team is assigned one event per round (Press Conference, Product Launch, or Internal Conference). After every round, **events rotate**: each team inherits the work that the previous team left behind, reads their handoff note, and continues building from it.

```
Round 1:  Team A → Press Conference     Team B → Product Launch     Team C → Internal Conference
Round 2:  Team A → Product Launch       Team B → Internal Conf.     Team C → Press Conference
Round 3:  Team A → Internal Conf.       Team B → Press Conference   Team C → Product Launch
```

By Round 3, every team has touched every event. The debrief then shows the full evolution of each event across all three teams — and the gaps between what was handed off and what was picked up are where the learning happens.

### What each round contains

Each event workspace has three structured tasks:

| Task | Type | Description |
|---|---|---|
| TASK 1 — AGENDA | Table | Step / Activity / Notes |
| TASK 2 — MATERIALS | Table | Item / Purpose / Responsible Person |
| TASK 3 — RULES | Free text | Team protocols, contingencies, ground rules |

When a new team opens a workspace, the previous team's completed work appears **read-only above** their editable area. They see what was inherited, then build on, correct, or override it.

### Handoff notes

In the final stretch of each round (the last 30% of round duration, max 3 minutes), the handoff note panel unlocks. Teams write what the next team *needs to know* — decisions made, context they'd otherwise lose, warnings. At round end, any unsubmitted notes are auto-saved. The transition screen shows participants the incoming handoff note before the next round starts.

### Debrief

After Round 3, participants complete a 3-question reflection:
1. What changed most between Round 1 and Round 3 of your event?
2. What was the biggest communication challenge your team faced?
3. What would you do differently in a real international project?

The facilitator sees a full debrief view: every event's evolution round by round, handoff notes, all reflections, and a post-session analytics panel (handoff word counts, reflection response rates, top content words). Everything exports to PDF.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router v6, Tailwind CSS, Vite |
| Backend | Node.js 22+, Express |
| Real-time | Socket.IO v4 |
| Database | SQLite via Node.js built-in `node:sqlite` (no native compilation) |
| PDF export | jsPDF + jsPDF-AutoTable |
| QR codes | qrcode.react |

**Requires Node.js 22+** — the server uses `node:sqlite`, which is built into Node 22 and requires no separate native module.

---

## Getting started

```bash
# 1. Clone the repo
git clone https://github.com/Srirams0908/crosswire.git
cd crosswire

# 2. Install all dependencies (root + client + server)
npm run install:all

# 3. Start both dev servers
npm run dev
```

| Service | URL |
|---|---|
| Client (Vite) | http://localhost:5173 |
| Server (Express) | http://localhost:3001 |

The client proxies `/api` and Socket.IO to the server in dev mode. The SQLite database (`server/crosswire.db`) is created automatically on first run.

---

## How to run a session

### As a facilitator

1. Go to the landing page → **I'm a Facilitator**
2. Complete the 3-step setup wizard:
   - **Step 1:** Set participant count (12–50) and round duration (5, 10, or 15 min). A live timeline shows when prompts fire (2-min warning, handoff unlock, round end).
   - **Step 2:** Assign a country to each team slot across all instances.
   - **Step 3:** Review the generated join codes.
3. Display join codes to participants (or use **Projector View** for a fullscreen QR grid).
4. Open the **Facilitator Dashboard** → click **Start Round 1**.
5. Monitor teams: see who has joined, which events are assigned, and which handoff notes have been submitted.
6. Click **Trigger Handoff** to end the round early, or let the timer run to zero.
7. Repeat for Rounds 2 and 3. After Round 3 ends, click **Open Debrief**.
8. Click **Close Session** when done — all participants see the end card.

**Facilitator-only features:**
- Private notes panel (auto-saved, included in the full PDF export)
- Broadcast messages to all participants
- Skip debrief (jumps directly to the debrief screen)
- Post-session analytics: handoff word counts, reflection rates, top content words

### As a participant

1. Landing page → **I'm a Participant**
2. Enter your 4-character team join code
3. Enter your first name — you'll be assigned a role automatically
4. Wait for the facilitator to start Round 1

If you refresh or reconnect (same device), you rejoin via a token stored in `localStorage`. On a different device, you rejoin by name.

### As an observer

1. Landing page → **Join as Observer**
2. Enter the 6-character facilitator code
3. Watch all team workspaces and handoff notes update live (read-only)

---

## Countries and roles

Six countries are available, each with a distinct communication style and six role-specific behavior cards (Manager + Person 1–5). Roles are assigned server-side in fixed order as participants join; each slot can only be taken once per team.

| Country | Communication style |
|---|---|
| 🇧🇷 Brazil | Relationship-first, high-context, expressive and fast-moving |
| 🇮🇳 India | Hierarchical yet collaborative, indirect, consensus-oriented |
| 🇩🇪 Germany | Direct, structured, precision-focused, low-context |
| 🇯🇵 Japan | Harmony-preserving, very high-context, group consensus (nemawashi) |
| 🇫🇷 France | Intellectual, debate-oriented, comfortable with ambiguity |
| 🇳🇬 Nigeria | Adaptive, entrepreneurial, relationship-driven, oral-tradition-oriented |

Role assignment order: `Manager → Person 1 → Person 2 → Person 3 → Person 4 → Person 5`

Teams are capped at 6 participants. A 7th join attempt on a full team receives an error.

---

## Participant scaling

The system auto-calculates the instance/team configuration from participant count:

| Participants | Parallel instances | Teams per instance | Total teams |
|---|---|---|---|
| 12–18 | 1 | 3 | 3 |
| 19–30 | 1 | 3–5 | 3–5 |
| 31–42 | 2 | 3 each | 6 |
| 43–50 | 3 | 3 each | 9 |

Multiple instances run the same simulation in parallel (useful for large cohorts). Each instance has its own independent set of teams, workspaces, and handoff notes, but shares the same session round clock.

---

## Project structure

```
crosswire/
├── client/                          # React frontend (Vite)
│   └── src/
│       ├── pages/
│       │   ├── Landing.jsx
│       │   ├── FacilitatorSetup.jsx      # 3-step wizard + projector view
│       │   ├── FacilitatorDashboard.jsx  # Live session control panel
│       │   ├── ParticipantJoin.jsx
│       │   ├── ParticipantGame.jsx       # Main participant loop
│       │   ├── Debrief.jsx               # Full-session debrief + PDF export
│       │   ├── ObserverJoin.jsx
│       │   ├── ObserverView.jsx          # Read-only live workspace view
│       │   └── EndCard.jsx
│       ├── components/
│       │   ├── StructuredWorkspace.jsx   # 3-task event workspace (tables + text)
│       │   ├── RoleCard.jsx              # Country style + individual behavior card
│       │   ├── HandoffNote.jsx           # Timed handoff note panel (150-word limit)
│       │   ├── Timer.jsx                 # Countdown with warning states
│       │   ├── TransitionScreen.jsx      # Between-round incoming handoff display
│       │   ├── AnalyticsPanel.jsx        # Word count bars, reflection rates, top words
│       │   └── DebriefView.jsx           # Event timeline across 3 rounds
│       ├── data/
│       │   └── events.js                 # Event definitions, task schemas, content helpers
│       └── utils/
│           └── exportPDF.js              # Full-session + personal PDF generation
│
└── server/
    ├── index.js                          # Express routes + Socket.IO event handlers
    ├── gameLogic.js                      # Round timers, pause/resume, handoff engine
    ├── sessionManager.js                 # Session/team/participant state, COUNTRIES data
    └── db.js                             # SQLite schema + auto-migration
```

---

## Database schema

| Table | Key columns | Purpose |
|---|---|---|
| `sessions` | `id`, `facilitator_code`, `status`, `current_round`, `round_duration`, `paused_elapsed` | One row per live session |
| `instances` | `session_id`, `instance_number`, `status` | Parallel sub-sessions within a session |
| `teams` | `instance_id`, `join_code`, `country` | One team per country per instance |
| `participants` | `team_id`, `name`, `role`, `socket_id` | Individual players; socket_id nulled on disconnect |
| `workspaces` | `instance_id`, `event_name`, `round`, `content` | One row per (event × round); UNIQUE constraint |
| `handoff_notes` | `instance_id`, `event_name`, `from_round`, `content`, `submitted`, `submitted_at` | One row per (event × round); `submitted_at = NULL` means auto-saved |
| `reflections` | `participant_id`, `instance_id`, `q1`, `q2`, `q3` | Post-game reflection answers |

Workspace `content` is stored as JSON (`{ v: 2, task1: [...rows], task2: [...rows], task3: "..." }`). Legacy plain-text content is handled transparently via the `parseContent` helper.

---

## Real-time architecture

The server uses Socket.IO rooms for efficient fanout:

| Room | Members | Purpose |
|---|---|---|
| `session:<id>` | All sockets in the session | State broadcasts, timer ticks, game prompts |
| `facilitator:<id>` | Facilitator socket only | Facilitator-specific events |
| `team:<id>` | Team members only | Workspace and handoff note sync within a team |

**Key socket events (server → client):**

| Event | Payload | When |
|---|---|---|
| `session:state` | Full session object | Any state change |
| `timer:update` | `{ round, remaining, total, handoffSecs }` | Every second while active |
| `timer:paused` | `{ elapsed, remaining }` | On pause |
| `game:prompt` | `{ type, message }` | Round start, 2-min warning, round end |
| `handoff:unlock` | — | When handoff window opens |
| `game:handoff` | `{ fromRound, toRound }` | Round end (non-final rounds) |
| `game:debrief` | — | After Round 3 ends |
| `game:end` | — | On session close |
| `workspace:updated` | `{ instanceId, eventName, round, content }` | Collaborative workspace edits |
| `handoff:submitted` | `{ instanceId, eventName, fromRound, teamId }` | When a team submits their note |

---

## PDF export

Two export formats are available from the debrief screen:

- **Full session PDF** (facilitator): cover page, all events across 3 rounds (structured tables), all handoff notes, all participant reflections by country, facilitator notes, session metadata.
- **Personal PDF** (participant): their team's outputs only + their own reflection answers.

---

## License

MIT
