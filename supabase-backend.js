// Intercepts Game functions to use Supabase instead of localStorage/JSONBin
(function() {
  const sb = window.supabaseClient;
  let currentUser = null;

  window.Game.loadAuth = async function() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
      currentUser = null;
      return null;
    }

    const userId = session.user.id;
    const { data: profile } = await sb.from('profiles').select('*').eq('id', userId).single();
    if (!profile) return null;

    const { data: scoresData } = await sb.from('scores').select('*').eq('user_id', userId);
    const scores = {};
    let totalAttempts = 0;
    if (scoresData) {
      scoresData.forEach(s => {
        scores[s.topic_id] = {
          score: s.score, total: s.total, pct: s.pct,
          timeSeconds: s.time_seconds, attempts: s.attempts, date: s.date
        };
        totalAttempts += s.attempts;
      });
    }

    currentUser = {
      id: userId,
      name: profile.name,
      xp: profile.xp,
      level: profile.level,
      badges: profile.badges || [],
      scores: scores,
      totalAttempts: totalAttempts
    };
    return currentUser;
  };

  window.Game.getPlayer = function() { return currentUser; };

  const _origSave = window.Game.savePlayer;
  window.Game.savePlayer = function(player) {
    if (!player) return;
    currentUser = player;
    if (player.id) {
      sb.from('profiles').update({ xp: player.xp, level: player.level, badges: player.badges }).eq('id', player.id).then();
    }
  };

  const _origSubmit = window.Game.submitScore;
  window.Game.submitScore = function(topicId, score, total, timeSeconds) {
    const res = _origSubmit(topicId, score, total, timeSeconds);
    if (currentUser && currentUser.id) {
      const s = currentUser.scores[topicId];
      sb.from('scores').upsert({
        user_id: currentUser.id, topic_id: topicId, score: s.score, total: s.total,
        pct: s.pct, time_seconds: s.timeSeconds, attempts: s.attempts, date: s.date
      }, { onConflict: 'user_id, topic_id' }).then();
    }
    return res;
  };

  window.Game.getSharedLeaderboard = async function() {
    const { data: profiles } = await sb.from('profiles').select('id, name, xp, level, badges');
    const { data: scores } = await sb.from('scores').select('user_id, topic_id, score, total, pct');
    if (!profiles) return { entries: [], shared: true };

    const entries = profiles.map(p => {
      const userScores = {};
      let topicsCompleted = 0;
      if (scores) {
        scores.filter(s => s.user_id === p.id).forEach(s => {
          userScores[s.topic_id] = s;
          topicsCompleted++;
        });
      }
      return {
        name: p.name, xp: p.xp, level: p.level,
        badges: (p.badges || []).length, topicsCompleted, scores: userScores,
        id: p.id // Admin access
      };
    });
    entries.sort((a, b) => b.xp - a.xp);
    return { entries, shared: true, resetThisLoad: false };
  };

  window.Game.resetSharedLeaderboard = async function() {
    const { error } = await sb.rpc('reset_leaderboard');
    return !error;
  };

  window.Game.pushToShared = async function() {};
  window.Game.syncLocalToShared = async function() {};

  window.Game.signUp = async function(email, password, name) {
    const { data: existing } = await sb.from('profiles').select('name').ilike('name', name).maybeSingle();
    if (existing) throw new Error("Name is already taken. Please choose another.");

    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) throw error;
    if (!data.session) throw new Error("Account created! Please check your email to confirm, then log in.");

    const userId = data.user.id;
    const local = localStorage.getItem('rv_player');
    let initXp = 0, initLevel = 1, initBadges = [];
    let parsedLocal = null;
    
    if (local) {
        parsedLocal = JSON.parse(local);
        initXp = parsedLocal.xp || 0;
        initLevel = parsedLocal.level || 1;
        initBadges = parsedLocal.badges || [];
    }

    const { error: pErr } = await sb.from('profiles').insert({
        id: userId, name: name, xp: initXp, level: initLevel, badges: initBadges
    });
    if (pErr) throw pErr;

    if (parsedLocal && parsedLocal.scores) {
        for (const [tId, s] of Object.entries(parsedLocal.scores)) {
            await sb.from('scores').upsert({
                user_id: userId, topic_id: tId, score: s.score, total: s.total,
                pct: s.pct, time_seconds: s.timeSeconds || 0, attempts: s.attempts || 1, date: s.date || new Date().toISOString()
            });
        }
    }
    
    if (local) localStorage.removeItem('rv_player');
    return await window.Game.loadAuth();
  };

  window.Game.logIn = async function(email, password) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return await window.Game.loadAuth();
  };

  window.Game.logOut = async function() {
    await sb.auth.signOut();
    currentUser = null;
    window.location.href = 'index.html';
  };

  window.Game.adminUpdateXP = async function(studentId, newXP) {
     const { error } = await sb.rpc('admin_update_xp', { student_id: studentId, new_xp: newXP });
     if (error) throw error;
     return true;
  };

  window.Game.changeName = async function(newName) {
      if (!currentUser) return;
      const { data: existing } = await sb.from('profiles').select('name').ilike('name', newName).maybeSingle();
      if (existing) throw new Error("Name is already taken!");
      
      const { error } = await sb.from('profiles').update({ name: newName }).eq('id', currentUser.id);
      if (error) throw error;
      
      currentUser.name = newName;
  };

})();
