/** Split editor HTML into one line per block element / list item so lines can be diffed. */
export function toLines(html: string): string[] {
  return html
    .replace(/<\/(p|h[1-6]|li|ul|ol|blockquote)>/gi, '</$1>\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .split('\n').map((l) => l.trim()).filter(Boolean);
}

export interface DiffLine { type: 'same' | 'add' | 'del'; text: string }

/** Simple LCS line diff: 'del' = only in `from`, 'add' = only in `to`. */
export function diffLines(from: string[], to: string[]): DiffLine[] {
  const n = from.length, m = to.length;
  const t: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--) t[i][j] = from[i] === to[j] ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
  const out: DiffLine[] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (from[i] === to[j]) { out.push({ type: 'same', text: from[i] }); i++; j++; }
    else if (t[i + 1][j] >= t[i][j + 1]) out.push({ type: 'del', text: from[i++] });
    else out.push({ type: 'add', text: to[j++] });
  }
  while (i < n) out.push({ type: 'del', text: from[i++] });
  while (j < m) out.push({ type: 'add', text: to[j++] });
  return out;
}
