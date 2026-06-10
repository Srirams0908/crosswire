import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BACKEND_URL } from '../config';

const STATUS_LABELS = {
  waiting: { label: 'Waiting', color: 'bg-navy-700 text-navy-400' },
  active:  { label: 'Active',  color: 'bg-emerald-500/20 text-emerald-400' },
  paused:  { label: 'Paused',  color: 'bg-amber-500/20 text-amber-400' },
  handoff: { label: 'Handoff', color: 'bg-amber-500/20 text-amber-400' },
  debrief: { label: 'Debrief', color: 'bg-purple-500/20 text-purple-400' },
  closed:  { label: 'Closed',  color: 'bg-navy-700 text-navy-500' },
};

function fmt(ts) {
  if (!ts) return '—';
  return new Date(ts * 1000).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

export default function SessionHistory() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const codes = JSON.parse(localStorage.getItem('crosswire_history') || '[]');
    if (codes.length === 0) { setLoading(false); return; }

    fetch(`${BACKEND_URL}/api/sessions/by-codes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codes }),
    })
      .then(r => r.json())
      .then(data => {
        // Sort by created_at desc
        setSessions(data.sort((a, b) => b.created_at - a.created_at));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openSession = (session) => {
    localStorage.setItem('facilitatorCode', session.facilitator_code);
    localStorage.setItem('sessionId', session.id);
    if (session.status === 'debrief' || session.status === 'closed') {
      navigate('/debrief');
    } else {
      navigate('/facilitator/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate('/')} className="text-navy-400 hover:text-white text-sm flex items-center gap-2 mb-8 transition-colors">
          ← Back
        </button>
        <div className="flex items-center gap-3 mb-8">
          <span className="font-display text-2xl font-bold text-white">Session History</span>
        </div>

        {loading && (
          <div className="text-navy-400 text-sm text-center py-12 animate-pulse">Loading sessions…</div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="card text-center py-12">
            <p className="text-navy-400 text-sm">No past sessions found on this device.</p>
            <p className="text-navy-600 text-xs mt-2">Sessions are tracked locally — they appear here after you create one.</p>
          </div>
        )}

        {!loading && sessions.length > 0 && (
          <div className="space-y-3">
            {sessions.map(session => {
              const badge = STATUS_LABELS[session.status] || STATUS_LABELS.closed;
              const participantCount = session.config?.participantCount || '—';
              const canResume = session.status !== 'closed' && session.status !== 'debrief';
              return (
                <div key={session.id} className="card flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-display font-bold text-white tracking-widest text-sm">{session.facilitator_code}</span>
                      <span className={`tag text-xs px-2 py-0.5 rounded-full ${badge.color}`}>{badge.label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-navy-500">
                      <span>{fmt(session.created_at)}</span>
                      <span>·</span>
                      <span>{participantCount} participants</span>
                      <span>·</span>
                      <span>Round {session.current_round}/3</span>
                    </div>
                  </div>
                  <button
                    onClick={() => openSession(session)}
                    className={`text-sm px-4 py-2 rounded-lg font-medium flex-shrink-0 transition-colors ${
                      canResume
                        ? 'btn-ghost'
                        : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded-lg'
                    }`}
                  >
                    {session.status === 'closed' ? 'View Debrief' :
                     session.status === 'debrief' ? 'View Debrief' :
                     'Resume →'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
