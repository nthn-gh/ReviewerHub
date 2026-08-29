// ============================================================
//  REVIEWERHUB — CONFIGURATION
//  Fill in your JSONBin.io credentials below to enable the
//  shared leaderboard (all students see each other's scores).
//
//  SETUP:
//  1. Go to https://jsonbin.io and create a FREE account
//  2. Click "CREATE BIN" → paste this as initial content:
//     {"weekKey":"","leaderboard":[]}
//     then click Create
//  3. Copy the Bin ID from the URL bar
//  4. Go to API Keys → copy your Master Key
//  5. Paste both below and save this file, then push to GitHub
// ============================================================
window.CONFIG = {
  JSONBIN_API_KEY: '$2a$10$uPFrzjSu3jTNpIA/GNP9ue91.Pf5mnAbQ7UOn9i10XvMChZpjaZua',      // ← paste your Master Key here  e.g. '$2a$10$abc...'
  JSONBIN_BIN_ID:  '6a92cef1f5f4af5e29516ce5',      // ← paste your Bin ID here      e.g. '66d1a2b3e41b4d34f...'

  WEEKLY_RESET: true,       // set to false to disable weekly resets

  // Password for the "Reset Leaderboard" button on the leaderboard page
  RESET_PASSWORD: 'Nathan2026',  // ← CHANGE THIS!
};
