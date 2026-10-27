'use client';
import { useEffect, useState } from 'react';
import { DEFAULT_LOOK, type ProfileLook, type ProfileHello } from '../../lib/profile-space';
import { profileFetch } from './profile-view';

export function useProfileSpace(username: string | null) {
  const [look,setLook] = useState<ProfileLook>(DEFAULT_LOOK);
  const [coverUrl,setCoverUrl] = useState<string|null>(null);
  const [notes,setNotes] = useState<ProfileHello[]>([]);
  const [status,setStatus] = useState<'loading'|'ready'|'preview'|'error'>('loading');
  const [revision,setRevision] = useState(0);
  useEffect(() => {
    let active=true;
    setLook(DEFAULT_LOOK); setCoverUrl(null); setNotes([]); setStatus('loading');
    if (!username) return;
    profileFetch(`/api/profiles/space?username=${encodeURIComponent(username)}`).then(({response,data}) => {
      if (!response.ok) throw new Error();
      if (active) { setLook(data.look);setCoverUrl(data.coverUrl??null);setNotes(data.notes);setStatus(data.available?'ready':'preview'); }
    }).catch(() => { if(active) setStatus('error'); });
    return () => {active=false;};
  },[username,revision]);
  return {look,coverUrl,notes,status,reload:()=>setRevision(value=>value+1),updateNotes:setNotes,updateLook:setLook};
}
