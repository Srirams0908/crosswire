import { useEffect, useRef } from 'react';

const MAX_CHARS = 2000;

export default function Workspace({ eventName, round, content, prevContent, prevHandoff, prevTeam, onChange, readOnly = false }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current && !readOnly) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [content, readOnly]);

  const charCount = content?.length || 0;
  const overLimit = charCount > MAX_CHARS;

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Event label */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Round {round} · Event</span>
          <h2 className="font-display text-xl font-bold text-gray-900">{eventName}</h2>
        </div>
        {!readOnly && (
          <div className={`text-xs font-mono tabular-nums ${overLimit ? 'text-red-500' : 'text-gray-400'}`}>
            {charCount}/{MAX_CHARS}
          </div>
        )}
      </div>

      {/* Previous round output */}
      {round > 1 && prevContent !== undefined && (
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 flex-shrink-0 max-h-48 overflow-y-auto scrollbar-thin">
          <p className="text-xs text-blue-600 uppercase tracking-wider font-semibold mb-1">
            {prevTeam ? `${prevTeam} Team's Work (Round ${round - 1})` : `Previous Round (Round ${round - 1})`}
          </p>
          {prevHandoff && (
            <div className="mb-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-700 font-semibold mb-1">Handoff Note</p>
              <p className="text-sm text-amber-900 italic">"{prevHandoff}"</p>
            </div>
          )}
          <p className="text-sm text-blue-900 whitespace-pre-wrap leading-relaxed">
            {prevContent || <span className="text-blue-400 italic">No content was written.</span>}
          </p>
        </div>
      )}

      {/* Workspace textarea */}
      <div className="flex-1 flex flex-col min-h-0">
        {readOnly ? (
          <div className="flex-1 bg-gray-50 rounded-xl p-4 border border-gray-200 overflow-y-auto scrollbar-thin">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Workspace (locked)</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {content || <span className="text-gray-400 italic">No content yet.</span>}
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <label className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">
              {round === 1 ? "Your team's workspace" : 'Continue the work'}
            </label>
            <textarea
              ref={textareaRef}
              value={content || ''}
              onChange={e => !overLimit && onChange?.(e.target.value)}
              placeholder={round === 1
                ? 'Start planning your event here. All team members can see and edit this together...'
                : 'Pick up where the previous team left off. Build on their work...'}
              className={`flex-1 input-field resize-none text-sm leading-relaxed min-h-48 ${
                overLimit ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
              }`}
              disabled={readOnly}
            />
          </div>
        )}
      </div>
    </div>
  );
}
