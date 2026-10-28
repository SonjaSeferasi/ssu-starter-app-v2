'use client';

import { useState } from 'react';
import { CATEGORIES } from './types';
import type { WhisperCategory } from './types';

export function CategoryFilter({ value, onChange }: { value: WhisperCategory | null; onChange: (category: WhisperCategory | null) => void }) {
  const [open, setOpen] = useState(false);
  const selected = CATEGORIES.find((c) => c.id === value);

  function choose(category: WhisperCategory | null) {
    onChange(category);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
      >
        {selected ? (
          <>
            <span aria-hidden="true">{selected.emoji}</span> {selected.label}
          </>
        ) : (
          'All Categories'
        )}
        <span aria-hidden="true" className="text-xs text-stone-400">▾</span>
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div role="listbox" className="absolute right-0 z-20 mt-1 w-48 rounded-xl border border-stone-200 bg-white py-1 shadow-lg">
            <button
              type="button"
              role="option"
              aria-selected={value === null}
              onClick={() => choose(null)}
              className={`block w-full px-4 py-2 text-left text-sm hover:bg-stone-50 ${value === null ? 'font-semibold text-emerald-700' : 'text-stone-700'}`}
            >
              All Categories
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                role="option"
                aria-selected={value === c.id}
                onClick={() => choose(c.id)}
                className={`block w-full px-4 py-2 text-left text-sm hover:bg-stone-50 ${value === c.id ? 'font-semibold text-emerald-700' : 'text-stone-700'}`}
              >
                <span aria-hidden="true">{c.emoji}</span> {c.label}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
