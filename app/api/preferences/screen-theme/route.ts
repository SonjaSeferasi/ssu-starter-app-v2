import { verifiedUser, accountResponse, jsonBody } from '../../../../lib/socialu-account';
import { feedRpc } from '../../../../lib/feed';
import { SCREEN_THEME_IDS, HEADER_THEME_IDS, type ScreenThemeId, type HeaderThemeId } from '../../../../lib/screen-themes';

export const dynamic = 'force-dynamic';

// "Customize Your Screen" -- additional functionality, not in the
// official SRS, not to be confused with SRS-627's Light/Dark appearance
// mode. GET reads the caller's own saved background/header theme; PUT
// saves both at once (an unrecognized/omitted value is treated as
// Default/NULL, never silently rejected the whole request). Background
// only ever accepts the 9 illustrated themes; header accepts all 23
// (illustrated art, solid colors, gradients) -- validated here against
// the same two lists the picker UI itself renders from, and re-validated
// again server-side in socialu_set_screen_theme.
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
    const backgroundTheme = typeof body.backgroundTheme === 'string' && SCREEN_THEME_IDS.includes(body.backgroundTheme as ScreenThemeId) ? body.backgroundTheme : null;
    const headerTheme = typeof body.headerTheme === 'string' && HEADER_THEME_IDS.includes(body.headerTheme as HeaderThemeId) ? body.headerTheme : null;
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
