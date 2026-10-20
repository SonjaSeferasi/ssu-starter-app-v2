import Link from 'next/link';
import credits from '../../../../public/dormspace/campus/lpc/credits.json';
export default function DormArtCredits() {
    const authors = [...new Set(credits.flatMap(row => row.authors.split(',')))].sort();
    return <main style={{ maxWidth: 960, margin: '32px auto', padding: 24, color: '#28434a' }}><Link href="/game-room/dormspace">← DormSpace</Link>
    <h1 style={{ fontSize: 30, margin: '24px 0 16px' }}>DormSpace art credits</h1>
    <p>Character layers from the <a href="https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator">Universal LPC Spritesheet Character Generator</a>, with runtime color and clothing adaptations for SocialU.</p>
    <p style={{ margin: '12px 0' }}>Sprites by {authors.join(', ')}. Individual source files, authors, source links and selected licenses are listed below. Original PNG sources are distributed with the game.</p>
    <p>Furniture artwork was created for this rebuild using the built-in image-generation tool. <a href="/dormspace/campus/generation-prompts.json">Generation prompts</a>. <a href="/dormspace/campus/lpc/CREDITS.csv">Download character credits</a>.</p>
    <p style={{ margin: '12px 0' }}>Licenses: <a href="https://opengameart.org/content/oga-by-30-faq">OGA-BY 3.0</a> and <a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA 3.0</a>. Derived character rendering and color variants retain the corresponding source license.</p>
    <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}><thead><tr><th align="left">Source piece</th><th align="left">Artists</th><th align="left">License</th></tr></thead><tbody>{credits.map(row => <tr key={row.filename}><td style={{ padding: 8, borderBottom: '1px solid #d6e3dc' }}><a href={'/dormspace/campus/lpc/' + row.filename}>{row.filename}</a></td><td style={{ padding: 8, borderBottom: '1px solid #d6e3dc' }}>{row.authors}</td><td style={{ padding: 8, borderBottom: '1px solid #d6e3dc' }}>{row.selectedLicense}</td></tr>)}</tbody></table></div>
  </main>;
}
