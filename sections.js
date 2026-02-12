/* ==========================================
   Section Renderers - SeAH C&M Performance Report
   ========================================== */

const SectionRenderers = {

    /* ------------------------------------------
       0. 종합 대시보드
       ------------------------------------------ */
    dashboard(container) {
        const cost = dataManager.getSectionData('costReduction');
        const tasks = dataManager.getSectionData('keyTasks');
        const meta = dataManager.data.meta;

        container.innerHTML = `
            <div class="summary-row">
                <div class="summary-card positive">
                    <span class="summary-label">원가 절감 누적 (24년 대비)</span>
                    <span class="summary-value">${formatNumber(cost.actual24)}</span>
                    <span class="summary-change">억원 (달성 ${cost.changeRate}%)</span>
                </div>
                <div class="summary-card info">
                    <span class="summary-label">생산량 달성율 (당월)</span>
                    <span class="summary-value">${Math.round(cost.production.actual / cost.production.plan * 100)}%</span>
                    <span class="summary-change">${formatNumber(cost.production.actual)} / ${formatNumber(cost.production.plan)} 톤</span>
                </div>
                <div class="summary-card warning">
                    <span class="summary-label">주요과제 누적 진도율</span>
                    <span class="summary-value">${dataManager.get('keyTasks.teamSummary.생산팀.rate') || 0}%</span>
                    <span class="summary-change">생산팀 기준</span>
                </div>
                <div class="summary-card positive">
                    <span class="summary-label">A급 수율 (종합)</span>
                    <span class="summary-value">${dataManager.get('yield.composite.monthly.11') || '-'}%</span>
                    <span class="summary-change">당월 실적</span>
                </div>
            </div>

            <div class="grid-2">
                <div class="card">
                    <div class="card-header"><h3>원가 절감 실적 추이 (억원)</h3></div>
                    <div class="card-body">
                        <div class="chart-container" style="height:320px">
                            <canvas id="chart-dash-cost"></canvas>
                        </div>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header"><h3>주요 라인별 수율/가동률 현황</h3></div>
                    <div class="card-body">
                        <div class="data-table-wrapper">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>라인</th>
                                        <th>A급 수율 (%)</th>
                                        <th>실가동률 (%)</th>
                                        <th>LNG 원단위</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${['CGL', '1CCL', '2CCL', '3CCL'].map(l => `
                                        <tr>
                                            <td><strong>${l}</strong></td>
                                            <td>${dataManager.get(`yield.${l}.monthly.11`) || '-'}</td>
                                            <td>${dataManager.get(`operationRate.${l}.monthly.11`) || '-'}</td>
                                            <td>${dataManager.get(`lng.${l}.monthly.11`) || '-'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;

        setTimeout(() => {
            const costData = cost.lineData?.improvement;
            const labels = ['5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
            const datasets = [
                {
                    label: '전체 개선금액',
                    data: labels.map((_, i) => LINES.reduce((s, l) => s + (cost.lineData.improvement[l][`m${i + 5}`] || 0), 0)),
                    backgroundColor: '#E31937',
                    borderRadius: 4
                }
            ];

            new Chart(document.getElementById('chart-dash-cost'), {
                type: 'bar',
                data: { labels, datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: {
                            grid: { color: 'rgba(0,0,0,0.05)' },
                            ticks: { callback: (v) => v + '억' }
                        },
                        x: { grid: { display: false } }
                    }
                }
            });
        }, 100);
    },
    costReduction(container) {
        const d = dataManager.getSectionData('costReduction');
        const meta = dataManager.data.meta;

        container.innerHTML = `
            <!-- 요약 카드 -->
            <div class="summary-row">
                <div class="summary-card ${d.changeRate >= 0 ? 'positive' : 'negative'}">
                    <span class="summary-label">원가 절감 실적 (24년 대비)</span>
                    <span class="summary-value">${formatNumber(d.actual24)}</span>
                    <span class="summary-change ${d.changeRate >= 0 ? 'up' : 'down'}">${d.changeRate}%</span>
                </div>
                <div class="summary-card info">
                    <span class="summary-label">목표</span>
                    <span class="summary-value">${formatNumber(d.target)}</span>
                    <span class="summary-change">억원</span>
                </div>
                <div class="summary-card ${d.q4Compare >= 0 ? 'positive' : 'negative'}">
                    <span class="summary-label">4분기 대비</span>
                    <span class="summary-value">${formatNumber(d.q4Compare)}</span>
                    <span class="summary-change ${d.q4Compare >= 0 ? 'up' : 'down'}">억원</span>
                </div>
                <div class="summary-card info">
                    <span class="summary-label">생산량 달성율</span>
                    <span class="summary-value">${d.production.actual ? Math.round(d.production.actual / d.production.plan * 100) : '-'}%</span>
                    <span class="summary-change">${formatNumber(d.production.actual)} / ${formatNumber(d.production.plan)}</span>
                </div>
            </div>

            <!-- 차트 영역 -->
            <div class="grid-2">
                <div class="card">
                    <div class="card-header">
                        <h3>원가 절감 실적</h3>
                        <div class="card-actions">
                            <button class="btn-edit" onclick="openEditModal('costReduction', 'summary')">
                                <i class="fas fa-edit"></i> 데이터 수정
                            </button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="chart-container" style="height:280px">
                            <canvas id="chart-cost-summary"></canvas>
                        </div>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header">
                        <h3>생산량</h3>
                        <div class="card-actions">
                            <button class="btn-edit" onclick="openEditModal('costReduction', 'production')">
                                <i class="fas fa-edit"></i> 데이터 수정
                            </button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="chart-container" style="height:280px">
                            <canvas id="chart-production-summary"></canvas>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 실적 분석 -->
            <div class="card">
                <div class="card-header">
                    <h3>실적 분석 <span class="badge">${d.analysis?.comment || ''}</span></h3>
                    <div class="card-actions">
                        <button class="btn-edit" onclick="openEditModal('costReduction', 'analysis')">
                            <i class="fas fa-edit"></i> 수정
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="data-table-wrapper">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>구분</th>
                                    <th>감소</th>
                                    <th>증가</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${LINES.map(line => `
                                    <tr>
                                        <td><strong>${line}</strong></td>
                                        <td style="text-align:left;color:var(--positive)">${d.analysis?.lines?.[line]?.decrease || '-'}</td>
                                        <td style="text-align:left;color:var(--negative)">${d.analysis?.lines?.[line]?.increase || '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- 라인별 제조원가 절감 현황 테이블 -->
            <div class="card">
                <div class="card-header">
                    <h3>라인별 제조원가 절감 현황</h3>
                    <div class="card-actions">
                        <button class="btn-edit" onclick="openEditModal('costReduction', 'lineData')">
                            <i class="fas fa-edit"></i> 데이터 수정
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="data-table-wrapper">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th rowspan="2">구분</th>
                                    <th colspan="8">원단위 (단위: 원/톤)</th>
                                    <th colspan="9">개선 금액 실적 (단위: 억원)</th>
                                </tr>
                                <tr>
                                    <th>24'4</th><th>24년</th><th>7월</th><th>8월</th><th>9월</th><th>10월</th><th>11월</th><th>12월</th>
                                    <th>5월</th><th>6월</th><th>7월</th><th>8월</th><th>9월</th><th>10월</th><th>11월</th><th>12월</th><th>합계</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${LINES.map(line => {
            const uc = d.lineData?.unitCost?.[line] || {};
            const imp = d.lineData?.improvement?.[line] || {};
            const total = Object.values(imp).reduce((s, v) => s + (v || 0), 0);
            return `<tr>
                                        <td><strong>${line}</strong></td>
                                        <td>${formatNumber(uc.y24_4)}</td><td>${formatNumber(uc.y24)}</td>
                                        <td>${formatNumber(uc.m7)}</td><td>${formatNumber(uc.m8)}</td>
                                        <td>${formatNumber(uc.m9)}</td><td>${formatNumber(uc.m10)}</td>
                                        <td>${formatNumber(uc.m11)}</td><td>${formatNumber(uc.m12)}</td>
                                        <td class="${getValueClass(imp.m5)}">${formatNumber(imp.m5)}</td>
                                        <td class="${getValueClass(imp.m6)}">${formatNumber(imp.m6)}</td>
                                        <td class="${getValueClass(imp.m7)}">${formatNumber(imp.m7)}</td>
                                        <td class="${getValueClass(imp.m8)}">${formatNumber(imp.m8)}</td>
                                        <td class="${getValueClass(imp.m9)}">${formatNumber(imp.m9)}</td>
                                        <td class="${getValueClass(imp.m10)}">${formatNumber(imp.m10)}</td>
                                        <td class="${getValueClass(imp.m11)}">${formatNumber(imp.m11)}</td>
                                        <td class="${getValueClass(imp.m12)}">${formatNumber(imp.m12)}</td>
                                        <td class="${getValueClass(total)}"><strong>${total.toFixed(2)}</strong></td>
                                    </tr>`;
        }).join('')}
                                <tr class="total-row">
                                    <td><strong>합계</strong></td>
                                    <td colspan="8"></td>
                                    ${['m5', 'm6', 'm7', 'm8', 'm9', 'm10', 'm11', 'm12'].map(m => {
            const sum = LINES.reduce((s, l) => s + (d.lineData?.improvement?.[l]?.[m] || 0), 0);
            return `<td class="${getValueClass(sum)}"><strong>${sum.toFixed(2)}</strong></td>`;
        }).join('')}
                                    <td><strong>${LINES.reduce((s, l) => s + Object.values(d.lineData?.improvement?.[l] || {}).reduce((a, v) => a + (v || 0), 0), 0).toFixed(2)}</strong></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        // 차트 렌더링
        setTimeout(() => {
            createSimpleBarChart('chart-cost-summary', {
                labels: ['목표', '실적(24년대비)', '4분기 대비'],
                values: [d.target, d.actual24, d.q4Compare],
                colors: ['#3b82f6', d.actual24 >= 0 ? '#10b981' : '#ef4444', d.q4Compare >= 0 ? '#6d9b3a' : '#f59e0b'],
                title: '원가 절감 실적',
                unit: '억원'
            });
            createSimpleBarChart('chart-production-summary', {
                labels: ['24년 평균', '계획', '실적'],
                values: [d.production.avg24, d.production.plan, d.production.actual],
                colors: ['#3b82f6', '#6d9b3a', '#f59e0b'],
                title: '생산량',
                showPercent: true
            });
        }, 100);
    },

    /* ------------------------------------------
       3. 라인별 실적
       ------------------------------------------ */
    linePerformance(container) {
        const d = dataManager.getSectionData('linePerformance');
        const meta = dataManager.data.meta;

        container.innerHTML = `
            <div class="grid-2">
                <div class="card">
                    <div class="card-header">
                        <h3>${meta.year}년 ${meta.month}월 제조원가 절감 현황</h3>
                        <div class="card-actions">
                            <button class="btn-edit" onclick="openEditModal('linePerformance', 'costReduction')">
                                <i class="fas fa-edit"></i> 데이터 수정
                            </button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="chart-container" style="height:350px">
                            <canvas id="chart-line-cost"></canvas>
                        </div>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header">
                        <h3>${meta.year}년 ${meta.month}월 생산 현황</h3>
                        <div class="card-actions">
                            <button class="btn-edit" onclick="openEditModal('linePerformance', 'production')">
                                <i class="fas fa-edit"></i> 데이터 수정
                            </button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="chart-container" style="height:350px">
                            <canvas id="chart-line-prod"></canvas>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 상세 데이터 테이블 -->
            <div class="grid-2">
                <div class="card">
                    <div class="card-header"><h3>제조원가 절감 상세</h3></div>
                    <div class="card-body">
                        <table class="data-table">
                            <thead><tr><th>라인</th><th>목표</th><th>24년 대비</th><th>4분기 대비</th></tr></thead>
                            <tbody>
                                ${LINES.map(l => {
            const v = d.costReduction?.[l] || {};
            return `<tr><td><strong>${l}</strong></td>
                                        <td>${formatNumber(v.target)}</td>
                                        <td class="${getValueClass(v.y24)}">${formatNumber(v.y24)}</td>
                                        <td class="${getValueClass(v.q4)}">${formatNumber(v.q4)}</td></tr>`;
        }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header"><h3>생산 현황 상세</h3></div>
                    <div class="card-body">
                        <table class="data-table">
                            <thead><tr><th>라인</th><th>24월평균</th><th>계획량</th><th>생산량</th><th>달성율</th></tr></thead>
                            <tbody>
                                ${LINES.map(l => {
            const v = d.production?.[l] || {};
            const rate = v.plan ? Math.round(v.actual / v.plan * 100) : '-';
            return `<tr><td><strong>${l}</strong></td>
                                        <td>${formatNumber(v.avg24)}</td>
                                        <td>${formatNumber(v.plan)}</td>
                                        <td>${formatNumber(v.actual)}</td>
                                        <td class="${rate >= 100 ? 'positive-val' : rate < 90 ? 'negative-val' : ''}">${rate}%</td></tr>`;
        }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        setTimeout(() => {
            createGroupedBarChart('chart-line-cost', {
                labels: LINES,
                datasets: [
                    { label: '목표', data: LINES.map(l => d.costReduction?.[l]?.target || 0) },
                    { label: '24년 대비', data: LINES.map(l => d.costReduction?.[l]?.y24 || 0) },
                    { label: '4분기 대비', data: LINES.map(l => d.costReduction?.[l]?.q4 || 0) }
                ],
                title: '제조원가 절감 현황'
            });
            createGroupedBarChart('chart-line-prod', {
                labels: LINES,
                datasets: [
                    { label: '24월평균', data: LINES.map(l => d.production?.[l]?.avg24 || 0) },
                    { label: '계획량', data: LINES.map(l => d.production?.[l]?.plan || 0) },
                    { label: '생산량', data: LINES.map(l => d.production?.[l]?.actual || 0) }
                ],
                title: '생산 현황'
            });
        }, 100);
    },

    /* ------------------------------------------
       4. 주요과제 진행사항
       ------------------------------------------ */
    keyTasks(container) {
        const d = dataManager.getSectionData('keyTasks');
        const scheduleColors = ['gantt-none', 'gantt-plan', 'gantt-progress', 'gantt-delayed'];
        const scheduleLabels = ['', '계획', '진행', '미진행'];

        // --- [자동 업데이트 로직 추가] ---
        // 상세 과제 데이터를 기반으로 팀별 요약(teamSummary) 자동 업데이트
        TEAMS.forEach(team => {
            const teamTasks = d.tasks?.[team] || [];
            if (teamTasks.length > 0) {
                const target = teamTasks.reduce((s, t) => s + (t.target || 0), 0);
                const monthly = teamTasks.reduce((s, t) => s + (t.monthly || 0), 0);
                const cumulative = teamTasks.reduce((s, t) => s + (t.cumulative || 0), 0);
                const rate = target ? Math.round((cumulative / target) * 100) : 0;

                d.teamSummary[team] = {
                    target: parseFloat(target.toFixed(2)),
                    monthly: parseFloat(monthly.toFixed(2)),
                    cumulative: parseFloat(cumulative.toFixed(2)),
                    rate: rate
                };
            }
        });
        // ------------------------------

        let selectedTeam = container.dataset.selectedTeam || TEAMS[0];

        // 팀별 합계 계산 (데이터가 업데이트된 d.teamSummary 사용)
        const totalTarget = Object.values(d.teamSummary || {}).reduce((s, v) => s + (v?.target || 0), 0);
        const totalMonthly = Object.values(d.teamSummary || {}).reduce((s, v) => s + (v?.monthly || 0), 0);
        const totalCum = Object.values(d.teamSummary || {}).reduce((s, v) => s + (v?.cumulative || 0), 0);
        const totalRate = totalTarget ? Math.round(totalCum / totalTarget * 100) : 0;

        const renderContent = () => {
            const teamTasks = d.tasks?.[selectedTeam] || [];
            const teamSummary = d.teamSummary?.[selectedTeam] || {};

            container.innerHTML = `
                <!-- 요약 -->
                <div class="summary-row">
                    <div class="summary-card info">
                        <span class="summary-label">목표 합계</span>
                        <span class="summary-value">${totalTarget.toFixed(2)}</span>
                        <span class="summary-change">억원</span>
                    </div>
                    <div class="summary-card warning">
                        <span class="summary-label">당월 실적</span>
                        <span class="summary-value">${totalMonthly.toFixed(2)}</span>
                        <span class="summary-change">억원</span>
                    </div>
                    <div class="summary-card positive">
                        <span class="summary-label">누적 실적</span>
                        <span class="summary-value">${totalCum.toFixed(2)}</span>
                        <span class="summary-change">억원</span>
                    </div>
                    <div class="summary-card ${totalRate >= 100 ? 'positive' : 'warning'}">
                        <span class="summary-label">종합 진도율</span>
                        <span class="summary-value">${totalRate}%</span>
                        <div class="progress-bar-container" style="margin-top:8px">
                            <div class="progress-bar ${getProgressClass(totalRate)}" style="width:${Math.min(totalRate, 100)}%"></div>
                        </div>
                    </div>
                </div>

                <!-- 팀별 과제 실적 요약 테이블 -->
                <div class="card">
                    <div class="card-header">
                        <h3>주요 과제 실적 현황</h3>
                        <div class="card-actions">
                            <button class="btn-edit" onclick="openEditModal('keyTasks', 'teamSummary')">
                                <i class="fas fa-edit"></i> 요약 데이터 수정
                            </button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="data-table-wrapper">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th class="yellow-header">구분</th>
                                        <th class="yellow-header">목표</th>
                                        <th class="yellow-header">당월</th>
                                        <th class="yellow-header">누적</th>
                                        <th class="yellow-header">진도율</th>
                                        <th class="yellow-header">진행바</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${TEAMS.map(team => {
                const v = d.teamSummary?.[team] || {};
                return `<tr>
                                            <td><strong>${team}</strong></td>
                                            <td>${v.target !== null ? formatNumber(v.target) : '-'}</td>
                                            <td>${v.monthly !== null ? formatNumber(v.monthly) : '-'}</td>
                                            <td>${v.cumulative !== null ? formatNumber(v.cumulative) : '-'}</td>
                                            <td class="${v.rate >= 100 ? 'positive-val' : v.rate < 50 ? 'negative-val' : ''}">${v.rate !== null ? v.rate + '%' : '-'}</td>
                                            <td style="min-width:100px">
                                                ${v.rate !== null ? `<div class="progress-bar-container"><div class="progress-bar ${getProgressClass(v.rate)}" style="width:${Math.min(v.rate, 100)}%"></div></div>` : '-'}
                                            </td>
                                        </tr>`;
            }).join('')}
                                    <tr class="total-row">
                                        <td><strong>합계</strong></td>
                                        <td><strong>${totalTarget.toFixed(2)}</strong></td>
                                        <td><strong>${totalMonthly.toFixed(2)}</strong></td>
                                        <td><strong>${totalCum.toFixed(2)}</strong></td>
                                        <td><strong>${totalRate}%</strong></td>
                                        <td></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- 팀별 상세 필터 탭 -->
                <div class="team-filter-tabs">
                    ${TEAMS.map(team => `
                        <button class="team-tab ${selectedTeam === team ? 'active' : ''}" data-team="${team}">
                            ${team}
                        </button>
                    `).join('')}
                </div>

                <!-- 과제 상세 -->
                <div class="card">
                    <div class="card-header">
                        <h3>주요 과제 상세 실적 (${selectedTeam})</h3>
                        <div class="card-actions" style="display:flex; align-items:center;">
                            <div class="gantt-legend" style="display:flex; align-items:center; margin-right:15px;">
                                <span class="gantt-cell gantt-plan" style="width:12px;height:12px;cursor:default"></span> <span style="font-size:11px;margin:0 8px 0 4px">계획</span>
                                <span class="gantt-cell gantt-progress" style="width:12px;height:12px;cursor:default"></span> <span style="font-size:11px;margin:0 8px 0 4px">진행</span>
                                <span class="gantt-cell gantt-delayed" style="width:12px;height:12px;cursor:default"></span> <span style="font-size:11px;margin:0 8px 0 4px">미진행</span>
                            </div>
                            <button class="btn-edit" onclick="openKeyTaskEditModal('${selectedTeam}')">
                                <i class="fas fa-edit"></i> 과제 추가/수정
                            </button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="data-table-wrapper">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>NO</th><th>라인</th><th style="min-width:200px">과제명</th>
                                        <th>목표</th><th>당월</th><th>누적</th><th>진도</th><th>담당</th>
                                        ${MONTHS.map(m => `<th style="padding:4px">${m.replace('월', '')}</th>`).join('')}
                                    </tr>
                                </thead>
                                <tbody>
                                    ${teamTasks.length > 0 ? teamTasks.map((task, taskIdx) => `
                                        <tr>
                                            <td>${task.no || taskIdx + 1}</td>
                                            <td>${task.line || '-'}</td>
                                            <td style="text-align:left;font-size:12px">${task.name}</td>
                                            <td>${formatNumber(task.target)}</td>
                                            <td>${formatNumber(task.monthly)}</td>
                                            <td>${formatNumber(task.cumulative)}</td>
                                            <td class="${task.rate >= 100 ? 'positive-val' : task.rate < 0 ? 'negative-val' : ''}">${task.rate}%</td>
                                            <td>${task.person}</td>
                                            ${MONTHS.map((_, mIdx) => {
                const s = task.schedule?.[mIdx] || 0;
                return `<td style="padding:2px">
                                                    <span class="gantt-cell ${scheduleColors[s]}" 
                                                          onclick="toggleGanttCell('${selectedTeam}', ${taskIdx}, ${mIdx})"
                                                          title="클릭하여 상태 변경"></span>
                                                </td>`;
            }).join('')}
                                        </tr>
                                    `).join('') : `<tr><td colspan="${8 + MONTHS.length}" style="padding:40px; color:var(--text-secondary)">등록된 과제가 없습니다.</td></tr>`}
                                    
                                    ${teamTasks.length > 0 ? `
                                        <tr class="total-row">
                                            <td colspan="3"><strong>${selectedTeam} 합계</strong></td>
                                            <td><strong>${teamTasks.reduce((s, t) => s + (t.target || 0), 0).toFixed(1)}</strong></td>
                                            <td><strong>${teamTasks.reduce((s, t) => s + (t.monthly || 0), 0).toFixed(1)}</strong></td>
                                            <td><strong>${teamTasks.reduce((s, t) => s + (t.cumulative || 0), 0).toFixed(1)}</strong></td>
                                            <td><strong>${teamSummary.rate || 0}%</strong></td>
                                            <td colspan="13"></td>
                                        </tr>
                                    ` : ''}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;

            // 이벤트 리스너 추가
            container.querySelectorAll('.team-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    selectedTeam = tab.dataset.team;
                    container.dataset.selectedTeam = selectedTeam;
                    renderContent();
                });
            });
        };

        // 전역 함수로 노출 (간트 셀 클릭 핸들링)
        window.toggleGanttCell = (team, taskIdx, monthIdx) => {
            const currentData = dataManager.getSectionData('keyTasks');
            if (currentData.tasks && currentData.tasks[team] && currentData.tasks[team][taskIdx]) {
                const task = currentData.tasks[team][taskIdx];
                if (!task.schedule) task.schedule = new Array(12).fill(0);
                task.schedule[monthIdx] = (task.schedule[monthIdx] + 1) % 4;
                dataManager.updateSectionData('keyTasks', currentData);
                SectionRenderers.keyTasks(container);
            }
        };

        // 초기 렌더링
        renderContent();
    },

    /* ------------------------------------------
       주요지표 - 공통 렌더러 (연도별+월별 차트 6개)
       ------------------------------------------ */
    _renderMultiLineCharts(container, sectionId, title, lineKeys, unit, options = {}) {
        const d = dataManager.getSectionData(sectionId);

        const chartCards = lineKeys.map((key, i) => {
            const lineData = d[key] || {};
            const chartId = `chart-${sectionId}-${key}`.replace(/[^a-zA-Z0-9]/g, '_');
            const displayName = key === 'composite' ? '종합' : key;

            return `
                <div class="card">
                    <div class="card-header">
                        <h3>${displayName} ${options.subtitle || ''}</h3>
                        <div class="card-actions">
                            <span class="target-info">목표: ${lineData.target || '-'}${unit}</span>
                            <button class="btn-edit" onclick="openEditModal('${sectionId}', '${key}')">
                                <i class="fas fa-edit"></i> 수정
                            </button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="chart-container chart-container-sm">
                            <canvas id="${chartId}"></canvas>
                        </div>
                        ${lineData.analysis ? `<div class="comment-box"><p style="font-size:13px">${lineData.analysis}</p></div>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="card" style="margin-bottom:20px">
                <div class="card-header">
                    <h3>${title}</h3>
                    <div class="card-actions">
                        <button class="btn-edit" onclick="openBulkEditModal('${sectionId}')">
                            <i class="fas fa-edit"></i> 전체 데이터 수정
                        </button>
                    </div>
                </div>
            </div>
            <div class="grid-2">${chartCards}</div>
        `;

        setTimeout(() => {
            lineKeys.forEach(key => {
                const lineData = d[key] || {};
                const chartId = `chart-${sectionId}-${key}`.replace(/[^a-zA-Z0-9]/g, '_');
                createYearlyMonthlyBarChart(chartId, {
                    yearly: lineData.yearly || [],
                    monthly: lineData.monthly || [],
                    target: lineData.target,
                    unit: unit,
                    higherIsBad: options.higherIsBad || false,
                    beginAtZero: options.beginAtZero === true
                });
            });
        }, 100);
    },

    /* ------------------------------------------
       5. 설비종합효율
       ------------------------------------------ */
    equipEfficiency(container) {
        const d = dataManager.getSectionData('equipEfficiency');
        const lines = ['CGL', '1CCL', '3CCL'];

        const chartCards = lines.map(line => {
            const lineData = d[line] || {};
            const chartId = `chart-equip-${line}`.replace(/[^a-zA-Z0-9]/g, '_');
            return `
                <div class="card">
                    <div class="card-header">
                        <h3>${line} 설비종합효율</h3>
                        <div class="card-actions">
                            <span class="target-info">목표: ${lineData.target || '-'}%</span>
                            <button class="btn-edit" onclick="openEditModal('equipEfficiency', '${line}')"><i class="fas fa-edit"></i> 수정</button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="chart-container chart-container-sm"><canvas id="${chartId}"></canvas></div>
                        ${lineData.analysis ? `<div class="comment-box"><p style="font-size:13px">• ${lineData.analysis}</p></div>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `<div class="grid-3">${chartCards}</div>`;

        setTimeout(() => {
            lines.forEach(line => {
                const lineData = d[line] || {};
                createYearlyMonthlyBarChart(`chart-equip-${line}`.replace(/[^a-zA-Z0-9]/g, '_'), {
                    yearly: lineData.yearly || [],
                    monthly: lineData.monthly || [],
                    target: lineData.target,
                    unit: '%',
                    beginAtZero: false
                });
            });
        }, 100);
    },

    /* ------------------------------------------
       6. 스크랩 현황
       ------------------------------------------ */
    scrap(container) {
        const d = dataManager.getSectionData('scrap');

        container.innerHTML = `
            <div class="grid-2">
                ${['steel', 'al'].map(type => {
            const sd = d[type] || {};
            const label = type === 'steel' ? 'Steel 스크랩 원단위' : 'AL 스크랩 원단위';
            const chartId = `chart-scrap-${type}`;
            return `
                        <div class="card">
                            <div class="card-header">
                                <h3>${label}</h3>
                                <div class="card-actions">
                                    <span class="target-info">준 목표: ${sd.target}kg</span>
                                    <button class="btn-edit" onclick="openEditModal('scrap', '${type}')"><i class="fas fa-edit"></i> 수정</button>
                                </div>
                            </div>
                            <div class="card-body">
                                <div class="chart-container" style="height:300px"><canvas id="${chartId}"></canvas></div>
                                <div class="comment-box" style="margin-top:12px">
                                    <p style="font-size:13px">• 투입량: ${formatNumber(sd.input)}톤 &nbsp; 스크랩 매출: ${formatNumber(sd.scrapSales)}톤</p>
                                    <p style="font-size:13px">• ${sd.analysis || ''}</p>
                                </div>
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;

        setTimeout(() => {
            ['steel', 'al'].forEach(type => {
                const sd = d[type] || {};
                createYearlyMonthlyBarChart(`chart-scrap-${type}`, {
                    yearly: sd.yearly || [],
                    monthly: sd.monthly || [],
                    target: sd.target,
                    unit: 'kg',
                    higherIsBad: true
                });
            });
        }, 100);
    },

    /* ------------------------------------------
       7. A급 수율
       ------------------------------------------ */
    yield(container) {
        this._renderMultiLineCharts(container, 'yield', '주요지표 - A급 수율',
            ['composite', 'CPL', 'CGL', '1CCL', '2CCL', '3CCL'], '%', { subtitle: '수율' });
    },

    /* ------------------------------------------
       8. 톤파워
       ------------------------------------------ */
    tonPower(container) {
        const d = dataManager.getSectionData('tonPower');
        const lines = ['CGL', '1CCL'];

        const chartCards = lines.map(line => {
            const ld = d[line] || {};
            const chartId = `chart-tonpower-${line}`.replace(/[^a-zA-Z0-9]/g, '_');
            return `
                <div class="card">
                    <div class="card-header">
                        <h3>${line} 톤파워 (톤/hr)</h3>
                        <div class="card-actions">
                            <span class="target-info">목표: ${ld.target}</span>
                            <button class="btn-edit" onclick="openEditModal('tonPower', '${line}')"><i class="fas fa-edit"></i> 수정</button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="chart-container" style="height:320px"><canvas id="${chartId}"></canvas></div>
                        <div class="comment-box"><p style="font-size:13px">• ${ld.analysis || ''}</p></div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `<div class="grid-2">${chartCards}</div>`;

        setTimeout(() => {
            lines.forEach(line => {
                const ld = d[line] || {};
                const barData = [...(ld.yearly || []), ...(ld.monthly || [])];
                const lineData = ld.index || [];
                createComboChart(`chart-tonpower-${line}`.replace(/[^a-zA-Z0-9]/g, '_'), {
                    labels: YEAR_MONTH_LABELS,
                    barData: barData,
                    lineData: lineData.length > 0 ? lineData : null,
                    barLabel: '톤파워',
                    lineLabel: '비교지수',
                    target: ld.target,
                    unit: ''
                });
            });
        }, 100);
    },

    /* ------------------------------------------
       9. 실가동률
       ------------------------------------------ */
    operationRate(container) {
        this._renderMultiLineCharts(container, 'operationRate', '주요지표 - 실가동률',
            ['composite', 'CRM', 'CGL', '1CCL', '2CCL', '3CCL'], '%', { subtitle: '' });
    },

    /* ------------------------------------------
       11. LNG원단위
       ------------------------------------------ */
    lng(container) {
        this._renderMultiLineCharts(container, 'lng', '주요지표 - LNG원단위',
            ['composite', 'CPL', 'CGL', '1CCL', '2CCL', '3CCL'], '', { subtitle: '', higherIsBad: true });
    },

    /* ------------------------------------------
       12. 전력원단위
       ------------------------------------------ */
    power(container) {
        this._renderMultiLineCharts(container, 'power', '주요지표 - 전력원단위',
            ['composite', 'CRM', 'CGL', '1CCL', '2CCL', '3CCL'], 'kW/톤', { subtitle: '', higherIsBad: true });
    },

    /* ------------------------------------------
       13. 스팀
       ------------------------------------------ */
    steam(container) {
        const d = dataManager.getSectionData('steam');

        container.innerHTML = `
            <div class="grid-2">
                <div class="card">
                    <div class="card-header">
                        <h3>스팀구매량 대상 (톤)</h3>
                        <div class="card-actions">
                            <span class="target-info">기준선: ${d.purchase?.baseline || 1600}</span>
                            <button class="btn-edit" onclick="openEditModal('steam', 'purchase')"><i class="fas fa-edit"></i> 수정</button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="chart-container" style="height:300px"><canvas id="chart-steam-purchase"></canvas></div>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header">
                        <h3>스팀 사용량 원단위 (원/톤)</h3>
                        <div class="card-actions">
                            <span class="target-info">기준선: ${d.usageUnit?.baseline || 1492}원/톤</span>
                            <button class="btn-edit" onclick="openEditModal('steam', 'usageUnit')"><i class="fas fa-edit"></i> 수정</button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="chart-container" style="height:300px"><canvas id="chart-steam-usage"></canvas></div>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header">
                        <h3>자가생산량 2CCL</h3>
                        <div class="card-actions">
                            <span class="target-info">기준선: ${d.selfProd2CCL?.baseline || 420}</span>
                            <button class="btn-edit" onclick="openEditModal('steam', 'selfProd2CCL')"><i class="fas fa-edit"></i> 수정</button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="chart-container" style="height:300px"><canvas id="chart-steam-2ccl"></canvas></div>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header">
                        <h3>자가생산량 3CCL</h3>
                        <div class="card-actions">
                            <span class="target-info">기준선: ${d.selfProd3CCL?.baseline || 1025}</span>
                            <button class="btn-edit" onclick="openEditModal('steam', 'selfProd3CCL')"><i class="fas fa-edit"></i> 수정</button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="chart-container" style="height:300px"><canvas id="chart-steam-3ccl"></canvas></div>
                    </div>
                </div>
            </div>
        `;

        setTimeout(() => {
            const items = [
                { id: 'chart-steam-purchase', key: 'purchase' },
                { id: 'chart-steam-2ccl', key: 'selfProd2CCL' },
                { id: 'chart-steam-3ccl', key: 'selfProd3CCL' }
            ];
            items.forEach(({ id, key }) => {
                const sd = d[key] || {};
                createYearlyMonthlyBarChart(id, {
                    yearly: sd.yearly || [],
                    monthly: sd.monthly || [],
                    target: sd.baseline,
                    higherIsBad: key === 'purchase'
                });
            });

            // 사용량 원단위 (월별만)
            const usage = d.usageUnit || {};
            createYearlyMonthlyBarChart('chart-steam-usage', {
                yearly: [],
                monthly: usage.monthly || [],
                target: usage.baseline,
                higherIsBad: true
            });
        }, 100);
    },

    /* ------------------------------------------
       14-15. 소모품 원단위
       ------------------------------------------ */
    consumables(container) {
        const d = dataManager.getSectionData('consumables');

        container.innerHTML = `
            <div class="card" style="margin-bottom:20px">
                <div class="card-header">
                    <h3>주요지표 – 소모품 원단위 <span class="badge">환산목표 = 실적기준 원단위 달성 비용</span></h3>
                </div>
            </div>
            <div class="sub-tabs" id="consumableTabs">
                ${LINES.map((l, i) => `<button class="sub-tab ${i === 0 ? 'active' : ''}" data-line="${l}">${l}</button>`).join('')}
            </div>
            ${LINES.map((l, i) => `
                <div class="sub-content ${i === 0 ? 'active' : ''}" id="consumable-${l}">
                    <div class="grid-2">
                        <div class="card">
                            <div class="card-header">
                                <h3>비용 계 ${l} (만원)</h3>
                                <div class="card-actions">
                                    <span class="target-info">환산목표: ${formatNumber(d[l]?.costTarget)}만원</span>
                                    <button class="btn-edit" onclick="openEditModal('consumables', '${l}')"><i class="fas fa-edit"></i></button>
                                </div>
                            </div>
                            <div class="card-body">
                                <div class="chart-container" style="height:300px"><canvas id="chart-cons-cost-${l.replace('#', '')}"></canvas></div>
                            </div>
                        </div>
                        <div class="card">
                            <div class="card-header">
                                <h3>원단위 ${l} (원)</h3>
                                <div class="card-actions">
                                    <span class="target-info">목표: ${formatNumber(d[l]?.unitTarget)}원</span>
                                </div>
                            </div>
                            <div class="card-body">
                                <div class="chart-container" style="height:300px"><canvas id="chart-cons-unit-${l.replace('#', '')}"></canvas></div>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('')}
        `;

        // 탭 전환
        container.querySelectorAll('.sub-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                container.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
                container.querySelectorAll('.sub-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                const line = tab.dataset.line;
                document.getElementById(`consumable-${line}`).classList.add('active');
                renderConsumableCharts(line);
            });
        });

        function renderConsumableCharts(line) {
            const ld = d[line] || {};
            setTimeout(() => {
                createYearlyMonthlyBarChart(`chart-cons-cost-${line.replace('#', '')}`, {
                    yearly: ld.costYearly || [],
                    monthly: ld.costMonthly || [],
                    target: ld.costTarget,
                    higherIsBad: true
                });
                createYearlyMonthlyBarChart(`chart-cons-unit-${line.replace('#', '')}`, {
                    yearly: ld.unitYearly || [],
                    monthly: ld.unitMonthly || [],
                    target: ld.unitTarget,
                    higherIsBad: true
                });
            }, 50);
        }
        renderConsumableCharts(LINES[0]);
    },

    /* ------------------------------------------
       16. 공장KPI (폐기/재고)
       ------------------------------------------ */
    factoryKPI(container) {
        const d = dataManager.getSectionData('factoryKPI');

        container.innerHTML = `
            <div class="grid-2">
                <div class="card">
                    <div class="card-header"><h3>월평균 재고 및 폐기량</h3>
                        <div class="card-actions"><button class="btn-edit" onclick="openEditModal('factoryKPI', 'disposal')"><i class="fas fa-edit"></i> 수정</button></div>
                    </div>
                    <div class="card-body">
                        <div class="chart-container" style="height:300px"><canvas id="chart-kpi-disposal"></canvas></div>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header"><h3>월 폐기비용 및 원단위</h3></div>
                    <div class="card-body">
                        <div class="chart-container" style="height:300px"><canvas id="chart-kpi-cost"></canvas></div>
                    </div>
                </div>
            </div>

            <!-- 폐기 상세 -->
            <div class="grid-3">
                <div class="card"><div class="card-body" style="text-align:center">
                    <span class="summary-label">폐기량 (kg)</span>
                    <span class="summary-value" style="display:block;margin-top:8px">${formatNumber(d.disposal?.amount)}</span>
                </div></div>
                <div class="card"><div class="card-body" style="text-align:center">
                    <span class="summary-label">색상 개수</span>
                    <span class="summary-value" style="display:block;margin-top:8px">${formatNumber(d.disposal?.colors)}</span>
                </div></div>
                <div class="card"><div class="card-body" style="text-align:center">
                    <span class="summary-label">원단위 (원/kg)</span>
                    <span class="summary-value" style="display:block;margin-top:8px">${formatNumber(d.disposal?.unitCost)}</span>
                </div></div>
            </div>

            <!-- 도료 유형별 -->
            <div class="card">
                <div class="card-header"><h3>도료 유형별 폐기량</h3></div>
                <div class="card-body">
                    <table class="data-table">
                        <thead><tr>${Object.keys(d.disposal?.byType || {}).map(k => `<th>${k}</th>`).join('')}</tr></thead>
                        <tbody><tr>${Object.values(d.disposal?.byType || {}).map(v => `<td>${formatNumber(v)}</td>`).join('')}</tr></tbody>
                    </table>
                </div>
            </div>

            <!-- 반제품 재고량 -->
            <div class="card">
                <div class="card-header"><h3>반제품 재고량 (단위: 톤)</h3>
                    <div class="card-actions"><button class="btn-edit" onclick="openEditModal('factoryKPI', 'semiProduct')"><i class="fas fa-edit"></i> 수정</button></div>
                </div>
                <div class="card-body">
                    <div class="data-table-wrapper">
                        <table class="data-table">
                            <thead><tr><th>구분</th><th>25년</th>${MONTHS.map(m => `<th>${m}</th>`).join('')}</tr></thead>
                            <tbody>
                                <tr><td><strong>목표</strong></td>${(d.semiProduct?.target || []).slice(0, 13).map(v => `<td>${formatNumber(v)}</td>`).join('')}</tr>
                                <tr><td><strong>실적</strong></td>${(d.semiProduct?.actual || []).slice(0, 13).map(v => `<td>${formatNumber(v)}</td>`).join('')}</tr>
                                <tr class="total-row"><td><strong>실적-목표</strong></td>${(d.semiProduct?.diff || []).slice(0, 13).map(v => `<td class="${getValueClass(v)}">${formatNumber(v)}</td>`).join('')}</tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        setTimeout(() => {
            createYearlyMonthlyBarChart('chart-kpi-disposal', {
                yearly: (d.disposal?.yearly || []).slice(0, 4),
                monthly: d.disposal?.monthly || [],
                target: null
            });
            if (d.disposalCost) {
                createComboChart('chart-kpi-cost', {
                    labels: YEAR_MONTH_LABELS,
                    barData: [null, null, null, null, ...(d.disposalCost.costMonthly || [])],
                    lineData: [null, null, null, null, ...(d.disposalCost.unitMonthly || [])],
                    barLabel: '폐기비용(백만원)',
                    lineLabel: '원단위(원)',
                    unit: ''
                });
            }
        }, 100);
    },

    /* ------------------------------------------
       17. 고객불만 및 반품
       ------------------------------------------ */
    complaints(container) {
        const d = dataManager.getSectionData('complaints');

        container.innerHTML = `
            <div class="grid-2">
                <div class="card">
                    <div class="card-header">
                        <h3>고객불만 추이 (단위: 건)</h3>
                        <div class="card-actions"><button class="btn-edit" onclick="openEditModal('complaints', 'customerComplaints')"><i class="fas fa-edit"></i> 수정</button></div>
                    </div>
                    <div class="card-body">
                        <div class="chart-container" style="height:280px"><canvas id="chart-complaints"></canvas></div>
                        <table class="data-table" style="margin-top:16px">
                            <thead><tr><th>구분</th><th>단위</th><th>1~11월</th><th>12월</th><th>25.누적</th><th>24년</th></tr></thead>
                            <tbody>
                                <tr><td>접수</td><td>건</td><td>${d.customerComplaints?.count?.total1to11 || '-'}</td><td>${d.customerComplaints?.count?.dec || '-'}</td><td>${d.customerComplaints?.count?.cumulative25 || '-'}</td><td>${d.customerComplaints?.count?.y24 || '-'}</td></tr>
                                <tr><td>종결</td><td>건</td><td>${d.customerComplaints?.closed?.total1to11 || '-'}</td><td>${d.customerComplaints?.closed?.dec || '-'}</td><td>${d.customerComplaints?.closed?.cumulative25 || '-'}</td><td>${d.customerComplaints?.closed?.y24 || '-'}</td></tr>
                                <tr><td>보상액</td><td>억원</td><td>${d.customerComplaints?.compensation?.total1to11 || '-'}</td><td>${d.customerComplaints?.compensation?.dec || '-'}</td><td>${d.customerComplaints?.compensation?.cumulative25 || '-'}</td><td>${d.customerComplaints?.compensation?.y24 || '-'}</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header">
                        <h3>반품 추이 (단위: 톤)</h3>
                        <div class="card-actions"><button class="btn-edit" onclick="openEditModal('complaints', 'returns')"><i class="fas fa-edit"></i> 수정</button></div>
                    </div>
                    <div class="card-body">
                        <div class="chart-container" style="height:280px"><canvas id="chart-returns"></canvas></div>
                        <table class="data-table" style="margin-top:16px">
                            <thead><tr><th>구분</th><th>단위</th><th>1~11월</th><th>12월</th><th>25.누적</th><th>24년</th></tr></thead>
                            <tbody>
                                <tr><td>건수</td><td>건</td><td>${d.returns?.count?.total1to11 || '-'}</td><td>${d.returns?.count?.dec || '-'}</td><td>${d.returns?.count?.cumulative25 || '-'}</td><td>-</td></tr>
                                <tr><td>중량</td><td>건</td><td>${d.returns?.volume?.total1to11 || '-'}</td><td>${d.returns?.volume?.dec || '-'}</td><td>${d.returns?.volume?.cumulative25 || '-'}</td><td>${d.returns?.volume?.y24 || '-'}</td></tr>
                                <tr><td>손실액</td><td>백만원</td><td>${d.returns?.loss?.total1to11 || '-'}</td><td>${d.returns?.loss?.dec || '-'}</td><td>${d.returns?.loss?.cumulative25 || '-'}</td><td>${d.returns?.loss?.y24 || '-'}</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        setTimeout(() => {
            createYearlyMonthlyBarChart('chart-complaints', {
                yearly: d.customerComplaints?.yearly || [],
                monthly: d.customerComplaints?.monthly || []
            });
            createYearlyMonthlyBarChart('chart-returns', {
                yearly: d.returns?.yearly || [],
                monthly: d.returns?.monthly || []
            });
        }, 100);
    },

    /* ------------------------------------------
       18. 설비고장
       ------------------------------------------ */
    breakdown(container) {
        const d = dataManager.getSectionData('breakdown');
        const items = [
            { key: 'timeTotal', label: '고장시간 종합', target: d.timeTotal?.target },
            { key: 'countTotal', label: '고장건수 종합', target: d.countTotal?.target },
            { key: 'timeMech', label: '기계 (시간)', target: d.timeMech?.target },
            { key: 'countMech', label: '기계 (건수)', target: d.countMech?.target },
            { key: 'timeElec', label: '전기 (시간)', target: d.timeElec?.target },
            { key: 'countElec', label: '전기 (건수)', target: d.countElec?.target }
        ];

        container.innerHTML = `
            <div class="card" style="margin-bottom:20px">
                <div class="card-header">
                    <h3>주요지표 – 설비고장</h3>
                    <div class="card-actions">
                        <button class="btn-edit" onclick="openBulkEditModal('breakdown')"><i class="fas fa-edit"></i> 전체 데이터 수정</button>
                    </div>
                </div>
            </div>
            <div class="grid-2">
                ${items.map(item => {
            const id = `chart-bd-${item.key}`;
            return `<div class="card">
                        <div class="card-header">
                            <h3>${item.label}</h3>
                            <span class="target-info">목표: ${item.target}</span>
                        </div>
                        <div class="card-body">
                            <div class="chart-container chart-container-sm"><canvas id="${id}"></canvas></div>
                        </div>
                    </div>`;
        }).join('')}
            </div>
        `;

        setTimeout(() => {
            items.forEach(item => {
                const sd = d[item.key] || {};
                createYearlyMonthlyBarChart(`chart-bd-${item.key}`, {
                    yearly: sd.yearly || [],
                    monthly: sd.monthly || [],
                    target: sd.target,
                    higherIsBad: true
                });
            });
        }, 100);
    }
};
