import { useState, useEffect } from 'react';

const MAX_WORDS = 150;
const MIN_WORDS = 20;

function countWords(text) {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

export default function HandoffNote({ visible, content, onChange, onSubmit, submitted, isLastRound = false, unlockSeconds = 90 }) {
  const wordCount = countWords(content || '');
  const overLimit = wordCount > MAX_WORDS;
  const underMinimum = wordCount > 0 && wordCount < MIN_WORDS;

  if (isLastRound) return null;

  if (!visible) {
    return (
      <div className="card border-gray-200 opacity-60">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-lg">✏️</div>
          <p className="text-sm font-semibold text-gray-500">Handoff Note</p>
        </div>
        <p className="text-sm text-gray-400 leading-relaxed mb-1">
          Before you pass this project on, you'll write a note for the next team.
        </p>
        <p className="text-xs text-gray-400 italic">
          Unlocks with {unlockSeconds >= 60
            ? `${Math.round(unlockSeconds / 60)} min`
            : `${unlockSeconds} sec`} remaining…
        </p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="card border-emerald-300 bg-emerald-50">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-xs text-white">✓</div>
          <p className="text-sm font-semibold text-emerald-700">Handoff note submitted</p>
        </div>
        <p className="text-sm text-gray-600 italic leading-relaxed">"{content}"</p>
      </div>
    );
  }

  return (
    <div className="card border-amber-300 bg-amber-50 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white text-sm font-bold">!</div>
          <p className="text-sm font-bold text-amber-800">Write your handoff note</p>
        </div>
        <span className={`text-xs font-mono font-semibold ${overLimit ? 'text-red-500' : underMinimum ? 'text-amber-600' : 'text-gray-400'}`}>
          {wordCount}/{MAX_WORDS} words
        </span>
      </div>

      <p className="text-xs text-amber-900 leading-relaxed mb-3 bg-amber-100 rounded-lg px-3 py-2">
        Tell the next team: what decisions did you make and why? What's still unfinished? What should they watch out for? Be direct — they only have {Math.round((unlockSeconds || 90) / 60) < 1 ? `${unlockSeconds || 90} seconds` : `${Math.round((unlockSeconds || 90) / 60)} minutes`}.
      </p>

      <textarea
        value={content || ''}
        onChange={e => onChange?.(e.target.value)}
        placeholder="e.g. We agreed on a 3-part agenda but didn't assign speakers. The budget column is empty — prioritise that. We assumed a 200-person venue."
        rows={5}
        className={`input-field resize-none text-sm mb-2 ${
          overLimit ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : underMinimum ? 'border-amber-400' : ''
        }`}
        disabled={submitted}
      />

      {underMinimum && (
        <p className="text-xs text-amber-700 mb-2">Aim for at least {MIN_WORDS} words — the next team needs enough context.</p>
      )}
      {overLimit && (
        <p className="text-xs text-red-500 mb-2">Too long — trim to under {MAX_WORDS} words.</p>
      )}

      <button
        onClick={onSubmit}
        disabled={submitted || overLimit || wordCount === 0}
        className="btn-primary w-full text-sm py-2.5"
      >
        Submit Handoff Note
      </button>
    </div>
  );
}
