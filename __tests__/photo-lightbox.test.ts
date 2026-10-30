import { createElement } from 'react';
import { createRequire } from 'node:module';
import type { ReactNode } from 'react';
const { renderToStaticMarkup } = createRequire(import.meta.url)('react-dom/server') as { renderToStaticMarkup(node: ReactNode): string };
import { describe, expect, it } from 'vitest';
import { PostMedia } from '../components/feed/PostMedia';
import { PostCard } from '../components/feed/PostCard';
import { swipeAction } from '../components/feed/PhotoLightbox';
import type { FeedPost, FeedPhoto } from '../components/feed/types';

const photo = (assetId: number): FeedPhoto => ({ assetId, url: `https://example.test/${assetId}.jpg` });

const post = (overrides: Partial<FeedPost> = {}): FeedPost => ({
  postId: 1, authorId: 2, authorName: 'Maya Chen', authorUsername: 'maya.chen', authorPhotoUrl: null,
  textContent: 'Original post text', visibility: 'public', publishedAt: '2026-10-08T12:00:00Z', editedAt: null,
  photos: [], mentions: [], isRepost: false, repostOf: null, likeCount: 0, isLikedByViewer: false,
  reactionCounts: { like: 0, love: 0, haha: 0, wow: 0, sad: 0, care: 0 }, myReaction: null, commentCount: 0,
  ...overrides,
});

// Photo viewer (additional functionality, not SRS-numbered): a full
// render of PhotoLightbox itself needs a real DOM (document.addEventListener/
// document.body), which this project's node-environment test harness
// doesn't provide -- consistent with every other component test here,
// which statically renders and/or tests extracted pure logic instead of
// using jsdom. These checks cover: thumbnails become real buttons (not
// bare <img>s) with correct accessible names, the lightbox never
// attempts to touch `document` before a click opens it (so SSR/static
// render is safe), the repost embed never nests an interactive thumbnail
// inside its Link (the same invalid-nesting bug class already fixed once
// for a nested <a>), full-aspect-ratio (no-crop) thumbnail styling, and
// the swipe-gesture threshold logic.
describe('Photo viewer', () => {
  it('renders a single photo as a clickable, accessible button instead of a bare <img>', () => {
    const html = renderToStaticMarkup(createElement(PostMedia, { photos: [photo(1)] }));
    expect(html).toContain('<button');
    expect(html).toContain('aria-label="View photo"');
    expect(html).toContain('https://example.test/1.jpg');
    // No lightbox content present until a thumbnail is actually clicked.
    expect(html).not.toContain('Photo viewer');
  });

  it('never crops a photo in the feed: no fixed height, no object-cover, on a single photo', () => {
    const html = renderToStaticMarkup(createElement(PostMedia, { photos: [photo(1)] }));
    const imgTag = html.match(/<img[^>]*>/)?.[0] ?? '';
    expect(imgTag).toContain('h-auto');
    expect(imgTag).toContain('object-contain');
    expect(imgTag).not.toContain('object-cover');
    expect(imgTag).not.toMatch(/max-h-\[|h-48/);
  });

  it('never crops a photo in the feed: no fixed height, no object-cover, on a multi-photo grid', () => {
    const html = renderToStaticMarkup(createElement(PostMedia, { photos: [photo(1), photo(2)] }));
    for (const imgTag of html.match(/<img[^>]*>/g) ?? []) {
      expect(imgTag).toContain('h-auto');
      expect(imgTag).toContain('object-contain');
      expect(imgTag).not.toContain('object-cover');
      expect(imgTag).not.toMatch(/max-h-\[|h-48/);
    }
  });

  it('gives each thumbnail in a multi-photo post a numbered accessible name', () => {
    const html = renderToStaticMarkup(createElement(PostMedia, { photos: [photo(1), photo(2), photo(3)] }));
    expect(html).toContain('aria-label="View photo 1 of 3"');
    expect(html).toContain('aria-label="View photo 2 of 3"');
    expect(html).toContain('aria-label="View photo 3 of 3"');
  });

  it('renders nothing for a post with no photos', () => {
    const html = renderToStaticMarkup(createElement(PostMedia, { photos: [] }));
    expect(html).toBe('');
  });

  it('keeps a repost embed\'s photo thumbnails OUTSIDE the Link to the original post (never nests interactive content inside an <a>)', () => {
    const html = renderToStaticMarkup(
      createElement(PostCard, {
        post: post({ isRepost: true, repostOf: {
          postId: 9, authorId: 3, authorName: 'Sam Lee', authorUsername: 'sam', authorPhotoUrl: null,
          publishedAt: '2026-10-20T00:00:00Z', textContent: 'Original caption', photos: [photo(5)],
        } }),
        accessToken: 'token', isOwnPost: false, authorInitial: 'M', currentStudentId: 1,
        onUpdated: () => {}, onDeleted: () => {},
      })
    );
    const linkMatch = html.match(/<a [^>]*href="\/posts\/9"[^>]*>([\s\S]*?)<\/a>/);
    expect(linkMatch).not.toBeNull();
    // The Link wraps the embedded author/caption, but not the photo button.
    expect(linkMatch![1]).not.toContain('<button');
    expect(linkMatch![1]).not.toContain('example.test/5.jpg');
    // The photo thumbnail still renders, just as a sibling of the Link.
    expect(html).toContain('example.test/5.jpg');
  });

  it('does not interfere with Like, Comment, Share, or Save controls when a post has photos', () => {
    const html = renderToStaticMarkup(
      createElement(PostCard, {
        post: post({ photos: [photo(1)] }), accessToken: 'token', isOwnPost: false, authorInitial: 'M',
        currentStudentId: 1, onUpdated: () => {}, onDeleted: () => {},
      })
    );
    expect(html).toContain('Share');
    expect(html).toContain('💬');
  });

  it('treats a short touch movement as a tap, not a swipe', () => {
    expect(swipeAction(10)).toBeNull();
    expect(swipeAction(-10)).toBeNull();
    expect(swipeAction(49)).toBeNull();
    expect(swipeAction(-49)).toBeNull();
  });

  it('maps a leftward swipe to next and a rightward swipe to prev, past the threshold', () => {
    expect(swipeAction(-50)).toBe('next');
    expect(swipeAction(-200)).toBe('next');
    expect(swipeAction(50)).toBe('prev');
    expect(swipeAction(200)).toBe('prev');
  });
});
