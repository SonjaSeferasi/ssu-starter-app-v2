import { beforeEach, describe, expect, it, vi } from 'vitest';

function makeTableBuilder() {
  let result: { data: unknown; error: unknown } = { data: null, error: null };
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    or: vi.fn(() => builder),
    order: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => result),
    single: vi.fn(async () => result),
    then: (resolve: (value: unknown) => unknown) => resolve(result),
    __setResult: (next: { data: unknown; error: unknown }) => {
      result = next;
    },
  };
  return builder;
}

const tables = {
  posts: makeTableBuilder(),
  current_friendships: makeTableBuilder(),
  media_assets: makeTableBuilder(),
  post_photos: makeTableBuilder(),
};

const storageUpload = vi.fn(async () => ({ error: null }));
const storageCreateSignedUrl = vi.fn(async (key: string) => ({
  data: { signedUrl: `https://signed.example/${key}` },
  error: null,
}));

vi.mock('../../lib/socialu', () => ({
  getSocialuClient: vi.fn(() => ({
    from: vi.fn((table: keyof typeof tables) => tables[table]),
    storage: { from: vi.fn(() => ({ upload: storageUpload, createSignedUrl: storageCreateSignedUrl })) },
  })),
  getCurrentStudentId: vi.fn((request: Request) => {
    const header = request.headers.get('x-student-id');
    if (!header) return null;
    const id = Number(header);
    return Number.isInteger(id) && id > 0 ? id : null;
  }),
}));

import { GET as campusFeed } from '../../app/api/posts/feed/campus/route';
import { GET as friendsFeed } from '../../app/api/posts/feed/friends/route';
import { POST as createPost } from '../../app/api/posts/route';
import { POST as attachPhotos } from '../../app/api/posts/[postId]/photos/route';

const rawPost = (overrides: Partial<Record<string, unknown>> = {}) => ({
  post_id: 1,
  author_id: 42,
  text_content: 'Hello campus!',
  visibility: 'public',
  published_at: '2026-10-08T12:00:00Z',
  edited_at: null,
  students: { full_name: 'Maya Chen', student_profiles: { display_name: null, media_assets: null } },
  post_photos: [],
  ...overrides,
});

function req(url: string, init: RequestInit & { studentId?: number | string } = {}) {
  const { studentId, headers, ...rest } = init;
  return new Request(`http://localhost${url}`, {
    ...rest,
    headers: { ...(headers as Record<string, string>), ...(studentId !== undefined ? { 'x-student-id': String(studentId) } : {}) },
  });
}

describe('Campus Feed (SRS-301)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tables.posts.__setResult({ data: [rawPost()], error: null });
  });

  it('rejects an unauthenticated request', async () => {
    const response = await campusFeed(req('/api/posts/feed/campus'));
    expect(response.status).toBe(401);
  });

  it('returns shaped public posts for an authenticated student', async () => {
    const response = await campusFeed(req('/api/posts/feed/campus', { studentId: 7 }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.posts).toEqual([
      {
        postId: 1,
        authorId: 42,
        authorName: 'Maya Chen',
        authorPhotoUrl: null,
        textContent: 'Hello campus!',
        visibility: 'public',
        publishedAt: '2026-10-08T12:00:00Z',
        editedAt: null,
        photos: [],
      },
    ]);
  });

  it('a non-friend public post is still returned (SRS-301.3)', async () => {
    const response = await campusFeed(req('/api/posts/feed/campus', { studentId: 999 }));
    const body = await response.json();
    expect(body.posts).toHaveLength(1);
  });
});

describe('Friends Feed (SRS-302)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tables.current_friendships.__setResult({ data: [], error: null });
    tables.posts.__setResult({ data: [rawPost({ visibility: 'friends_only' })], error: null });
  });

  it('rejects an unauthenticated request', async () => {
    const response = await friendsFeed(req('/api/posts/feed/friends'));
    expect(response.status).toBe(401);
  });

  it('returns an empty feed when the student has no accepted friends', async () => {
    const response = await friendsFeed(req('/api/posts/feed/friends', { studentId: 7 }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ posts: [] });
  });

  it('returns friends-only posts from an accepted friend', async () => {
    tables.current_friendships.__setResult({ data: [{ student_low: 7, student_high: 42 }], error: null });
    const response = await friendsFeed(req('/api/posts/feed/friends', { studentId: 7 }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.posts).toHaveLength(1);
    expect(body.posts[0].visibility).toBe('friends_only');
  });
});

describe('Create Post (SRS-303)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tables.posts.__setResult({ data: rawPost(), error: null });
  });

  it('rejects an unauthenticated request', async () => {
    const response = await createPost(req('/api/posts', { method: 'POST', body: JSON.stringify({}) }));
    expect(response.status).toBe(401);
  });

  it('rejects blank text', async () => {
    const response = await createPost(
      req('/api/posts', { method: 'POST', studentId: 42, body: JSON.stringify({ textContent: '   ', visibility: 'public' }) })
    );
    expect(response.status).toBe(400);
  });

  it('rejects an invalid visibility value', async () => {
    const response = await createPost(
      req('/api/posts', { method: 'POST', studentId: 42, body: JSON.stringify({ textContent: 'Hi', visibility: 'everyone' }) })
    );
    expect(response.status).toBe(400);
  });

  it('creates a post for the authenticated student', async () => {
    const response = await createPost(
      req('/api/posts', { method: 'POST', studentId: 42, body: JSON.stringify({ textContent: 'Hello!', visibility: 'public' }) })
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.post.authorId).toBe(42);
    expect(tables.posts.insert).toHaveBeenCalledWith(
      expect.objectContaining({ author_id: 42, text_content: 'Hello!', visibility: 'public' })
    );
  });
});

describe('Attach Photos (SRS-304)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tables.posts.__setResult({ data: { post_id: 1, author_id: 42 }, error: null });
    tables.media_assets.__setResult({ data: { asset_id: 99 }, error: null });
    tables.post_photos.__setResult({ data: null, error: null });
  });

  function photoRequest(studentId: number, files: File[]) {
    const form = new FormData();
    for (const file of files) form.append('images', file);
    return req('/api/posts/1/photos', { method: 'POST', studentId, body: form });
  }

  it('rejects an unauthenticated request', async () => {
    const response = await attachPhotos(req('/api/posts/1/photos', { method: 'POST' }), { params: { postId: '1' } });
    expect(response.status).toBe(401);
  });

  it('returns 404 when the post does not exist', async () => {
    tables.posts.__setResult({ data: null, error: null });
    const response = await attachPhotos(photoRequest(42, [new File(['x'], 'a.jpg', { type: 'image/jpeg' })]), {
      params: { postId: '1' },
    });
    expect(response.status).toBe(404);
  });

  it('returns 403 when the requester is not the post author', async () => {
    const response = await attachPhotos(photoRequest(7, [new File(['x'], 'a.jpg', { type: 'image/jpeg' })]), {
      params: { postId: '1' },
    });
    expect(response.status).toBe(403);
  });

  it('rejects an unsupported file type', async () => {
    const response = await attachPhotos(photoRequest(42, [new File(['x'], 'a.gif', { type: 'image/gif' })]), {
      params: { postId: '1' },
    });
    expect(response.status).toBe(400);
  });

  it('attaches supported photos to the post', async () => {
    const response = await attachPhotos(
      photoRequest(42, [new File(['x'], 'a.jpg', { type: 'image/jpeg' }), new File(['y'], 'b.png', { type: 'image/png' })]),
      { params: { postId: '1' } }
    );
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ attachedCount: 2 });
    expect(storageUpload).toHaveBeenCalledTimes(2);
  });
});
