'use client';

import { useEffect, useState } from 'react';
import { SavePostButton } from '../profile/social-actions';
import { PostAuthor } from './PostAuthor';
import { PostMedia } from './PostMedia';
import { EditPostModal } from './EditPostModal';
import { DeletePostModal } from './DeletePostModal';
import { ReportPostModal, type ReportResult } from './ReportPostModal';
import { LikeButton } from './LikeButton';
import { CommentSection } from './CommentSection';
import { MentionText } from './MentionText';
import type { FeedPost } from './types';

export function PostCard({
  post,
  accessToken,
  isOwnPost,
  authorInitial,
  currentStudentId,
  highlighted,
  targetCommentId,
  onUpdated,
  onDeleted,
}: {
  post: FeedPost;
  accessToken: string;
  isOwnPost: boolean;
  authorInitial: string;
  currentStudentId: number | null;
  highlighted?: boolean;
  /** SRS-313/312.10: a clicked comment/reply notification's ?comment=<id>, only passed for the matching post. */
  targetCommentId?: number;
  onUpdated: (updated: FeedPost) => void;
  onDeleted: (postId: number) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportNotice, setReportNotice] = useState('');
  const [commentsOpen, setCommentsOpen] = useState(false);

  // SRS-314.4: confirm a submitted report. A post removed by this report
  // reaching the 5-distinct-reporter threshold reuses the same onDeleted
  // path as Delete Post (removes it from the feed); otherwise a brief
  // inline notice covers both a fresh report and an already-reported repeat.
  function handleReported(result: ReportResult) {
    setReporting(false);
    if (result.postRemoved) {
      onDeleted(post.postId);
      return;
    }
    setReportNotice(result.reported ? 'Post reported. Thank you for helping keep SocialU safe.' : "You've already reported this post.");
    setTimeout(() => setReportNotice(''), 4000);
  }

  // Auto-open the comments section when a notification links directly to a
  // comment/reply on this post, so there's something for CommentSection's
  // own scroll-to-target effect to find once comments load.
  useEffect(() => {
    if (targetCommentId !== undefined) setCommentsOpen(true);
  }, [targetCommentId]);

  return (
    <article
      id={`post-${post.postId}`}
      className={`relative rounded-3xl border border-stone-200 bg-white p-5 shadow-sm transition ${
        highlighted ? 'ring-2 ring-emerald-400' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <PostAuthor
          name={post.authorName}
          profileHref={isOwnPost ? '/profile' : post.authorUsername ? `/students/${encodeURIComponent(post.authorUsername)}` : undefined}
          photoUrl={post.authorPhotoUrl}
          publishedAt={post.publishedAt}
          editedAt={post.editedAt}
          visibility={post.visibility}
        />

        {/* SRS-306.1/307.1: Edit/Delete Post are only ever shown to the post's own author.
            SRS-314: Report Post is only ever shown to someone else's post -- self-reporting
            is blocked server-side too (socialu_report_post), this just matches that in the UI. */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Post options"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex h-8 w-8 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100"
          >
            ⋮
          </button>
          {menuOpen ? (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div role="menu" className="absolute right-0 top-9 z-20 w-36 rounded-xl border border-stone-200 bg-white py-1 shadow-lg">
                {isOwnPost ? (
                  <>
                    <button
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        setEditing(true);
                      }}
                      className="block w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-50"
                    >
                      Edit Post
                    </button>
                    <button
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        setDeleting(true);
                      }}
                      className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                      Delete Post
                    </button>
                  </>
                ) : (
                  <button
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setReporting(true);
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    Report Post
                  </button>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>

      {reportNotice ? <p className="mt-2 text-xs text-stone-500">{reportNotice}</p> : null}

      {post.textContent ? (
        <p className="mt-3 whitespace-pre-wrap text-[15px] text-stone-800">
          <MentionText text={post.textContent} mentions={post.mentions} />
        </p>
      ) : null}
      <PostMedia photos={post.photos} />

      {/* Share remains visual prep; likes, comments and saving use their APIs. */}
      <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3 text-stone-400">
        <div className="flex items-center gap-5">
          <LikeButton post={post} accessToken={accessToken} onUpdated={onUpdated} />
          <button
            type="button"
            onClick={() => setCommentsOpen((v) => !v)}
            aria-expanded={commentsOpen}
            className="flex items-center gap-1.5 text-sm text-stone-400 transition hover:text-stone-600"
          >
            <span aria-hidden="true">💬</span>
            <span>{post.commentCount}</span>
          </button>
          <span className="flex items-center gap-1.5 text-sm">↗ Share</span>
        </div>
        <SavePostButton postId={post.postId} />
      </div>

      {commentsOpen ? (
        <CommentSection
          postId={post.postId}
          accessToken={accessToken}
          authorInitial={authorInitial}
          currentStudentId={currentStudentId}
          targetCommentId={targetCommentId}
          onCountChange={(count) => onUpdated({ ...post, commentCount: count })}
        />
      ) : null}

      {editing ? (
        <EditPostModal
          post={post}
          accessToken={accessToken}
          onClose={() => setEditing(false)}
          onSaved={(updated) => {
            setEditing(false);
            onUpdated(updated);
          }}
        />
      ) : null}

      {deleting ? (
        <DeletePostModal
          postId={post.postId}
          accessToken={accessToken}
          onClose={() => setDeleting(false)}
          onDeleted={() => {
            setDeleting(false);
            onDeleted(post.postId);
          }}
        />
      ) : null}

      {reporting ? (
        <ReportPostModal postId={post.postId} accessToken={accessToken} onClose={() => setReporting(false)} onReported={handleReported} />
      ) : null}
    </article>
  );
}
