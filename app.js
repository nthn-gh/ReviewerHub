// ============================================================
//  REVIEWER SITE — GAME ENGINE
//  Handles: player, XP, levels, badges, scores, leaderboard
// ============================================================

const KEYS = {
  PLAYER:      'rv_player',      // { name, xp, level, badges, scores }
  LEADERBOARD: 'rv_leaderboard', // array of player summaries
};

// ---- Levels -----------------------------------------------
const LEVELS = [
  { level:1, title:'Novice',      min:0,    icon:'🌱' },
  { level:2, title:'Apprentice',  min:200,  icon:'📖' },
  { level:3, title:'Scholar',     min:500,  icon:'🎓' },
  { level:4, title:'Expert',      min:1000, icon:'⚡' },
  { level:5, title:'Prodigy',     min:2000, icon:'🔥' },
  { level:6, title:'Master',      min:3500, icon:'👑' },
  { level:7, title:'Legend',      min:5500, icon:'💎' },
];

// ---- Badges -----------------------------------------------
const BADGES = [
  { id:'first_try',    label:'First Try!',      icon:'🎯', desc:'Complete your first reviewer' },
  { id:'perfect',      label:'Perfect Score!',  icon:'⭐', desc:'Score 100% on any topic' },
  { id:'five_topics',  label:'Bookworm',        icon:'📚', desc:'Complete 5 different topics' },
  { id:'ten_topics',   label:'Knowledge Seeker',icon:'🌟', desc:'Complete 10 different topics' },
  { id:'comeback',     label:'Comeback Kid',    icon:'💪', desc:'Retry a topic you previously failed' },
  { id:'speedster',    label:'Speed Run!',      icon:'⚡', desc:'Finish a reviewer in under 60 seconds' },
  { id:'high_scorer',  label:'High Achiever',   icon:'🏆', desc:'Score 90%+ on any topic' },
  { id:'master_level', label:'Master Level',    icon:'👑', desc:'Reach Master level' },
];

// ---- Core Helpers -----------------------------------------
function getPlayer() {
  try { return JSON.parse(localStorage.getItem(KEYS.PLAYER)); } catch { return null; }
}

function savePlayer(p) {
  localStorage.setItem(KEYS.PLAYER, JSON.stringify(p));
}

function createPlayer(name) {
  return { name, xp: 0, level: 1, badges: [], scores: {}, totalAttempts: 0 };
}

function ensurePlayer() {
  let p = getPlayer();
  if (!p) return null;
  return p;
}

// ---- XP Calculation ---------------------------------------
function calcXP(score, total) {
  if (!total) return 0;
  const pct = (score / total) * 100;
  let earned = 0;
  if (pct === 100)      earned = Math.round(total * 2.5) + 50;
  else if (pct >= 90)   earned = Math.round(score * 2.0);
  else if (pct >= 80)   earned = Math.round(score * 1.5);
  else if (pct >= 50)   earned = Math.round(score * 1.0);
  else                  earned = Math.round(score * 0.5);
  return Math.max(1, earned);
}

// ---- Level Resolution -------------------------------------
function resolveLevel(xp) {
  let lv = LEVELS[0];
  for (const l of LEVELS) { if (xp >= l.min) lv = l; else break; }
  return lv;
}

function nextLevel(xp) {
  const cur = resolveLevel(xp);
  return LEVELS.find(l => l.level === cur.level + 1) || null;
}

function xpProgress(xp) {
  const cur = resolveLevel(xp);
  const nxt = nextLevel(xp);
  if (!nxt) return { pct: 100, current: xp - cur.min, needed: 0 };
  const span = nxt.min - cur.min;
  const done = xp - cur.min;
  return { pct: Math.round((done / span) * 100), current: done, needed: span };
}

// ---- Badge Checking ---------------------------------------
function checkBadges(player, result) {
  const earned = [];
  const topicsPlayed = Object.keys(player.scores).length;

  function award(id) {
    if (!player.badges.includes(id)) { player.badges.push(id); earned.push(id); }
  }

  const pct = (result.score / result.total) * 100;

  if (topicsPlayed >= 1) award('first_try');
  if (pct === 100)       award('perfect');
  if (pct >= 90)         award('high_scorer');
  if (topicsPlayed >= 5) award('five_topics');
  if (topicsPlayed >= 10) award('ten_topics');
  if (result.timeSeconds && result.timeSeconds < 60) award('speedster');
  if (result.wasRetry && pct >= 50) award('comeback');
  if (player.level >= 6) award('master_level');

  return earned;
}

// ---- Submit Score -----------------------------------------
function submitScore(topicId, score, total, timeSeconds) {
  let player = getPlayer();
  if (!player) return null;

  const pct = Math.round((score / total) * 100);
  const prev = player.scores[topicId];
  const wasRetry = !!prev;
  const xpEarned = calcXP(score, total);

  // Update score record (keep best)
  if (!prev || pct > prev.pct) {
    player.scores[topicId] = { score, total, pct, timeSeconds, date: new Date().toISOString() };
  }

  player.xp += xpEarned;
  player.totalAttempts = (player.totalAttempts || 0) + 1;

  const prevLevel = player.level;
  const newLevelObj = resolveLevel(player.xp);
  player.level = newLevelObj.level;
  const leveledUp = player.level > prevLevel;

  const newBadges = checkBadges(player, { score, total, timeSeconds, wasRetry });
  savePlayer(player);
  updateLeaderboard(player);

  return { xpEarned, leveledUp, newBadges, newLevel: newLevelObj, pct };
}

// ---- Weekly Reset Helper ----------------------------------
function getWeekKey() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(now.getFullYear(), now.getMonth(), diff);
  return monday.toISOString().split('T')[0]; // e.g. '2026-08-24'
}

// ---- JSONBin Helpers (shared leaderboard) -----------------
const JSONBIN = 'https://api.jsonbin.io/v3';

function jsonbinConfigured() {
  const c = window.CONFIG;
  return c && c.JSONBIN_API_KEY && c.JSONBIN_BIN_ID;
}

async function fetchSharedData() {
  const { JSONBIN_API_KEY, JSONBIN_BIN_ID } = window.CONFIG;
  const res = await fetch(`${JSONBIN}/b/${JSONBIN_BIN_ID}/latest`, {
    headers: { 'X-Master-Key': JSONBIN_API_KEY }
  });
  if (!res.ok) throw new Error('JSONBin fetch failed');
  const json = await res.json();
  return json.record; // { weekKey, leaderboard: [] }
}

async function saveSharedData(data) {
  const { JSONBIN_API_KEY, JSONBIN_BIN_ID } = window.CONFIG;
  await fetch(`${JSONBIN}/b/${JSONBIN_BIN_ID}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': JSONBIN_API_KEY,
    },
    body: JSON.stringify(data),
  });
}

// ---- Leaderboard ------------------------------------------
function getLeaderboard() {
  try { return JSON.parse(localStorage.getItem(KEYS.LEADERBOARD)) || []; }
  catch { return []; }
}

function updateLeaderboard(player) {
  // Always update local cache
  const lb = getLeaderboard();
  const idx = lb.findIndex(p => p.name === player.name);
  const entry = buildEntry(player);
  if (idx >= 0) lb[idx] = entry; else lb.push(entry);
  lb.sort((a, b) => b.xp - a.xp);
  localStorage.setItem(KEYS.LEADERBOARD, JSON.stringify(lb));
}

function buildEntry(player) {
  return {
    name: player.name,
    xp: player.xp,
    level: player.level,
    badges: player.badges.length,
    topicsCompleted: Object.keys(player.scores).length,
    scores: player.scores,
  };
}

// Push score to shared JSONBin leaderboard (async, non-blocking)
async function pushToShared(player) {
  if (!jsonbinConfigured()) return;
  try {
    const remote = await fetchSharedData();
    const weekKey = getWeekKey();
    const cfg = window.CONFIG;

    // Weekly reset
    let lb = (cfg.WEEKLY_RESET && remote.weekKey !== weekKey) ? [] : (remote.leaderboard || []);

    const entry = buildEntry(player);
    const idx = lb.findIndex(p => p.name === player.name);
    if (idx >= 0) lb[idx] = entry; else lb.push(entry);
    lb.sort((a, b) => b.xp - a.xp);

    await saveSharedData({ weekKey, leaderboard: lb });
  } catch (e) {
    console.warn('Shared leaderboard update failed (offline?):', e);
  }
}

// Fetch the shared leaderboard for display (returns array)
async function getSharedLeaderboard() {
  if (!jsonbinConfigured()) return { entries: getLeaderboard(), shared: false };
  try {
    const remote = await fetchSharedData();
    const weekKey = getWeekKey();
    const cfg = window.CONFIG;
    if (cfg.WEEKLY_RESET && remote.weekKey !== weekKey) {
      return { entries: [], shared: true, resetThisLoad: true };
    }
    return { entries: remote.leaderboard || [], shared: true };
  } catch (e) {
    return { entries: getLeaderboard(), shared: false };
  }
}

// Reset the shared leaderboard (teacher action)
async function resetSharedLeaderboard() {
  if (!jsonbinConfigured()) {
    localStorage.removeItem(KEYS.LEADERBOARD);
    return true;
  }
  try {
    await saveSharedData({ weekKey: getWeekKey(), leaderboard: [] });
    localStorage.removeItem(KEYS.LEADERBOARD);
    return true;
  } catch (e) {
    return false;
  }
}

// ---- Confetti ---------------------------------------------
function launchConfetti() {
  const colors = ['#a78bfa','#22d3ee','#f59e0b','#10b981','#f472b6'];
  for (let i = 0; i < 80; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-particle';
    const size = Math.random() * 10 + 6;
    el.style.cssText = `
      width:${size}px;height:${size}px;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      left:${Math.random()*100}vw;top:-10px;
      animation-duration:${Math.random()*2+2}s;
      animation-delay:${Math.random()*0.8}s;
      border-radius:${Math.random()>0.5?'50%':'2px'};
      opacity:${Math.random()*0.5+0.5};
    `;
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

// ---- Toast ------------------------------------------------
function showToast(msg, duration = 3000) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast'; t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

// ---- Render Helpers ----------------------------------------
function renderLevelBadge(player) {
  const lv = resolveLevel(player.xp);
  return `<span class="level-badge">${lv.icon} ${lv.title}</span>`;
}

function renderXPBar(player) {
  const prog = xpProgress(player.xp);
  const nxt = nextLevel(player.xp);
  return `
    <div class="xp-bar-wrap">
      <div class="xp-bar-label">
        <span>${player.xp} XP total</span>
        <span>${nxt ? `${prog.current}/${prog.needed} to next level` : '🏆 Max Level'}</span>
      </div>
      <div class="xp-bar-track"><div class="xp-bar-fill" style="width:${prog.pct}%"></div></div>
    </div>`;
}

function getDifficultyClass(diff) {
  const map = { Easy:'easy', Medium:'medium', Hard:'hard' };
  return map[diff] || 'easy';
}

function getBestScore(player, topicId) {
  const s = player?.scores?.[topicId];
  return s ? s.pct : null;
}

// ---- Sync existing local scores → shared leaderboard ---------
// Called on page load. If JSONBin is now configured and the player
// has local scores that were saved before the shared leaderboard
// existed, this silently uploads them so they appear on the board.
async function syncLocalToShared() {
  if (!jsonbinConfigured()) return;        // JSONBin not set up yet
  const player = getPlayer();
  if (!player) return;                     // no player on this device
  if (!Object.keys(player.scores || {}).length) return; // no scores to sync

  // Check if already synced this session (avoid hammering the API)
  const syncKey = 'rv_synced_' + getWeekKey();
  if (localStorage.getItem(syncKey)) return;

  try {
    await pushToShared(player);
    localStorage.setItem(syncKey, '1');
    console.log('[ReviewerHub] Local scores synced to shared leaderboard.');
  } catch (e) {
    // Silently fail — will retry next visit
  }
}

// ---- Custom Topic Management (Admin Panel) ----------------
async function getCustomTopics() {
  if (!jsonbinConfigured()) return [];
  try {
    const data = await fetchSharedData();
    return data.customTopics || [];
  } catch { return []; }
}

async function getAllTopics() {
  const custom = await getCustomTopics();
  return [...(window.TOPICS || []), ...custom];
}

async function saveCustomTopic(topic) {
  if (!jsonbinConfigured()) throw new Error('JSONBin not configured');
  const data = await fetchSharedData();
  const topics = data.customTopics || [];
  const idx = topics.findIndex(t => t.id === topic.id);
  if (idx >= 0) topics[idx] = topic; else topics.push(topic);
  await saveSharedData({ ...data, customTopics: topics });
}

async function deleteCustomTopic(id) {
  if (!jsonbinConfigured()) throw new Error('JSONBin not configured');
  const data = await fetchSharedData();
  const topics = (data.customTopics || []).filter(t => t.id !== id);
  await saveSharedData({ ...data, customTopics: topics });
}

// Export to window
window.Game = {
  getPlayer, savePlayer, createPlayer, ensurePlayer,
  submitScore, calcXP, resolveLevel, nextLevel, xpProgress,
  checkBadges, getLeaderboard, updateLeaderboard,
  pushToShared, getSharedLeaderboard, resetSharedLeaderboard,
  syncLocalToShared,
  getCustomTopics, getAllTopics, saveCustomTopic, deleteCustomTopic,
  getWeekKey, jsonbinConfigured,
  launchConfetti, showToast,
  renderLevelBadge, renderXPBar, getDifficultyClass, getBestScore,
  LEVELS, BADGES,
};
