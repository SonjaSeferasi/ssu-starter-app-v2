'use client';

import { useMemo, useState } from 'react';
import { searchEmojis } from '../../lib/chat-emoji';
import { GIF_LIBRARY_EMPTY, libraryGifSrc, searchLibraryGifs, type LibraryGif } from '../../lib/chat-gif-library';
import styles from './messages.module.css';

// SRS-201.8 (#797): search the built-in emoji list by name ("laugh" finds 😂) and choose one to send it.
// SRS-201.10 (UR-201): the GIF library opens from the same button as the emoji list, as two tabs of one
// panel, because they are the same decision for the student -- "say this without typing" -- and the
// composer row was collecting an icon per idea. The GIF file picker moved in here too, as a line under
// the library, so choosing a GIF from the device (SRS-201.12) is still one click from the composer.
// Enter in the search box sends the first match; Escape or Close closes the panel.
//
// onPickGif is optional on purpose: without it the library is a gallery, which is all SRS-201.10 asks
// for ("access the available GIF library while preparing a message"). Selecting one to send is
// SRS-201.11 and arrives with the handler.
export function MessagePicker({ disabled, onPickEmoji, onPickGif, onUploadGif, onClose }: {
  disabled: boolean;
  onPickEmoji: (emoji: string) => void;
  onPickGif?: (gif: LibraryGif) => void;
  onUploadGif: () => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'emoji' | 'gif'>('emoji');
  const [query, setQuery] = useState('');
  const emojis = useMemo(() => (tab === 'emoji' ? searchEmojis(query) : []), [tab, query]);
  const gifs = useMemo(() => (tab === 'gif' ? searchLibraryGifs(query) : []), [tab, query]);

  // One search box serves both tabs, so the word is cleared when the tab changes: "laugh" is a sensible
  // emoji search and a sensible GIF search, but a word that matched in one and not the other would land
  // the student on an empty tab they did not ask for.
  const show = (next: 'emoji' | 'gif') => { setTab(next); setQuery(''); };

  return (
    <div className={styles.emojiPanel} role="dialog" aria-labelledby="picker-title"
      onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}>
      <div className={styles.invitePanelTop}>
        <h3 id="picker-title" className={styles.stepTitle}>{tab === 'emoji' ? 'Send an emoji' : 'Send a GIF'}</h3>
        <button type="button" className={styles.retry} onClick={onClose}>Close</button>
      </div>

      <div className={styles.pickerTabs} role="tablist" aria-label="Emoji and GIFs">
        <button type="button" role="tab" id="picker-tab-emoji" aria-selected={tab === 'emoji'}
          aria-controls="picker-panel-emoji"
          className={tab === 'emoji' ? `${styles.pickerTab} ${styles.pickerTabOn}` : styles.pickerTab}
          onClick={() => show('emoji')}>Emoji</button>
        <button type="button" role="tab" id="picker-tab-gif" aria-selected={tab === 'gif'}
          aria-controls="picker-panel-gif"
          className={tab === 'gif' ? `${styles.pickerTab} ${styles.pickerTabOn}` : styles.pickerTab}
          onClick={() => show('gif')}>GIF</button>
      </div>

      <label htmlFor="picker-search" className={styles.srOnly}>
        {tab === 'emoji' ? 'Search emoji' : 'Search GIFs'}
      </label>
      <input id="picker-search" className={styles.pickerSearch} value={query} autoFocus autoComplete="off"
        maxLength={50} placeholder={tab === 'emoji' ? 'Search emoji…' : 'Search GIFs…'}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return;
          event.preventDefault();
          if (disabled) return;
          if (tab === 'emoji' && emojis.length) onPickEmoji(emojis[0].emoji);
          if (tab === 'gif' && gifs.length && onPickGif) onPickGif(gifs[0]);
        }} />

      {tab === 'emoji' ? (
        <div className={styles.pickerTabPanel} role="tabpanel" id="picker-panel-emoji" aria-labelledby="picker-tab-emoji">
          {emojis.length === 0 ? (
            <p className={styles.pickerHint}>No emoji match that word.</p>
          ) : (
            <ul className={styles.emojiGrid} aria-label="Emoji">
              {emojis.map((item) => (
                <li key={item.emoji}>
                  <button type="button" className={styles.emojiOption} onClick={() => onPickEmoji(item.emoji)}
                    disabled={disabled} aria-label={item.name} title={item.name}>{item.emoji}</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className={styles.pickerTabPanel} role="tabpanel" id="picker-panel-gif" aria-labelledby="picker-tab-gif">
          {gifs.length === 0 ? (
            <p className={styles.pickerHint}>{GIF_LIBRARY_EMPTY}</p>
          ) : (
            <ul className={styles.gifGrid} aria-label="GIF library">
              {gifs.map((gif) => (
                <li key={gif.id}>
                  {onPickGif ? (
                    <button type="button" className={styles.gifOption} disabled={disabled}
                      onClick={() => onPickGif(gif)} aria-label={gif.name} title={gif.name}>
                      {/* A plain img, so it animates in the grid the way it will in the conversation.
                          Lazy loading is deliberately off: eight small local files, and a tile that
                          loads when scrolled to would show as a blank square first. */}
                      <img className={styles.gifThumb} src={libraryGifSrc(gif.id)} alt={gif.name} />
                    </button>
                  ) : (
                    <span className={styles.gifOption}>
                      <img className={styles.gifThumb} src={libraryGifSrc(gif.id)} alt={gif.name} />
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {/* SRS-201.12: the device picker, now that the composer no longer has an icon of its own for it. */}
          <button type="button" className={styles.pickerUpload} onClick={onUploadGif} disabled={disabled}>
            Upload a GIF from this device
          </button>
        </div>
      )}
    </div>
  );
}
