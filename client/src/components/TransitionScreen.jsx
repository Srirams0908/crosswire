import { useState, useEffect } from 'react';

const COUNTRY_FLAGS = {
  Brazil: '🇧🇷', India: '🇮🇳', Germany: '🇩🇪',
  Japan: '🇯🇵', France: '🇫🇷', Nigeria: '🇳🇬'
};

export default function TransitionScreen({ fromRound, toRound, receivingTeam, handoffNote, onDone }) {
  const [countdown, setCountdown] = useState(10);

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
    <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center px-8 text-center animate-fade-in">
      <div className="mb-8">
        <div className="text-gray-400 text-sm uppercase tracking-widest font-semibold mb-4">
          Round {fromRound} Complete
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-2">
          Handoff in progress…
        </h1>
        {receivingTeam && (
          <p className="text-gray-600 text-lg mt-3">
            <span className="text-2xl">{COUNTRY_FLAGS[receivingTeam.country]}</span>{' '}
            <span className="text-gray-900 font-semibold">{receivingTeam.country} Team</span>{' '}
            is receiving your work
          </p>
        )}
      </div>

      {handoffNote && (
        <div className="max-w-xl w-full bg-amber-50 border border-amber-300 rounded-2xl p-6 mb-8 animate-fade-in">
          <p className="text-xs text-amber-700 uppercase tracking-wider font-semibold mb-3">Incoming Handoff Note</p>
          <p className="text-gray-900 text-lg leading-relaxed italic">"{handoffNote}"</p>
        </div>
      )}

      <div className="bg-gray-100 rounded-xl px-6 py-4 mb-6 border border-gray-200">
        <p className="text-sm text-gray-500 mb-1">Read carefully —</p>
        <p className="text-gray-700 font-medium">what did they leave you, and what's missing?</p>
      </div>

      <div className="flex items-center gap-3 text-gray-500">
        <div className="w-8 h-8 rounded-full border-2 border-amber-400 flex items-center justify-center font-display font-bold text-amber-600">
          {countdown}
        </div>
        <span className="text-sm">Your round begins in {countdown} second{countdown !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}
