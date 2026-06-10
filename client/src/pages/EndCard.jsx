import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import { parseContent, EVENTS_DATA } from '../data/events';

const REFLECTION_QUESTIONS = [
  'What changed most between Round 1 and Round 3 of your event?',
  'What was the biggest communication challenge your team faced?',
  'What would you do differently in a real international project?',
];

const COUNTRY_FLAGS = {
  Brazil: '🇧🇷', India: '🇮🇳', Germany: '🇩🇪',
  Japan: '🇯🇵', France: '🇫🇷', Nigeria: '🇳🇬',
};

export default function EndCard() {
  const navigate = useNavigate();
  const [debriefData, setDebriefData] = useState(null);
  const [exporting, setExporting] = useState(false);

  const sessionId = localStorage.getItem('sessionId');
  const participantId = localStorage.getItem('participantId');
  const facilitatorCode = localStorage.getItem('facilitatorCode');
  const instanceId = localStorage.getItem('debriefInstanceId');
  const isFacilitator = Boolean(facilitatorCode);

  useEffect(() => {
    if (sessionId) {
      fetch(`/api/sessions/${sessionId}/debrief`)
        .then(r => r.json())
        .then(({ instances }) => setDebriefData(instances))
        .catch(() => {});
    }
  }, []);

  const handleParticipantPDF = async () => {
    if (!debriefData || exporting) return;
    setExporting(true);
    try {
      await exportParticipantPDF(debriefData, sessionId, participantId, instanceId);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-2xl w-full text-center animate-fade-in">

        {/* Globe */}
        <div className="text-6xl mb-8">🌍</div>

        {/* Main message */}
        <h1 className="font-display text-3xl md:text-4xl font-bold text-amber-500 mb-6 leading-tight">
          You just experienced CrossWire.
        </h1>

        <div className="text-navy-200 text-base md:text-lg leading-relaxed space-y-4 mb-10 text-balance">
          <p>
            What felt like a simple planning task was actually a live experiment in how culture,
            communication style, and distance shape the way teams work — and hand off work to each other.
          </p>
          <p>
            The friction you felt? The confusion when you received someone else's plan?
            The assumptions that didn't travel?
          </p>
          <p className="text-navy-300 font-medium">
            That happens in real organizations every day.
          </p>
        </div>

        {/* Takeaways */}
        <div className="bg-navy-900 border border-navy-700 rounded-2xl p-6 mb-10 text-left">
          <p className="text-xs text-navy-400 uppercase tracking-wider font-medium mb-4">What to take with you</p>
          <ul className="space-y-3">
            {[
              'Communication style is invisible until it collides with another one',
              'A handoff note is never just logistics — it\'s a trust signal',
              'The way you pass work on is as important as the work itself',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-amber-500 font-bold mt-0.5 flex-shrink-0">—</span>
                <span className="text-navy-200 text-sm leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Sign-off */}
        <p className="text-navy-300 text-lg font-medium mb-2">Thank you for playing.</p>
        <p className="text-navy-500 text-sm mb-10">
          CrossWire — built to make the invisible visible.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={handleParticipantPDF}
            disabled={exporting || !debriefData}
            className="btn-ghost flex items-center justify-center gap-2 text-sm px-6 py-3"
          >
            {exporting ? (
              <>
                <span className="inline-block w-3.5 h-3.5 border-2 border-navy-400/30 border-t-navy-400 rounded-full animate-spin" />
                Generating…
              </>
            ) : (
              '↓ Download my session summary'
            )}
          </button>

          {isFacilitator && (
            <button
              onClick={() => navigate('/')}
              className="btn-primary text-sm px-6 py-3"
            >
              Start a new session →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Participant PDF export ────────────────────────────────────────────────────

async function exportParticipantPDF(debriefData, sessionId, participantId, myInstanceId) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const MARGIN = 18;
  const CW = 210 - MARGIN * 2;
  const NAVY = [10, 24, 80];
  const AMBER = [210, 130, 10];
  const GRAY3 = [120, 125, 140];
  const GRAY4 = [60, 65, 80];
  const GRAY1 = [245, 246, 250];
  let y = MARGIN;

  const font = (style, size) => { doc.setFont('helvetica', style); doc.setFontSize(size); };
  const color = (rgb) => doc.setTextColor(...rgb);
  const fill = (rgb) => doc.setFillColor(...rgb);
  const wrap = (text, w) => doc.splitTextToSize(text || '', w);
  const lh = (size) => size * 0.45;

  const need = (h) => {
    if (y + h > 287 - MARGIN) {
      doc.addPage(); y = MARGIN;
      fill(NAVY); doc.rect(MARGIN, MARGIN - 2, CW, 0.3, 'F'); fill([0,0,0]);
    }
  };

  // Find the participant's instance and team
  const instData = debriefData.find(d => d.instance.id === myInstanceId) || debriefData[0];
  if (!instData) return;

  const myTeam = instData.teams?.find(t => t.members?.some(m => m.id === participantId));
  const myParticipant = myTeam?.members?.find(m => m.id === participantId);
  const myReflection = instData.reflections?.find(r => r.participant_id === participantId);

  // ── Cover ──
  fill(AMBER); doc.rect(MARGIN, MARGIN, CW, 1.2, 'F');
  y = MARGIN + 8;
  font('bold', 22); color(NAVY);
  doc.text('CrossWire', MARGIN, y); y += 10;
  font('normal', 10); color(GRAY3);
  doc.text('My Session Summary', MARGIN, y); y += 14;

  fill(GRAY1); doc.roundedRect(MARGIN, y, CW, 18, 1, 1, 'F');
  font('bold', 9); color(NAVY);
  doc.text(myParticipant?.name || 'Participant', MARGIN + 4, y + 7);
  font('normal', 8); color(GRAY3);
  doc.text(`${myParticipant?.role || ''} · ${myTeam?.country || ''} Team`, MARGIN + 4, y + 12);
  doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), 210 - MARGIN, y + 7, { align: 'right' });
  y += 24;

  // ── My team's work across all rounds ──
  font('bold', 11); color(NAVY);
  doc.text('My Team\'s Work', MARGIN, y); y += 8;

  instData.eventData?.forEach(({ eventName, rounds }) => {
    const myRounds = rounds.filter(r => r.team?.id === myTeam?.id);
    if (!myRounds.length) return;

    myRounds.forEach(({ round, content, handoffNote }) => {
      need(16);
      fill(NAVY); doc.roundedRect(MARGIN, y, CW, 8, 1, 1, 'F');
      font('bold', 8.5); color([255, 255, 255]);
      doc.text(`${eventName} — Round ${round}`, MARGIN + 4, y + 5.5);
      y += 11;

      const parsed = parseContent(content);
      const eventDef = EVENTS_DATA[eventName];

      if (eventDef) {
        eventDef.tasks.forEach(task => {
          if (task.type === 'table') {
            const rows = (parsed[task.id] || []).filter(r => r.c0 || r.c1 || r.c2);
            if (!rows.length) return;
            need(8);
            font('bold', 7); color(GRAY3);
            doc.text(task.label, MARGIN + 2, y); y += 4;
            rows.forEach(row => {
              need(6);
              const line = [row.c0, row.c1, row.c2].filter(Boolean).join(' · ');
              font('normal', 8); color(GRAY4);
              const lines = wrap(line, CW - 6);
              lines.forEach(l => { doc.text(l, MARGIN + 4, y); y += lh(8) + 0.5; });
            });
            y += 2;
          } else if (parsed.task3?.trim()) {
            need(8);
            font('bold', 7); color(GRAY3);
            doc.text(task.label, MARGIN + 2, y); y += 4;
            font('normal', 8); color(GRAY4);
            const lines = wrap(parsed.task3, CW - 6);
            lines.forEach(l => { need(5); doc.text(l, MARGIN + 4, y); y += lh(8) + 0.5; });
            y += 2;
          }
        });
      } else if (content?.trim()) {
        font('normal', 8); color(GRAY4);
        const lines = wrap(content, CW - 4);
        lines.forEach(l => { need(5); doc.text(l, MARGIN + 2, y); y += lh(8) + 0.5; });
      }

      if (handoffNote?.trim() && round < 3) {
        need(12);
        fill([255, 250, 235]); doc.roundedRect(MARGIN + 2, y, CW - 4, 9, 0.8, 0.8, 'F');
        font('bold', 7); color(AMBER);
        doc.text('HANDOFF NOTE', MARGIN + 5, y + 3.5);
        font('italic', 7.5); color([100, 75, 10]);
        const hn = wrap(`"${handoffNote}"`, CW - 10);
        hn.forEach((l, i) => doc.text(l, MARGIN + 5, y + 6.5 + i * 3.5));
        y += Math.max(10, hn.length * 3.5 + 7);
      }
      y += 4;
    });
  });

  // ── Reflections ──
  if (myReflection) {
    need(16);
    y += 4;
    fill(NAVY); doc.roundedRect(MARGIN, y, CW, 8, 1, 1, 'F');
    font('bold', 8.5); color([255, 255, 255]);
    doc.text('My Reflections', MARGIN + 4, y + 5.5);
    y += 11;

    REFLECTION_QUESTIONS.forEach((q, i) => {
      const ans = myReflection[`q${i + 1}`];
      if (!ans?.trim()) return;
      need(12);
      font('bold', 7.5); color(NAVY);
      const qLines = wrap(`Q${i + 1}  ${q}`, CW);
      qLines.forEach(l => { doc.text(l, MARGIN, y); y += lh(7.5); });
      y += 2;
      font('normal', 8.5); color(GRAY4);
      const aLines = wrap(ans, CW - 4);
      aLines.forEach(l => { need(5); doc.text(l, MARGIN + 2, y); y += lh(8.5); });
      y += 4;
    });
  }

  // Footer on all pages
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    font('normal', 7); color(GRAY3);
    doc.text('CrossWire — My Session Summary', MARGIN, 297 - 8);
    doc.text(`Page ${i} of ${total}`, 210 - MARGIN, 297 - 8, { align: 'right' });
  }

  doc.save(`crosswire-my-summary-${sessionId?.slice(0, 8)}.pdf`);
}
