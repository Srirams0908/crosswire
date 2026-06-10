import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <div className="text-center max-w-2xl animate-fade-in">
          {/* Logo mark */}
          <div className="inline-flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center">
              <CrossWireIcon />
            </div>
            <span className="font-display text-3xl font-bold tracking-tight text-white">CrossWire</span>
          </div>

          <h1 className="font-display text-5xl md:text-6xl font-bold text-white leading-tight mb-5 text-balance">
            Where communication<br />
            <span className="text-amber-500">gets real.</span>
          </h1>

          <p className="text-navy-300 text-lg md:text-xl leading-relaxed mb-12 text-balance">
            A live simulation of international team handoffs. Experience the communication breakdowns,
            cultural mismatches, and coordination challenges of real global organizations.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
            <button
              onClick={() => navigate('/facilitator/setup')}
              className="btn-primary text-lg px-8 py-4 rounded-xl"
            >
              I'm a Facilitator
            </button>
            <button
              onClick={() => navigate('/join')}
              className="btn-ghost text-lg px-8 py-4 rounded-xl border-navy-500 text-white hover:bg-navy-800"
            >
              I'm a Participant
            </button>
          </div>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => navigate('/observer')}
              className="flex items-center gap-2 text-navy-500 hover:text-navy-300 text-sm transition-colors py-1.5 px-3 rounded-lg hover:bg-navy-800/50"
            >
              <span>👁</span>
              <span>Join as Observer</span>
            </button>
            <button
              onClick={() => navigate('/history')}
              className="flex items-center gap-2 text-navy-500 hover:text-navy-300 text-sm transition-colors py-1.5 px-3 rounded-lg hover:bg-navy-800/50"
            >
              <span>🕐</span>
              <span>Session History</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feature strip */}
      <div className="border-t border-navy-800 bg-navy-900/50">
        <div className="max-w-4xl mx-auto px-6 py-10 grid grid-cols-1 sm:grid-cols-3 gap-8">
          {[
            {
              icon: '🌏',
              title: '6 Country Profiles',
              desc: 'Brazil, India, Germany, Japan, France, Nigeria — each with distinct communication styles and role behaviors.'
            },
            {
              icon: '⏱',
              title: '3 Rounds, Live Handoffs',
              desc: 'Teams pass their work forward after each round. What gets lost in translation is the lesson.'
            },
            {
              icon: '📊',
              title: 'Built-in Debrief',
              desc: 'Track every output, handoff note, and reflection. Export the full session summary as PDF.'
            }
          ].map(f => (
            <div key={f.title} className="text-center">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-display font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-navy-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="py-6 text-center text-navy-600 text-sm border-t border-navy-900">
        CrossWire · Intercultural Communication Simulation
      </div>
    </div>
  );
}

function CrossWireIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 6C3 6 9 6 12 12C15 18 21 18 21 18" stroke="#0a1850" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M3 18C3 18 9 18 12 12C15 6 21 6 21 6" stroke="#0a1850" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}
