'use client';
import Link from 'next/link';
import { DormSpaceGame } from '../../../../components/dormspace-classic/dormspace-game';
import { DormSpaceBanner } from '../../../../components/dormspace-classic/pixel-art';
import { SessionNotice } from '../../../../components/navigation/section-page';
import { useNavigationSession } from '../../../../components/navigation/social-shell';
import styles from '../../../../components/navigation/social-shell.module.css';
export default function ClassicDormSpacePage() {
    const session = useNavigationSession();
    if (session !== 'signed-in')
        return <SessionNotice state={session}/>;
    return <main className={styles.page}><p><Link href="/game-room/dormspace">← Updated DormSpace</Link> · Saved original version</p><DormSpaceBanner /><DormSpaceGame /></main>;
}
