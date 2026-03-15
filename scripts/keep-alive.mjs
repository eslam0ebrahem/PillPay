/**
 * Render Keep-Alive script
 * This script pings the application's external URL every 14 minutes
 * to prevent the Render server from sleeping due to inactivity.
 */

const PING_INTERVAL = 14 * 60 * 1000; // 14 minutes

const keepAlive = async () => {
  const url = process.env.RENDER_EXTERNAL_URL;

  if (!url) {
    console.warn('[Keep-Alive] RENDER_EXTERNAL_URL environment variable is not set. Self-ping skipped.');
    return;
  }

  console.log(`[Keep-Alive] Starting monitoring for ${url}`);

  setInterval(async () => {
    try {
      console.log(`[Keep-Alive] Pinging ${url}...`);
      const response = await fetch(url);
      console.log(`[Keep-Alive] Ping successful! Status: ${response.status} at ${new Date().toISOString()}`);
    } catch (error) {
      console.error(`[Keep-Alive] Ping failed at ${new Date().toISOString()}:`, error instanceof Error ? error.message : error);
    }
  }, PING_INTERVAL);
};

keepAlive();
