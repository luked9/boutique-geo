/**
 * Startup wrapper — catches module-level crashes that would otherwise be silent.
 * Uses process.stderr.write() because console.log() buffers to stdout,
 * and process.exit() kills the process before stdout flushes (losing all logs).
 */
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
