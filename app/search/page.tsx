import { CampusSearchPage } from '../../components/navigation/campus-search-page';

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string | string[]; offset?: string | string[] }> }) {
  const params = await searchParams;
  const query = typeof params.q === 'string' ? params.q.trim() : '';
  const offset = typeof params.offset === 'string' ? Number(params.offset) : 0;
  return <CampusSearchPage key={`${query}|${offset}`} query={query} offset={offset} />;
}
