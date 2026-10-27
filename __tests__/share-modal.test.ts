import { createElement } from 'react';
import { createRequire } from 'node:module';
import type { ReactNode } from 'react';
const { renderToStaticMarkup } = createRequire(import.meta.url)('react-dom/server') as { renderToStaticMarkup(node: ReactNode): string };
import { describe, expect, it } from 'vitest';
import { ShareModal } from '../components/feed/ShareModal';
import type { FeedPost } from '../components/feed/types';

const post = (overrides: Partial<FeedPost> = {}): FeedPost => ({
  postId: 1, authorId: 2, authorName: 'Maya Chen', authorUsername: 'maya.chen', authorPhotoUrl: null,
  textContent: 'Original post text', visibility: 'public', publishedAt: '2026-10-08T12:00:00Z', editedAt: null,
  photos: [], mentions: [], isRepost: false, repostOf: null, likeCount: 0, isLikedByViewer: false, commentCount: 0,
  ...overrides,
});

// Share (additional functionality): static-render checks for the modal's
// required elements (caption placeholder, original-post preview with
// attribution, visibility selector with no default, Share button starting
// disabled until a visibility is chosen) and the Friends Only
// visibility-forcing UI cue. No reposting-dropdown/native-share leftovers
// -- the interactive flow (typing a caption, picking visibility, actually
// submitting) was verified manually in the browser, same as every other
// composer in this app.
describe('ShareModal (Share, additional functionality)', () => {
  it('renders the caption field, original preview with attribution, visibility selector with no default, and a disabled Share button', () => {
    const html = renderToStaticMarkup(createElement(ShareModal, { post: post(), accessToken: 'token', onClose: () => {} }));
    expect(html).toContain('Say something about this post');
    expect(html).toContain('Maya Chen'); // original author attribution
    expect(html).toContain('Original post text');
    expect(html).toContain('Public');
    expect(html).toContain('Friends Only');
    expect(html).toContain('Share to SocialU');
    // No visibility pre-selected -> neither option carries the selected styling.
    expect(html).not.toContain('bg-emerald-100 text-emerald-800');
    // The Share button itself starts disabled (no visibility chosen yet).
    const shareButtonMatch = html.match(/<button[^>]*>Share to SocialU<\/button>/);
    expect(shareButtonMatch?.[0]).toContain('disabled=""');
  });

  it('forces Friends Only and disables Public when the original post is Friends Only', () => {
    const html = renderToStaticMarkup(
      createElement(ShareModal, { post: post({ visibility: 'friends_only' }), accessToken: 'token', onClose: () => {} })
    );
    expect(html).toContain('your repost will be too');
    const publicButtonMatch = html.match(/<button[^>]*>Public<\/button>/);
    expect(publicButtonMatch?.[0]).toContain('disabled=""');
  });
});
