import { AccountError, accountResponse, jsonBody, verifiedUser } from '../../../../lib/socialu-account';
import { dormShop, shopBuyerScope, unexpectedShop } from '../../../../lib/dormspace-3d-server';
import { isActionKey, readPurchaseRequest, readPurchaseResult, readShopCatalog, rejectionResponse } from '../../../../lib/dormspace-shop-contract';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'no-store' };

// GET -> the caller's shared balance, every DormSpace offer with its state, and an opaque buyer scope.
// GET ?purchase=<actionKey> -> the stored outcome of an earlier attempt (for unknown results).
export async function GET(request: Request) {
  try {
    const user = await verifiedUser(request);
    const params = new URL(request.url).searchParams;
    if (params.has('purchase')) {
      const actionKey = params.get('purchase');
      if (!isActionKey(actionKey)) throw new AccountError('Choose a purchase to check.', 400);
      const result = readPurchaseResult(await dormShop(user.id, 'status', { actionKey: actionKey.toLowerCase() }));
      if (!result) throw unexpectedShop();
      return Response.json(result, { headers: noStore });
    }
    const catalog = readShopCatalog(await dormShop(user.id, 'catalog', {}));
    if (!catalog) throw unexpectedShop();
    // The buyer scope comes from the verified session only (any client-sent field is ignored).
    return Response.json({ ...catalog, buyer: shopBuyerScope(user.id) }, { headers: noStore });
  } catch (error) { return accountResponse(error); }
}

// POST {itemId, expectedPrice, actionKey} buys one item with the caller's own shared points.
export async function POST(request: Request) {
  try {
    const user = await verifiedUser(request);
    const purchase = readPurchaseRequest(await jsonBody(request));
    if (typeof purchase === 'string') throw new AccountError(purchase, 400);
    const result = readPurchaseResult(await dormShop(user.id, 'purchase', purchase));
    if (!result || result.status === 'not_found') throw unexpectedShop();
    if (result.status === 'rejected') {
      const rejection = rejectionResponse(result.reason);
      // Nothing was charged; the body carries the current price and balance for re-confirmation.
      return Response.json({ error: rejection.message, code: rejection.code, result }, { status: rejection.status, headers: noStore });
    }
    return Response.json(result, { status: result.replayed ? 200 : 201, headers: noStore });
  } catch (error) { return accountResponse(error); }
}
