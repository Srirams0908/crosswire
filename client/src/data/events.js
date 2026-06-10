export const EVENT_NAMES = ['Press Conference', 'Product Launch', 'Internal Conference'];

const GENERIC_EVENT_DEF = {
  framing: 'Your team is working on this event. Read what the previous team left you, then continue building the plan below.',
  tasks: [
    { id: 'task1', label: 'TASK 1 — AGENDA', description: 'Plan the structure of the event.', type: 'table', columns: ['Step', 'Activity / Description', 'Notes'], colWidths: ['w-12', 'flex-1', 'w-36'] },
    { id: 'task2', label: 'TASK 2 — MATERIALS', description: 'List what your team will need to prepare or present.', type: 'table', columns: ['Item', 'Purpose', 'Responsible Person'], colWidths: ['w-32', 'flex-1', 'w-36'] },
    { id: 'task3', label: 'TASK 3 — NOTES', description: 'Define the ground rules and any additional notes.', type: 'text' },
  ],
};

export function getEventDef(name) {
  return EVENTS_DATA[name] || { ...GENERIC_EVENT_DEF, framing: `Your team is working on: ${name}. Read what the previous team left you, then continue building the plan below.` };
}

export const EVENTS_DATA = {
  'Press Conference': {
    framing: 'Your team is organizing an international Press Conference. This is a high-stakes public event — journalists, media, and external stakeholders will be present. You have been handed work from another team. Read what they left you, then continue developing the plan below.',
    tasks: [
      {
        id: 'task1',
        label: 'TASK 1 — AGENDA',
        description: 'Plan the structure of the event. What happens first, next, and last? Who is involved?',
        type: 'table',
        columns: ['Step', 'Activity / Description', 'Notes'],
        colWidths: ['w-12', 'flex-1', 'w-36'],
      },
      {
        id: 'task2',
        label: 'TASK 2 — MATERIALS',
        description: 'List what your team will need to prepare or present at the conference.',
        type: 'table',
        columns: ['Item', 'Purpose', 'Responsible Person'],
        colWidths: ['w-32', 'flex-1', 'w-36'],
      },
      {
        id: 'task3',
        label: 'TASK 3 — RULES',
        description: 'Define the internal rules for running this Press Conference smoothly. How will your team manage questions from journalists? What is off-limits? What is the protocol if something goes wrong?',
        type: 'text',
      },
    ],
  },
  'Product Launch': {
    framing: 'Your team is preparing a Product Launch event. This is an external-facing event where a new product will be revealed to clients, partners, and press. Read what the previous team planned, then continue developing it below.',
    tasks: [
      {
        id: 'task1',
        label: 'TASK 1 — AGENDA',
        description: 'Plan the structure of the launch event. What happens first, next, and last? Who presents or performs each part?',
        type: 'table',
        columns: ['Step', 'Activity / Description', 'Notes'],
        colWidths: ['w-12', 'flex-1', 'w-36'],
      },
      {
        id: 'task2',
        label: 'TASK 2 — MATERIALS',
        description: 'List everything your team will need to prepare, produce, or present for the launch.',
        type: 'table',
        columns: ['Item', 'Purpose', 'Responsible Person'],
        colWidths: ['w-32', 'flex-1', 'w-36'],
      },
      {
        id: 'task3',
        label: 'TASK 3 — RULES',
        description: 'Define how the launch event will run. What are the rules for the team on the day? How do you handle technical problems, late arrivals, or unexpected questions from the audience?',
        type: 'text',
      },
    ],
  },
  'Internal Conference': {
    framing: 'Your team is managing an Internal Conference — an event for employees and internal stakeholders only. Unlike public events, this one is about alignment, learning, and internal culture. Read what the previous team planned, then continue developing it below.',
    tasks: [
      {
        id: 'task1',
        label: 'TASK 1 — AGENDA',
        description: 'Plan the structure of the conference. What sessions, activities, or presentations will take place? In what order?',
        type: 'table',
        columns: ['Step', 'Activity / Description', 'Notes'],
        colWidths: ['w-12', 'flex-1', 'w-36'],
      },
      {
        id: 'task2',
        label: 'TASK 2 — MATERIALS',
        description: 'List what your team will need to prepare or distribute for this internal event.',
        type: 'table',
        columns: ['Item', 'Purpose', 'Responsible Person'],
        colWidths: ['w-32', 'flex-1', 'w-36'],
      },
      {
        id: 'task3',
        label: 'TASK 3 — RULES',
        description: 'Define the ground rules for participation. How do you want people to engage? What behavior is expected? What happens if someone dominates the discussion or disengages?',
        type: 'text',
      },
    ],
  },
};

// ── Content shape helpers ──────────────────────────────────────────────────────

export function emptyRows(n = 3) {
  return Array.from({ length: n }, () => ({ c0: '', c1: '', c2: '' }));
}

export function emptyContent() {
  return { v: 2, task1: emptyRows(), task2: emptyRows(), task3: '' };
}

export function parseContent(raw) {
  if (!raw || !raw.trim()) return emptyContent();
  try {
    const obj = JSON.parse(raw);
    if (obj && obj.v === 2) {
      return {
        v: 2,
        task1: obj.task1?.length ? obj.task1 : emptyRows(),
        task2: obj.task2?.length ? obj.task2 : emptyRows(),
        task3: obj.task3 ?? '',
      };
    }
  } catch {}
  // Legacy plain text — surface in task3 as fallback
  return { v: 2, task1: emptyRows(), task2: emptyRows(), task3: raw };
}

// Extract plain text from any content (for analytics, observer preview, etc.)
export function extractText(raw) {
  if (!raw || !raw.trim()) return '';
  const parsed = parseContent(raw);
  const rows = [...(parsed.task1 || []), ...(parsed.task2 || [])];
  const rowText = rows.map(r => [r.c0, r.c1, r.c2].filter(Boolean).join(' ')).join(' ');
  return [rowText, parsed.task3].filter(Boolean).join(' ');
}
