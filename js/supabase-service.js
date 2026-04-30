// =====================================================================
// Supabase 서비스 — 클라이언트 초기화, 인증, 리더보드, 진행상황, 배지
// =====================================================================

const BADGE_DEFINITIONS = [
    { key: 'stage_1_clear', icon: '🌱', name: '첫 발걸음',    condition: '1단계를 클리어하세요.' },
    { key: 'stage_2_clear', icon: '🌊', name: '물결을 넘어',  condition: '2단계를 클리어하세요.' },
    { key: 'stage_3_clear', icon: '⚡', name: '폭풍의 눈',   condition: '3단계를 클리어하세요.' },
    { key: 'stage_4_clear', icon: '🔥', name: '화염 정복자',  condition: '4단계를 클리어하세요.' },
    { key: 'stage_5_clear', icon: '🌪️', name: '재난을 넘어', condition: '5단계를 클리어하세요.' },
    { key: 'stage_6_clear', icon: '👑', name: '초월자',       condition: '6단계를 클리어하세요.' },
];

const SUPABASE_URL = 'https://akdscfegwrvsonwaqeof.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrZHNjZmVnd3J2c29ud2FxZW9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NDgwNzUsImV4cCI6MjA5MzAyNDA3NX0.5qhN5ll0bLRMX60qvyEw7u7SCvEVMrZYS-ofaIrfkCE';
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===================================================
// 인증
// ===================================================
let currentUser = null;
let isSignUpMode = false;
let clearedStages = new Set();     // 클리어한 단계 (세션 내 추적)
let shownBadgesSession = new Set(); // 세션 중 이미 표시한 배지 (비로그인 중복 방지)

async function initAuth() {
    const { data: { session } } = await sb.auth.getSession();
    currentUser = session?.user ?? null;
    if (currentUser) await ensureProfile(currentUser);
    updateHeaderUI(currentUser);
    sb.auth.onAuthStateChange(async (_event, session) => {
        currentUser = session?.user ?? null;
        if (currentUser) await ensureProfile(currentUser);
        updateHeaderUI(currentUser);
    });
}

// 로그인 시 프로필이 없으면 localStorage에 저장된 닉네임으로 생성
async function ensureProfile(user) {
    const existing = await fetchUsername(user.id);
    if (!existing) {
        const pendingUsername = localStorage.getItem('pending_username_' + user.id);
        if (pendingUsername) {
            await sb.from('profiles').upsert({ id: user.id, username: pendingUsername });
            await sb.from('user_progress').upsert({ user_id: user.id });
            localStorage.removeItem('pending_username_' + user.id);
        }
    }
}

function updateHeaderUI(user) {
    const btnAuth      = document.getElementById('btn-header-auth');
    const btnSignout   = document.getElementById('btn-header-signout');
    const usernameEl   = document.getElementById('header-username');
    const btnMyrecords = document.getElementById('btn-myrecords');
    if (user) {
        fetchUsername(user.id).then(name => {
            usernameEl.textContent = name ? '👤 ' + name : user.email;
        });
        btnAuth.style.display    = 'none';
        btnSignout.style.display = '';
        if (btnMyrecords) btnMyrecords.style.display = '';
        loadClearedStages().then(updateStageButtons);
    } else {
        usernameEl.textContent   = '';
        btnAuth.style.display    = '';
        btnSignout.style.display = 'none';
        if (btnMyrecords) btnMyrecords.style.display = 'none';
        clearedStages.clear();
        updateStageButtons();
    }
}

async function loadClearedStages() {
    if (!currentUser) return;
    const { data } = await sb.from('user_progress').select('stages_cleared').eq('user_id', currentUser.id).maybeSingle();
    if (data?.stages_cleared) {
        data.stages_cleared.forEach(s => clearedStages.add(s));
    }
}

function updateStageButtons() {
    for (let i = 1; i <= 6; i++) {
        const btn = document.querySelector(`#screen-select button[data-stage="${i}"]`);
        if (!btn) continue;
        const isUnlocked = i === 1 || clearedStages.has(i - 1);
        btn.disabled = !isUnlocked;
        if (!isUnlocked) {
            btn.textContent = `🔒 ${i}단계`;
            btn.classList.add('stage-locked');
        } else {
            btn.textContent = `${i}단계`;
            btn.classList.remove('stage-locked');
        }
    }
}

async function openStageSelect() {
    changeScreen('screen-select');
    await loadClearedStages();
    updateStageButtons();
}

async function fetchUsername(userId) {
    const { data } = await sb.from('profiles').select('username').eq('id', userId).maybeSingle();
    return data?.username ?? null;
}

function openAuthModal() {
    isSignUpMode = false;
    document.getElementById('auth-modal-title').textContent     = '로그인';
    document.getElementById('auth-submit-btn').textContent      = '로그인';
    document.getElementById('auth-toggle-text').textContent     = '계정이 없으신가요?';
    document.getElementById('auth-toggle-link').textContent     = ' 회원가입';
    document.getElementById('auth-username-wrap').style.display = 'none';
    document.getElementById('auth-error').textContent           = '';
    document.getElementById('auth-email').value                 = '';
    document.getElementById('auth-password').value              = '';
    document.getElementById('auth-username').value              = '';
    document.getElementById('auth-modal').classList.add('active');
}

function closeAuthModal() {
    document.getElementById('auth-modal').classList.remove('active');
}

function toggleAuthMode() {
    isSignUpMode = !isSignUpMode;
    if (isSignUpMode) {
        document.getElementById('auth-modal-title').textContent     = '회원가입';
        document.getElementById('auth-submit-btn').textContent      = '회원가입';
        document.getElementById('auth-toggle-text').textContent     = '이미 계정이 있으신가요?';
        document.getElementById('auth-toggle-link').textContent     = ' 로그인';
        document.getElementById('auth-username-wrap').style.display = '';
    } else {
        document.getElementById('auth-modal-title').textContent     = '로그인';
        document.getElementById('auth-submit-btn').textContent      = '로그인';
        document.getElementById('auth-toggle-text').textContent     = '계정이 없으신가요?';
        document.getElementById('auth-toggle-link').textContent     = ' 회원가입';
        document.getElementById('auth-username-wrap').style.display = 'none';
    }
    document.getElementById('auth-error').textContent = '';
}

async function handleAuthSubmit() {
    const email = document.getElementById('auth-email').value.trim();
    const pw    = document.getElementById('auth-password').value;
    const errEl = document.getElementById('auth-error');
    errEl.textContent = '';
    if (!email || !pw) { errEl.textContent = '이메일과 비밀번호를 입력하세요.'; return; }

    if (isSignUpMode) {
        const username = document.getElementById('auth-username').value.trim();
        if (!username || username.length < 2) { errEl.textContent = '닉네임을 2자 이상 입력하세요.'; return; }
        const { data: existing } = await sb.from('profiles').select('id').eq('username', username).maybeSingle();
        if (existing) { errEl.textContent = '이미 사용 중인 닉네임입니다.'; return; }
        const { data, error } = await sb.auth.signUp({ email, password: pw });
        if (error) { errEl.textContent = error.message; return; }
        // 이메일 인증이 필요한 경우를 대비해 닉네임을 localStorage에 저장
        localStorage.setItem('pending_username_' + data.user.id, username);
        // 바로 세션이 생성된 경우(이메일 인증 불필요) 즉시 프로필 생성
        await sb.from('profiles').upsert({ id: data.user.id, username });
        await sb.from('user_progress').upsert({ user_id: data.user.id });
        closeAuthModal();
    } else {
        const { error } = await sb.auth.signInWithPassword({ email, password: pw });
        if (error) { errEl.textContent = '이메일 또는 비밀번호가 올바르지 않습니다.'; return; }
        closeAuthModal();
    }
}

async function sbSignOut() {
    await sb.auth.signOut();
}

// ===================================================
// 리더보드
// ===================================================
async function openLeaderboard() {
    changeScreen('screen-leaderboard');
    loadLeaderboard(1, document.querySelector('.lb-tab'));
}

async function loadLeaderboard(stage, tabEl) {
    document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
    if (tabEl) tabEl.classList.add('active');
    const content = document.getElementById('lb-content');
    content.innerHTML = '<p class="lb-loading">불러오는 중...</p>';

    const { data, error } = await sb
        .from('leaderboard')
        .select('username, turns')
        .eq('stage', stage)
        .order('turns', { ascending: true })
        .limit(100);

    if (error || !data) { content.innerHTML = '<p class="lb-empty">데이터를 불러오지 못했습니다.</p>'; return; }

    const best = {};
    data.forEach(r => { if (!best[r.username] || r.turns < best[r.username]) best[r.username] = r.turns; });
    const rows = Object.entries(best).sort((a, b) => a[1] - b[1]).slice(0, 10);

    if (!rows.length) { content.innerHTML = '<p class="lb-empty">아직 기록이 없습니다. 첫 번째 기록을 남겨보세요!</p>'; return; }

    let html = '<table class="lb-table"><thead><tr><th>순위</th><th>닉네임</th><th>턴수</th></tr></thead><tbody>';
    rows.forEach(([username, turns], i) => {
        const cls = i === 0 ? 'lb-rank-1' : i === 1 ? 'lb-rank-2' : i === 2 ? 'lb-rank-3' : '';
        html += '<tr><td class="' + cls + '">' + (i + 1) + '</td><td>' + escHtml(username) + '</td><td>' + turns + '</td></tr>';
    });
    html += '</tbody></table>';
    content.innerHTML = html;
}

function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ===================================================
// 내 기록
// ===================================================
async function openMyRecords() {
    if (!currentUser) { openAuthModal(); return; }
    changeScreen('screen-myrecords');

    const [progRes, achRes] = await Promise.all([
        sb.from('user_progress').select('stages_cleared, best_turns').eq('user_id', currentUser.id).maybeSingle(),
        sb.from('user_achievements').select('achievement_key').eq('user_id', currentUser.id)
    ]);

    const progress     = progRes.data;
    const unlockedKeys = new Set((achRes.data || []).map(a => a.achievement_key));

    let stagesHtml = '';
    for (let s = 1; s <= 6; s++) {
        const cleared   = (progress?.stages_cleared || []).includes(s);
        const bestT     = (progress?.best_turns || [])[s - 1];
        const scoreHtml = cleared ? bestT + ' <span>턴</span>' : '미클리어';
        stagesHtml += '<div class="stage-card ' + (cleared ? 'cleared' : 'not-cleared') + '">'
            + '<div class="stage-label">' + s + '단계</div>'
            + '<div class="stage-score">' + scoreHtml + '</div></div>';
    }
    document.getElementById('myrecords-stages').innerHTML = stagesHtml;

    let badgeHtml = '';
    BADGE_DEFINITIONS.forEach(badge => {
        const unlocked = unlockedKeys.has(badge.key);
        badgeHtml += '<div class="badge-card ' + (unlocked ? 'unlocked' : 'locked') + '">'
            + '<span class="badge-card-icon">' + badge.icon + '</span>'
            + '<div class="badge-card-name">' + escHtml(badge.name) + '</div>'
            + '<div class="badge-card-condition">' + escHtml(badge.condition) + '</div>'
            + '</div>';
    });
    document.getElementById('myrecords-badges').innerHTML = badgeHtml;
}

// ===================================================
// 게임 클리어 저장
// ===================================================
async function onGameClear(stage, turns) {
    clearedStages.add(stage);
    const statusEl = document.getElementById('result-save-status');
    if (!currentUser) {
        statusEl.textContent = '로그인하면 기록이 저장됩니다.';
        setTimeout(() => checkAndUnlockBadges(null, stage), 600);
        return;
    }
    statusEl.textContent = '기록 저장 중...';
    try {
        const username = await fetchUsername(currentUser.id);
        if (!username) {
            statusEl.textContent = '프로필 정보를 찾을 수 없습니다. 다시 로그인해주세요.';
            return;
        }

        const { error: lbErr } = await sb.from('leaderboard').insert({ user_id: currentUser.id, username, stage, turns });
        if (lbErr) {
            console.error('[onGameClear] leaderboard insert:', lbErr);
            statusEl.textContent = `기록 저장 실패: ${lbErr.message}`;
            return;
        }

        const progErr = await upsertProgress(currentUser.id, stage, turns);
        if (progErr) console.error('[onGameClear] upsertProgress:', progErr);

        await checkAndUnlockBadges(currentUser.id, stage);
        statusEl.textContent = '기록이 저장되었습니다!';
    } catch (e) {
        console.error('[onGameClear] exception:', e);
        statusEl.textContent = '기록 저장에 실패했습니다.';
    }
}

async function upsertProgress(userId, stage, turns) {
    const { data: existing } = await sb.from('user_progress').select('stages_cleared, best_turns').eq('user_id', userId).maybeSingle();
    let cleared = existing?.stages_cleared ?? [];
    let best    = existing?.best_turns    ?? [0, 0, 0, 0, 0, 0];
    if (!cleared.includes(stage)) cleared = [...cleared, stage];
    const idx = stage - 1;
    if (best[idx] === 0 || turns < best[idx]) best[idx] = turns;

    if (existing) {
        const { error } = await sb.from('user_progress')
            .update({ stages_cleared: cleared, best_turns: best, updated_at: new Date().toISOString() })
            .eq('user_id', userId);
        return error ?? null;
    } else {
        const { error } = await sb.from('user_progress')
            .insert({ user_id: userId, stages_cleared: cleared, best_turns: best });
        return error ?? null;
    }
}

// ===================================================
// 배지
// ===================================================
async function checkAndUnlockBadges(userId, stage) {
    await unlockBadge(userId, `stage_${stage}_clear`);
}

async function unlockBadge(userId, key) {
    const badgeDef = BADGE_DEFINITIONS.find(b => b.key === key);
    if (!badgeDef) return;

    if (userId) {
        const { data: existing } = await sb.from('user_achievements')
            .select('achievement_key')
            .eq('user_id', userId)
            .eq('achievement_key', key)
            .maybeSingle();
        if (existing) return;
        const { error: insErr } = await sb.from('user_achievements').insert({ user_id: userId, achievement_key: key });
        if (insErr) { console.error('[unlockBadge] insert failed:', insErr); return; }
    } else {
        if (shownBadgesSession.has(key)) return;
    }
    shownBadgesSession.add(key);
    showBadgeModal(badgeDef);
}

function showBadgeModal(badge) {
    const content = document.querySelector('.badge-modal-content');
    if (content) { content.style.animation = 'none'; content.offsetHeight; content.style.animation = ''; }
    document.getElementById('badge-icon-large').textContent = badge.icon;
    document.getElementById('badge-modal-name').textContent = badge.name;
    document.getElementById('badge-modal-condition').textContent = badge.condition;
    document.getElementById('badge-modal').classList.add('active');
}

function closeBadgeModal() {
    document.getElementById('badge-modal').classList.remove('active');
}

// ===================================================
// 초기화
// ===================================================
window.addEventListener('DOMContentLoaded', initAuth);
