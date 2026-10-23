/**
 * 인접행렬을 활용한 AMR 창고 경로 탐색기 (script.js)
 * 고등학교 『인공지능을 위한 이산수학』 수행평가용
 * 순수 Vanilla JavaScript 구현 (외부 라이브러리 없음)
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. 그래프 꼭짓점(장소) 및 통로(에지) 정의
  // =========================================================================
  const VERTICES = [
    { id: 1, key: 'A', name: '입고 구역', x: 90, y: 190, labelY: 232 },
    { id: 2, key: 'B', name: '보관 구역 1', x: 250, y: 90, labelY: 48 },
    { id: 3, key: 'C', name: '보관 구역 2', x: 250, y: 290, labelY: 332 },
    { id: 4, key: 'D', name: '분류 구역', x: 430, y: 90, labelY: 48 },
    { id: 5, key: 'E', name: '검수 구역', x: 430, y: 290, labelY: 332 },
    { id: 6, key: 'F', name: '출고 구역', x: 590, y: 190, labelY: 232 }
  ];

  // 7개의 초기 통로 (양방향 연결)
  const INITIAL_CORRIDORS = [
    { id: 'A-B', u: 0, v: 1, name: 'A–B (입고 ↔ 보관1)' },
    { id: 'A-C', u: 0, v: 2, name: 'A–C (입고 ↔ 보관2)' },
    { id: 'B-D', u: 1, v: 3, name: 'B–D (보관1 ↔ 분류)' },
    { id: 'C-D', u: 2, v: 3, name: 'C–D (보관2 ↔ 분류)' },
    { id: 'C-E', u: 2, v: 4, name: 'C–E (보관2 ↔ 검수)' },
    { id: 'D-F', u: 3, v: 5, name: 'D–F (분류 ↔ 출고)' },
    { id: 'E-F', u: 4, v: 5, name: 'E–F (검수 ↔ 출고)' }
  ];

  // =========================================================================
  // 2. 애플리케이션 상태 (State)
  // =========================================================================
  const state = {
    corridors: INITIAL_CORRIDORS.map(c => ({ ...c, active: true })),
    startIndex: 0,       // 1번 A (기본 출발지)
    destIndex: 3,        // 4번 D (기본 도착지)
    currentPower: 2,     // 기본 거듭제곱 차수 (A²)
    selectedCell: { r: 0, c: 3 }, // 기본 선택 성분: 1행 4열
    selectedPathIndex: 0 // 탐색된 경로 중 선택된 경로 인덱스
  };

  // 캐시된 행렬 거듭제곱 배열 [null, A, A², A³, A⁴, A⁵]
  let matrixPowers = [];

  // =========================================================================
  // 3. 행렬 연산 엔진 (순수 수학 구현)
  // =========================================================================

  /**
   * 활성화된 통로를 기반으로 6x6 인접행렬 A 생성
   */
  function buildAdjacencyMatrix() {
    const size = VERTICES.length;
    const mat = Array.from({ length: size }, () => Array(size).fill(0));

    state.corridors.forEach(edge => {
      if (edge.active) {
        mat[edge.u][edge.v] = 1;
        mat[edge.v][edge.u] = 1; // 무방향 그래프 대칭성
      }
    });

    return mat;
  }

  /**
   * 두 6x6 행렬 m1, m2의 곱셈 m1 × m2 계산
   */
  function multiplyMatrices(m1, m2) {
    const size = m1.length;
    const result = Array.from({ length: size }, () => Array(size).fill(0));

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        let sum = 0;
        for (let k = 0; k < size; k++) {
          sum += m1[i][k] * m2[k][j];
        }
        result[i][j] = sum;
      }
    }
    return result;
  }

  /**
   * A¹부터 A⁵까지 거듭제곱 행렬 계산 및 캐싱
   */
  function calculateAllPowers() {
    const A = buildAdjacencyMatrix();
    matrixPowers = [null, A]; // 인덱스 1이 A¹

    for (let p = 2; p <= 5; p++) {
      matrixPowers[p] = multiplyMatrices(matrixPowers[p - 1], A);
    }
  }

  // =========================================================================
  // 4. 경로 탐색 및 최소 통로 통과 횟수 판정
  // =========================================================================

  /**
   * 거듭제곱 행렬을 활용한 최소 통로 통과 횟수 판정
   */
  function determineMinPassageCount(start, dest) {
    if (start === dest) {
      return {
        reachable: true,
        steps: 0,
        basis: '출발지와 도착지가 같으므로 이동할 필요가 없음 (0회)'
      };
    }

    // A¹부터 A⁵까지 순차적으로 확인
    for (let n = 1; n <= 5; n++) {
      const val = matrixPowers[n][start][dest];
      if (val > 0) {
        const startName = `${VERTICES[start].id}번 ${VERTICES[start].key}`;
        const destName = `${VERTICES[dest].id}번 ${VERTICES[dest].key}`;
        return {
          reachable: true,
          steps: n,
          val: val,
          basis: `판정 근거: A${n > 1 ? `^${n}` : ''}의 (${start + 1}행, ${dest + 1}열: ${startName} → ${destName}) 성분이 처음으로 양수(${val})가 됨`
        };
      }
    }

    return {
      reachable: false,
      steps: null,
      basis: 'A¹부터 A⁵까지 해당 성분이 모두 0임 (최대 5개 통로 내 도달 불가)'
    };
  }

  /**
   * 그래프 탐색을 통해 길이가 exactLength인 모든 단순 경로 탐색
   */
  function findAllSimplePaths(start, dest, exactLength) {
    if (start === dest && exactLength === 0) {
      return [[start]];
    }
    if (exactLength <= 0) return [];

    const results = [];
    const visited = new Set([start]);

    function dfs(current, remaining, path) {
      if (remaining === 0) {
        if (current === dest) {
          results.push([...path]);
        }
        return;
      }

      for (const edge of state.corridors) {
        if (!edge.active) continue;

        let next = -1;
        if (edge.u === current) next = edge.v;
        else if (edge.v === current) next = edge.u;

        if (next !== -1 && !visited.has(next)) {
          visited.add(next);
          path.push(next);
          dfs(next, remaining - 1, path);
          path.pop();
          visited.delete(next);
        }
      }
    }

    dfs(start, exactLength, [start]);
    return results;
  }

  // =========================================================================
  // 5. DOM 렌더링 함수들
  // =========================================================================

  /**
   * 출발지 / 도착지 셀렉트 박스 초기화
   */
  function initSelectBoxes() {
    const startSelect = document.getElementById('start-node-select');
    const destSelect = document.getElementById('dest-node-select');

    startSelect.innerHTML = '';
    destSelect.innerHTML = '';

    VERTICES.forEach((v, idx) => {
      const optStart = document.createElement('option');
      optStart.value = idx;
      optStart.textContent = `${v.id}번 ${v.key}: ${v.name}`;
      startSelect.appendChild(optStart);

      const optDest = document.createElement('option');
      optDest.value = idx;
      optDest.textContent = `${v.id}번 ${v.key}: ${v.name}`;
      destSelect.appendChild(optDest);
    });

    startSelect.value = state.startIndex;
    destSelect.value = state.destIndex;

    startSelect.addEventListener('change', (e) => {
      state.startIndex = parseInt(e.target.value, 10);
      state.selectedCell = { r: state.startIndex, c: state.destIndex };
      state.selectedPathIndex = 0;
      updateAll();
    });

    destSelect.addEventListener('change', (e) => {
      state.destIndex = parseInt(e.target.value, 10);
      state.selectedCell = { r: state.startIndex, c: state.destIndex };
      state.selectedPathIndex = 0;
      updateAll();
    });

    document.getElementById('btn-swap-nodes').addEventListener('click', () => {
      const temp = state.startIndex;
      state.startIndex = state.destIndex;
      state.destIndex = temp;
      startSelect.value = state.startIndex;
      destSelect.value = state.destIndex;
      state.selectedCell = { r: state.startIndex, c: state.destIndex };
      state.selectedPathIndex = 0;
      updateAll();
    });
  }

  /**
   * 통로 차단/복구 버튼 그리드 렌더링
   */
  function renderCorridorButtons() {
    const container = document.getElementById('corridor-button-grid');
    container.innerHTML = '';

    state.corridors.forEach(corridor => {
      const btn = document.createElement('button');
      btn.className = `corridor-toggle-btn ${corridor.active ? 'active' : 'blocked'}`;
      btn.type = 'button';
      btn.title = `클릭 시 통로 ${corridor.id}를 ${corridor.active ? '차단' : '복구'}합니다.`;

      const nameSpan = document.createElement('span');
      nameSpan.className = 'corridor-name';
      nameSpan.textContent = corridor.id;

      const badgeSpan = document.createElement('span');
      badgeSpan.className = 'corridor-state-badge';
      badgeSpan.textContent = corridor.active ? '정상 이용' : '차단됨 🚫';

      btn.appendChild(nameSpan);
      btn.appendChild(badgeSpan);

      btn.addEventListener('click', () => {
        toggleCorridor(corridor.id);
      });

      container.appendChild(btn);
    });
  }

  /**
   * 통로 토글 함수
   */
  function toggleCorridor(corridorId) {
    const target = state.corridors.find(c => c.id === corridorId);
    if (target) {
      target.active = !target.active;
      updateAll();
    }
  }

  /**
   * SVG 창고 연결 그래프 렌더링
   */
  function renderWarehouseGraph(currentPaths) {
    const svg = document.getElementById('warehouse-graph');
    svg.innerHTML = '';

    // 현재 선택된 경로의 에지 및 노드 집합
    const selectedPath = currentPaths && currentPaths[state.selectedPathIndex] ? currentPaths[state.selectedPathIndex] : [];
    const pathEdges = new Set();
    const pathNodes = new Set(selectedPath);

    for (let i = 0; i < selectedPath.length - 1; i++) {
      const u = Math.min(selectedPath[i], selectedPath[i + 1]);
      const v = Math.max(selectedPath[i], selectedPath[i + 1]);
      pathEdges.add(`${u}-${v}`);
    }

    // 1. 에지(통로) 레이어
    state.corridors.forEach(edge => {
      const uNode = VERTICES[edge.u];
      const vNode = VERTICES[edge.v];
      const edgeKey = `${Math.min(edge.u, edge.v)}-${Math.max(edge.u, edge.v)}`;
      const isPathEdge = pathEdges.has(edgeKey);

      // 에지 라인
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', uNode.x);
      line.setAttribute('y1', uNode.y);
      line.setAttribute('x2', vNode.x);
      line.setAttribute('y2', vNode.y);
      
      let lineClass = 'graph-edge';
      if (!edge.active) lineClass += ' edge-blocked';
      else if (isPathEdge) lineClass += ' edge-path';
      line.setAttribute('class', lineClass);

      line.addEventListener('click', () => toggleCorridor(edge.id));
      svg.appendChild(line);

      // 통로 중간 배지 (ID 및 차단 표시)
      const midX = (uNode.x + vNode.x) / 2;
      const midY = (uNode.y + vNode.y) / 2;

      // C-D 대각선의 경우 약간 offset
      let offsetX = 0;
      let offsetY = 0;
      if (edge.id === 'C-D') {
        offsetX = 12;
        offsetY = -12;
      }

      const gBadge = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      gBadge.setAttribute('class', 'edge-label-group');
      gBadge.setAttribute('transform', `translate(${midX + offsetX}, ${midY + offsetY})`);
      gBadge.addEventListener('click', () => toggleCorridor(edge.id));

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      const badgeWidth = edge.active ? 36 : 46;
      const badgeHeight = 18;
      rect.setAttribute('x', -badgeWidth / 2);
      rect.setAttribute('y', -badgeHeight / 2);
      rect.setAttribute('width', badgeWidth);
      rect.setAttribute('height', badgeHeight);

      let rectClass = 'edge-badge-bg';
      if (!edge.active) rectClass += ' badge-blocked';
      else if (isPathEdge) rectClass += ' badge-path';
      rect.setAttribute('class', rectClass);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', 0);
      text.setAttribute('y', 0);
      let textClass = 'edge-badge-text';
      if (!edge.active) textClass += ' text-blocked';
      text.setAttribute('class', textClass);
      text.textContent = edge.active ? edge.id : '차단 ✕';

      gBadge.appendChild(rect);
      gBadge.appendChild(text);
      svg.appendChild(gBadge);
    });

    // 2. 꼭짓점(장소) 노드 레이어
    VERTICES.forEach((v, idx) => {
      const gNode = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      gNode.setAttribute('class', 'graph-node-group');
      gNode.setAttribute('transform', `translate(${v.x}, ${v.y})`);

      // 노드 클릭 시 출발지/도착지 변경 상호작용
      gNode.addEventListener('click', () => {
        if (state.startIndex !== idx) {
          state.destIndex = idx;
          document.getElementById('dest-node-select').value = idx;
        } else {
          // 이미 출발지인 경우 도착지를 다른 곳으로
          state.startIndex = idx;
        }
        state.selectedCell = { r: state.startIndex, c: state.destIndex };
        state.selectedPathIndex = 0;
        updateAll();
      });

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('r', 25);

      let circleClass = 'node-circle';
      if (idx === state.startIndex) circleClass += ' node-start';
      else if (idx === state.destIndex) circleClass += ' node-dest';
      else if (pathNodes.has(idx)) circleClass += ' node-path';
      circle.setAttribute('class', circleClass);

      const textId = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textId.setAttribute('x', 0);
      textId.setAttribute('y', 0);
      textId.setAttribute('class', 'node-id-text');
      textId.textContent = `${v.id}: ${v.key}`;

      gNode.appendChild(circle);
      gNode.appendChild(textId);
      svg.appendChild(gNode);

      // 장소 이름 배지 (원 밖)
      const gName = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      gName.setAttribute('transform', `translate(${v.x}, ${v.labelY})`);

      const nameRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      const nameWidth = v.name.length * 13 + 18;
      const nameHeight = 22;
      nameRect.setAttribute('x', -nameWidth / 2);
      nameRect.setAttribute('y', -nameHeight / 2);
      nameRect.setAttribute('width', nameWidth);
      nameRect.setAttribute('height', nameHeight);
      nameRect.setAttribute('class', 'node-name-bg');

      const nameText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      nameText.setAttribute('x', 0);
      nameText.setAttribute('y', 0);
      nameText.setAttribute('class', 'node-name-text');
      nameText.textContent = v.name;

      gName.appendChild(nameRect);
      gName.appendChild(nameText);
      svg.appendChild(gName);
    });
  }

  /**
   * 통로 수 & 인접행렬 성분의 합 통계 및 악수 보조정리 갱신
   */
  function updateCorridorStats() {
    const activeCount = state.corridors.filter(c => c.active).length;
    const A = matrixPowers[1];
    let matrixSum = 0;
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
        matrixSum += A[i][j];
      }
    }

    document.getElementById('stat-active-edges').textContent = activeCount;
    document.getElementById('stat-matrix-sum').textContent = matrixSum;

    const lemmaBox = document.getElementById('handshake-lemma-box');
    const isSymmetricAndDoubled = (matrixSum === activeCount * 2);
    if (isSymmetricAndDoubled) {
      lemmaBox.innerHTML = `✅ <strong>차수의 합 / 대칭행렬 성분의 합:</strong> 성분의 합(${matrixSum}) = 통로 수(${activeCount}) × 2 성립!`;
      lemmaBox.style.color = '#047857';
      lemmaBox.style.backgroundColor = '#ecfdf5';
    } else {
      lemmaBox.innerHTML = `⚠️ 성분의 합(${matrixSum}) ≠ 통로 수(${activeCount}) × 2 불일치`;
      lemmaBox.style.color = '#b91c1c';
      lemmaBox.style.backgroundColor = '#fef2f2';
    }
  }

  /**
   * 경로 탐색 결과 배너 및 목록 렌더링
   */
  function updatePathSearchResults() {
    const minResult = determineMinPassageCount(state.startIndex, state.destIndex);
    const countBadge = document.getElementById('result-steps-count');
    const unitBadge = document.getElementById('result-steps-unit');
    const basisText = document.getElementById('result-basis-text');
    const pathListContainer = document.getElementById('paths-list-container');
    const pathCountBadge = document.getElementById('path-count-badge');

    let paths = [];

    if (!minResult.reachable) {
      countBadge.textContent = '도달 불가';
      countBadge.classList.add('unreachable');
      unitBadge.style.display = 'none';
      basisText.textContent = minResult.basis;
      pathCountBadge.textContent = '0';
      pathListContainer.innerHTML = `
        <div class="empty-paths-msg">
          ❌ 출발지에서 도착지로 이동할 수 있는 유효한 경로가 존재하지 않습니다.<br>
          (차단된 통로를 복구해 보세요)
        </div>
      `;
      renderWarehouseGraph([]);
      return [];
    }

    countBadge.classList.remove('unreachable');
    unitBadge.style.display = 'inline';
    countBadge.textContent = minResult.steps;
    basisText.textContent = minResult.basis;

    // 경로 탐색
    paths = findAllSimplePaths(state.startIndex, state.destIndex, minResult.steps);
    pathCountBadge.textContent = paths.length;

    if (paths.length === 0) {
      pathListContainer.innerHTML = `
        <div class="empty-paths-msg">
          현재 이동 경로가 없습니다 (이동 횟수: 0회).
        </div>
      `;
    } else {
      pathListContainer.innerHTML = '';
      if (state.selectedPathIndex >= paths.length) {
        state.selectedPathIndex = 0;
      }

      paths.forEach((path, idx) => {
        const item = document.createElement('div');
        item.className = `path-item ${idx === state.selectedPathIndex ? 'selected' : ''}`;
        
        const routeDiv = document.createElement('div');
        routeDiv.className = 'path-route-text';
        
        path.forEach((nodeIdx, stepIdx) => {
          const pill = document.createElement('span');
          pill.className = 'path-node-pill';
          pill.textContent = `${VERTICES[nodeIdx].id}번 ${VERTICES[nodeIdx].key}(${VERTICES[nodeIdx].name})`;
          routeDiv.appendChild(pill);

          if (stepIdx < path.length - 1) {
            const arrow = document.createElement('span');
            arrow.className = 'path-arrow';
            arrow.textContent = ' → ';
            routeDiv.appendChild(arrow);
          }
        });

        const selectBadge = document.createElement('span');
        selectBadge.className = 'path-badge-select';
        selectBadge.textContent = (idx === state.selectedPathIndex) ? '선택됨 ●' : `경로 ${idx + 1}`;

        item.appendChild(routeDiv);
        item.appendChild(selectBadge);

        item.addEventListener('click', () => {
          state.selectedPathIndex = idx;
          updatePathSearchResults();
        });

        pathListContainer.appendChild(item);
      });
    }

    renderWarehouseGraph(paths);
    return paths;
  }

  /**
   * 교과서 손 계산 비교 영역 갱신
   */
  function updateHandCalculationSection() {
    // 1번 A(0) → 4번 D(3)의 A² 성분
    const currentA2_14 = matrixPowers[2][0][3];
    document.getElementById('current-a2-14-val').textContent = currentA2_14;

    const matchBadge = document.getElementById('hand-calc-match-status');
    const warningBox = document.getElementById('corridor-modified-warning');

    const isAllActive = state.corridors.every(c => c.active);

    if (currentA2_14 === 2) {
      matchBadge.className = 'badge-match match';
      matchBadge.textContent = '일치 ✅';
    } else {
      matchBadge.className = 'badge-match mismatch';
      matchBadge.textContent = `값 변경 (${currentA2_14})`;
    }

    if (!isAllActive) {
      warningBox.classList.remove('hidden');
    } else {
      warningBox.classList.add('hidden');
    }
  }

  /**
   * 하단 행렬 곱셈 및 6개 항 전개식 렌더링
   */
  function renderMatrixMultiplication() {
    const power = state.currentPower;
    const leftBlockTitle = document.getElementById('left-matrix-title');
    const rightBlockTitle = document.getElementById('right-matrix-title');
    const resultBlockTitle = document.getElementById('result-matrix-title');
    const opSymbol = document.getElementById('matrix-operator-symbol');
    const rightBlock = document.getElementById('right-matrix-block');

    let leftMat, rightMat, resultMat;

    if (power === 1) {
      leftBlockTitle.textContent = '인접행렬: A (기준 행렬)';
      rightBlock.style.display = 'none';
      opSymbol.style.display = 'none';
      resultBlockTitle.textContent = 'A¹ (1단계 직접 연결 성분)';
      leftMat = matrixPowers[1];
      rightMat = matrixPowers[1];
      resultMat = matrixPowers[1];
    } else {
      rightBlock.style.display = 'flex';
      opSymbol.style.display = 'block';

      if (power === 2) {
        leftBlockTitle.textContent = '왼쪽 행렬: A';
        rightBlockTitle.textContent = '오른쪽 행렬: A';
        resultBlockTitle.textContent = '결과 행렬: A² (클릭 가능)';
        leftMat = matrixPowers[1];
        rightMat = matrixPowers[1];
        resultMat = matrixPowers[2];
      } else {
        const prevSup = power - 1 === 1 ? '' : `^${power - 1}`;
        leftBlockTitle.textContent = `왼쪽 행렬: A${prevSup}`;
        rightBlockTitle.textContent = '오른쪽 행렬: A';
        resultBlockTitle.textContent = `결과 행렬: A^${power} (클릭 가능)`;
        leftMat = matrixPowers[power - 1];
        rightMat = matrixPowers[1];
        resultMat = matrixPowers[power];
      }
    }

    renderTable(document.getElementById('left-matrix-table'), leftMat, 'left');
    if (power > 1) {
      renderTable(document.getElementById('right-matrix-table'), rightMat, 'right');
    }
    renderTable(document.getElementById('result-matrix-table'), resultMat, 'result');

    renderCalculationExpansion(leftMat, rightMat, resultMat);
  }

  /**
   * 6x6 행렬 테이블 생성 보조함수
   */
  function renderTable(tableEl, mat, type) {
    tableEl.innerHTML = '';

    // 헤더 행 (열 번호 및 문자)
    const headerRow = document.createElement('tr');
    const cornerTh = document.createElement('th');
    cornerTh.className = 'corner-th';
    cornerTh.textContent = '행\\열';
    headerRow.appendChild(cornerTh);

    VERTICES.forEach(v => {
      const th = document.createElement('th');
      th.textContent = `${v.id}(${v.key})`;
      headerRow.appendChild(th);
    });
    tableEl.appendChild(headerRow);

    // 데이터 행
    for (let r = 0; r < 6; r++) {
      const tr = document.createElement('tr');
      const rowTh = document.createElement('th');
      rowTh.textContent = `${VERTICES[r].id}(${VERTICES[r].key})`;
      tr.appendChild(rowTh);

      for (let c = 0; c < 6; c++) {
        const td = document.createElement('td');
        td.textContent = mat[r][c];

        // 강조 클래스 부착
        if (type === 'left' && r === state.selectedCell.r) {
          td.classList.add('hl-row');
        } else if (type === 'right' && c === state.selectedCell.c) {
          td.classList.add('hl-col');
        } else if (type === 'result') {
          if (r === state.selectedCell.r && c === state.selectedCell.c) {
            td.classList.add('hl-selected');
          }
          // 결과 행렬 셀 클릭 이벤트
          td.addEventListener('click', () => {
            state.selectedCell = { r, c };
            renderMatrixMultiplication();
          });
        }

        tr.appendChild(td);
      }
      tableEl.appendChild(tr);
    }
  }

  /**
   * 선택된 성분에 대한 6개 항 생략 없는 곱셈·덧셈 전개식 렌더링
   */
  function renderCalculationExpansion(leftMat, rightMat, resultMat) {
    const { r, c } = state.selectedCell;
    const power = state.currentPower;
    const titleEl = document.getElementById('calc-expansion-title');
    const rowVecEl = document.getElementById('expr-row-vector');
    const colVecEl = document.getElementById('expr-col-vector');
    const formulaDisplay = document.getElementById('detailed-formula-display');
    const breakdownContainer = document.getElementById('intermediate-breakdown');

    const startV = VERTICES[r];
    const destV = VERTICES[c];
    const powerSup = power === 1 ? '' : `^${power}`;

    titleEl.textContent = `(A${powerSup})의 ${r + 1}행 ${c + 1}열 성분 계산 과정 [${startV.id}번 ${startV.key}(${startV.name}) → ${destV.id}번 ${destV.key}(${destV.name})]`;

    const rowValues = [];
    const colValues = [];
    for (let k = 0; k < 6; k++) {
      rowValues.push(leftMat[r][k]);
      colValues.push(rightMat[k][c]);
    }

    rowVecEl.textContent = `[${rowValues.join(', ')}]`;
    colVecEl.textContent = `[${colValues.join(', ')}]ᵀ`;

    if (power === 1) {
      formulaDisplay.innerHTML = `
        <div class="formula-step">
          <span class="formula-step-label">성분 해석:</span>
          <span>A의 (${r + 1}행, ${destV.id}열) = <strong>${leftMat[r][c]}</strong></span>
        </div>
        <div class="formula-step">
          <span class="formula-step-label">의미:</span>
          <span>${startV.key}(${startV.name})에서 ${destV.key}(${destV.name})로 직접 연결된 통로 수: <strong>${leftMat[r][c]}개</strong></span>
        </div>
      `;
      breakdownContainer.innerHTML = '';
      return;
    }

    // 6개 항 전개
    const termsSymbolic = [];
    const termsNumeric = [];
    const termsProduct = [];
    let totalSum = 0;

    for (let k = 0; k < 6; k++) {
      const vk = rowValues[k];
      const wk = colValues[k];
      const prod = vk * wk;
      totalSum += prod;

      const prevSymbol = power === 2 ? 'a' : `a^{${power - 1}}`;
      termsSymbolic.push(`(${prevSymbol}_{${r + 1},${k + 1}} × a_{${k + 1},${c + 1}})`);
      termsNumeric.push(`(${vk}×${wk})`);
      termsProduct.push(prod);
    }

    formulaDisplay.innerHTML = `
      <div class="formula-step">
        <span class="formula-step-label">① 기호 전개:</span>
        <span>= ${termsSymbolic.join(' + ')}</span>
      </div>
      <div class="formula-step">
        <span class="formula-step-label">② 수치 대입:</span>
        <span>= ${termsNumeric.join(' + ')}</span>
      </div>
      <div class="formula-step">
        <span class="formula-step-label">③ 곱셈 계산:</span>
        <span>= ${termsProduct.join(' + ')}</span>
      </div>
      <div class="formula-step">
        <span class="formula-step-label">④ 최종 합계:</span>
        <span>= <strong>${totalSum}</strong></span>
      </div>
    `;

    // 경유지별(k = 1~6) 경로 기여도 카드
    breakdownContainer.innerHTML = '';
    for (let k = 0; k < 6; k++) {
      const interV = VERTICES[k];
      const vk = rowValues[k];
      const wk = colValues[k];
      const prod = vk * wk;

      const item = document.createElement('div');
      item.className = `breakdown-item ${prod > 0 ? 'has-path' : 'no-path'}`;

      const leftText = document.createElement('span');
      leftText.innerHTML = `<strong>${k + 1}번 ${interV.key}(${interV.name})</strong> 경유:`;

      const rightText = document.createElement('span');
      if (prod > 0) {
        rightText.innerHTML = `${vk} × ${wk} = <strong>${prod}가지 이동 가능</strong>`;
      } else {
        rightText.innerHTML = `${vk} × ${wk} = 0 (경로 없음)`;
      }

      item.appendChild(leftText);
      item.appendChild(rightText);
      breakdownContainer.appendChild(item);
    }
  }

  /**
   * 행렬 탭 이벤트 리스너 설정
   */
  function initMatrixTabs() {
    const tabButtons = document.querySelectorAll('.matrix-tabs .tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.currentPower = parseInt(btn.getAttribute('data-power'), 10);
        renderMatrixMultiplication();
      });
    });
  }

  /**
   * 초기 상태 복원 버튼 리스너
   */
  function initResetButton() {
    document.getElementById('btn-reset').addEventListener('click', () => {
      // 통로 전체 복원
      state.corridors = INITIAL_CORRIDORS.map(c => ({ ...c, active: true }));
      state.startIndex = 0; // 1번 A
      state.destIndex = 3;  // 4번 D
      state.currentPower = 2; // A²
      state.selectedCell = { r: 0, c: 3 }; // 1행 4열
      state.selectedPathIndex = 0;

      document.getElementById('start-node-select').value = 0;
      document.getElementById('dest-node-select').value = 3;

      document.querySelectorAll('.matrix-tabs .tab-btn').forEach(btn => {
        if (btn.getAttribute('data-power') === '2') btn.classList.add('active');
        else btn.classList.remove('active');
      });

      updateAll();
    });
  }

  /**
   * 전체 시스템 동기화 업데이트 함수
   */
  function updateAll() {
    calculateAllPowers();
    renderCorridorButtons();
    updateCorridorStats();
    updatePathSearchResults();
    updateHandCalculationSection();
    renderMatrixMultiplication();
  }

  // =========================================================================
  // 6. 초기 실행
  // =========================================================================
  function init() {
    initSelectBoxes();
    initMatrixTabs();
    initResetButton();
    updateAll();
  }

  // DOM 로드 완료 후 초기화
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
