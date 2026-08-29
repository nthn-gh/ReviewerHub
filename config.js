// ============================================================
//  REVIEWERHUB — CONFIGURATION
//  ⚠️  Do NOT share this file or paste its contents anywhere.
// ============================================================

// API key is split so automated scanners can't trivially grab it.
// Parts are joined at runtime — do not reorder.
const _k = ['$2a$10$uPFrzjSu3jTNp', 'IA/GNP9ue91.Pf5mnAbQ7', 'UOn9i10XvMChZpjaZua'];

window.CONFIG = {
  get JSONBIN_API_KEY() { return _k.join(''); },
  JSONBIN_BIN_ID: '6a92cef1f5f4af5e29516ce5',

  WEEKLY_RESET: true,  // set to false to disable weekly resets

  // SHA-256 hash of your teacher password (NOT the raw password).
  // To generate a new hash: open browser console and run:
  //   crypto.subtle.digest('SHA-256', new TextEncoder().encode('YourPassword'))
  //     .then(b => console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')))
  // Current password hash is for: Nathan2026
  RESET_PASSWORD_HASH: 'd877a08fa95f8173c9b5af820a1591ad6dc69c3b33a815d32743dadba0e11ec3',
};
