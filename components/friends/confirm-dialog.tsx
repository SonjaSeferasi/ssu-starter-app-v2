'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import styles from './friends.module.css';
export function ConfirmDialog({ title, children, busy, error, confirmLabel, onConfirm, onClose }: {title:string;children:ReactNode;busy:boolean;error:string;confirmLabel:string;onConfirm:()=>void;onClose:()=>void}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{ const dialog=ref.current; dialog?.showModal(); return ()=>dialog?.close(); },[]);
  return <dialog ref={ref} className={styles.dialog} aria-labelledby="confirmation-title" onCancel={event=>{event.preventDefault();if(!busy)onClose();}}>
    <h2 id="confirmation-title">{title}</h2><div className={styles.dialogBody}>{children}</div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <div className={styles.actions}><button autoFocus disabled={busy} onClick={onClose} className={styles.secondary}>Cancel</button><button disabled={busy} onClick={onConfirm} className={styles.danger}>{busy?'Please wait…':confirmLabel}</button></div>
  </dialog>;
}
