import { useState, useEffect } from 'react';

const COUNTRY_FLAGS = {
  Brazil: '🇧🇷', India: '🇮🇳', Germany: '🇩🇪',
  Japan: '🇯🇵', France: '🇫🇷', Nigeria: '🇳🇬'
};

export default function TransitionScreen({ fromRound, toRound, receivingTeam, handoffNote, onDone }) {
  const [countdown, setCountdown] = useState(10);
  const [phase, setPhase] = useState('incoming');

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(timer);
          setTimeout(onDone, 500);
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 bg-navy-950 z-50 flex flex-col items-center justify-center px-8 text-center animate-fade-in">
      <div className="mb-8">
        <div className="text-navy-400 text-sm uppercase tracking-widest font-medium mb-4">
          Round {fromRound} Complete
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-2">
          Handoff in progress...
        </h1>
        {receivingTeam && (
          <p className="text-navy-300 text-lg mt-3">
            <span className="text-2xl">{COUNTRY_FLAGS[receivingTeam.country]}</span>{' '}
            <span className="text-white font-medium">{receivingTeam.country} Team</span>{' '}
            is receiving your work
          </p>
        )}
      </div>

      {handoffNote && (
        <div className="max-w-xl w-full bg-navy-800 border border-amber-500/30 rounded-2xl p-6 mb-8 animate-fade-in">
          <p className="text-xs text-amber-400 uppercase tracking-wider font-medium mb-3">Incoming Handoff Note</p>
          <p className="text-white text-lg leading-relaxed italic">"{handoffNote}"</p>
        </div>
      )}

      <div className="bg-navy-800/50 rounded-xl px-6 py-4 mb-6">
        <p className="text-sm text-navy-400 mb-1">Read carefully —</p>
        <p className="text-navy-200">what did they leave you, and what's missing?</p>
      </div>

      <div className="flex items-center gap-3 text-navy-400">
        <div className="w-8 h-8 rounded-full border-2 border-navy-600 flex items-center justify-center font-display font-bold text-white">
          {countdown}
        </div>
        <span className="text-sm">Your round begins in {countdown} second{countdown !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}
