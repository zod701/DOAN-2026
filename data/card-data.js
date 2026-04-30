// =====================================================================
// 카드 데이터 — 보상 카드, 확률, 기본/강화/이중강화 카드 정의
// =====================================================================

const rewardCardPool = {
    // =====================================================================
    // 보상 카드 풀
    // 대성공/성공/실패 각각 보상으로 선택 가능한 카드 목록입니다.
    // 각 결과마다 원하는 만큼 카드를 추가할 수 있으며,
    // 룰렛 결과 후 이 목록에서 무작위 3장이 선택지로 제시됩니다.
    //
    // name   : 카드 이름
    // desc   : 카드 설명 (이 설명을 읽고 effect를 구현합니다)
    // effect : 효과 식별자 — 나중에 applyRewardEffect()에서 이 값으로 분기합니다.
    //          예: 'PURIFY_RANDOM_3', 'SKIP_PENALTY', 'REVERT_2' 등 원하는 키 입력.
    //          비워두면 효과 없음으로 처리됩니다.
    // =====================================================================
    '대성공': [
        {
            name: '대성공 보상 카드 1',
            desc: '이번 턴에 사용하는 방재 카드는 왜곡 타일을 무시합니다.',
            effect: 'GREAT_IGNORE_DISTORTION'
        },
        {
            name: '대성공 보상 카드 2',
            desc: '이번 턴에 사용하는 방재 카드가 강화됩니다.',
            effect: 'GREAT_ENHANCE_CARD'
        },
        {
            name: '대성공 보상 카드 3',
            desc: '이번 턴은 사용한 턴을 증가시키지 않습니다.',
            effect: 'GREAT_SKIP_TURN'
        },
        {
            name: '대성공 보상 카드 4',
            desc: '교체 기회가 2회 추가됩니다.',
            effect: 'GREAT_ADD_SWAP_2'
        },
        {
            name: '대성공 보상 카드 5',
            desc: '무작위 왜곡 타일 2개가 정화됩니다.',
            effect: 'GREAT_PURIFY_DISTORTION_2'
        },
        {
            name: '대성공 보상 카드 6',
            desc: '왜곡 타일을 하나 선택하여 정화합니다.',
            effect: 'GREAT_SELECT_DISTORTION'
        },
        {
            name: '대성공 보상 카드 7',
            desc: '무작위 오염 타일을 3개 정화합니다.',
            effect: 'GREAT_PURIFY_RANDOM_3'
        }
    ],
    '성공': [
        {
            name: '성공 보상 카드 1',
            desc: '무작위 왜곡 타일 하나가 정화됩니다.',
            effect: 'SUCCESS_PURIFY_DISTORTION_1'
        },
        {
            name: '성공 보상 카드 2',
            desc: '교체 기회가 1회 추가됩니다.',
            effect: 'SUCCESS_ADD_SWAP_1'
        },
        {
            name: '성공 보상 카드 3',
            desc: '무작위 오염 타일을 하나 정화합니다.',
            effect: 'SUCCESS_PURIFY_RANDOM_1'
        },
        {
            name: '성공 보상 카드 4',
            desc: '이번 턴에 사용하는 방재 카드가 소모되지 않습니다.',
            effect: 'SUCCESS_KEEP_CARD'
        },
        {
            name: '성공 보상 카드 5',
            desc: '왜곡 타일을 제외한 모든 타일을 무작위로 재배치합니다.',
            effect: 'SUCCESS_SHUFFLE_POLLUTED'
        },
        {
            name: '성공 보상 카드 6',
            desc: '다음 턴에 대성공 확률이 2배 증가합니다.',
            effect: 'SUCCESS_DOUBLE_GREAT_CHANCE'
        },
        {
            name: '성공 보상 카드 7',
            desc: '30% 확률로 이번 턴에 사용하는 방재 카드를 강화합니다.',
            effect: 'SUCCESS_30_ENHANCE'
        },
        {
            name: '성공 보상 카드 8',
            desc: '이번 턴은 정화된 타일을 선택할 수 있습니다.',
            effect: 'SUCCESS_SELECT_PURIFIED'
        }
    ],
    '실패': [
        {
            name: '실패 보상 카드 1',
            desc: '이번 턴은 사용한 턴을 1회 추가로 증가시킵니다.',
            effect: 'FAIL_EXTRA_TURNS'
        },
        {
            name: '실패 보상 카드 2',
            desc: '무작위 타일에 왜곡 타일이 하나 생성됩니다.',
            effect: 'FAIL_ADD_DISTORTION'
        },
        {
            name: '실패 보상 카드 3',
            desc: '정화된 무작위 3개 타일이 다시 오염됩니다.',
            effect: 'FAIL_REPOLLUTE_3'
        },
        {
            name: '실패 보상 카드 4',
            desc: '모든 방재 카드가 무작위 일반 방재 카드로 교체됩니다.',
            effect: 'FAIL_SHUFFLE_CARDS'
        },
        {
            name: '실패 보상 카드 5',
            desc: '모든 타일을 무작위로 재배치합니다.',
            effect: 'FAIL_SHUFFLE_BOARD'
        }
    ]
};


const resultProbabilities = {
    3: { 대성공: 15, 성공: 65, 실패: 20 },
    2: { 대성공: 10, 성공: 56, 실패: 34 },
    1: { 대성공: 5, 성공: 47, 실패: 48 },
    0: { 대성공: 0, 성공: 38, 실패: 62 }
};


const basicCardTypes = [
    {
        name: "기본 X자",
        desc: "선택한 타일을 중심으로 X자 모양 5개의 타일을 정화합니다.",
        shape: [
            [0,0,0,0,0],
            [0,1,0,1,0],
            [0,0,2,0,0],
            [0,1,0,1,0],
            [0,0,0,0,0]
        ],
        getPreviewTiles: (cx, cy) => {
            return [[cx, cy], [cx-1, cy-1], [cx-1, cy+1], [cx+1, cy-1], [cx+1, cy+1]];
        }
    },
    {
        name: "기본 십자가 (+)",
        desc: "선택한 타일을 중심으로 십자가 모양(+) 5개의 타일을 정화합니다.",
        shape: [
            [0,0,0,0,0],
            [0,0,1,0,0],
            [0,1,2,1,0],
            [0,0,1,0,0],
            [0,0,0,0,0]
        ],
        getPreviewTiles: (cx, cy) => {
            return [[cx, cy], [cx-1, cy], [cx+1, cy], [cx, cy-1], [cx, cy+1]];
        }
    },
    {
        name: "기본 가로 (ㅡ)",
        desc: "선택한 타일을 중심으로 좌우 포함 총 3개의 타일을 정화합니다.",
        shape: [
            [0,0,0,0,0],
            [0,0,0,0,0],
            [0,1,2,1,0],
            [0,0,0,0,0],
            [0,0,0,0,0]
        ],
        getPreviewTiles: (cx, cy) => {
            return [[cx, cy-1], [cx, cy], [cx, cy+1]];
        }
    },
    {
        name: "기본 세로 (ㅣ)",
        desc: "선택한 타일을 중심으로 상하 포함 총 3개의 타일을 정화합니다.",
        shape: [
            [0,0,0,0,0],
            [0,0,1,0,0],
            [0,0,2,0,0],
            [0,0,1,0,0],
            [0,0,0,0,0]
        ],
        getPreviewTiles: (cx, cy) => {
            return [[cx-1, cy], [cx, cy], [cx+1, cy]];
        }
    },
    {
        name: "기본 무작위",
        desc: "선택한 타일과 무작위 일반 타일 0~5개를 정화합니다.<br><span style='color:#ffb74d'>일정 확률로 정화된 무작위 일반 타일 1~3개가 다시 오염됩니다.</span>",
        shape: [
            [0,0,0,0,0],
            [0,0,0,0,0],
            [0,0,3,0,0],
            [0,0,0,0,0],
            [0,0,0,0,0]
        ],
        getPreviewTiles: (cx, cy) => { return [[cx, cy]]; },
        execute: (cx, cy) => {
            let targetTile = boardState[cx][cy];
            
            if (targetTile.state === 'polluted' && targetTile.type !== 'distortion') {
                targetTile.state = 'purified';
            }
            
            const purifyCount = Math.floor(Math.random() * 6);
            let pollutedNormal = [];
            for(let i=0; i<BOARD_SIZE; i++) {
                for(let j=0; j<BOARD_SIZE; j++) {
                    if(boardState[i][j].type === 'normal' && boardState[i][j].state === 'polluted' && !(i===cx && j===cy)) {
                        pollutedNormal.push([i,j]);
                    }
                }
            }
            pollutedNormal.sort(() => Math.random() - 0.5);
            let actualPurified = 0;
            for(let i=0; i<Math.min(purifyCount, pollutedNormal.length); i++) {
                boardState[pollutedNormal[i][0]][pollutedNormal[i][1]].state = 'purified';
                actualPurified++;
            }
            
            let repolluted = false;
            let actualPolluted = 0;
            if (Math.random() < 0.33) {
                const repolluteCount = Math.floor(Math.random() * 3) + 1;
                let purifiedTiles = [];
                for(let i=0; i<BOARD_SIZE; i++) {
                    for(let j=0; j<BOARD_SIZE; j++) {
                        if(boardState[i][j].state === 'purified' && boardState[i][j].type === 'normal') {
                            purifiedTiles.push([i,j]);
                        }
                    }
                }
                purifiedTiles.sort(() => Math.random() - 0.5);
                for(let i=0; i<Math.min(repolluteCount, purifiedTiles.length); i++) {
                    boardState[purifiedTiles[i][0]][purifiedTiles[i][1]].state = 'polluted';
                    actualPolluted++;
                }
                if(actualPolluted > 0) repolluted = true;
            }
            
            if (repolluted) {
                showVisualFeedback(`무작위 정화(${actualPurified}칸) 발동 및 부작용으로 ${actualPolluted}칸 오염!`, '#f57c00');
            } else if (actualPurified > 0) {
                showVisualFeedback(`무작위 정화 발동! (추가 ${actualPurified}칸)`, '#388e3c');
            }
        }
    },
    {
        name: "기본 사각형 (ㅁ)",
        desc: "선택한 타일을 중심으로 정사각형 9개의 타일을 정화합니다.",
        shape: [
            [0,0,0,0,0],
            [0,1,1,1,0],
            [0,1,2,1,0],
            [0,1,1,1,0],
            [0,0,0,0,0]
        ],
        getPreviewTiles: (cx, cy) => {
            let t=[]; for(let i=-1;i<=1;i++) for(let j=-1;j<=1;j++) t.push([cx+i, cy+j]); return t;
        }
    },
    {
        name: "기본 정화",
        desc: "선택한 타일을 정화합니다.<br><span style='color:#ffb74d'>왜곡 타일을 패널티 없이 정화할 수 있습니다.</span>",
        canDestroyDistortion: true,
        shape: [
            [0,0,0,0,0],
            [0,0,0,0,0],
            [0,0,2,0,0],
            [0,0,0,0,0],
            [0,0,0,0,0]
        ],
        getPreviewTiles: (cx, cy) => { return [[cx, cy]]; }
    }
];

const enhancedCardTypes = [
    {
        name: "강화 X자",
        desc: "선택한 타일을 중심으로 X자 모양(대각선)의 모든 타일을 정화합니다.",
        shape: [
            [1,0,0,0,1],
            [0,1,0,1,0],
            [0,0,2,0,0],
            [0,1,0,1,0],
            [1,0,0,0,1]
        ],
        getPreviewTiles: (cx, cy) => {
            let t=[]; for(let i=0;i<BOARD_SIZE;i++) for(let j=0;j<BOARD_SIZE;j++) if(Math.abs(i-cx)===Math.abs(j-cy)) t.push([i,j]); return t;
        }
    },
    {
        name: "강화 십자가 (+)",
        desc: "선택한 타일을 중심으로 십자가 모양(+)의 모든 타일을 정화합니다.",
        shape: [
            [0,0,1,0,0],
            [0,0,1,0,0],
            [1,1,2,1,1],
            [0,0,1,0,0],
            [0,0,1,0,0]
        ],
        getPreviewTiles: (cx, cy) => {
            let t=[]; for(let i=0;i<BOARD_SIZE;i++){ t.push([i,cy]); t.push([cx,i]); } return t;
        }
    },
    {
        name: "강화 가로 (ㅡ)",
        desc: "선택한 타일을 기준으로 가로(ㅡ) 모양의 모든 타일을 정화합니다.",
        shape: [
            [0,0,0,0,0],
            [0,0,0,0,0],
            [1,1,2,1,1],
            [0,0,0,0,0],
            [0,0,0,0,0]
        ],
        getPreviewTiles: (cx, cy) => {
            let t=[]; for(let i=0;i<BOARD_SIZE;i++) t.push([cx,i]); return t;
        }
    },
    {
        name: "강화 세로 (ㅣ)",
        desc: "선택한 타일을 기준으로 세로(ㅣ) 모양의 모든 타일을 정화합니다.",
        shape: [
            [0,0,1,0,0],
            [0,0,1,0,0],
            [0,0,2,0,0],
            [0,0,1,0,0],
            [0,0,1,0,0]
        ],
        getPreviewTiles: (cx, cy) => {
            let t=[]; for(let i=0;i<BOARD_SIZE;i++) t.push([i,cy]); return t;
        }
    },
    {
        name: "강화 무작위",
        desc: "선택한 타일과 무작위 일반 타일 3~5개를 추가 정화합니다.<br><span style='color:#ffb74d'></span>",
        shape: [
            [0,0,0,0,0],
            [0,0,0,0,0],
            [0,0,3,0,0],
            [0,0,0,0,0],
            [0,0,0,0,0]
        ],
        getPreviewTiles: (cx, cy) => { return [[cx, cy]]; },
        execute: (cx, cy) => {
            let targetTile = boardState[cx][cy];
            if (targetTile.state === 'polluted' && targetTile.type !== 'distortion') {
                targetTile.state = 'purified';
            }
            const purifyCount = Math.floor(Math.random() * 3) + 3;
            let pollutedNormal = [];
            for(let i=0; i<BOARD_SIZE; i++) {
                for(let j=0; j<BOARD_SIZE; j++) {
                    if(boardState[i][j].type === 'normal' && boardState[i][j].state === 'polluted' && !(i===cx && j===cy)) {
                        pollutedNormal.push([i,j]);
                    }
                }
            }
            pollutedNormal.sort(() => Math.random() - 0.5);
            let actualPurified = 0;
            for(let i=0; i<Math.min(purifyCount, pollutedNormal.length); i++) {
                boardState[pollutedNormal[i][0]][pollutedNormal[i][1]].state = 'purified';
                actualPurified++;
            }
            
            let repolluted = false;
            let actualPolluted = 0;
            if (Math.random() > 0.33) {
                const repolluteCount = Math.floor(Math.random() * 3) + 1;
                let purifiedTiles = [];
                for(let i=0; i<BOARD_SIZE; i++) {
                    for(let j=0; j<BOARD_SIZE; j++) {
                        if(boardState[i][j].state === 'purified' && boardState[i][j].type === 'normal') {
                            purifiedTiles.push([i,j]);
                        }
                    }
                }
                purifiedTiles.sort(() => Math.random() - 0.5);
                for(let i=0; i<Math.min(repolluteCount, purifiedTiles.length); i++) {
                    boardState[purifiedTiles[i][0]][purifiedTiles[i][1]].state = 'polluted';
                    actualPolluted++;
                }
                if(actualPolluted > 0) repolluted = true;
            }
            
            if (repolluted) {
                showVisualFeedback(`강화 무작위 정화(${actualPurified}칸) 발동 및 부작용으로 ${actualPolluted}칸 오염!`, '#f57c00');
            } else {
                showVisualFeedback(`강화 무작위 정화 발동! 오염 무효화 성공! (추가 ${actualPurified}칸)`, '#388e3c');
            }
        }
    },
    {
        name: "강화 사각형",
        desc: "선택한 타일 기준 45도 기울어진 사각형 모양(상하좌우 3칸)을 정화합니다.",
        shape: [
            [0,0,1,0,0],
            [0,1,1,1,0],
            [1,1,2,1,1],
            [0,1,1,1,0],
            [0,0,1,0,0]
        ],
        getPreviewTiles: (cx, cy) => {
            let t=[]; for(let i=0;i<BOARD_SIZE;i++) for(let j=0;j<BOARD_SIZE;j++) if(Math.abs(i-cx)+Math.abs(j-cy)<=3) t.push([i,j]); return t;
        }
    },
    {
        name: "강화 정화",
        desc: "선택한 타일을 중심으로 십자가 모양(+) 5개의 타일을 정화합니다.<br><span style='color:#ffb74d'>왜곡 타일을 포함하여도 패널티 없이 정화할 수 있습니다.</span>",
        canDestroyDistortion: true,
        shape: [
            [0,0,0,0,0],
            [0,0,1,0,0],
            [0,1,2,1,0],
            [0,0,1,0,0],
            [0,0,0,0,0]
        ],
        getPreviewTiles: (cx, cy) => {
            return [[cx, cy], [cx-1, cy], [cx+1, cy], [cx, cy-1], [cx, cy+1]];
        }
    }
];

const doubleEnhancedCardTypes = [
    {
        name: "이중 강화 X자",
        desc: "선택한 타일을 중심으로 X자 모양(대각선)의 모든 타일을 정화합니다.<br><span style='color:#ce93d8'>왜곡 타일이 범위에 포함되어도 패널티가 발생하지 않습니다.</span>",
        ignoreDistortion: true,
        highlightColor: '#ce93d8',
        shape: [
            [1,0,0,0,1],
            [0,1,0,1,0],
            [0,0,2,0,0],
            [0,1,0,1,0],
            [1,0,0,0,1]
        ],
        getPreviewTiles: (cx, cy) => {
            let t=[]; for(let i=0;i<BOARD_SIZE;i++) for(let j=0;j<BOARD_SIZE;j++) if(Math.abs(i-cx)===Math.abs(j-cy)) t.push([i,j]); return t;
        }
    },
    {
        name: "이중 강화 십자가 (+)",
        desc: "선택한 타일을 중심으로 십자가 모양(+)의 모든 타일을 정화합니다.<br><span style='color:#ce93d8'>왜곡 타일이 범위에 포함되어도 패널티가 발생하지 않습니다.</span>",
        ignoreDistortion: true,
        highlightColor: '#ce93d8',
        shape: [
            [0,0,1,0,0],
            [0,0,1,0,0],
            [1,1,2,1,1],
            [0,0,1,0,0],
            [0,0,1,0,0]
        ],
        getPreviewTiles: (cx, cy) => {
            let t=[]; for(let i=0;i<BOARD_SIZE;i++){ t.push([i,cy]); t.push([cx,i]); } return t;
        }
    },
    {
        name: "이중 강화 가로 (ㅡ)",
        desc: "선택한 타일을 기준으로 가로(ㅡ) 모양의 모든 타일을 정화합니다.<br><span style='color:#ce93d8'>왜곡 타일이 범위에 포함되어도 패널티가 발생하지 않습니다.</span>",
        ignoreDistortion: true,
        highlightColor: '#ce93d8',
        shape: [
            [0,0,0,0,0],
            [0,0,0,0,0],
            [1,1,2,1,1],
            [0,0,0,0,0],
            [0,0,0,0,0]
        ],
        getPreviewTiles: (cx, cy) => {
            let t=[]; for(let i=0;i<BOARD_SIZE;i++) t.push([cx,i]); return t;
        }
    },
    {
        name: "이중 강화 세로 (ㅣ)",
        desc: "선택한 타일을 기준으로 세로(ㅣ) 모양의 모든 타일을 정화합니다.<br><span style='color:#ce93d8'>왜곡 타일이 범위에 포함되어도 패널티가 발생하지 않습니다.</span>",
        ignoreDistortion: true,
        highlightColor: '#ce93d8',
        shape: [
            [0,0,1,0,0],
            [0,0,1,0,0],
            [0,0,2,0,0],
            [0,0,1,0,0],
            [0,0,1,0,0]
        ],
        getPreviewTiles: (cx, cy) => {
            let t=[]; for(let i=0;i<BOARD_SIZE;i++) t.push([i,cy]); return t;
        }
    },
    {
        name: "이중 강화 무작위",
        desc: "선택한 타일과 무작위 오염 타일 5~7개를 추가 정화합니다.</span>",
        ignoreDistortion: true,
        highlightColor: '#ce93d8',
        shape: [
            [0,0,0,0,0],
            [0,0,0,0,0],
            [0,0,3,0,0],
            [0,0,0,0,0],
            [0,0,0,0,0]
        ],
        getPreviewTiles: (cx, cy) => { return [[cx, cy]]; },
        execute: (cx, cy) => {
            let targetTile = boardState[cx][cy];
            if (targetTile.state === 'polluted' && targetTile.type !== 'distortion') {
                targetTile.state = 'purified';
            }
            const purifyCount = Math.floor(Math.random() * 3) + 5;
            let pollutedNormal = [];
            for(let i=0; i<BOARD_SIZE; i++) {
                for(let j=0; j<BOARD_SIZE; j++) {
                    if(boardState[i][j].type === 'normal' && boardState[i][j].state === 'polluted' && !(i===cx && j===cy)) {
                        pollutedNormal.push([i,j]);
                    }
                }
            }
            pollutedNormal.sort(() => Math.random() - 0.5);
            let actualPurified = 0;
            for(let i=0; i<Math.min(purifyCount, pollutedNormal.length); i++) {
                boardState[pollutedNormal[i][0]][pollutedNormal[i][1]].state = 'purified';
                actualPurified++;
            }
            showVisualFeedback(`이중 강화 무작위 정화 발동! (추가 ${actualPurified}칸)`, '#388e3c');
        }
    },
    {
        name: "이중 강화 사각형",
        desc: "선택한 타일 기준 45도 기울어진 사각형 모양(상하좌우 3칸)을 정화합니다.<br><span style='color:#ce93d8'>왜곡 타일이 범위에 포함되어도 패널티가 발생하지 않습니다.</span>",
        ignoreDistortion: true,
        highlightColor: '#ce93d8',
        shape: [
            [0,0,1,0,0],
            [0,1,1,1,0],
            [1,1,2,1,1],
            [0,1,1,1,0],
            [0,0,1,0,0]
        ],
        getPreviewTiles: (cx, cy) => {
            let t=[]; for(let i=0;i<BOARD_SIZE;i++) for(let j=0;j<BOARD_SIZE;j++) if(Math.abs(i-cx)+Math.abs(j-cy)<=3) t.push([i,j]); return t;
        }
    },
    {
        name: "이중 강화 정화",
        desc: "선택한 타일을 중심으로 3x3 정사각형 9개의 타일을 정화합니다.<br><span style='color:#ce93d8'>왜곡 타일이 범위에 포함되어도 패널티가 발생하지 않습니다.</span>",
        canDestroyDistortion: true,
        ignoreDistortion: true,
        highlightColor: '#ce93d8',
        shape: [
            [0,0,0,0,0],
            [0,1,1,1,0],
            [0,1,2,1,0],
            [0,1,1,1,0],
            [0,0,0,0,0]
        ],
        getPreviewTiles: (cx, cy) => {
            let t=[]; for(let i=-1;i<=1;i++) for(let j=-1;j<=1;j++) t.push([cx+i, cy+j]); return t;
        }
    }
];