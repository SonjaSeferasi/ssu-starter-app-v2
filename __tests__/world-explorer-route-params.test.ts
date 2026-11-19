// Next.js 16 hands a dynamic route's `params` to the handler as a Promise, not a plain object.
// A handler that reads `params.code` straight off it gets undefined, so every request looks like
// an unknown country and the route answers 404 instead of the country.
//
// These tests call the two world-explorer routes the way Next 16 calls them. They fail against a
// handler written for the Next 14 contract and pass once it awaits params.
//
// The upstream providers are mocked, so nothing here touches the network: the point is how the
// handler reads its parameters, not what Wikimedia or the World Bank reply.

import { describe, it, expect, vi } from 'vitest';

vi.mock('../lib/world-explorer/providers', () => ({
  fetchCountryFacts: vi.fn(async () => null),
  fetchCountriesDevFacts: vi.fn(async () => null),
}));

vi.mock('../lib/world-explorer/media', () => ({
  landmarkImage: vi.fn(async () => null),
}));

import { GET as countriesRoute } from '../app/api/world-explorer/countries/[code]/route';
import { GET as mediaRoute } from '../app/api/world-explorer/media/[code]/route';

// How Next 16 invokes a dynamic route handler.
function nextContext(code: string) {
  return { params: Promise.resolve({ code }) };
}

describe('world-explorer dynamic routes follow the Next 16 params contract', () => {
  it('returns the country when params arrives as a promise', async () => {
    const response = await countriesRoute(
      new Request('http://localhost/api/world-explorer/countries/FRA'),
      nextContext('FRA'),
    );

    expect(
      response.status,
      'the handler did not await params, so FRA looked like an unknown country',
    ).toBe(200);

    const body = await response.json();
    expect(body.country?.code).toBe('FRA');
  });

  it('returns the media payload when params arrives as a promise', async () => {
    const response = await mediaRoute(
      new Request('http://localhost/api/world-explorer/media/FRA'),
      nextContext('FRA'),
    );

    expect(
      response.status,
      'the handler did not await params, so FRA looked like an unknown country',
    ).toBe(200);

    const body = await response.json();
    expect(body.countryCode).toBe('FRA');
  });

  // The 404 path must keep working: awaiting params must not turn a bad code into a 200.
  it('still refuses a code that is not in the catalogue', async () => {
    const response = await countriesRoute(
      new Request('http://localhost/api/world-explorer/countries/ZZZ'),
      nextContext('ZZZ'),
    );

    expect(response.status).toBe(404);
  });
});
