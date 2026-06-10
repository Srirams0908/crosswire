import jsPDF from 'jspdf';
import { parseContent, EVENTS_DATA } from '../data/events';

// ── Design tokens ─────────────────────────────────────────────────────────────
const NAVY   = [10, 24, 80];
const AMBER  = [210, 130, 10];   // slightly darker amber — prints better
const GRAY1  = [245, 246, 250];  // very light fill
const GRAY2  = [220, 222, 230];  // mid-tone borders/lines
const GRAY3  = [120, 125, 140];  // secondary text
const GRAY4  = [60,  65,  80];   // body text
const WHITE  = [255, 255, 255];

const PAGE_W  = 210;
const PAGE_H  = 297;
const MARGIN  = 18;
const CW      = PAGE_W - MARGIN * 2;   // content width = 174mm
const FOOTER_H = 10;
const SAFE_BOTTOM = PAGE_H - MARGIN - FOOTER_H;

const REFLECTION_QUESTIONS = [
  'What changed most between Round 1 and Round 3 of your event?',
  'What was the biggest communication challenge your team faced?',
  'What would you do differently in a real international project?',
];

// ── Low-level helpers ─────────────────────────────────────────────────────────

function rgb(doc, color, target = 'fill') {
  if (target === 'fill') doc.setFillColor(...color);
  else if (target === 'draw') doc.setDrawColor(...color);
  else doc.setTextColor(...color);
}

function font(doc, style, size) {
  doc.setFont('helvetica', style);
  doc.setFontSize(size);
}

// Wraps text to fit width, returns array of lines
function wrap(doc, text, maxW) {
  return doc.splitTextToSize(text || '', maxW);
}

// Returns line height for a given font size (generous leading)
function lh(size) { return size * 0.45; }

// ── Stateful layout engine ────────────────────────────────────────────────────

function createLayout(doc) {
  let y = MARGIN;
  let page = 1;
  let totalPages = 1;  // filled in later via two-pass or estimate

  function addPage() {
    drawFooter(doc, page, '…');
    doc.addPage();
    page++;
    y = MARGIN;
    // Subtle top border
    rgb(doc, NAVY, 'fill');
    doc.rect(MARGIN, MARGIN - 2, CW, 0.4, 'F');
    rgb(doc, [0,0,0], 'fill');
  }

  function need(mm) {
    if (y + mm > SAFE_BOTTOM) addPage();
  }

  function gap(mm) { y += mm; }

  function rule(color = GRAY2, thickness = 0.3) {
    rgb(doc, color, 'fill');
    doc.rect(MARGIN, y, CW, thickness, 'F');
    y += thickness + 1;
    rgb(doc, [0,0,0], 'fill');
  }

  function getY() { return y; }
  function setY(val) { y = val; }
  function getPage() { return page; }

  return { need, gap, rule, getY, setY, getPage, addPage };
}

// ── Reusable blocks ───────────────────────────────────────────────────────────

function drawFooter(doc, pageNum, totalStr) {
  const footerY = PAGE_H - 9;
  font(doc, 'normal', 7);
  rgb(doc, GRAY3, 'text');
  doc.text('CrossWire — Session Debrief Report', MARGIN, footerY);
  doc.text(`Page ${pageNum}`, PAGE_W - MARGIN, footerY, { align: 'right' });
  rgb(doc, [0,0,0], 'text');
}

function sectionBar(doc, layout, label) {
  layout.need(14);
  rgb(doc, NAVY, 'fill');
  doc.roundedRect(MARGIN, layout.getY(), CW, 10, 1.5, 1.5, 'F');
  font(doc, 'bold', 10);
  rgb(doc, WHITE, 'text');
  doc.text(label, MARGIN + 5, layout.getY() + 6.5);
  rgb(doc, [0,0,0], 'text');
  layout.gap(14);
}

function roundBadge(doc, layout, num) {
  const cx = MARGIN + 4;
  const cy = layout.getY() + 4;
  rgb(doc, GRAY1, 'fill');
  rgb(doc, GRAY2, 'draw');
  doc.setLineWidth(0.3);
  doc.circle(cx, cy, 3.5, 'FD');
  font(doc, 'bold', 8);
  rgb(doc, NAVY, 'text');
  doc.text(String(num), cx, cy + 0.5 * lh(8) + 0.5, { align: 'center' });
  rgb(doc, [0,0,0], 'text');
}

// Content block with optional left-border accent
function contentBlock(doc, layout, text, opts = {}) {
  const {
    bgColor = GRAY1,
    borderColor = null,
    paddingX = 4,
    paddingY = 3.5,
    fontSize = 9,
    fontStyle = 'normal',
    textColor = GRAY4,
    label = null,
    labelColor = GRAY3,
    indent = 0,
  } = opts;

  const blockW = CW - indent;
  const blockX = MARGIN + indent;
  const innerW = blockW - paddingX * 2;

  font(doc, fontStyle, fontSize);
  const lines = wrap(doc, text, innerW);
  const textH = lines.length * lh(fontSize) + 1;
  const blockH = textH + paddingY * 2 + (label ? 5 : 0);

  layout.need(blockH + 2);

  // Background
  rgb(doc, bgColor, 'fill');
  doc.roundedRect(blockX, layout.getY(), blockW, blockH, 1, 1, 'F');

  // Left accent border
  if (borderColor) {
    rgb(doc, borderColor, 'fill');
    doc.roundedRect(blockX, layout.getY(), 2, blockH, 0.5, 0.5, 'F');
  }

  let textY = layout.getY() + paddingY;

  // Optional label above content
  if (label) {
    font(doc, 'bold', 7);
    rgb(doc, labelColor, 'text');
    doc.text(label.toUpperCase(), blockX + paddingX + (borderColor ? 2 : 0), textY + lh(7));
    textY += 5;
  }

  // Body text
  font(doc, fontStyle, fontSize);
  rgb(doc, textColor, 'text');
  lines.forEach((line, i) => {
    doc.text(line, blockX + paddingX + (borderColor ? 2 : 0), textY + lh(fontSize) + i * lh(fontSize));
  });

  rgb(doc, [0,0,0], 'text');
  layout.gap(blockH + 2);
}

function teamLabel(doc, layout, team, roundNum) {
  layout.need(8);
  font(doc, 'bold', 9);
  rgb(doc, NAVY, 'text');
  doc.text(`${team?.country || '—'} Team`, MARGIN + 11, layout.getY() + 4);
  font(doc, 'normal', 8);
  rgb(doc, GRAY3, 'text');
  doc.text(`Round ${roundNum}`, MARGIN + 11 + doc.getTextWidth(`${team?.country || '—'} Team`) + 3, layout.getY() + 4);
  rgb(doc, [0,0,0], 'text');
  layout.gap(7);
}

function handoffArrow(doc, layout) {
  layout.need(8);
  const cx = MARGIN + CW / 2;
  const arrowY = layout.getY() + 3;
  font(doc, 'normal', 7);
  rgb(doc, GRAY3, 'text');
  doc.text('Handoff Note', cx, arrowY, { align: 'center' });
  // Arrow shaft
  rgb(doc, AMBER, 'draw');
  doc.setLineWidth(0.4);
  doc.line(cx, arrowY + 1.5, cx, arrowY + 3.5);
  // Arrowhead
  doc.line(cx - 1.5, arrowY + 2.5, cx, arrowY + 4);
  doc.line(cx + 1.5, arrowY + 2.5, cx, arrowY + 4);
  rgb(doc, [0,0,0], 'text');
  doc.setLineWidth(0.2);
  layout.gap(8);
}

// ── Cover page ────────────────────────────────────────────────────────────────

function drawCover(doc, layout, debriefData, sessionId, sessionDate) {
  const allTeams = debriefData.flatMap(d => d.teams);
  const allParticipants = allTeams.flatMap(t => t.members || []);
  const allReflections = debriefData.flatMap(d => d.reflections || []);

  // Top amber rule
  rgb(doc, AMBER, 'fill');
  doc.rect(MARGIN, MARGIN, CW, 1.5, 'F');
  layout.setY(MARGIN + 6);

  // Wordmark
  font(doc, 'bold', 28);
  rgb(doc, NAVY, 'text');
  doc.text('CrossWire', MARGIN, layout.getY() + 16);
  layout.gap(20);

  font(doc, 'normal', 12);
  rgb(doc, GRAY3, 'text');
  doc.text('Session Debrief Report', MARGIN, layout.getY());
  layout.gap(12);

  // Bottom rule under title
  layout.rule(GRAY2, 0.4);
  layout.gap(8);

  // Session meta grid
  const metaItems = [
    ['Date', sessionDate],
    ['Participants', String(allParticipants.length)],
    ['Instances', String(debriefData.length)],
    ['Events per instance', '3'],
    ['Rounds', '3'],
    ['Reflections submitted', String(allReflections.length)],
  ];

  font(doc, 'normal', 9);
  const colW = CW / 2;
  metaItems.forEach(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = MARGIN + col * colW;
    const y = layout.getY() + row * 8;

    rgb(doc, GRAY3, 'text');
    doc.text(label, x, y);
    font(doc, 'bold', 9);
    rgb(doc, NAVY, 'text');
    doc.text(value, x + colW / 2, y);
    font(doc, 'normal', 9);
  });
  layout.gap(Math.ceil(metaItems.length / 2) * 8 + 10);

  // Teams
  layout.rule(GRAY2, 0.4);
  layout.gap(8);

  font(doc, 'bold', 8);
  rgb(doc, GRAY3, 'text');
  doc.text('TEAMS', MARGIN, layout.getY());
  layout.gap(6);

  debriefData.forEach((instData) => {
    if (debriefData.length > 1) {
      font(doc, 'bold', 8);
      rgb(doc, NAVY, 'text');
      doc.text(`Instance ${instData.instance.instance_number}`, MARGIN, layout.getY());
      layout.gap(5);
    }

    instData.teams.forEach((team, ti) => {
      const members = team.members || [];
      const col = ti % 3;
      const row = Math.floor(ti / 3);
      const x = MARGIN + col * (CW / 3);
      const y = layout.getY() + row * 10;

      rgb(doc, GRAY1, 'fill');
      doc.roundedRect(x, y - 1, CW / 3 - 2, 9, 1, 1, 'F');
      font(doc, 'bold', 8);
      rgb(doc, NAVY, 'text');
      doc.text(team.country, x + 3, y + 3.5);
      font(doc, 'normal', 7);
      rgb(doc, GRAY3, 'text');
      doc.text(`${members.length} member${members.length !== 1 ? 's' : ''} · ${team.join_code}`, x + 3, y + 7.5);
    });

    const teamRows = Math.ceil(instData.teams.length / 3);
    layout.gap(teamRows * 10 + 4);
  });

  // Session ID at bottom of cover
  layout.setY(PAGE_H - 22);
  layout.rule(GRAY2, 0.3);
  layout.gap(3);
  font(doc, 'normal', 7);
  rgb(doc, GRAY3, 'text');
  doc.text(`Session ID: ${sessionId}`, MARGIN, layout.getY());
  doc.text(`Generated by CrossWire on ${sessionDate}`, PAGE_W - MARGIN, layout.getY(), { align: 'right' });
}

// ── Structured workspace content renderer ─────────────────────────────────────

function drawStructuredContent(doc, layout, eventDef, parsed) {
  const indent = 10;
  const blockW = CW - indent;
  const blockX = MARGIN + indent;

  eventDef.tasks.forEach(task => {
    layout.need(10);

    // Task label
    font(doc, 'bold', 7);
    rgb(doc, AMBER, 'text');
    doc.text(task.label, blockX, layout.getY());
    layout.gap(5);

    if (task.type === 'table') {
      const rows = (parsed[task.id] || []).filter(r => r.c0 || r.c1 || r.c2);
      if (!rows.length) { layout.gap(2); return; }

      // Column headers
      layout.need(6);
      rgb(doc, GRAY1, 'fill');
      doc.rect(blockX, layout.getY(), blockW, 5, 'F');
      font(doc, 'bold', 6.5);
      rgb(doc, GRAY3, 'text');
      const colWidths = [blockW * 0.18, blockW * 0.52, blockW * 0.30];
      task.columns.forEach((col, ci) => {
        const cx = blockX + colWidths.slice(0, ci).reduce((a, b) => a + b, 0) + 2;
        doc.text(col, cx, layout.getY() + 3.5);
      });
      layout.gap(5.5);

      // Data rows
      rows.forEach(row => {
        const vals = [row.c0, row.c1, row.c2];
        const maxLines = Math.max(...vals.map((v, ci) => wrap(doc, v, colWidths[ci] - 3).length));
        const rowH = maxLines * 4 + 3;
        layout.need(rowH);

        rgb(doc, [0,0,0], 'draw');
        doc.setLineWidth(0.1);
        doc.rect(blockX, layout.getY(), blockW, rowH);

        font(doc, 'normal', 8);
        rgb(doc, GRAY4, 'text');
        let colX = blockX;
        vals.forEach((val, ci) => {
          const lines = wrap(doc, val, colWidths[ci] - 3);
          lines.forEach((l, li) => doc.text(l, colX + 2, layout.getY() + 3 + li * 4));
          colX += colWidths[ci];
        });
        layout.gap(rowH + 1);
      });
      layout.gap(3);

    } else if (parsed.task3?.trim()) {
      contentBlock(doc, layout, parsed.task3, {
        bgColor: GRAY1, fontSize: 8.5, textColor: GRAY4, indent,
      });
    } else {
      layout.gap(2);
    }
  });
}

// ── Event section ─────────────────────────────────────────────────────────────

function drawEvent(doc, layout, eventName, rounds, instanceLabel) {
  layout.need(20);
  // Instance context label if needed
  if (instanceLabel) {
    font(doc, 'normal', 7.5);
    rgb(doc, GRAY3, 'text');
    doc.text(instanceLabel, MARGIN, layout.getY());
    layout.gap(5);
  }

  sectionBar(doc, layout, eventName);

  rounds.forEach(({ round, team, content, handoffNote, handoffSubmitted }, idx) => {
    // Round header row
    roundBadge(doc, layout, round);
    teamLabel(doc, layout, team, round);

    // Workspace content — structured (v2) or plain text
    const parsed = parseContent(content);
    const eventDef = EVENTS_DATA[eventName];

    if (eventDef && parsed.v === 2 && content?.trim()) {
      drawStructuredContent(doc, layout, eventDef, parsed);
    } else {
      const bodyText = content?.trim() || '(Nothing was written during this round.)';
      contentBlock(doc, layout, bodyText, {
        bgColor: GRAY1, fontSize: 9, fontStyle: 'normal',
        textColor: content?.trim() ? GRAY4 : GRAY3, indent: 10,
      });
    }

    // Handoff note — shown between rounds, not after round 3
    if (round < 3) {
      handoffArrow(doc, layout);

      const hnText = handoffNote?.trim()
        ? `"${handoffNote.trim()}"`
        : '(No handoff note was submitted.)';

      contentBlock(doc, layout, hnText, {
        bgColor: [255, 250, 235],
        borderColor: AMBER,
        fontSize: 8.5,
        fontStyle: handoffNote?.trim() ? 'italic' : 'normal',
        textColor: handoffNote?.trim() ? [100, 75, 10] : GRAY3,
        label: handoffSubmitted ? 'Handoff note — submitted' : 'Handoff note — auto-saved at round end',
        labelColor: [150, 110, 20],
        indent: 10,
      });

      layout.gap(3);
    }
  });
}

// ── Reflections section ───────────────────────────────────────────────────────

function drawReflections(doc, layout, allReflections) {
  if (!allReflections.length) return;

  layout.addPage();
  sectionBar(doc, layout, 'Team Reflections');
  layout.gap(2);

  REFLECTION_QUESTIONS.forEach((question, qi) => {
    const answers = allReflections
      .map(r => ({ name: r.name, role: r.role, country: r.country, answer: r[`q${qi + 1}`] }))
      .filter(a => a.answer?.trim());

    if (!answers.length) return;

    layout.need(12);

    // Question header
    font(doc, 'bold', 9);
    rgb(doc, NAVY, 'text');
    const qLines = wrap(doc, `Q${qi + 1}  ${question}`, CW);
    qLines.forEach((line, i) => {
      doc.text(line, MARGIN, layout.getY() + lh(9) + i * lh(9));
    });
    layout.gap(qLines.length * lh(9) + 4);

    // Answers grouped under question
    answers.forEach(({ name, role, country, answer }) => {
      layout.need(16);

      // Attribution line
      font(doc, 'bold', 8);
      rgb(doc, NAVY, 'text');
      doc.text(`${name}`, MARGIN + 2, layout.getY());
      font(doc, 'normal', 7.5);
      rgb(doc, GRAY3, 'text');
      doc.text(`${role} · ${country}`, MARGIN + 2 + doc.getTextWidth(name) + 3, layout.getY());
      layout.gap(5);

      contentBlock(doc, layout, answer, {
        bgColor: GRAY1,
        borderColor: GRAY2,
        fontSize: 8.5,
        textColor: GRAY4,
        indent: 2,
      });
    });

    // Separator between questions
    layout.gap(4);
    if (qi < REFLECTION_QUESTIONS.length - 1) {
      layout.rule(GRAY2, 0.3);
      layout.gap(6);
    }
  });
}

// ── Facilitator notes section ─────────────────────────────────────────────────

function drawFacilitatorNotes(doc, layout, notes) {
  layout.addPage();

  sectionBar(doc, layout, 'Facilitator Notes');
  layout.gap(2);

  // Confidentiality label
  font(doc, 'normal', 7.5);
  rgb(doc, GRAY3, 'text');
  doc.text('Private — recorded during the session by the facilitator. Not shared with participants.', MARGIN, layout.getY());
  layout.gap(7);

  if (notes.trim()) {
    // Render as paragraphs, preserving blank-line breaks
    const paragraphs = notes.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
    paragraphs.forEach((para, i) => {
      contentBlock(doc, layout, para, {
        bgColor: GRAY1,
        borderColor: NAVY,
        fontSize: 9,
        textColor: GRAY4,
      });
      if (i < paragraphs.length - 1) layout.gap(2);
    });
  } else {
    font(doc, 'normal', 9);
    rgb(doc, GRAY3, 'text');
    doc.text('No notes were recorded for this session.', MARGIN, layout.getY());
    layout.gap(6);
  }
}

// ── Page-number finalisation ──────────────────────────────────────────────────

function finaliseFooters(doc) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    drawFooter(doc, i, total);
  }
}

// ── Public entry point ────────────────────────────────────────────────────────

export function generateSessionPDF(debriefData, sessionId, facilitatorNotes = '') {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const layout = createLayout(doc);

  const sessionDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  // ── Cover ──
  drawCover(doc, layout, debriefData, sessionId, sessionDate);

  // ── Events ──
  debriefData.forEach((instData, instIdx) => {
    const instanceLabel = debriefData.length > 1
      ? `Instance ${instData.instance.instance_number}`
      : null;

    instData.eventData.forEach(({ eventName, rounds }, evIdx) => {
      doc.addPage();
      layout.setY(MARGIN);

      // Reset to clean top-of-page
      rgb(doc, NAVY, 'fill');
      doc.rect(MARGIN, MARGIN - 2, CW, 0.4, 'F');
      rgb(doc, [0,0,0], 'fill');
      layout.gap(4);

      drawEvent(doc, layout, eventName, rounds, instanceLabel);
    });
  });

  // ── Facilitator notes ──
  drawFacilitatorNotes(doc, layout, facilitatorNotes);

  // ── Reflections ──
  const allReflections = debriefData.flatMap(d => d.reflections || []);
  if (allReflections.length) {
    drawReflections(doc, layout, allReflections);
  }

  // ── Finalise footers ──
  finaliseFooters(doc);

  const slug = sessionId?.slice(0, 8) ?? 'session';
  doc.save(`crosswire-debrief-${slug}.pdf`);
}
