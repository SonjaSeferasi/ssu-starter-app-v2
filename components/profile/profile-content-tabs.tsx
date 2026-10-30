'use client';

import { BookOpen, Bookmark, LayoutDashboard, Tag } from 'lucide-react';
import styles from './profile-campus.module.css';

export type ProfileCategory = 'posts' | 'tagged' | 'saved' | 'board';
export const profileCategories = (own: boolean): ProfileCategory[] => own ? ['posts', 'board', 'tagged', 'saved'] : ['posts', 'board', 'tagged'];

export function ProfileContentTabs({ value, onChange, own, prefix = 'profile', panelId = 'profile-posts', className = '' }: {
  value: ProfileCategory; onChange: (value: ProfileCategory) => void; own: boolean; prefix?: string; panelId?: string; className?: string;
}) {
  const tabs = profileCategories(own);
  return <div className={`${styles.contentTabs} ${className}`} role="tablist" aria-label="Profile content">
    {tabs.map(item => <button key={item} id={`${prefix}-tab-${item}`} aria-controls={panelId} type="button" role="tab" aria-selected={value === item} tabIndex={value === item ? 0 : -1}
      onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const index = tabs.indexOf(item);
        const next = event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs[tabs.length - 1] : tabs[(index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
        onChange(next); document.getElementById(`${prefix}-tab-${next}`)?.focus();
      }}
      onClick={() => onChange(item)}>{item === 'board' ? <LayoutDashboard /> : item === 'posts' ? <BookOpen /> : item === 'saved' ? <Bookmark /> : <Tag />}{item === 'board' ? 'My Board' : item === 'posts' ? 'Posts' : item === 'saved' ? 'Saved' : 'Tagged'}</button>)}
  </div>;
}
