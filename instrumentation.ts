export async function register() {
  if (process.env.NEXT_RUNTIME === 'edge') return;

  const { processIncomingEmails } = await import('./lib/email-processor');

  const POLL_INTERVAL_MS = 2 * 60 * 1000;

  setTimeout(async () => {
    console.log('[instrumentation] Starting first email poll');
    await processIncomingEmails();
    setInterval(processIncomingEmails, POLL_INTERVAL_MS);
  }, 10_000);

  console.log('[instrumentation] Email polling scheduled every 2 minutes');
}
