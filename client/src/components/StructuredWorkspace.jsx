import { useState, useEffect, useRef } from 'react';
import { EVENTS_DATA, parseContent, emptyContent, emptyRows } from '../data/events';

const COUNTRY_FLAGS = {
  Brazil: '🇧🇷', India: '🇮🇳', Germany: '🇩🇪',
  Japan: '🇯🇵', France: '🇫🇷', Nigeria: '🇳🇬',
};

export default function StructuredWorkspace({
  eventName, round, content, prevContent, prevTeam, prevHandoff, onChange, readOnly
}) {
  const eventDef = EVENTS_DATA[eventName];
  const [local, setLocal] = useState(() => parseContent(content));
  const lastSent = useRef(content);

  // Sync in remote updates (other team members typing) without stomping local edits
  useEffect(() => {
    if (content !== lastSent.current) {
      setLocal(parseContent(content));
    }
  }, [content]);

  if (!eventDef) return null;

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
      <div className="flex-shrink-0 mb-4">
        <span className="text-xs text-navy-400 uppercase tracking-wider font-medium">
          Round {round} · Event
        </span>
        <h2 className="font-display text-xl font-bold text-white mt-0.5">{eventName}</h2>
        <p className="text-navy-300 text-sm leading-relaxed mt-2 bg-navy-800/50 rounded-xl px-4 py-3 border border-navy-700/50">
          {eventDef.framing}
        </p>
      </div>

      {/* Previous team's work */}
      {round > 1 && parsedPrev && (
        <div className="flex-shrink-0 mb-5 rounded-xl border border-navy-700 overflow-hidden">
          <div className="bg-navy-800/80 px-4 py-2.5 flex items-center gap-2">
            <span className="text-base">{COUNTRY_FLAGS[prevTeam] ?? '🏳'}</span>
            <span className="text-sm font-semibold text-navy-200">
              {prevTeam} Team — Round {round - 1}
            </span>
            <span className="ml-auto text-xs text-navy-500 italic">read-only</span>
          </div>
          {prevHandoff && (
            <div className="px-4 py-3 bg-amber-500/5 border-b border-amber-500/20">
              <p className="text-xs text-amber-400 font-medium uppercase tracking-wider mb-1">Handoff Note</p>
              <p className="text-sm text-navy-200 italic">"{prevHandoff}"</p>
            </div>
          )}
          <div className="px-4 py-3 space-y-4 bg-navy-900/30">
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
    <div className={`rounded-xl border overflow-hidden flex-shrink-0 ${
      readOnly ? 'border-navy-700/60' : 'border-navy-600'
    }`}>
      {/* Task header */}
      <div className={`px-4 py-2 border-b ${
        readOnly
          ? 'bg-navy-800/40 border-navy-700/60'
          : 'bg-navy-800 border-navy-600'
      }`}>
        <p className={`text-xs font-bold uppercase tracking-wider ${
          readOnly ? 'text-navy-500' : 'text-amber-500'
        }`}>
          {task.label}
        </p>
        <p className={`text-xs mt-0.5 leading-relaxed ${
          readOnly ? 'text-navy-600' : 'text-navy-400'
        }`}>
          {task.description}
        </p>
      </div>

      {/* Task content */}
      <div className={readOnly ? 'bg-navy-900/20' : 'bg-navy-900/40'}>
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
      <div className="flex border-b border-navy-700/60 bg-navy-800/30">
        {task.columns.map((col, ci) => (
          <div
            key={ci}
            className={`${task.colWidths[ci]} px-3 py-1.5 text-xs font-medium text-navy-400 uppercase tracking-wide ${
              ci < task.columns.length - 1 ? 'border-r border-navy-700/60' : ''
            }`}
          >
            {col}
          </div>
        ))}
      </div>

      {/* Data rows */}
      {rows.map((row, ri) => (
        <div key={ri} className={`flex border-b border-navy-700/40 last:border-b-0 ${
          readOnly ? '' : 'hover:bg-navy-800/20 transition-colors'
        }`}>
          {cols.map((col, ci) => (
            <div
              key={ci}
              className={`${task.colWidths[ci]} ${
                ci < cols.length - 1 ? 'border-r border-navy-700/40' : ''
              }`}
            >
              {readOnly ? (
                <div className="px-3 py-2 text-sm text-navy-300 min-h-[2.25rem] whitespace-pre-wrap">
                  {row[col] || <span className="text-navy-700">—</span>}
                </div>
              ) : (
                <textarea
                  value={row[col]}
                  onChange={e => onCellChange(ri, col, e.target.value)}
                  rows={1}
                  className="w-full px-3 py-2 bg-transparent text-sm text-white placeholder-navy-600 focus:outline-none focus:bg-navy-800/40 resize-none leading-snug min-h-[2.25rem] transition-colors"
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
            className="text-xs text-navy-500 hover:text-navy-300 transition-colors flex items-center gap-1"
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
      <div className="px-4 py-3 text-sm text-navy-300 whitespace-pre-wrap leading-relaxed min-h-16">
        {value || <span className="text-navy-700 italic">Nothing written.</span>}
      </div>
    );
  }
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={4}
      className="w-full px-4 py-3 bg-transparent text-sm text-white placeholder-navy-600 focus:outline-none resize-none leading-relaxed"
    />
  );
}
