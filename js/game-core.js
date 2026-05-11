// =====================================================================
// 게임 핵심 로직 — 상태 변수, 렌더링, 타일/카드 조작, 게임 흐름
// =====================================================================


// [1] 게임 상태 변수
const BOARD_SIZE = 6;

let boardState = []; // { type: 'normal'|'distortion', state: 'polluted'|'purified' }
let cardsPlayed = 0;
let upcomingQueue = [];
let activeHand = [];
let selectedCardIndex = null;
let quizEngaged = false; // 문제 풀기 버튼을 눌러야 카드 선택 가능
let swapChances = 2; // 교체 기회
let lastDealtCardIndex = null; // 마지막으로 들어온 카드의 위치
let mergedCardIndex = null; // 병합된 강화 카드의 위치
let pendingExtraTurnPenalty  = false; // 실패 보상 카드 1: 다음 카드 사용 시 턴 1 추가 소모
let pendingIgnoreDistortion  = false; // 대성공 보상 카드 1: 이번 턴 왜곡 무시
let pendingEnhanceCard       = false; // 대성공 보상 카드 2: 이번 턴 카드 강화
let pendingEnhanceOriginalHand = null; // 강화 전 원본 손패 보관
let pendingSkipTurn          = false; // 대성공 보상 카드 3: 이번 턴 턴 소모 없음
let selectingDistortionMode  = false; // 대성공 보상 카드 6: 왜곡 타일 직접 선택 모드
let pendingKeepCard          = false; // 성공 보상 카드 4: 이번 턴 카드 소모 없음
let pendingDoubleGreatChance = false; // 성공 보상 카드 6: 다음 턴 대성공 확률 2배
let pendingCanSelectPurified = false; // 성공 보상 카드 8: 이번 턴 정화 타일 선택 가능

const disasterTypes = ['홍수', '호우', '태풍', '대설', '한파', '폭염', '황사', '지진', '화재', '산불', '붕괴', '폭발'];


// [2] tooltip 관련 + 유틸 함수:
const tooltip = document.getElementById('tooltip');
document.addEventListener('mousemove', (e) => {
    if (tooltip.style.display === 'block') {
        tooltip.style.left = (e.clientX + 15) + 'px';
        tooltip.style.top = (e.clientY + 15) + 'px';
    }
});
function showTooltip(text) {
    tooltip.innerHTML = text;
    tooltip.style.display = 'block';
}
function hideTooltip() {
    tooltip.style.display = 'none';
}

function showVisualFeedback(msg, color = '#d32f2f') {
    const toast = document.getElementById('toast');
    toast.innerText = msg;
    toast.style.background = color;
    toast.style.display = 'block';
    toast.style.animation = 'none';
    toast.offsetHeight; // reflow
    toast.style.animation = 'fadeInOut 3s forwards';
}

function updateSelectedCardInfo() {
    const infoContent = document.getElementById('card-info-content');
    if (selectedCardIndex !== null && activeHand[selectedCardIndex]) {
        const card = activeHand[selectedCardIndex];
        const displayName = card.name.includes('이중 강화')
            ? card.name.replace('이중 강화', '<span style="color:#ce93d8;">이중 강화</span>')
            : card.name.replace('강화', '<span style="color:#fdd835;">강화</span>');

        // 다른 버전(일반/강화/이중 강화) 표시 섹션 생성
        let versionsHtml = '';
        const versions = getAllCardVersions(card);
        if (versions) {
            const otherVersions = [versions.basic, versions.enhanced, versions.double]
                .filter(v => v && v.name !== card.name);
            if (otherVersions.length > 0) {
                const items = otherVersions.map((v, i) => {
                    const vName = v.name.includes('이중 강화')
                        ? v.name.replace('이중 강화', '<span style="color:#ce93d8;">이중 강화</span>')
                        : v.name.replace('강화', '<span style="color:#fdd835;">강화</span>');
                    return `<div class="version-card-item" data-version-idx="${i}">
                        ${buildCardContent(v, '90px', false)}
                        <div class="version-card-name">${vName}</div>
                    </div>`;
                }).join('');
                versionsHtml = `<div class="card-versions-section">
                    <div class="card-versions-grid">${items}</div>
                </div>`;
                // 툴팁 이벤트는 innerHTML 설정 후 아래에서 부착
                window._pendingVersionTooltips = otherVersions;
            }
        }

        infoContent.innerHTML = `
            <div class="card-preview">
                ${buildCardContent(card, '160px', pendingEnhanceCard)}
            </div>
            <h4 class="card-name">${displayName}</h4>
            <p class="card-desc">${card.desc}</p>
            ${versionsHtml}
        `;

        // 다른 버전 카드에 툴팁 이벤트 부착
        if (window._pendingVersionTooltips) {
            infoContent.querySelectorAll('.version-card-item').forEach(el => {
                const idx = parseInt(el.dataset.versionIdx);
                const v = window._pendingVersionTooltips[idx];
                if (!v) return;
                const tName = v.name.includes('이중 강화')
                    ? v.name.replace('이중 강화', '<span style="color:#ce93d8;">이중 강화</span>')
                    : v.name.replace('강화', '<span style="color:#fdd835;">강화</span>');
                el.addEventListener('mouseenter', () => showTooltip(`<strong>${tName}</strong><br>${v.desc}`));
                el.addEventListener('mouseleave', hideTooltip);
            });
            window._pendingVersionTooltips = null;
        }
    } else {
        infoContent.innerHTML = '<p>사용할 카드를 선택하세요.</p>';
    }
}

function triggerDistortionPenalty(hitCount = 1) {
    let purifiedTiles = [];
    for(let i=0; i<BOARD_SIZE; i++) {
        for(let j=0; j<BOARD_SIZE; j++) {
            if(boardState[i][j].state === 'purified' && boardState[i][j].type === 'normal') {
                purifiedTiles.push([i,j]);
            }
        }
    }
    purifiedTiles.sort(() => Math.random() - 0.5);
    const repolluteCount = Math.min(3 * hitCount, purifiedTiles.length);
    
    for(let i=0; i<repolluteCount; i++) {
        const [tr, tc] = purifiedTiles[i];
        boardState[tr][tc].state = 'polluted';
    }
    
    if (repolluteCount > 0) {
        showVisualFeedback(`왜곡 타일 ${hitCount}개 정화 시도 패널티! 정화된 일반 타일 ${repolluteCount}개가 다시 오염되었습니다.`, '#d32f2f');
    } else {
        showVisualFeedback(`왜곡 타일 ${hitCount}개 정화 시도 패널티! (다시 오염될 정화된 일반 타일이 없습니다)`, '#f57c00');
    }
}

function generateMiniGrid(shape, sizeCss, highlightColor = '#8bc34a') {
    const cellPx = (parseInt(sizeCss) - 4 * 2) / 5;
    const qFontPx = Math.max(6, Math.round(cellPx * 0.7));
    let html = `<div style="display:grid; grid-template-columns:repeat(5, 1fr); gap:2px; width:${sizeCss}; height:${sizeCss};">`;
    for(let r=0; r<5; r++) {
        for(let c=0; c<5; c++) {
            let val = shape[r] ? shape[r][c] : 0;
            let bg = 'transparent';
            if (val === 1) bg = highlightColor;
            if (val === 2 || val === 3) bg = '#ffeb3b';
            const inner = (val === 3)
                ? `<span style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-size:${qFontPx}px; line-height:1; color:#555; font-weight:bold; user-select:none;">?</span>`
                : '';
            html += `<div style="background-color:${bg}; border-radius:1px; position:relative;">${inner}</div>`;
        }
    }
    html += `</div>`;
    return html;
}


// [3] 카드 생성 + 게임 화면 전환 + 스테이지 맵 + startGame 이후 모든 함수:
function getRandomCard() {
    return basicCardTypes[Math.floor(Math.random() * basicCardTypes.length)];
}

function changeScreen(screenId) {
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function openBackConfirmModal() {
    document.getElementById('back-confirm-modal').classList.add('active');
}
function closeBackConfirmModal() {
    document.getElementById('back-confirm-modal').classList.remove('active');
}
function confirmBackToSelect() {
    closeBackConfirmModal();
    openStageSelect();
}

// 0 = 일반 타일, 1 = 왜곡 타일, 2 = 빈 칸(게임 판 외부)
// 3 = 마을 타일, 4 = 강 타일, 5 = 공장 타일, 6 = 바다 타일(빈 칸 대체)
const STAGE_MAPS = [
    // 1단계: 평범한 6×6
    [
        [0,0,0,0,0,0],
        [0,0,0,0,0,0],
        [0,0,0,0,0,0],
        [0,0,0,0,0,0],
        [0,0,0,0,0,0],
        [0,0,0,0,0,0]
    ],
    // 2단계: 반대각선 왜곡
    [
        [0,0,0,0,0,0],
        [0,0,0,0,1,0],
        [0,0,0,1,0,0],
        [0,0,1,0,0,0],
        [0,1,0,0,0,0],
        [0,0,0,0,0,0]
    ],
    // 3단계: 모서리 빈 칸 + 중앙 2×2 왜곡
    [
        [2,0,0,0,0,2],
        [0,0,0,0,0,0],
        [0,0,1,1,0,0],
        [0,0,1,1,0,0],
        [0,0,0,0,0,0],
        [2,0,0,0,0,2]
    ],
    // 4단계
    [
        [0,0,0,0,0,0],
        [0,1,1,0,0,0],
        [0,0,0,0,0,0],
        [0,0,0,0,0,0],
        [0,0,0,1,1,0],
        [0,0,0,0,0,0]
    ],
    // 5단계
    [
        [2,2,0,0,2,2],
        [2,0,1,0,0,2],
        [0,0,0,0,1,0],
        [0,1,0,0,0,0],
        [2,0,0,1,0,2],
        [2,2,0,0,2,2]
    ],
    // 6단계: 모서리 빈 칸 + 산발 왜곡
    [
        [0,0,0,0,0,1],
        [0,1,0,0,1,0],
        [0,0,0,1,0,0],
        [0,0,1,0,0,0],
        [0,1,0,0,1,0],
        [1,0,0,0,0,0],
    ],
    // 테스트: 레벨 2 기반, 마을/강/공장/바다 타일 포함
    [
        [6, 3, 4, 5, 4, 6],
        [3, 4, 3, 0, 1, 5],
        [4, 5, 0, 1, 3, 4],
        [5, 3, 1, 4, 0, 3],
        [0, 1, 4, 5, 3, 4],
        [6, 5, 3, 4, 5, 6],
    ]
];

function startGame(stageIndex) {
    currentStage = stageIndex + 1;
    swapCountThisGame = 0;
    greatSuccessStreak = 0;
    const map = STAGE_MAPS[stageIndex];
    const size = map.length;
    boardState = [];
    for(let i=0; i<size; i++) {
        let row = [];
        for(let j=0; j<size; j++) {
            const v = map[i][j];
            const TILE_TYPE  = { 0:'normal', 1:'distortion', 2:'empty', 3:'village', 4:'river', 5:'factory', 6:'sea' };
            const TILE_STATE = { 2:'empty', 6:'sea' };
            row.push({
                type:  TILE_TYPE[v]  ?? 'normal',
                state: TILE_STATE[v] ?? 'polluted',
            });
        }
        boardState.push(row);
    }

    cardsPlayed = 0;
    upcomingQueue = [getRandomCard(), getRandomCard(), getRandomCard()];
    activeHand = [getRandomCard(), getRandomCard()];
    selectedCardIndex = null;
    quizEngaged = false;
    swapChances = 2;
    lastDealtCardIndex = null;
    pendingKeepCard = false;
    pendingDoubleGreatChance = false;
    pendingCanSelectPurified = false;
    ['enhance-pending-label','ignore-distortion-label','skip-turn-label',
        'keep-card-label','double-great-label','extra-turn-label','select-purified-label']
        .forEach(id => { document.getElementById(id).style.display = 'none'; });

    updateStatus();
    setProblemBtnEnabled(true);
    renderBoard();
    renderCards();
    updateSelectedCardInfo();
    changeScreen('screen-game');
}

function renderBoard() {
    const boardEl = document.getElementById('board');
    boardEl.innerHTML = '';
    boardEl.style.gridTemplateColumns = `repeat(${BOARD_SIZE}, 1fr)`;
    
    for(let i=0; i<BOARD_SIZE; i++) {
        for(let j=0; j<BOARD_SIZE; j++) {
            const cell = boardState[i][j];
            const tile = document.createElement('div');
            
            if (cell.type === 'empty') {
                tile.className = 'tile empty-tile';
                tile.id = `tile-${i}-${j}`;
                boardEl.appendChild(tile);
                continue;
            }
            if (cell.type === 'sea') {
                tile.className = 'tile sea-tile';
                tile.id = `tile-${i}-${j}`;
                boardEl.appendChild(tile);
                continue;
            }

            tile.className = 'tile';
            if (cell.type === 'distortion') tile.classList.add('distortion');
            else if (cell.type === 'village') tile.classList.add('village');
            else if (cell.type === 'river')   tile.classList.add('river');
            else if (cell.type === 'factory') tile.classList.add('factory');
            if (cell.state === 'purified') tile.classList.add('purified');

            tile.onclick = () => handleTileClick(i, j);

            tile.onmouseenter = () => {
                showPreview(i, j);
                if (cell.type === 'distortion') {
                    showTooltip('<strong style="color:#ff5252;">⚠️ 왜곡 타일</strong><br>일반/강화 방재카드로 범위에 포함시켜 정화 시도 시 정화된 일반 타일 3개가 다시 오염됩니다.<br>정화 방재 카드를 사용하면 패널티 없이 정화할 수 있습니다.<br><span style="color:#ce93d8;">이중 강화 카드는 범위에 포함되어도 패널티가 발생하지 않습니다.</span>');
                }
            };
            tile.onmouseleave = () => {
                clearPreview();
                hideTooltip();
            };
            
            tile.id = `tile-${i}-${j}`;
            boardEl.appendChild(tile);
        }
    }
}

// 미니 그리드 + 티어 화살표 오버레이를 합친 카드 콘텐츠 HTML 반환
function buildCardContent(card, sizeCss, isTempEnhanced) {
    const px = parseInt(sizeCss);
    const arrowPx = Math.min(14, Math.max(8, Math.round(px * 0.13)));

    let tierArrow = '';
    if (card.name.startsWith('이중 강화')) {
        tierArrow = `<span class="tier-arrow tier-arrow-double" style="font-size:${arrowPx}px;">▲</span>`;
    } else if (card.name.startsWith('강화')) {
        tierArrow = `<span class="tier-arrow tier-arrow-enhanced" style="font-size:${arrowPx}px;">▲</span>`;
    }

    const tempArrow = isTempEnhanced
        ? `<span class="tier-arrow tier-arrow-temp" style="font-size:${arrowPx}px;"
            onmouseenter="event.stopPropagation(); showTooltip('대성공 보상 카드의 효과로 이번 턴 동안만 강화된 상태가 유지됩니다.')"
            onmouseleave="event.stopPropagation(); hideTooltip()">▲</span>`
        : '';

    if (!tierArrow && !tempArrow) {
        return generateMiniGrid(card.shape, sizeCss, card.highlightColor);
    }
    const pad = arrowPx + 2;
    return `<div style="position:relative; display:inline-block; padding: 0 ${pad}px;">
        ${generateMiniGrid(card.shape, sizeCss, card.highlightColor)}
        ${tierArrow}${tempArrow}
    </div>`;
}

function renderCards() {
    // 1️⃣ 같은 카드 2개 병합 체크
    const hasMerged = checkAndMergeIdenticalCards();

    const queueEl = document.getElementById('upcoming-queue');
    queueEl.innerHTML = '';
    upcomingQueue.forEach((card, idx) => {
        const el = document.createElement('div');
        el.className = 'card';
        // 새로 pop in된 카드는 idx === 0 (또는 병합되지 않았을 때는 애니메이션 없음)
        if (hasMerged && idx === 0) {
            el.style.animation = 'cardPopIn 0.5s ease-out';
        }
        el.innerHTML = buildCardContent(card, '56px', false);
        el.onmouseenter = () => showTooltip(`<strong style="color:#64b5f6;">[대기중] ${card.name}</strong><br>${card.desc}`);
        el.onmouseleave = hideTooltip;
        queueEl.appendChild(el);
    });

    const handEl = document.getElementById('active-hand');
    handEl.innerHTML = '';
    activeHand.forEach((card, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'hand-card-wrapper';

        const el = document.createElement('div');
        el.className = 'card' + (selectedCardIndex === index ? ' selected' : '');
        // 병합된 카드에 반짝임 애니메이션
        if (mergedCardIndex === index) {
            el.style.animation = 'cardMergeGlow 0.8s ease-in-out';
            mergedCardIndex = null; // 애니메이션 적용 후 초기화
        }
        el.onclick = () => {
            selectedCardIndex = index;
            renderCards();
            updateSelectedCardInfo();
        };
        el.onmouseenter = () => {
            const highlightedName = card.name.includes('이중 강화')
                ? card.name.replace('이중 강화', '<span style="color:#ce93d8;">이중 강화</span>')
                : card.name.replace('강화', '<span style="color:#fdd835;">강화</span>');
            showTooltip(`<strong>${highlightedName}</strong><br>${card.desc}`);
        };
        el.onmouseleave = hideTooltip;
        el.innerHTML = buildCardContent(card, '90px', pendingEnhanceCard);

        const swapBtn = document.createElement('button');
        swapBtn.className = 'swap-btn';
        swapBtn.textContent = '교체';
        swapBtn.disabled = swapChances <= 0 || upcomingQueue.length === 0;
        swapBtn.onclick = () => swapCard(index);

        wrapper.appendChild(el);
        wrapper.appendChild(swapBtn);
        handEl.appendChild(wrapper);
    });

    const countEl = document.getElementById('swap-chances-count');
    if (countEl) countEl.textContent = swapChances;
}

function checkAndMergeIdenticalCards() {
    if (activeHand.length < 2) return false;

    let anyMerge = false;

    // 최대 2회 반복: 기본→강화 후 즉시 강화+기본→이중 강화가 연쇄 발생하는 경우를 처리
    for (let pass = 0; pass < 2; pass++) {
        const card0 = activeHand[0];
        const card1 = activeHand[1];

        // lastDealtCardIndex가 null이면 index 1을 새로 들어온 카드 위치로 간주
        const newCardIndex = lastDealtCardIndex !== null ? lastDealtCardIndex : 1;
        const originalCardIndex = newCardIndex === 0 ? 1 : 0;

        let upgradedCard = null;
        let feedbackMsg = '';

        // Case 1: 같은 기본 카드 2개 → 강화 카드
        if (card0.name === card1.name) {
            upgradedCard = getEnhancedVersion(card0);
            if (upgradedCard) {
                feedbackMsg = `🌟 ${card0.name} 2개가 병합되어 강화되었습니다!`;
            }
        }

        // Case 2: 강화 카드 1개 + 대응하는 기본 카드 1개 → 이중 강화 카드
        if (!upgradedCard) {
            upgradedCard = getDoubleEnhancedFromPair(card0, card1);
            if (upgradedCard) {
                const enhancedCardName = card0.name.startsWith('강화') ? card0.name : card1.name;
                feedbackMsg = `🌟 ${enhancedCardName}이(가) 기본 카드와 병합되어 이중 강화되었습니다!`;
            }
        }

        if (upgradedCard) {
            activeHand[originalCardIndex] = upgradedCard;
            mergedCardIndex = originalCardIndex;

            if (upcomingQueue.length > 0) {
                activeHand[newCardIndex] = upcomingQueue.pop();
            }
            upcomingQueue.unshift(getRandomCard());

            showVisualFeedback(feedbackMsg, '#ff9800');

            selectedCardIndex = null;
            // 다음 패스를 위해 새로 들어온 카드의 위치를 유지
            lastDealtCardIndex = newCardIndex;
            updateSelectedCardInfo();

            anyMerge = true;
        } else {
            break; // 더 이상 병합 없음
        }
    }

    lastDealtCardIndex = null;
    return anyMerge;
}

function getEnhancedVersion(basicCard) {
    // 기본 카드를 강화 카드로 매핑
    const basicToEnhanced = {
        '기본 X자': enhancedCardTypes.find(c => c.name === '강화 X자'),
        '기본 십자가 (+)': enhancedCardTypes.find(c => c.name === '강화 십자가 (+)'),
        '기본 가로 (ㅡ)': enhancedCardTypes.find(c => c.name === '강화 가로 (ㅡ)'),
        '기본 세로 (ㅣ)': enhancedCardTypes.find(c => c.name === '강화 세로 (ㅣ)'),
        '기본 무작위': enhancedCardTypes.find(c => c.name === '강화 무작위'),
        '기본 사각형 (ㅁ)': enhancedCardTypes.find(c => c.name === '강화 사각형'),
        '기본 정화': enhancedCardTypes.find(c => c.name === '강화 정화')
    };

    return basicToEnhanced[basicCard.name] ? { ...basicToEnhanced[basicCard.name] } : null;
}

function getDoubleEnhancedVersion(enhancedCard) {
    // 강화 카드를 이중 강화 카드로 매핑
    const enhancedToDouble = {
        '강화 X자': doubleEnhancedCardTypes.find(c => c.name === '이중 강화 X자'),
        '강화 십자가 (+)': doubleEnhancedCardTypes.find(c => c.name === '이중 강화 십자가 (+)'),
        '강화 가로 (ㅡ)': doubleEnhancedCardTypes.find(c => c.name === '이중 강화 가로 (ㅡ)'),
        '강화 세로 (ㅣ)': doubleEnhancedCardTypes.find(c => c.name === '이중 강화 세로 (ㅣ)'),
        '강화 무작위': doubleEnhancedCardTypes.find(c => c.name === '이중 강화 무작위'),
        '강화 사각형': doubleEnhancedCardTypes.find(c => c.name === '이중 강화 사각형'),
        '강화 정화': doubleEnhancedCardTypes.find(c => c.name === '이중 강화 정화')
    };

    return enhancedToDouble[enhancedCard.name] ? { ...enhancedToDouble[enhancedCard.name] } : null;
}

function getDoubleEnhancedFromPair(cardA, cardB) {
    // 강화 카드 + 대응하는 기본 카드 쌍인지 확인 → 이중 강화 카드 반환
    const basicToEnhancedName = {
        '기본 X자': '강화 X자',
        '기본 십자가 (+)': '강화 십자가 (+)',
        '기본 가로 (ㅡ)': '강화 가로 (ㅡ)',
        '기본 세로 (ㅣ)': '강화 세로 (ㅣ)',
        '기본 무작위': '강화 무작위',
        '기본 사각형 (ㅁ)': '강화 사각형',
        '기본 정화': '강화 정화'
    };
    for (const [basicName, enhancedName] of Object.entries(basicToEnhancedName)) {
        if ((cardA.name === enhancedName && cardB.name === basicName) ||
            (cardB.name === enhancedName && cardA.name === basicName)) {
            return getDoubleEnhancedVersion({ name: enhancedName });
        }
    }
    return null;
}

// 카드의 일반/강화/이중 강화 세 버전을 모두 반환
function getAllCardVersions(card) {
    const families = [
        { basic: '기본 X자',        enhanced: '강화 X자',        double: '이중 강화 X자' },
        { basic: '기본 십자가 (+)', enhanced: '강화 십자가 (+)', double: '이중 강화 십자가 (+)' },
        { basic: '기본 가로 (ㅡ)',  enhanced: '강화 가로 (ㅡ)',  double: '이중 강화 가로 (ㅡ)' },
        { basic: '기본 세로 (ㅣ)',  enhanced: '강화 세로 (ㅣ)',  double: '이중 강화 세로 (ㅣ)' },
        { basic: '기본 무작위',     enhanced: '강화 무작위',     double: '이중 강화 무작위' },
        { basic: '기본 사각형 (ㅁ)',enhanced: '강화 사각형',     double: '이중 강화 사각형' },
        { basic: '기본 정화',       enhanced: '강화 정화',       double: '이중 강화 정화' }
    ];
    const family = families.find(f =>
        card.name === f.basic || card.name === f.enhanced || card.name === f.double
    );
    if (!family) return null;
    return {
        basic:    basicCardTypes.find(c => c.name === family.basic),
        enhanced: enhancedCardTypes.find(c => c.name === family.enhanced),
        double:   doubleEnhancedCardTypes.find(c => c.name === family.double)
    };
}

function swapCard(index) {
    if (swapChances <= 0 || upcomingQueue.length === 0) return;
    // 오른쪽(마지막)이 당장 다음에 들어올 카드 → pop으로 가져옴
    const replacement = upcomingQueue.pop();
    activeHand[index] = replacement;
    lastDealtCardIndex = index; // 새로 들어온 카드의 위치 기록
    // 새 랜덤 카드를 왼쪽(가장 나중에 들어올)에 추가
    upcomingQueue.unshift(getRandomCard());
    if (selectedCardIndex === index) {
        selectedCardIndex = null;
        updateSelectedCardInfo();
    }
    swapChances--;
    swapCountThisGame++;
    renderCards();
}

function showPreview(r, c) {
    if (selectedCardIndex === null) return;
    const card = activeHand[selectedCardIndex];
    const effectTiles = card.getPreviewTiles(r, c);
    
    effectTiles.forEach(([tr, tc]) => {
        const el = document.getElementById(`tile-${tr}-${tc}`);
        if (el && boardState[tr] && boardState[tr][tc]) {
            const targetTile = boardState[tr][tc];
            if (targetTile.state === 'polluted') {
                if (targetTile.type === 'distortion') {
                    if (card.canDestroyDistortion) {
                        el.style.opacity = '0.6';
                        el.style.backgroundColor = 'var(--purified-color)';
                    } else if (card.ignoreDistortion) {
                        el.style.opacity = '0.4';
                        // 왜곡 타일이지만 패널티 없이 무시됨 — 기본 색 유지, 살짝 투명
                    } else {
                        el.style.opacity = '0.8';
                        el.style.backgroundColor = '#d32f2f';
                        el.style.border = '2px solid #ff5252';
                    }
                } else {
                    el.style.opacity = '0.6';
                    el.style.backgroundColor = 'var(--purified-color)';
                }
            }
        }
    });
}

function clearPreview() {
    for(let i=0; i<BOARD_SIZE; i++) {
        for(let j=0; j<BOARD_SIZE; j++) {
            const el = document.getElementById(`tile-${i}-${j}`);
            if (el) {
                el.style.opacity = '1';
                el.style.backgroundColor = ''; 
                el.style.border = '';
            }
        }
    }
}

function handleTileClick(r, c) {
    if (boardState[r][c].type === 'empty') return;

    // ── 대성공 보상 카드 6: 왜곡 타일 선택 모드 ──────────────────────
    if (selectingDistortionMode) {
        if (boardState[r][c].type === 'distortion' && boardState[r][c].state === 'polluted') {
            boardState[r][c].state = 'purified';
            exitDistortionSelectMode();
            renderBoard();
            showVisualFeedback('왜곡 타일이 정화되었습니다!', '#388e3c');
            checkGameState();
        } else {
            showVisualFeedback('왜곡 타일을 선택해주세요.', '#f57c00');
        }
        return;
    }

    if (selectedCardIndex === null) {
        showVisualFeedback('먼저 사용할 방재 카드를 우측 아래에서 선택해주세요.', '#555');
        return;
    }

    if (boardState[r][c].state === 'purified' && !pendingCanSelectPurified) {
        showVisualFeedback('이미 정화된 타일은 선택할 수 없습니다.', '#555');
        return;
    }

    // activeHand는 이미 강화된 상태 (GREAT_ENHANCE_CARD 적용 시 교체됨)
    let card = activeHand[selectedCardIndex];

    // 배지 1: 이중 강화 카드 사용
    if (card.name.startsWith('이중 강화')) tryUnlockBadge('use_double_enhanced');

    // 대성공 보상 카드 1: 이번 턴 왜곡 무시 플래그 적용
    const effectiveIgnore = card.ignoreDistortion || pendingIgnoreDistortion;
    if (pendingIgnoreDistortion) {
        pendingIgnoreDistortion = false;
        document.getElementById('ignore-distortion-label').style.display = 'none';
    }

    if (card.execute) {
        // 배지 2: 기본 무작위로 재생성 없이 5개 이상 정화
        if (card.name === '기본 무작위') {
            const normalBefore = {};
            for (let i = 0; i < BOARD_SIZE; i++)
                for (let j = 0; j < BOARD_SIZE; j++)
                    if (boardState[i][j].type === 'normal') normalBefore[`${i},${j}`] = boardState[i][j].state;
            card.execute(r, c);
            let newlyPurified = 0, repolluted = false;
            for (let i = 0; i < BOARD_SIZE; i++) {
                for (let j = 0; j < BOARD_SIZE; j++) {
                    if (boardState[i][j].type === 'normal') {
                        const k = `${i},${j}`;
                        if (normalBefore[k] === 'polluted' && boardState[i][j].state === 'purified') newlyPurified++;
                        if (normalBefore[k] === 'purified' && boardState[i][j].state === 'polluted') repolluted = true;
                    }
                }
            }
            if (!repolluted && newlyPurified >= 5) tryUnlockBadge('random_purify_5_clean');
        } else {
            card.execute(r, c);
        }
    } else {
        const effectTiles = card.getPreviewTiles(r, c);
        let distortionHitCount = 0;
        let distortionInRange = 0;

        effectTiles.forEach(([tr, tc]) => {
            if (tr >= 0 && tr < BOARD_SIZE && tc >= 0 && tc < BOARD_SIZE) {
                const tile = boardState[tr][tc];
                if (tile.state === 'polluted' && tile.type === 'distortion') distortionInRange++;
                if (tile.state === 'polluted') {
                    if (tile.type === 'distortion') {
                        if (card.canDestroyDistortion) {
                            tile.state = 'purified';
                        } else if (!effectiveIgnore) {
                            distortionHitCount++;
                        }
                    } else {
                        tile.state = 'purified';
                    }
                }
            }
        });

        if (distortionHitCount > 0) {
            triggerDistortionPenalty(distortionHitCount);
        }

        // 배지 3&4: 왜곡 타일 정화 시도
        if (distortionInRange >= 1) tryUnlockBadge('attempt_distortion');
        if (distortionInRange >= 3) tryUnlockBadge('distortion_triple');
    }

    const usedCardIndex = selectedCardIndex;
    if (pendingKeepCard) {
        // 성공 보상 카드 4: 카드 소모 없이 그대로 유지
        pendingKeepCard = false;
        document.getElementById('keep-card-label').style.display = 'none';
    } else {
        activeHand[usedCardIndex] = upcomingQueue.pop();
        lastDealtCardIndex = usedCardIndex;
        upcomingQueue.unshift(getRandomCard());
    }

    if (pendingCanSelectPurified) {
        pendingCanSelectPurified = false;
        document.getElementById('select-purified-label').style.display = 'none';
    }

    // 대성공 보상 카드 2: 사용하지 않은 카드를 강화 전 원본으로 복원
    if (pendingEnhanceCard && pendingEnhanceOriginalHand) {
        const otherIdx = usedCardIndex === 0 ? 1 : 0;
        activeHand[otherIdx] = pendingEnhanceOriginalHand[otherIdx];
        pendingEnhanceCard = false;
        pendingEnhanceOriginalHand = null;
        document.getElementById('enhance-pending-label').style.display = 'none';
    }

    selectedCardIndex = null;

    if (pendingSkipTurn) {
        pendingSkipTurn = false;
        document.getElementById('skip-turn-label').style.display = 'none';
    } else {
        cardsPlayed++;
    }
    if (pendingExtraTurnPenalty) {
        cardsPlayed++;
        pendingExtraTurnPenalty = false;
        document.getElementById('extra-turn-label').style.display = 'none';
    }

    quizEngaged = false;
    setProblemBtnEnabled(true);

    clearPreview();
    hideTooltip();
    updateStatus();
    renderBoard();
    renderCards();
    updateSelectedCardInfo();
    checkGameState();
}

function checkGameState() {
    const isAllPurified = boardState.every(row =>
        row.every(tile => {
            if (tile.type === 'distortion') return true;
            if (tile.type === 'empty') return true;
            if (tile.type === 'sea') return true;
            return tile.state === 'purified';
        })
    );

    if(isAllPurified) {
        const distortionTiles = [];
        for (let i = 0; i < BOARD_SIZE; i++)
            for (let j = 0; j < BOARD_SIZE; j++)
                if (boardState[i][j].type === 'distortion') distortionTiles.push(boardState[i][j]);
        const allDistortionPurified = distortionTiles.length > 0 && distortionTiles.every(t => t.state === 'purified');

        setTimeout(() => {
            document.getElementById('final-turns').innerText = cardsPlayed;
            changeScreen('screen-result');
            if (allDistortionPurified) tryUnlockBadge('all_distortion_purified');
            onGameClear(currentStage, cardsPlayed);
        }, 300);
    }
}

function updateStatus() {
    document.getElementById('turn-counter').innerText = cardsPlayed + 1;
}

function setProblemBtnEnabled(enabled) {
    const btn = document.getElementById('problem-btn');
    btn.disabled = !enabled;
    if (enabled) {
        btn.onmouseenter = null;
        btn.onmouseleave = null;
    } else {
        btn.onmouseenter = () => showTooltip('방재카드를 사용한 후에 다시 문제를 풀 수 있습니다.');
        btn.onmouseleave = hideTooltip;
    }
}

function tryUnlockBadge(key) {
    unlockBadge(currentUser ? currentUser.id : null, key);
}

// [4] Supabase 연동을 위한 추적 변수:
let currentStage = 1;
let swapCountThisGame = 0;
let greatSuccessStreak = 0;
let sessionPerfectQuizCount = 0;
let sessionDisasters = new Set();

// [5] 단계 선택 화면 — 게임판 미리보기 툴팁
function generateBoardPreview(stageIndex) {
    const map = STAGE_MAPS[stageIndex];
    if (!map) return '';
    const cellSize = 20;
    const gap = 2;
    let html = `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
        <div style="font-size:12px;color:#bbb;">${stageIndex + 1}단계 미리보기</div>
        <div style="display:grid;grid-template-columns:repeat(6,${cellSize}px);gap:${gap}px;">`;
    for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
            const v = map[r][c];
            let style = `width:${cellSize}px;height:${cellSize}px;border-radius:2px;box-sizing:border-box;`;
            if (v === 2) {
                style += 'background:transparent;';
            } else if (v === 1) {
                style += 'background:#0d0d10;border:1px solid rgba(110,0,160,0.7);';
            } else {
                style += 'background:#4e342e;border:1px solid rgba(190,130,80,0.25);';
            }
            html += `<div style="${style}"></div>`;
        }
    }
    html += '</div></div>';
    return html;
}

function initStagePreviews() {
    for (let i = 1; i <= 6; i++) {
        const btn = document.querySelector(`#screen-select button[data-stage="${i}"]`);
        if (!btn) continue;
        btn.addEventListener('mouseenter', () => showTooltip(generateBoardPreview(i - 1)));
        btn.addEventListener('mouseleave', hideTooltip);
    }
}

window.addEventListener('DOMContentLoaded', initStagePreviews);