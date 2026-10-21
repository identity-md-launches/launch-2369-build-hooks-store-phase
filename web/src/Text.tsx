/** Keep digits in the terminal face, including amounts inside headings or request excerpts. */
export function Text({ children }: { children: string }) {
  return <>{children.split(/(0x[0-9a-fA-F]+|\d[\d.,]*(?:\s?(?:IMD|ETH|%|h))?)/g).map((part, i) => /^\d/.test(part) ? <span className="num" key={i}>{part}</span> : part)}</>;
}
