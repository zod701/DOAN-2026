// =====================================================================
// 퀴즈 & 룰렛 — 문제 풀기, 룰렛, 보상 카드 선택, 효과 적용
// =====================================================================

let currentDisaster = '';
let currentScenario = null;
let quizAnswers = [null, null, null];
let selectedQuestions = [];
let lastCorrectCount = 0;

function showProblemModal() {
    const randomIndex = Math.floor(Math.random() * disasterTypes.length);
    const selectedDisaster = disasterTypes[randomIndex];
    currentDisaster = selectedDisaster;
    sessionDisasters.add(selectedDisaster);
    const scenarioList = disasterScenarios[selectedDisaster];
    currentScenario = scenarioList && scenarioList.length > 0
        ? scenarioList[Math.floor(Math.random() * scenarioList.length)]
        : null;
    document.getElementById('problem-text').innerText = currentScenario
        ? currentScenario.initialText
        : selectedDisaster + ' 문제입니다.';
    document.getElementById('disaster-alert').style.display = 'block';
    document.getElementById('disaster-quiz').style.display = 'none';
    document.getElementById('problem-modal').classList.add('active');
}

function getRandomItems(arr, count) {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

function startQuiz() {
    quizEngaged = true;
    renderCards();
    document.getElementById('disaster-alert').style.display = 'none';
    document.getElementById('disaster-quiz').style.display = 'block';

    quizAnswers = [null, null, null];

    const disasterData = disasterQuestions[currentDisaster];
    document.getElementById('quiz-title').innerHTML = `${disasterData.icon} ${currentDisaster} 발생!`;

    selectedQuestions = getRandomItems(disasterData.questions, 3);

    const container = document.getElementById('questions-container');
    container.innerHTML = '';

    selectedQuestions.forEach((q, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-item';
        questionDiv.innerHTML = `
            <div class="question-text">Q${index + 1}. ${q.text}</div>
            <div class="choice-buttons">
                <button class="choice-btn o-btn" onclick="selectAnswer(${index}, 'O')">O</button>
                <button class="choice-btn x-btn" onclick="selectAnswer(${index}, 'X')">X</button>
            </div>
        `;
        container.appendChild(questionDiv);
    });

    updateSubmitButton();
}

function selectAnswer(questionIndex, answer) {
    quizAnswers[questionIndex] = (answer === 'O');

    const questionItems = document.querySelectorAll('.question-item');
    const buttons = questionItems[questionIndex].querySelectorAll('.choice-btn');
    buttons.forEach(btn => btn.classList.remove('selected'));

    if (answer === 'O') {
        buttons[0].classList.add('selected');
    } else {
        buttons[1].classList.add('selected');
    }

    updateSubmitButton();
}

function updateSubmitButton() {
    const submitBtn = document.getElementById('submit-btn');
    const allAnswered = quizAnswers.every(answer => answer !== null);
    submitBtn.disabled = !allAnswered;
}

function getCorrectAnswerCount() {
    let count = 0;
    for (let i = 0; i < selectedQuestions.length; i++) {
        if (quizAnswers[i] === selectedQuestions[i].answer) count++;
    }
    return count;
}

function submitQuiz() {
    let correctCount = 0;

    const itemsHTML = selectedQuestions.map((q, i) => {
        const answer = quizAnswers[i] === q.answer;
        if (answer) correctCount++;
        const verdictClass = answer ? 'correct' : 'wrong';
        const verdictIcon  = answer ? '✅' : '❌';
        const verdictText  = answer ? '정답입니다!' : '오답입니다.';
        const detailHTML = (!answer && q.detail)
            ? `<div class="quiz-result-detail">💡 이유: ${q.detail}</div>`
            : '';
        return `
            <div class="quiz-result-item ${verdictClass}">
                <div style="color:#ccc; font-size:13px; margin-bottom:4px;">Q${i + 1}. ${q.text}</div>
                <div class="quiz-result-verdict ${verdictClass}">${verdictIcon} ${verdictText}</div>
                ${detailHTML}
            </div>`;
    }).join('');

    lastCorrectCount = correctCount;
    if (correctCount === 3) sessionPerfectQuizCount++;

    document.getElementById('disaster-quiz').style.display = 'none';
    document.getElementById('disaster-result').style.display = 'block';

    const probs = resultProbabilities[correctCount];
    const resultContent = document.getElementById('result-content');
    resultContent.innerHTML = `
        <h2>📊 문제 풀이 결과</h2>
        <p>정답 개수: <strong style="color:#64b5f6; font-size:1.4em;">${correctCount}</strong> / 3개</p>
        <p style="color:#aaa; font-size:14px;">
            이번 룰렛 확률 —
            <span style="color:#E6A23C">대성공 ${probs['대성공']}%</span> /
            <span style="color:#67C23A">성공 ${probs['성공']}%</span> /
            <span style="color:#ef5350">실패 ${probs['실패']}%</span>
        </p>
        <div class="quiz-result-list">${itemsHTML}</div>
    `;
}

function confirmResult() {
    closeProblemModal();
    showRoulette(lastCorrectCount);
}

function closeProblemModal() {
    document.getElementById('problem-modal').classList.remove('active');
    document.getElementById('disaster-alert').style.display = 'block';
    document.getElementById('disaster-quiz').style.display = 'none';
    document.getElementById('disaster-result').style.display = 'none';
}

let rouletteResultTimer  = null;
let rouletteShowResult   = null;

function showRoulette(correctCount) {
    const base = resultProbabilities[correctCount];
    let prob_gs = base['대성공'];
    let prob_s  = base['성공'];
    let prob_f  = base['실패'];

    if (pendingDoubleGreatChance) {
        const bonus = Math.min(prob_gs, prob_s);
        prob_gs = prob_gs + bonus;
        prob_s  = prob_s  - bonus;
        pendingDoubleGreatChance = false;
        document.getElementById('double-great-label').style.display = 'none';
    }
    const gs_end  = prob_gs;
    const s_end   = prob_gs + prob_s;

    const wheelEl = document.getElementById('roulette-wheel');
    wheelEl.style.transition = 'none';
    wheelEl.style.transform  = 'rotate(0deg)';
    wheelEl.style.background = `conic-gradient(
        #E6A23C 0% ${gs_end}%,
        #67C23A ${gs_end}% ${s_end}%,
        #ef5350 ${s_end}% 100%
    )`;

    document.getElementById('roulette-probs').innerHTML = `
        <span style="color:#E6A23C">대성공 ${prob_gs}%</span>
        <span style="color:#67C23A">성공 ${prob_s}%</span>
        <span style="color:#ef5350">실패 ${prob_f}%</span>
    `;

    document.getElementById('roulette-step-spin').style.display   = 'block';
    document.getElementById('roulette-step-result').style.display = 'none';
    document.getElementById('roulette-status').textContent = '룰렛이 돌아가는 중...';

    document.getElementById('roulette-modal').classList.add('active');

    const rand = Math.random() * 100;
    let resultStr, color;
    if (rand < prob_gs)              { resultStr = '대성공'; color = '#E6A23C'; }
    else if (rand < prob_gs + prob_s) { resultStr = '성공';   color = '#67C23A'; }
    else                              { resultStr = '실패';   color = '#ef5350'; }

    const targetDeg     = 360 - (rand * 3.6);
    const totalRotation = 5 * 360 + targetDeg;

    rouletteShowResult = function() {
        rouletteResultTimer = null;
        rouletteShowResult  = null;
        document.getElementById('roulette-skip-btn').style.display = 'none';
        document.getElementById('roulette-step-spin').style.display   = 'none';
        document.getElementById('roulette-step-result').style.display = 'block';

        currentRouletteResult = resultStr;
        if (resultStr === '대성공') { greatSuccessStreak++; } else { greatSuccessStreak = 0; }

        const badge = document.getElementById('roulette-result-badge');
        badge.textContent = resultStr + '!';
        badge.style.color = color;

        const outcomeText = (currentScenario && currentScenario.outcomes[resultStr])
            ? currentScenario.outcomes[resultStr].text
            : { '대성공': '완벽합니다! 최고의 결과를 얻었습니다.', '성공': '잘 했습니다! 좋은 결과를 얻었습니다.', '실패': '아쉽습니다. 다음엔 더 잘할 수 있을 거예요!' }[resultStr];
        document.getElementById('roulette-result-desc').textContent = outcomeText;

        const toRewardBtn = document.getElementById('roulette-to-reward-btn');
        if (resultStr === '실패') {
            toRewardBtn.textContent = '🎰 패널티 카드 추첨';
            toRewardBtn.style.backgroundColor = '#c62828';
        } else {
            toRewardBtn.textContent = '🎁 보상 카드 선택하기';
            toRewardBtn.style.backgroundColor = '#1565c0';
        }
    };

    setTimeout(() => {
        wheelEl.style.transition = 'transform 3s cubic-bezier(0.25, 0.1, 0.25, 1)';
        wheelEl.style.transform  = `rotate(${totalRotation}deg)`;

        document.getElementById('roulette-skip-btn').style.display = 'inline-block';

        rouletteResultTimer = setTimeout(rouletteShowResult, 3000);
    }, 100);
}

function skipRoulette() {
    if (!rouletteShowResult) return;
    if (rouletteResultTimer) {
        clearTimeout(rouletteResultTimer);
        rouletteResultTimer = null;
    }
    const wheelEl = document.getElementById('roulette-wheel');
    wheelEl.style.transition = 'none';
    rouletteShowResult();
}

let currentRouletteResult = '';
let currentRewardCards  = [];
let selectedRewardIndex = null;


function showRewardStep() {
    if (currentRouletteResult === '실패') {
        showFailSlot();
        return;
    }

    const pool = rewardCardPool[currentRouletteResult] || rewardCardPool['실패'];

    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    currentRewardCards  = shuffled.slice(0, 3);
    selectedRewardIndex = null;

    const grid = document.getElementById('reward-cards-grid');
    grid.innerHTML = '';
    currentRewardCards.forEach((card, i) => {
        const div = document.createElement('div');
        div.className = 'reward-card-option';
        div.innerHTML = `
            <div class="reward-card-name">${card.name}</div>
            <div class="reward-card-desc">${card.desc}</div>
        `;
        div.onclick = () => selectRewardCard(i);
        grid.appendChild(div);
    });

    const confirmBtn = document.getElementById('reward-confirm-btn');
    confirmBtn.disabled = true;
    confirmBtn.style.backgroundColor = '#555';
    confirmBtn.style.color = '#aaa';
    confirmBtn.style.cursor = 'not-allowed';

    document.getElementById('roulette-step-result').style.display = 'none';
    document.getElementById('roulette-step-reward').style.display = 'block';

    const peekBtn = document.getElementById('reward-peek-btn');
    const rouletteOverlay = document.getElementById('roulette-modal');
    const restoreOpaque = () => {
        rouletteOverlay.style.opacity = '';
        rouletteOverlay.style.pointerEvents = '';
    };
    const makeTransparent = (e) => {
        e.preventDefault();
        rouletteOverlay.style.opacity = '0.05';
        rouletteOverlay.style.pointerEvents = 'none';
        document.addEventListener('mouseup',  restoreOpaque, { once: true });
        document.addEventListener('touchend', restoreOpaque, { once: true });
    };
    peekBtn.onmousedown  = makeTransparent;
    peekBtn.ontouchstart = makeTransparent;
}

let failSlotTargetCard = null;

function showFailSlot() {
    const pool   = rewardCardPool['실패'];
    const CARD_W = 110;
    const GAP    = 10;
    const STEP   = CARD_W + GAP;

    const REPEAT = 15;
    const trackCards = [];
    for (let i = 0; i < REPEAT; i++) pool.forEach(c => trackCards.push(c));

    const startIndex  = pool.length * 3;
    const targetIndex = pool.length * 11 + Math.floor(Math.random() * pool.length);
    failSlotTargetCard = trackCards[targetIndex];

    const track = document.getElementById('slot-track');
    track.innerHTML = '';
    trackCards.forEach((card, i) => {
        const el = document.createElement('div');
        el.className = 'slot-card';
        el.dataset.trackIndex = i;
        el.innerHTML = `
            <div class="slot-card-name">${card.name}</div>
            <div class="slot-card-desc">${card.desc}</div>
        `;
        track.appendChild(el);
    });

    document.getElementById('slot-result-area').style.display = 'none';
    document.getElementById('slot-center-line').classList.remove('slot-locked');

    document.getElementById('roulette-step-result').style.display = 'none';
    document.getElementById('roulette-step-slot').style.display   = 'block';

    requestAnimationFrame(() => {
        const containerW = document.getElementById('slot-container').offsetWidth;
        const CENTER_X   = containerW / 2;
        const calcX      = n => CENTER_X - (n * STEP + CARD_W / 2);

        const startX = calcX(startIndex);
        const finalX = calcX(targetIndex);

        track.style.transition = 'none';
        track.style.transform  = `translateX(${startX}px)`;

        requestAnimationFrame(() => {
            track.style.transition = 'transform 4s cubic-bezier(0.23, 1, 0.32, 1)';
            track.style.transform  = `translateX(${finalX}px)`;

            setTimeout(() => {
                document.getElementById('slot-center-line').classList.add('slot-locked');
                const winnerEl = track.querySelector(`[data-track-index="${targetIndex}"]`);
                if (winnerEl) winnerEl.classList.add('slot-winner');

                setTimeout(() => {
                    document.getElementById('slot-result-name').textContent = failSlotTargetCard.name;
                    document.getElementById('slot-result-desc').textContent = failSlotTargetCard.desc;
                    document.getElementById('slot-result-area').style.display = 'block';
                }, 500);
            }, 4000);
        });
    });
}

function confirmFailSlot() {
    applyRewardEffect(failSlotTargetCard);
    failSlotTargetCard = null;
    closeRoulette();
    renderBoard();
    renderCards();
    updateSelectedCardInfo();
    checkGameState();
}

function selectRewardCard(index) {
    selectedRewardIndex = index;

    document.querySelectorAll('.reward-card-option').forEach((el, i) => {
        el.classList.toggle('selected', i === index);
    });

    const confirmBtn = document.getElementById('reward-confirm-btn');
    confirmBtn.disabled = false;
    confirmBtn.style.backgroundColor = '#4caf50';
    confirmBtn.style.color = 'white';
    confirmBtn.style.cursor = 'pointer';
}

function confirmRewardCard() {
    if (selectedRewardIndex === null) return;
    const chosen = currentRewardCards[selectedRewardIndex];

    applyRewardEffect(chosen);

    if (chosen.effect === 'SUCCESS_30_ENHANCE') {
        showEnhanceRoulette();
    } else {
        closeRoulette();
    }
}

function enterDistortionSelectMode() {
    selectingDistortionMode = true;
    document.getElementById('distortion-select-msg').style.display = 'block';
    document.getElementById('info-panel').classList.add('distortion-select-dim');
    document.querySelector('.status-bar').classList.add('distortion-select-dim');
    document.querySelector('.cards-container').classList.add('distortion-select-dim');
}

function exitDistortionSelectMode() {
    selectingDistortionMode = false;
    document.getElementById('distortion-select-msg').style.display = 'none';
    document.getElementById('info-panel').classList.remove('distortion-select-dim');
    document.querySelector('.status-bar').classList.remove('distortion-select-dim');
    document.querySelector('.cards-container').classList.remove('distortion-select-dim');
}

function applyRewardEffect(chosen) {
    switch (chosen.effect) {

        case 'FAIL_EXTRA_TURNS': {
            pendingExtraTurnPenalty = true;
            document.getElementById('extra-turn-label').style.display = 'inline';
            break;
        }

        case 'FAIL_ADD_DISTORTION': {
            let candidates = [];
            for (let i = 0; i < BOARD_SIZE; i++)
                for (let j = 0; j < BOARD_SIZE; j++)
                    if (boardState[i][j].type === 'normal' && boardState[i][j].state === 'polluted')
                        candidates.push([i, j]);
            if (candidates.length > 0) {
                const [r, c] = candidates[Math.floor(Math.random() * candidates.length)];
                boardState[r][c].type = 'distortion';
                renderBoard();
                showVisualFeedback('패널티: 무작위 타일이 왜곡 타일로 변했습니다!', '#d32f2f');
            } else {
                showVisualFeedback('패널티: 왜곡 타일을 생성할 위치가 없습니다.', '#f57c00');
            }
            break;
        }

        case 'FAIL_REPOLLUTE_3': {
            let purified = [];
            for (let i = 0; i < BOARD_SIZE; i++)
                for (let j = 0; j < BOARD_SIZE; j++)
                    if (boardState[i][j].type === 'normal' && boardState[i][j].state === 'purified')
                        purified.push([i, j]);
            purified.sort(() => Math.random() - 0.5);
            const count = Math.min(3, purified.length);
            for (let k = 0; k < count; k++)
                boardState[purified[k][0]][purified[k][1]].state = 'polluted';
            renderBoard();
            showVisualFeedback(`패널티: 정화된 타일 ${count}개가 다시 오염되었습니다!`, '#d32f2f');
            break;
        }

        case 'FAIL_SHUFFLE_CARDS': {
            const handSize  = activeHand.length;
            const queueSize = upcomingQueue.length;
            activeHand  = Array.from({ length: handSize },  () => getRandomCard());
            upcomingQueue = Array.from({ length: queueSize }, () => getRandomCard());
            selectedCardIndex = null;
            lastDealtCardIndex = null;
            renderCards();
            updateSelectedCardInfo();
            showVisualFeedback('패널티: 모든 방재 카드가 무작위 카드로 교체되었습니다!', '#d32f2f');
            break;
        }

        case 'FAIL_SHUFFLE_BOARD': {
            let allPositions = [];
            let allTileData = [];
            for (let i = 0; i < BOARD_SIZE; i++)
                for (let j = 0; j < BOARD_SIZE; j++) {
                    allPositions.push([i, j]);
                    allTileData.push({ type: boardState[i][j].type, state: boardState[i][j].state });
                }
            allTileData.sort(() => Math.random() - 0.5);
            allPositions.forEach(([r, c], idx) => {
                boardState[r][c].type  = allTileData[idx].type;
                boardState[r][c].state = allTileData[idx].state;
            });
            renderBoard();
            showVisualFeedback('패널티: 모든 타일이 무작위로 재배치되었습니다!', '#d32f2f');
            break;
        }

        case 'SUCCESS_PURIFY_DISTORTION_1': {
            let distTiles = [];
            for (let i = 0; i < BOARD_SIZE; i++)
                for (let j = 0; j < BOARD_SIZE; j++)
                    if (boardState[i][j].type === 'distortion' && boardState[i][j].state === 'polluted')
                        distTiles.push([i, j]);
            if (distTiles.length > 0) {
                const [r, c] = distTiles[Math.floor(Math.random() * distTiles.length)];
                boardState[r][c].state = 'purified';
                renderBoard();
                checkGameState();
                showVisualFeedback('왜곡 타일 1개가 정화되었습니다!', '#66bb6a');
            } else {
                showVisualFeedback('정화할 왜곡 타일이 없습니다.', '#f57c00');
            }
            break;
        }

        case 'SUCCESS_ADD_SWAP_1': {
            swapChances += 1;
            renderCards();
            showVisualFeedback('교체 기회가 1회 추가되었습니다!', '#66bb6a');
            break;
        }

        case 'SUCCESS_PURIFY_RANDOM_1': {
            let polluted = [];
            for (let i = 0; i < BOARD_SIZE; i++)
                for (let j = 0; j < BOARD_SIZE; j++)
                    if (boardState[i][j].type === 'normal' && boardState[i][j].state === 'polluted')
                        polluted.push([i, j]);
            if (polluted.length > 0) {
                const [r, c] = polluted[Math.floor(Math.random() * polluted.length)];
                boardState[r][c].state = 'purified';
                renderBoard();
                checkGameState();
                showVisualFeedback('무작위 오염 타일 1개가 정화되었습니다!', '#66bb6a');
            } else {
                showVisualFeedback('정화할 오염 타일이 없습니다.', '#f57c00');
            }
            break;
        }

        case 'SUCCESS_KEEP_CARD': {
            pendingKeepCard = true;
            document.getElementById('keep-card-label').style.display = 'inline';
            break;
        }

        case 'SUCCESS_SHUFFLE_POLLUTED': {
            let positions = [];
            let states = [];
            for (let i = 0; i < BOARD_SIZE; i++)
                for (let j = 0; j < BOARD_SIZE; j++)
                    if (boardState[i][j].type !== 'distortion') {
                        positions.push([i, j]);
                        states.push(boardState[i][j].state);
                    }
            states.sort(() => Math.random() - 0.5);
            positions.forEach(([r, c], k) => { boardState[r][c].state = states[k]; });
            renderBoard();
            checkGameState();
            showVisualFeedback('왜곡 타일을 제외한 모든 타일이 재배치되었습니다!', '#66bb6a');
            break;
        }

        case 'SUCCESS_DOUBLE_GREAT_CHANCE': {
            pendingDoubleGreatChance = true;
            document.getElementById('double-great-label').style.display = 'inline';
            break;
        }

        case 'SUCCESS_30_ENHANCE': {
            break;
        }

        case 'SUCCESS_SELECT_PURIFIED': {
            pendingCanSelectPurified = true;
            document.getElementById('select-purified-label').style.display = 'inline';
            break;
        }

        case 'GREAT_IGNORE_DISTORTION': {
            pendingIgnoreDistortion = true;
            document.getElementById('ignore-distortion-label').style.display = 'inline';
            break;
        }

        case 'GREAT_ENHANCE_CARD': {
            pendingEnhanceOriginalHand = [...activeHand];
            activeHand = activeHand.map(card => {
                const upgraded = getEnhancedVersion(card) || getDoubleEnhancedVersion(card);
                return upgraded || card;
            });
            pendingEnhanceCard = true;
            document.getElementById('enhance-pending-label').style.display = 'inline';
            renderCards();
            updateSelectedCardInfo();
            break;
        }

        case 'GREAT_SKIP_TURN': {
            pendingSkipTurn = true;
            document.getElementById('skip-turn-label').style.display = 'inline';
            break;
        }

        case 'GREAT_ADD_SWAP_2': {
            swapChances += 2;
            renderCards();
            showVisualFeedback('교체 기회가 2회 추가되었습니다!', '#66bb6a');
            break;
        }

        case 'GREAT_PURIFY_DISTORTION_2': {
            let distTiles = [];
            for (let i = 0; i < BOARD_SIZE; i++)
                for (let j = 0; j < BOARD_SIZE; j++)
                    if (boardState[i][j].type === 'distortion' && boardState[i][j].state === 'polluted')
                        distTiles.push([i, j]);
            distTiles.sort(() => Math.random() - 0.5);
            const count = Math.min(2, distTiles.length);
            for (let k = 0; k < count; k++)
                boardState[distTiles[k][0]][distTiles[k][1]].state = 'purified';
            renderBoard();
            checkGameState();
            if (count > 0) showVisualFeedback(`왜곡 타일 ${count}개가 정화되었습니다!`, '#66bb6a');
            else           showVisualFeedback('정화할 왜곡 타일이 없습니다.', '#f57c00');
            break;
        }

        case 'GREAT_SELECT_DISTORTION': {
            const hasDistortion = boardState.some(row =>
                row.some(t => t.type === 'distortion' && t.state === 'polluted')
            );
            if (!hasDistortion) {
                showVisualFeedback('정화할 왜곡 타일이 없습니다.', '#f57c00');
            } else {
                enterDistortionSelectMode();
            }
            break;
        }

        case 'GREAT_PURIFY_RANDOM_3': {
            let polluted = [];
            for (let i = 0; i < BOARD_SIZE; i++)
                for (let j = 0; j < BOARD_SIZE; j++)
                    if (boardState[i][j].type === 'normal' && boardState[i][j].state === 'polluted')
                        polluted.push([i, j]);
            polluted.sort(() => Math.random() - 0.5);
            const cnt = Math.min(3, polluted.length);
            for (let k = 0; k < cnt; k++)
                boardState[polluted[k][0]][polluted[k][1]].state = 'purified';
            renderBoard();
            checkGameState();
            showVisualFeedback(`무작위 오염 타일 ${cnt}개가 정화되었습니다!`, '#66bb6a');
            break;
        }

        default:
            break;
    }
}

function showEnhanceRoulette() {
    document.getElementById('roulette-step-reward').style.display = 'none';
    document.getElementById('roulette-step-spin').style.display   = 'block';

    const wheelEl = document.getElementById('roulette-wheel');
    wheelEl.style.background = `conic-gradient(
        #67C23A 0% 30%,
        #ef5350 30% 100%
    )`;

    document.getElementById('roulette-probs').innerHTML = `
        <span style="color:#67C23A">강화 성공 30%</span>
        <span style="color:#ef5350">강화 실패 70%</span>
    `;
    document.getElementById('roulette-status').textContent = '강화 룰렛이 돌아가는 중...';

    wheelEl.style.transition = 'none';
    wheelEl.style.transform  = 'rotate(0deg)';

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            const rand = Math.random() * 100;
            const success = rand < 30;
            const color   = success ? '#67C23A' : '#ef5350';

            const targetDeg     = 360 - (rand * 3.6);
            const totalRotation = 5 * 360 + targetDeg;
            wheelEl.style.transition = 'transform 3s cubic-bezier(0.25, 0.1, 0.25, 1)';
            wheelEl.style.transform  = `rotate(${totalRotation}deg)`;

            setTimeout(() => {
                document.getElementById('roulette-step-spin').style.display   = 'none';
                document.getElementById('roulette-step-result').style.display = 'block';

                const badge = document.getElementById('roulette-result-badge');
                badge.textContent = success ? '강화 성공!' : '강화 실패';
                badge.style.color = color;
                document.getElementById('roulette-result-desc').textContent = success
                    ? '방재 카드가 강화됩니다!'
                    : '이번엔 강화되지 않았습니다.';

                if (success) {
                    pendingEnhanceOriginalHand = [...activeHand];
                    activeHand = activeHand.map(card => {
                        const upgraded = getEnhancedVersion(card) || getDoubleEnhancedVersion(card);
                        return upgraded || card;
                    });
                    pendingEnhanceCard = true;
                    document.getElementById('enhance-pending-label').style.display = 'inline';
                    renderCards();
                    updateSelectedCardInfo();
                }

                const toRewardBtn = document.getElementById('roulette-to-reward-btn');
                toRewardBtn.textContent = '닫기';
                toRewardBtn.onclick = () => {
                    closeRoulette();
                    toRewardBtn.textContent = '🎁 보상 카드 선택하기';
                    toRewardBtn.onclick = showRewardStep;
                };
            }, 3000);
        });
    });
}

function closeRoulette() {
    document.getElementById('roulette-modal').classList.remove('active');
    document.getElementById('roulette-step-result').style.display = 'none';
    document.getElementById('roulette-step-reward').style.display = 'none';
    document.getElementById('roulette-step-slot').style.display   = 'none';
    setProblemBtnEnabled(false);
}

