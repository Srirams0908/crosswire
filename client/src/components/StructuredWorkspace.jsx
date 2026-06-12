import { useState, useEffect, useRef } from 'react';
import { getEventDef, parseContent, emptyContent, emptyRows } from '../data/events';

const COUNTRY_FLAGS = {
  Brazil: '🇧🇷', India: '🇮🇳', Germany: '🇩🇪',
  Japan: '🇯🇵', France: '🇫🇷', Nigeria: '🇳🇬',
};

export default function StructuredWorkspace({
  eventName, round, content, prevContent, prevTeam, prevHandoff, onChange, readOnly
}) {
  const eventDef = getEventDef(eventName);
  const [local, setLocal] = useState(() => parseContent(content));
  const lastSent = useRef(content);

  useEffect(() => {
    if (content !== lastSent.current) {
      setLocal(parseContent(content));
    }
  }, [content]);

  const emit = (next) => {
    const serialized = JSON.stringify(next);
    lastSent.current = serialized;
    onChange?.(serialized);
  };

  const updateCell = (taskId, rowIdx, col, value) => {
    setLocal(prev => {
      const rows = prev[taskId].map((r, i) => i === rowIdx ? { ...r, [col]: value } : r);
      const next = { ...prev, [taskId]: rows };
      emit(next);
      return next;
    });
  };

  const addRow = (taskId) => {
    setLocal(prev => {
      const next = { ...prev, [taskId]: [...prev[taskId], { c0: '', c1: '', c2: '' }] };
      emit(next);
      return next;
    });
  };

  const updateText = (value) => {
    setLocal(prev => {
      const next = { ...prev, task3: value };
      emit(next);
      return next;
    });
  };

  const parsedPrev = prevContent ? parseContent(prevContent) : null;

  return (
    <div className="flex flex-col gap-0 min-h-0">
      {/* Event label + framing */}
      <div className="flex-shrink-0 mb-5">
        <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
          Round {round} · Event
        </span>
        <h2 className="font-display text-xl font-bold text-gray-900 mt-0.5">{eventName}</h2>
        <p className="text-gray-600 text-sm leading-relaxed mt-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          {eventDef.framing}
        </p>
      </div>

      {/* Previous team's work — visually distinct blue section */}
      {round > 1 && parsedPrev && (
        <div className="flex-shrink-0 mb-6 rounded-xl border border-blue-200 overflow-hidden">
          <div className="bg-blue-600 px-4 py-2.5 flex items-center gap-2">
            <span className="text-base">{COUNTRY_FLAGS[prevTeam] ?? '🏳'}</span>
            <span className="text-sm font-semibold text-white">
              {prevTeam} Team — Round {round - 1} (what they left you)
            </span>
            <span className="ml-auto text-xs text-blue-200 italic">read-only</span>
          </div>
          {prevHandoff && (
            <div className="px-4 py-3 bg-amber-50 border-b border-amber-200">
              <p className="text-xs text-amber-700 font-semibold uppercase tracking-wider mb-1">Their Handoff Note to You</p>
              <p className="text-sm text-amber-900 italic">"{prevHandoff}"</p>
            </div>
          )}
          <div className="px-4 py-3 space-y-4 bg-blue-50">
            {eventDef.tasks.map(task => (
              <TaskBlock
                key={task.id}
                task={task}
                content={parsedPrev}
                readOnly
              />
            ))}
          </div>
        </div>
      )}

      {/* Current team's editable work */}
      <div className="flex-1 flex flex-col gap-4 min-h-0">
        {round > 1 && (
          <div className="flex items-center gap-2 mb-1">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider px-2">Your work — continue below</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>
        )}
        {eventDef.tasks.map(task => (
          <TaskBlock
            key={task.id}
            task={task}
            content={local}
            readOnly={readOnly}
            onCellChange={updateCell}
            onAddRow={addRow}
            onTextChange={updateText}
          />
        ))}
      </div>
    </div>
  );
}

// ── Task block ────────────────────────────────────────────────────────────────

function TaskBlock({ task, content, readOnly, onCellChange, onAddRow, onTextChange }) {
  return (
    <div className={`rounded-xl border overflow-hidden flex-shrink-0 shadow-sm ${
      readOnly ? 'border-blue-200' : 'border-gray-200'
    }`}>
      {/* Task header */}
      <div className={`px-4 py-2.5 border-b ${
        readOnly
          ? 'bg-blue-100 border-blue-200'
          : 'bg-amber-50 border-amber-200'
      }`}>
        <p className={`text-xs font-bold uppercase tracking-wider ${
          readOnly ? 'text-blue-600' : 'text-amber-700'
        }`}>
          {task.label}
        </p>
        <p className={`text-xs mt-0.5 leading-relaxed ${
          readOnly ? 'text-blue-500' : 'text-gray-600'
        }`}>
          {task.description}
        </p>
      </div>

      {/* Task content */}
      <div className={readOnly ? 'bg-blue-50/50' : 'bg-white'}>
        {task.type === 'table' ? (
          <TableInput
            task={task}
            rows={content[task.id] ?? emptyRows()}
            readOnly={readOnly}
            onCellChange={(rowIdx, col, val) => onCellChange?.(task.id, rowIdx, col, val)}
            onAddRow={() => onAddRow?.(task.id)}
          />
        ) : (
          <TextInput
            value={content.task3 ?? ''}
            readOnly={readOnly}
            placeholder="Write your rules here..."
            onChange={onTextChange}
          />
        )}
      </div>
    </div>
  );
}

// ── Table input ───────────────────────────────────────────────────────────────

function TableInput({ task, rows, readOnly, onCellChange, onAddRow }) {
  const cols = ['c0', 'c1', 'c2'];

  return (
    <div>
      {/* Column headers */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        {task.columns.map((col, ci) => (
          <div
            key={ci}
            className={`${task.colWidths[ci]} px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide ${
              ci < task.columns.length - 1 ? 'border-r border-gray-200' : ''
            }`}
          >
            {col}
          </div>
        ))}
      </div>

      {/* Data rows */}
      {rows.map((row, ri) => (
        <div key={ri} className={`flex border-b border-gray-100 last:border-b-0 ${
          readOnly ? '' : 'hover:bg-amber-50/30 transition-colors'
        }`}>
          {cols.map((col, ci) => (
            <div
              key={ci}
              className={`${task.colWidths[ci]} ${
                ci < cols.length - 1 ? 'border-r border-gray-100' : ''
              }`}
            >
              {readOnly ? (
                <div className="px-3 py-2 text-sm text-gray-700 min-h-[2.25rem] whitespace-pre-wrap">
                  {row[col] || <span className="text-gray-300">—</span>}
                </div>
              ) : (
                <textarea
                  value={row[col]}
                  onChange={e => onCellChange(ri, col, e.target.value)}
                  rows={1}
                  className="w-full px-3 py-2 bg-transparent text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:bg-amber-50/50 resize-none leading-snug min-h-[2.25rem] transition-colors"
                  placeholder=""
                  style={{ height: 'auto', overflow: 'hidden' }}
                  onInput={e => {
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                />
              )}
            </div>
          ))}
        </div>
      ))}

      {/* Add row button */}
      {!readOnly && (
        <div className="px-3 py-1.5">
          <button
            onClick={onAddRow}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
          >
            <span className="text-base leading-none">+</span> Add row
          </button>
        </div>
      )}
    </div>
  );
}

// ── Text input ────────────────────────────────────────────────────────────────

function TextInput({ value, readOnly, placeholder, onChange }) {
  if (readOnly) {
    return (
      <div className="px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed min-h-16">
        {value || <span className="text-gray-300 italic">Nothing written.</span>}
      </div>
    );
  }
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={4}
      className="w-full px-4 py-3 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none resize-none leading-relaxed"
    />
  );
}
