import type { ReactNode } from 'react';
import Link from 'next/link';
import type { Mention } from './types';

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Renders text with ONLY server-verified @mentions highlighted and linked
// to the mentioned student's CURRENT profile -- never an arbitrary
// "@anything" substring (a typo or an unrelated email-looking string stays
// plain text). Built as an array of plain strings and <Link> elements, the
// same safe pattern React already uses everywhere else in this codebase;
// never dangerouslySetInnerHTML.
export function MentionText({ text, mentions }: { text: string; mentions: Mention[] }) {
  if (mentions.length === 0) return <>{text}</>;

  // Longest matchedUsername first, so e.g. "sam" can never swallow a match
  // that should have been the longer "samantha".
  const sorted = [...mentions].sort((a, b) => b.matchedUsername.length - a.matchedUsername.length);
  const pattern = new RegExp(`@(${sorted.map((m) => escapeRegExp(m.matchedUsername)).join('|')})\\b`, 'gi');
  const byUsername = new Map(mentions.map((m) => [m.matchedUsername.toLowerCase(), m]));

  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const mention = byUsername.get(match[1].toLowerCase());
    nodes.push(
      mention ? (
        <Link
          key={`mention-${key++}`}
          href={`/students/${encodeURIComponent(mention.username)}`}
          className="font-medium text-emerald-700 hover:underline"
        >
          @{match[1]}
        </Link>
      ) : (
        match[0]
      )
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));

  return <>{nodes}</>;
}
