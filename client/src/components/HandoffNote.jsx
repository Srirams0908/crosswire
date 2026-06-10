import { useState, useEffect } from 'react';

const MAX_WORDS = 150;

function countWords(text) {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

export default function HandoffNote({ visible, content, onChange, onSubmit, submitted, isLastRound = false, unlockSeconds = 90 }) {
  const wordCount = countWords(content || '');
  const overLimit = wordCount > MAX_WORDS;

  if (isLastRound) return null;

  if (!visible) {
    return (
      <div className="card border-navy-700 opacity-60">
        <p className="text-xs text-navy-500 uppercase tracking-wider font-medium mb-1">Handoff Note</p>
        <p className="text-sm text-navy-600 italic">
          Appears with {unlockSeconds >= 60
            ? `${Math.round(unlockSeconds / 60)} min`
            : `${unlockSeconds} sec`} remaining…
        </p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="card border-emerald-500/40 bg-emerald-500/5">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-xs">✓</div>
          <p className="text-sm font-semibold text-emerald-400">Handoff note submitted</p>
        </div>
        <p className="text-sm text-navy-300 italic">"{content}"</p>
      </div>
    );
  }

  return (
    <div className="card border-amber-500/40 bg-amber-500/5 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-amber-400 uppercase tracking-wider font-medium">Handoff Note</p>
        <span className={`text-xs font-mono ${overLimit ? 'text-red-400' : 'text-navy-500'}`}>
          {wordCount}/{MAX_WORDS} words
        </span>
      </div>
      <p className="text-xs text-navy-200 font-medium mb-1">
        Before you pass this on — write your handoff note.
      </p>
      <p className="text-xs text-navy-400 mb-3 leading-relaxed">
        Tell the next team: what decisions did you make and why? What's still unfinished? What should they watch out for? Be direct — they only have {Math.round((unlockSeconds || 90) / 60) < 1 ? `${unlockSeconds || 90} seconds` : `${Math.round((unlockSeconds || 90) / 60)} minutes`}.
      </p>
      <textarea
        value={content || ''}
        onChange={e => onChange?.(e.target.value)}
        placeholder="Write your handoff note here..."
        rows={4}
        className={`input-field resize-none text-sm mb-3 ${
          overLimit ? 'border-red-500 focus:border-red-500' : ''
        }`}
        disabled={submitted}
      />
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
