'use client';

import dynamic from 'next/dynamic';

const WorldExplorer = dynamic(() => import('../../components/world-explorer/world-explorer'), {
 ssr: false,
 loading: () => <main style={{minHeight:'100dvh',background:'#062c41',color:'#e9f4ec',display:'grid',placeItems:'center'}}>Opening your atlas…</main>,
});

export default function WorldExplorerPage(){return <WorldExplorer/>;}
