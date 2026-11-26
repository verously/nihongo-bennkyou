import React from 'react';

// Matches kanji compounds (including occasional internal kana like 話し方[はなしかた] or 取り組み[とりくみ])
// followed immediately by [furigana reading].
const RUBY_PATTERN =
  /([一-龯々ヶヵ]+(?:[ぁ-んァ-ヶー][一-龯々ヶヵ]+)*)\[([^\[\]\n]+)\]/g;

export function stripFurigana(text: string): string {
  if (!text) return '';
  return text.replace(RUBY_PATTERN, '$1');
}

interface RubyTextProps {
  text: string;
  className?: string;
}

export const RubyText: React.FC<RubyTextProps> = ({ text, className }) => {
  if (!text) return null;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const regex = new RegExp(RUBY_PATTERN.source, 'g');
  let keyIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const base = match[1];
    const reading = match[2];
    nodes.push(
      <ruby key={`rb-${keyIndex++}`}>
        {base}
        <rp>(</rp>
        <rt>{reading}</rt>
        <rp>)</rp>
      </ruby>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return <span className={className}>{nodes}</span>;
};
