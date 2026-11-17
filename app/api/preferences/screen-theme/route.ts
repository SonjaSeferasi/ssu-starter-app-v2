import { verifiedUser, accountResponse, jsonBody } from '../../../../lib/socialu-account';
import { feedRpc } from '../../../../lib/feed';
import { SCREEN_THEME_IDS, HEADER_THEME_IDS, type ScreenThemeId, type HeaderThemeId } from '../../../../lib/screen-themes';

export const dynamic = 'force-dynamic';

// "Customize Your Screen" -- additional functionality, not in the
// official SRS, not to be confused with SRS-627's Light/Dark appearance
// mode. GET reads the caller's own saved background/header theme; PUT
// saves either or both. An OMITTED field (undefined/null -- not sent at
// all) leaves that theme unchanged (socialu_set_screen_theme does a real
// partial update); a field that WAS sent but isn't a recognized id is
// rejected with 400 rather than silently becoming Default (fixed #1209 --
// previously both cases were indistinguishable and both silently reset to
// Default while still reporting success). Background only ever accepts
// the 9 illustrated themes; header accepts all 23 (illustrated art, solid
// colors, gradients) -- validated here against the same two lists the
// picker UI itself renders from, and re-validated again server-side in
// socialu_set_screen_theme.
export async function GET(request: Request) {
  try {
    const user = await verifiedUser(request);
    const result = await feedRpc<{ background_theme: ScreenThemeId | null; header_theme: HeaderThemeId | null }>('socialu_get_screen_theme', {
      p_auth_id: user.id,
    });
    return Response.json(
      { backgroundTheme: result.background_theme, headerTheme: result.header_theme },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return accountResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await verifiedUser(request);
    const body = await jsonBody(request);

    // A value that's genuinely absent (undefined/null -- the field wasn't
    // sent at all) means "leave this one alone": socialu_set_screen_theme
    // now does a real partial update for that case (see #1209). A value
    // that WAS sent but isn't a recognized id is a different thing
    // entirely -- the client got something wrong, and silently coercing
    // that to "leave alone" used to coerce it to Default instead while
    // still reporting success (confirmed bug #1209); that's now a 400.
    let backgroundTheme: ScreenThemeId | null = null;
    if (body.backgroundTheme !== undefined && body.backgroundTheme !== null) {
      if (typeof body.backgroundTheme === 'string' && SCREEN_THEME_IDS.includes(body.backgroundTheme as ScreenThemeId)) {
        backgroundTheme = body.backgroundTheme as ScreenThemeId;
      } else {
        return Response.json({ error: 'Choose a valid background theme.' }, { status: 400 });
      }
    }
    let headerTheme: HeaderThemeId | null = null;
    if (body.headerTheme !== undefined && body.headerTheme !== null) {
      if (typeof body.headerTheme === 'string' && HEADER_THEME_IDS.includes(body.headerTheme as HeaderThemeId)) {
        headerTheme = body.headerTheme as HeaderThemeId;
      } else {
        return Response.json({ error: 'Choose a valid header theme.' }, { status: 400 });
      }
    }

    const result = await feedRpc<{ background_theme: ScreenThemeId | null; header_theme: HeaderThemeId | null }>('socialu_set_screen_theme', {
      p_auth_id: user.id,
      p_background_theme: backgroundTheme,
      p_header_theme: headerTheme,
    });
    return Response.json(
      { backgroundTheme: result.background_theme, headerTheme: result.header_theme },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return accountResponse(error);
  }
}
