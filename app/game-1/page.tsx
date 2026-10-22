'use client';
import dynamic from 'next/dynamic';
import { useNavigationSession } from '../../components/navigation/social-shell';
import { SessionNotice } from '../../components/navigation/section-page';
const Jumpyland = dynamic(() => import('../../components/jumpyland/game'), {ssr:false,loading:()=><p role="status">Loading Jumpyland…</p>});
export default function Game1Page(){const session=useNavigationSession();return session==='signed-in'?<Jumpyland/>:<SessionNotice state={session}/>;}
