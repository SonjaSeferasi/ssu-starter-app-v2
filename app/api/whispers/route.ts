import { AccountError, accountResponse, jsonBody, textField, verifiedUser } from '../../../lib/socialu-account';
import { feedRpc } from '../../../lib/feed';
import { shapeConfession, shapeConfessions, type RawConfessionRow, type WhisperCategory, type WhisperSort } from '../../../lib/whisper';

const CATEGORIES: WhisperCategory[] = ['funny', 'campus_crush', 'embarrassing', 'rant', 'advice', 'unpopular_opinion'];
const SORTS: WhisperSort[] = ['latest', 'trending', 'most_discussed'];

// The Whisper Wall (additional functionality, not SRS-numbered) -- list
// confessions. Same-school scoping, category filtering, and sorting all
// live in socialu_whisper_list; never trusted from the client beyond the
// category/sort choice itself.
export async function GET(request: Request) {
  try {
    const user = await verifiedUser(request);
    const params = new URL(request.url).searchParams;
    const categoryParam = params.get('category');
    const category = categoryParam && CATEGORIES.includes(categoryParam as WhisperCategory) ? categoryParam : null;
    const sortParam = params.get('sort');
    const sort: WhisperSort = sortParam && SORTS.includes(sortParam as WhisperSort) ? (sortParam as WhisperSort) : 'latest';
    const offset = Number(params.get('offset') ?? 0);
    if (!Number.isInteger(offset) || offset < 0) throw new AccountError('Invalid offset.', 400);

    const rows = await feedRpc<RawConfessionRow[]>('socialu_whisper_list', {
      p_auth_id: user.id, p_category: category, p_sort: sort, p_offset: offset,
    });
    return Response.json({ confessions: shapeConfessions(rows) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return accountResponse(error);
  }
}

// Create a confession. author_id always comes from the verified session.
// Category/length validation and the posting cooldown live in
// socialu_whisper_create.
export async function POST(request: Request) {
  try {
    const user = await verifiedUser(request);
    const body = await jsonBody(request);
    const category = typeof body.category === 'string' ? body.category : null;

    const row = await feedRpc<RawConfessionRow>('socialu_whisper_create', {
      p_auth_id: user.id, p_category: category, p_text: textField(body.textContent),
    });
    return Response.json({ confession: shapeConfession(row) }, { status: 201 });
  } catch (error) {
    return accountResponse(error);
  }
}
