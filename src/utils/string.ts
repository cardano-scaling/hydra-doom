export function truncateString(
  str: string,
  frontLen: number,
  backLen: number,
): string {
  if (str.length <= frontLen + backLen) {
    return str;
  }
  return `${str.substring(0, frontLen)}...${str.substring(str.length - backLen)}`;
}
