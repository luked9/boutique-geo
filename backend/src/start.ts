/**
 * Startup wrapper — catches module-level crashes that would otherwise be silent.
 * This runs before any application code loads.
 */
console.log('[start] Booting server...');

try {
  require('./index');
} catch (error: any) {
  console.error('[start] FATAL: Server failed to start');
  console.error('[start] Error:', error?.message || error);
  if (error?.stack) {
    console.error('[start] Stack:', error.stack);
  }
  process.exit(1);
}
