/** Reject malformed escapes before Router's tolerant third-party query decoder runs. */
export function safeNativePath(path: string): string {
  if (path.length > 8192) return '/';
  try { decodeURIComponent(path); return path; }
  catch { return '/'; }
}
