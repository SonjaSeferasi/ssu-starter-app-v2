export function LoadingFeedState() {
  return <p className="py-10 text-center text-sm text-stone-500">Loading feed…</p>;
}

export function EmptyFeedState({ tab }: { tab: 'campus' | 'friends' }) {
  return (
    <div className="rounded-3xl border border-dashed border-stone-300 bg-white/60 py-10 text-center text-sm text-stone-500">
      {tab === 'campus'
        ? 'No public posts yet. Be the first to share something with campus.'
        : "No posts from friends yet. Posts your accepted friends mark \"Friends Only\" will show up here."}
    </div>
  );
}

export function ErrorFeedState({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-red-200 bg-red-50 py-6 text-center text-sm text-red-700">{message}</div>
  );
}
