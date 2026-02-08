/**
 * Startup wrapper — catches module-level crashes that would otherwise be silent.
 * Uses process.stderr.write() because console.log() buffers to stdout,
 * and process.exit() kills the process before stdout flushes (losing all logs).
 *
 * Also runs prisma db push here (instead of in Railway startCommand) because
 * `npx prisma db push` hangs indefinitely after completing — it never exits,
 * blocking the shell from running the next command.
 */
import { execSync } from 'child_process';

process.stderr.write('[start] Running prisma db push...\n');
try {
  execSync('npx prisma db push --accept-data-loss --skip-generate', {
    stdio: 'inherit',
    timeout: 30_000, // 30 second timeout — kill if it hangs
    env: { ...process.env, CHECKPOINT_DISABLE: '1' },
  });
  process.stderr.write('[start] Prisma db push completed.\n');
} catch (error: any) {
  // Log but don't exit — the server can still start even if db push fails
  // (schema might already be in sync, or this is a transient error)
  process.stderr.write(`[start] WARNING: prisma db push failed: ${error?.message || error}\n`);
}

process.stderr.write('[start] Booting server...\n');

try {
  require('./index');
} catch (error: any) {
  process.stderr.write('[start] FATAL: Server failed to start\n');
  process.stderr.write(`[start] Error: ${error?.message || error}\n`);
  if (error?.stack) {
    process.stderr.write(`[start] Stack: ${error.stack}\n`);
  }
  process.exit(1);
}
