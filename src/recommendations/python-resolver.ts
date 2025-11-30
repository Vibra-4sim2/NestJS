import { spawnSync } from 'child_process';

/**
 * Resolve a usable Python 3 interpreter path across platforms.
 * Priority: RECOMMENDER_PYTHON env → common absolute paths → python3/python/py in PATH.
 */
export function resolvePythonPath(): string | null {
  const candidates = [
    process.env.RECOMMENDER_PYTHON,
    // Common absolute paths
    '/opt/homebrew/bin/python3', // macOS Apple Silicon Homebrew
    '/usr/local/bin/python3',    // macOS Intel Homebrew/Linux
    '/usr/bin/python3',          // Alpine/Ubuntu/Debian
    // PATH fallbacks
    process.platform === 'win32' ? 'py' : 'python3',
    'python',
  ].filter(Boolean) as string[];

  for (const cmd of candidates) {
    try {
      const res = spawnSync(cmd, ['--version'], { encoding: 'utf-8' });
      const out = (res.stdout || '') + (res.stderr || '');
      if (res.status === 0 && /Python 3\./.test(out)) return cmd;
    } catch {
      // ignore and try next
    }
  }
  return null;
}

export function getPythonOrThrow(): string {
  const python = resolvePythonPath();
  if (!python) throw new Error('Python 3 interpreter not found');
  return python;
}
