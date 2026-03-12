/* ==========================================
   Section Renderers-SeAH C&M Performance Report
   ========================================== */

const SectionRenderers = {

    /*------------------------------------------
       0. 종합 대시보드
      ------------------------------------------ */
    dashboard(container) {
        const cost = dataManager.getSectionData('costReduction');
        const tasks = dataManager.getSectionData('keyTasks');
        const meta = dataManager.data.meta;
        const icon = 'fas fa-th-large';

        container.innerHTML = `
            <div class="card" style="margin-bottom:20px">
                <div class="card-header" style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white;">
                    <h3 style="margin:0"><i class="${icon}" style="margin-right:12px; color:#f59e0b"></i>성과개선 종합 대시보드</h3>
                </div>
            </div>
            <div class="summary-row">
                <div class="summary-card positive">
                    <span class="summary-label">원가 절감 누적 (25년 대비)</span>
                    <span class="summary-value">${formatNumber(cost.actual25)}</span>
                    <span class="summary-change">억원 (달성 ${cost.changeRate}%)</span>
               </div>
                <div class="summary-card info">
                    <span class="summary-label">생산량 달성율 (당월)</span>
                    <span class="summary-value">${Math.round(cost.production.actual / cost.production.plan * 100)}%</span>
                    <span class="summary-change">${formatNumber(cost.production.actual)} / ${formatNumber(cost.production.plan)} 톤</span>
               </div>
                <div class="summary-card warning">
                    <span class="summary-label">주요과제 누적 진도율</span>
                    <span class="summary-value">${(() => {
                const ts = tasks.teamSummary || {};
                const totalT = Object.values(ts).reduce((s, v) => s + (v.target || 0), 0);
                const totalC = Object.values(ts).reduce((s, v) => s + (v.cumulative || 0), 0);
                return totalT > 0 ? Math.round(totalC / totalT * 100) : 0;
            })()}%</span>
                    <span class="summary-change">전체 기준</span>
               </div>
                <div class="summary-card positive">
                    <span class="summary-label">A급 수율 (종합)</span>
                    <span class="summary-value">${dataManager.get('costReduction.yieldRate.m_actual') || '-'}</span>
                    <span class="summary-change">${meta.month}월 실적</span>
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
                                            <td>${dataManager.get(`yield.${l}.monthly.${meta.month - 1}`) || '-'}</td>
                                            <td>${dataManager.get(`operationRate.${l}.monthly.${meta.month - 1}`) || '-'}</td>
                                            <td>${dataManager.get(`lng.${l}.monthly.${meta.month - 1}`) || '-'}</td>
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
            const labels = [`${meta.year - 1}년 ${meta.month}월`, `${meta.year}년 ${meta.month}월`];
            const datasets = [
                {
                    label: '개선금액 (억원)',
                    data: [
                        1.25, // 전년 동월 예시 (나중에 실제 데이터 연동 가능)
                        LINES.reduce((s, l) => s + (cost.lineData?.improvement?.[l]?.m_actual || cost.lineData?.improvement?.[l]?.m1 || 0), 0)
                    ],
                    backgroundColor: ['#94a3b8', '#E31937'],
                    borderRadius: 6,
                    barThickness: 40
                }
            ];

            new Chart(document.getElementById('chart-dash-cost'), {
                type: 'bar',
                data: { labels, datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', padding: 12 }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
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
        const d_lp = dataManager.getSectionData('linePerformance');
        const meta = dataManager.data.meta;
        const icon = 'fas fa-chart-line';

        container.innerHTML = `
            <div class="card" style="margin-bottom:20px">
                <div class="card-header" style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white;">
                    <h3 style="margin:0"><i class="${icon}" style="margin-right:12px; color:#f59e0b"></i>제조원가 절감 현황</h3>
                </div>
            </div>
            
            <!-- 요약 카드-->
            <div class="summary-row">
                <div class="summary-card ${d.changeRate >= 0 ? 'positive' : 'negative'}">
                    <span class="summary-label">원가 절감 실적 (25년 대비)</span>
                    <span class="summary-value">${formatNumber(d.actual25)}</span>
                    <span class="summary-change ${d.changeRate >= 0 ? 'up' : 'down'}">${d.changeRate}%</span>
                </div>
                <div class="summary-card ${d.q4Compare >= 0 ? 'positive' : 'negative'}">
                    <span class="summary-label">전년 4분기 대비</span>
                    <span class="summary-value">${formatNumber(d.q4Compare)}</span>
                    <span class="summary-change ${d.q4Compare >= 0 ? 'up' : 'down'}">${d.q4Compare}%</span>
                </div>
                <div class="summary-card info">
                    <span class="summary-label">평균 원가 절감 목표</span>
                    <span class="summary-value">${formatNumber(d.target)}</span>
                    <span class="summary-change">억원/월</span>
                </div>
                <div class="summary-card info">
                    <span class="summary-label">생산량 달성율</span>
                    <span class="summary-value">${d.production.actual ? Math.round(d.production.actual / d.production.plan * 100) : '-'}%</span>
                    <span class="summary-change">${formatNumber(d.production.actual)} / ${formatNumber(d.production.plan)}</span>
               </div>
           </div>

            <!-- 차트 영역-->
            <div class="grid-2">
                <div class="card">
                    <div class="card-header">
                        <h3 style="display:flex; align-items:center; gap:8px">
                            <i class="${icon}" style="color:#3b82f6"></i> 원가 절감 실적
                        </h3>
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
                        <h3 style="display:flex; align-items:center; gap:8px">
                            <i class="${icon}" style="color:#3b82f6"></i> 생산량
                        </h3>
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

            <!-- 실적 분석-->
            <div class="card">
                <div class="card-header">
                    <h3 style="display:flex; align-items:center; gap:8px">
                        <i class="${icon}" style="color:#3b82f6"></i> 실적 분석 <span class="badge" style="margin-left:8px">${d.analysis?.comment || ''}</span>
                    </h3>
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

            <!-- 라인별 제조원가 절감 현황 테이블-->
            <div class="card">
                <div class="card-header">
                    <h3 style="display:flex; align-items:center; gap:8px">
                        <i class="${icon}" style="color:#3b82f6"></i> 라인별 제조원가 절감 현황
                    </h3>
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
                                    <th colspan="5">원단위 (단위: 원/톤)</th>
                                    <th colspan="2">개선 금액 실적 (단위: 억원)</th>
                                </tr>
                                <tr>
                                    <th>24년</th><th>25년</th><th>'${(meta.year - 1).toString().slice(-2)} ${meta.month}월</th><th>${meta.year % 100}년 목표</th><th>${meta.month}월 실적</th>
                                    <th>${meta.month}월</th><th>합계</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${LINES.map(line => {
            const uc = d.lineData?.unitCost?.[line] || {};
            const imp = d.lineData?.improvement?.[line] || {};
            const total = Object.values(imp).reduce((s, v) => s + (v || 0), 0);
            return `<tr>
                                        <td><strong>${line}</strong></td>
                                        <td>${formatNumber(uc.y24)}</td><td>${formatNumber(uc.y25)}</td>
                                        <td>${formatNumber(uc.m_prev ?? uc.m1_prev)}</td><td>${formatNumber(uc.m_goal ?? uc.m1_goal)}</td>
                                        <td>${formatNumber(uc.m_actual ?? uc.m1)}</td>
                                        <td class="positive-val">${formatNumber(imp.m_actual ?? imp.m1)}</td>
                                        <td class="total-col">${total.toFixed(2)}</td>
                                    </tr>`;
        }).join('')}
                                <tr class="total-row">
                                    <td><strong>수율</strong></td>
                                    <td>${d.yieldRate?.y24 || '-'}</td><td>${d.yieldRate?.y25 || '-'}</td>
                                    <td>${(d.yieldRate?.m_prev ?? d.yieldRate?.m1_prev) || '-'}</td><td>${(d.yieldRate?.m_goal ?? d.yieldRate?.m1_goal) || '-'}</td>
                                    <td>${(d.yieldRate?.m_actual ?? d.yieldRate?.m1) || '-'}</td>
                                    <td class="${getValueClass(d.lineData?.improvement?.yield?.m_actual ?? d.lineData?.improvement?.yield?.m1)}">${formatNumber(d.lineData?.improvement?.yield?.m_actual ?? d.lineData?.improvement?.yield?.m1)}</td>
                                    <td class="${getValueClass(d.lineData?.improvement?.yield?.m_actual ?? d.lineData?.improvement?.yield?.m1)}"><strong>${formatNumber(d.lineData?.improvement?.yield?.m_actual ?? d.lineData?.improvement?.yield?.m1)}</strong></td>
                                </tr>
                                <tr class="total-row">
                                    <td><strong>합계</strong></td>
                                    <td colspan="5"></td>
                                    ${(() => {
                const total = LINES.reduce((s, l) => s + (d.lineData?.improvement?.[l]?.m_actual ?? d.lineData?.improvement?.[l]?.m1 ?? 0), 0) + (d.lineData?.improvement?.yield?.m_actual ?? d.lineData?.improvement?.yield?.m1 ?? 0);
                return `<td class="${getValueClass(total)}"><strong>${total.toFixed(2)}</strong></td>`;
            })()}
                                    <td><strong>${(LINES.reduce((s, l) => s + (d.lineData?.improvement?.[l]?.m_actual || d.lineData?.improvement?.[l]?.m1 || 0), 0)).toFixed(2)}</strong></td>
                                </tr>
                                <tr class="total-row" style="background: #f8fafc">
                                    <td><strong>생산량</strong></td>
                                    <td>${formatNumber(d.productionMonthly?.y24)}</td><td>${formatNumber(d.productionMonthly?.y25)}</td>
                                    <td>${formatNumber(d.productionMonthly?.m_prev ?? d.productionMonthly?.m1_prev)}</td><td>${formatNumber(d.productionMonthly?.m_goal ?? d.productionMonthly?.m1_goal)}</td>
                                    <td>${formatNumber(d.productionMonthly?.m_actual ?? d.productionMonthly?.m1)}</td>
                                    <td>${formatNumber(d.q4Compare)}</td>
                                    <td><strong>${formatNumber(d.q4Compare)}</strong></td>
                                </tr>
                            </tbody>
                        </table>
                   </div>
               </div>
            </div>

            <!-- 라인별 실적 (이동됨) -->
            <div class="grid-2" style="margin-top:20px">
                <div class="card">
                    <div class="card-header">
                        <h3>${meta.year}년 ${meta.month}월 제조원가 절감 현황 (라인별)</h3>
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
                        <h3>${meta.year}년 ${meta.month}월 생산 현황 (라인별)</h3>
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

            <!-- 상세 데이터 테이블 (이동됨) -->
            <div class="grid-2">
                <div class="card">
                    <div class="card-header"><h3>제조원가 절감 상세</h3></div>
                    <div class="card-body">
                        <div class="data-table-wrapper">
                            <table class="data-table">
                                <thead><tr><th>라인</th><th>목표</th><th>24년 대비</th><th>4분기 대비</th></tr></thead>
                                <tbody>
                                    ${LINES.map(l => {
                const v = d_lp.costReduction?.[l] || {};
                return `<tr><td><strong>${l}</strong></td>
                                            <td>${formatNumber(v.target)}</td>
                                            <td class="${getValueClass(v.y24)}">${formatNumber(v.y24)}</td>
                                            <td class="${getValueClass(v.q4)}">${formatNumber(v.q4)}</td></tr>`;
            }).join('')}
                                </tbody>
                            </table>
                        </div>
                   </div>
               </div>
                <div class="card">
                    <div class="card-header"><h3>생산 현황 상세</h3></div>
                    <div class="card-body">
                        <div class="data-table-wrapper">
                            <table class="data-table">
                                <thead><tr><th>라인</th><th>24월평균</th><th>계획량</th><th>생산량</th><th>달성율</th></tr></thead>
                                <tbody>
                                    ${LINES.map(l => {
                const v = d_lp.production?.[l] || {};
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
            </div>
        `;

        // 차트 렌더링
        setTimeout(() => {
            createSimpleBarChart('chart-cost-summary', {
                labels: ['목표', '실적(25년대비)', '4분기 대비'],
                values: [d.target, d.actual25, d.q4Compare],
                colors: ['#3b82f6', d.actual25 >= 0 ? '#10b981' : '#ef4444', d.q4Compare >= 0 ? '#6d9b3a' : '#f59e0b'],
                title: '원가 절감 실적',
                unit: '억원'
            });
            createSimpleBarChart('chart-production-summary', {
                labels: ['25년 평균', '계획', '실적'],
                values: [d.production.avg25, d.production.plan, d.production.actual],
                colors: ['#3b82f6', '#6d9b3a', '#f59e0b'],
                title: '생산량',
                showPercent: true
            });

            createGroupedBarChart('chart-line-cost', {
                labels: LINES,
                datasets: [
                    { label: '목표', data: LINES.map(l => d_lp.costReduction?.[l]?.target || 0) },
                    { label: '25년 대비', data: LINES.map(l => d_lp.costReduction?.[l]?.y25 || 0) },
                    { label: '4분기 대비', data: LINES.map(l => d_lp.costReduction?.[l]?.q4 || 0) }
                ],
                title: '제조원가 절감 현황'
            });
            createGroupedBarChart('chart-line-prod', {
                labels: LINES,
                datasets: [
                    { label: '25월평균', data: LINES.map(l => d_lp.production?.[l]?.avg25 || d_lp.production?.[l]?.avg24 || 0) },
                    { label: '계획량', data: LINES.map(l => d_lp.production?.[l]?.plan || 0) },
                    { label: '생산량', data: LINES.map(l => d_lp.production?.[l]?.actual || 0) }
                ],
                title: '생산 현황'
            });
        }, 100);
    },

    /*------------------------------------------
       3. 라인별 실적
      ------------------------------------------ */
    linePerformance(container) {
        const d = dataManager.getSectionData('linePerformance');
        const meta = dataManager.data.meta;
        const icon = 'fas fa-layer-group';

        container.innerHTML = `
            <div class="card" style="margin-bottom:20px">
                <div class="card-header" style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white;">
                    <h3 style="margin:0"><i class="${icon}" style="margin-right:12px; color:#f59e0b"></i>라인별 실적</h3>
                </div>
            </div>
            </div>
            <div class="grid-2">
                <div class="card">
                    <div class="card-header">
                        <h3 style="display:flex; align-items:center; gap:8px">
                            <i class="${icon}" style="color:#3b82f6"></i> ${meta.year}년 ${meta.month}월 제조원가 절감 현황
                        </h3>
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
                        <h3 style="display:flex; align-items:center; gap:8px">
                            <i class="${icon}" style="color:#3b82f6"></i> ${meta.year}년 ${meta.month}월 생산 현황
                        </h3>
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

            <div class="grid-2">
                <div class="card">
                    <div class="card-header">
                        <h3 style="display:flex; align-items:center; gap:8px">
                            <i class="${icon}" style="color:#3b82f6"></i> 제조원가 절감 상세
                        </h3>
                    </div>
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
                    <div class="card-header">
                        <h3 style="display:flex; align-items:center; gap:8px">
                            <i class="${icon}" style="color:#3b82f6"></i> 생산 현황 상세
                        </h3>
                    </div>
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
                    { label: '25년 대비', data: LINES.map(l => d.costReduction?.[l]?.y25 || 0) },
                    { label: '4분기 대비', data: LINES.map(l => d.costReduction?.[l]?.q4 || 0) }
                ],
                title: '제조원가 절감 현황'
            });
            createGroupedBarChart('chart-line-prod', {
                labels: LINES,
                datasets: [
                    { label: '25월평균', data: LINES.map(l => d.production?.[l]?.avg25 || d.production?.[l]?.avg24 || 0) },
                    { label: '계획량', data: LINES.map(l => d.production?.[l]?.plan || 0) },
                    { label: '생산량', data: LINES.map(l => d.production?.[l]?.actual || 0) }
                ],
                title: '생산 현황'
            });
        }, 100);
    },

    /*------------------------------------------
       4. 주요과제 진행사항
      ------------------------------------------ */
    keyTasks(container) {
        const d = dataManager.getSectionData('keyTasks');
        const meta = dataManager.data.meta;
        const scheduleColors = ['gantt-none', 'gantt-plan', 'gantt-progress', 'gantt-delayed'];
        const scheduleLabels = ['', '계획', '진행', '미진행'];

        //--- [데이터 초기화 및 자동 업데이트 로직]---
        if (!d.tasks) d.tasks = {};
        if (!d.teamSummary) d.teamSummary = {};

        TEAMS.forEach(team => {
            if (!d.teamSummary[team]) {
                d.teamSummary[team] = { target: 0, monthly: 0, cumulative: 0, rate: 0 };
            }
            const teamTasks = d.tasks[team] || [];
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
        // 계산된 요약 정보를 파이어베이스에 자동 동기화 (대시보드 일관성 유지)
        if (Object.keys(d.tasks).length > 0) {
            dataManager.save();
        }
        //------------------------------

        let selectedTeam = localStorage.getItem('seah_cm_selected_team');
        if (!TEAMS.includes(selectedTeam)) {
            selectedTeam = TEAMS[0];
            localStorage.setItem('seah_cm_selected_team', selectedTeam);
        }

        // 팀별 합계 계산 (데이터가 업데이트된 d.teamSummary 사용)
        const totalTarget = Object.values(d.teamSummary || {}).reduce((s, v) => s + (v?.target || 0), 0);
        const totalMonthly = Object.values(d.teamSummary || {}).reduce((s, v) => s + (v?.monthly || 0), 0);
        const totalCum = Object.values(d.teamSummary || {}).reduce((s, v) => s + (v?.cumulative || 0), 0);
        const totalRate = totalTarget ? Math.round(totalCum / totalTarget * 100) : 0;

        const renderContent = () => {
            const teamTasks = d.tasks?.[selectedTeam] || [];
            const teamSummary = d.teamSummary?.[selectedTeam] || {};

            container.innerHTML = `
            <div class="card" style="margin-bottom:20px">
                <div class="card-header" style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white;">
                    <h3 style="margin:0"><i class="fas fa-tasks" style="margin-right:12px; color:#f59e0b"></i>${meta.year}년 주요과제 진행사항</h3>
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
                                        <td>${v.target != null ? formatNumber(v.target) : '-'}</td>
                                        <td>${v.monthly != null ? formatNumber(v.monthly) : '-'}</td>
                                        <td>${v.cumulative != null ? formatNumber(v.cumulative) : '-'}</td>
                                        <td class="${v.rate >= 100 ? 'positive-val' : v.rate < 50 ? 'negative-val' : ''}">${v.rate != null ? v.rate + '%' : '-'}</td>
                                        <td style="min-width:100px">
                                            ${v.rate != null ? `<div class="progress-bar-container"><div class="progress-bar ${getProgressClass(v.rate)}" style="width:${Math.min(v.rate, 100)}%"></div></div>` : '-'}
                                        </td>
                                    </tr>`;
            }).join('')}
                                <tr class="total-row">
                                    <td><strong>합계</strong></td>
                                    <td><strong>${totalTarget.toFixed(2)}</strong></td>
                                    <td><strong>${totalMonthly.toFixed(2)}</strong></td>
                                    <td><strong>${totalCum.toFixed(2)}</strong></td>
                                    <td><strong>${totalRate}%</strong></td>
                                    <td><div class="progress-bar-container"><div class="progress-bar ${getProgressClass(totalRate)}" style="width:${Math.min(totalRate, 100)}%"></div></div></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- 과제 상세-->
            <div class="card">
                <div class="card-header" style="flex-direction: column; align-items: flex-start; gap: 15px;">
                    <div style="display:flex; justify-content: space-between; width: 100%; align-items: center;">
                        <h3 style="margin:0">${meta.year}년 주요 과제 상세 실적</h3>
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
                    
                    <div class="sub-tabs" style="margin: 0; width: 100%; justify-content: flex-start;">
                        ${TEAMS.map(team => `
                            <button class="sub-tab ${selectedTeam === team ? 'active' : ''}" 
                                    onclick="selectKeyTaskTeam('${team}')">${team}</button>
                        `).join('')}
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
                                        <td style="text-align:left;font-size:12px">
                                            ${task.name}
                                        </td>
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

        // 전역 함수로 노출 (팀 선택 핸들링)
        window.selectKeyTaskTeam = (team) => {
            selectedTeam = team;
            localStorage.setItem('seah_cm_selected_team', selectedTeam);
            renderContent();
        };

        // 초기 렌더링
        renderContent();
    },

    /*------------------------------------------
       주요지표-공통 렌더러 (연도별+월별 차트 6개)
      ------------------------------------------ */
    _renderMultiLineCharts(container, sectionId, title, lineKeys, unit, options = {}) {
        const d = dataManager.getSectionData(sectionId);
        const icon = options.icon || 'fas fa-chart-bar';

        const chartCards = lineKeys.map((key, i) => {
            const lineData = d[key] || {};
            const chartId = `chart-${sectionId}-${key}`.replace(/[^a-zA-Z0-9]/g, '_');
            const displayName = key === 'composite' ? '종합' : key;

            return `
                <div class="card">
                    <div class="card-header">
                        <h3 style="display:flex; align-items:center; gap:8px">
                            <i class="${icon}" style="color:#3b82f6"></i> ${displayName} ${options.subtitle || ''}
                        </h3>
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
                <div class="card-header" style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white;">
                    <h3 style="margin:0"><i class="${icon}" style="margin-right:12px; color:#f59e0b"></i>${title}</h3>
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

    /*------------------------------------------
       5. 설비종합효율
      ------------------------------------------ */
    equipEfficiency(container) {
        const d = dataManager.getSectionData('equipEfficiency');
        const lines = ['CGL', '1CCL', '3CCL'];
        const icon = 'fas fa-cogs';

        const chartCards = lines.map(line => {
            const lineData = d[line] || {};
            const chartId = `chart-equip-${line}`.replace(/[^a-zA-Z0-9]/g, '_');
            return `
                <div class="card">
                    <div class="card-header">
                        <h3 style="display:flex; align-items:center; gap:8px">
                            <i class="${icon}" style="color:#3b82f6"></i> ${line} 설비종합효율
                        </h3>
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

        container.innerHTML = `
            <div class="card" style="margin-bottom:20px">
                <div class="card-header" style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white;">
                    <h3 style="margin:0"><i class="${icon}" style="margin-right:12px; color:#f59e0b"></i>설비종합효율</h3>
                </div>
            </div>
            <div class="grid-3">${chartCards}</div>
        `;

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

    /*------------------------------------------
       6. 스크랩 현황
      ------------------------------------------ */
    scrap(container) {
        const d = dataManager.getSectionData('scrap');
        const icon = 'fas fa-recycle';

        container.innerHTML = `
            <div class="card" style="margin-bottom:20px">
                <div class="card-header" style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white;">
                    <h3 style="margin:0"><i class="${icon}" style="margin-right:12px; color:#f59e0b"></i>스크랩 현황</h3>
                </div>
            </div>
            <div class="grid-2">
                ${['steel', 'al'].map(type => {
            const sd = d[type] || {};
            const label = type === 'steel' ? 'Steel 스크랩 원단위' : 'AL 스크랩 원단위';
            const chartId = `chart-scrap-${type}`;
            return `
                        <div class="card">
                            <div class="card-header">
                                <h3 style="display:flex; align-items:center; gap:8px">
                                    <i class="${icon}" style="color:#3b82f6"></i> ${label}
                                </h3>
                                <div class="card-actions">
                                    <span class="target-info">목표: ${sd.target}kg</span>
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

    /*------------------------------------------
       6.5. 생산량 현황
      ------------------------------------------ */
    productionStatus(container) {
        this._renderMultiLineCharts(container, 'productionStatus', '생산량 현황',
            ['composite', 'CPL', 'CRM', 'CGL', '1CCL', '2CCL', '3CCL'], '톤', { subtitle: '', icon: 'fas fa-industry' });
    },

    /*------------------------------------------
       6.6. 제조원가 현황
      ------------------------------------------ */
    mfgCostStatus(container) {
        this._renderMultiLineCharts(container, 'mfgCostStatus', '제조원가 현황',
            ['composite', 'CPL', 'CRM', 'CGL', '1CCL', '2CCL', '3CCL'], '원/톤', { subtitle: '', icon: 'fas fa-coins' });
    },

    /*------------------------------------------
       7. A급 수율
      ------------------------------------------ */
    yield(container) {
        this._renderMultiLineCharts(container, 'yield', 'A급 수율',
            ['composite', 'CPL', 'CGL', '1CCL', '2CCL', '3CCL'], '%', { subtitle: '수율', icon: 'fas fa-bullseye' });
    },

    /*------------------------------------------
       8. 톤파워
      ------------------------------------------ */
    tonPower(container) {
        const d = dataManager.getSectionData('tonPower');
        const lines = ['composite', 'CPL', 'CRM', 'CGL', '1CCL', '2CCL', '3CCL'];
        const icon = 'fas fa-bolt';

        const chartCards = lines.map(line => {
            const ld = d[line] || {};
            const chartId = `chart-tonpower-${line}`.replace(/[^a-zA-Z0-9]/g, '_');
            const displayName = line === 'composite' ? '종합' : line;

            return `
                <div class="card">
                    <div class="card-header">
                        <h3 style="display:flex; align-items:center; gap:8px">
                            <i class="${icon}" style="color:#3b82f6"></i> ${displayName} 톤파워 (톤/hr)
                        </h3>
                        <div class="card-actions">
                            <span class="target-info">목표: ${ld.target !== undefined && ld.target !== null ? formatNumber(ld.target) : '-'}</span>
                            <button class="btn-edit" onclick="openEditModal('tonPower', '${line}')"><i class="fas fa-edit"></i> 수정</button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="chart-container" style="height:280px"><canvas id="${chartId}"></canvas></div>
                        ${ld.analysis ? `<div class="comment-box"><p style="font-size:12px">• ${ld.analysis}</p></div>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="card" style="margin-bottom:20px">
                <div class="card-header" style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white;">
                    <h3 style="margin:0"><i class="${icon}" style="margin-right:12px; color:#f59e0b"></i>톤파워 현황</h3>
                </div>
            </div>
            <div class="grid-2">${chartCards}</div>
        `;

        setTimeout(() => {
            lines.forEach(line => {
                const ld = d[line] || {};
                const barData = [...(ld.yearly || []), ...(ld.monthly || [])];
                const lineData = ld.index || [];
                const chartId = `chart-tonpower-${line}`.replace(/[^a-zA-Z0-9]/g, '_');

                if (document.getElementById(chartId)) {
                    createComboChart(chartId, {
                        labels: YEAR_MONTH_LABELS,
                        barData: barData,
                        lineData: lineData.length > 0 ? lineData : null,
                        barLabel: '톤파워',
                        lineLabel: '비교지수',
                        target: ld.target,
                        unit: ''
                    });
                }
            });
        }, 150);
    },

    /*------------------------------------------
       9. 실가동률
      ------------------------------------------ */
    operationRate(container) {
        this._renderMultiLineCharts(container, 'operationRate', '실가동률',
            ['composite', 'CRM', 'CGL', '1CCL', '2CCL', '3CCL'], '%', { subtitle: '', icon: 'fas fa-tachometer-alt' });
    },

    /*------------------------------------------
       11. 유틸리티 현황 (LNG/전력)
      ------------------------------------------ */
    utilityStatus(container) {
        const powerData = dataManager.getSectionData('power') || {};
        const lngData = dataManager.getSectionData('lng') || {};
        const lines = ['CPL', 'CRM', 'CGL', '1CCL', '2CCL', '3CCL'];

        const chartCards = lines.map(line => {
            const chartId = `chart-utility-${line}`.replace(/[^a-zA-Z0-9]/g, '_');
            return `
                <div class="card">
                    <div class="card-header">
                        <h3 style="display:flex; align-items:center; gap:8px">
                            <i class="fas fa-plug" style="color:#3b82f6"></i> ${line} 유틸리티 현황
                        </h3>
                        <div class="card-actions">
                            <button class="btn-edit" onclick="openBulkEditModal('utilityStatus', '${line}')"><i class="fas fa-edit"></i> 수정</button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="chart-container" style="height:320px"><canvas id="${chartId}"></canvas></div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="card" style="margin-bottom:20px">
                <div class="card-header" style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white;">
                    <h3 style="margin:0"><i class="fas fa-plug" style="margin-right:12px; color:#f59e0b"></i>유틸리티 현황 (전력 / LNG)</h3>
                </div>
            </div>
            <div class="grid-2">${chartCards}</div>
        `;

        setTimeout(() => {
            lines.forEach(line => {
                const pd = powerData[line] || { yearly: [], monthly: [] };
                const ld = lngData[line] || { yearly: [], monthly: [] };
                const chartId = `chart-utility-${line}`.replace(/[^a-zA-Z0-9]/g, '_');

                createCommonTrendChart(chartId, {
                    labels: YEAR_MONTH_LABELS,
                    datasets: [
                        {
                            label: '전력 (kW/톤)',
                            type: 'bar',
                            data: [...(pd.yearly || [null, null, null, null]), ...(pd.monthly || new Array(12).fill(null))],
                            backgroundColor: '#3b82f6',
                            yAxisID: 'y'
                        },
                        {
                            label: 'LNG (Nm3/톤)',
                            type: 'line',
                            data: [...(ld.yearly || [null, null, null, null]), ...(ld.monthly || new Array(12).fill(null))],
                            borderColor: '#ef4444',
                            backgroundColor: 'transparent',
                            pointBackgroundColor: '#ef4444',
                            yAxisID: 'y1'
                        }
                    ],
                    yTitle: '전력 (kW/톤)',
                    y1Title: 'LNG (Nm3/톤)'
                });
            });
        }, 150);
    },

    /*------------------------------------------
       13. 스팀
      ------------------------------------------ */
    steam(container) {
        const d = dataManager.getSectionData('steam');
        const icon = 'fas fa-cloud';

        container.innerHTML = `
            <div class="card" style="margin-bottom:20px">
                <div class="card-header" style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white;">
                    <h3 style="margin:0"><i class="${icon}" style="margin-right:12px; color:#f59e0b"></i>스팀현황</h3>
                </div>
            </div>
    <div class="grid-2">
                <div class="card">
                    <div class="card-header">
                        <h3 style="display:flex; align-items:center; gap:8px">
                            <i class="${icon}" style="color:#3b82f6"></i> 스팀구매량 대상 (톤)
                        </h3>
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
                        <h3 style="display:flex; align-items:center; gap:8px">
                            <i class="${icon}" style="color:#3b82f6"></i> 스팀 사용량 원단위 (원/톤)
                        </h3>
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
                        <h3 style="display:flex; align-items:center; gap:8px">
                            <i class="${icon}" style="color:#3b82f6"></i> 자가생산량 2CCL
                        </h3>
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
                        <h3 style="display:flex; align-items:center; gap:8px">
                            <i class="${icon}" style="color:#3b82f6"></i> 자가생산량 3CCL
                        </h3>
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

    /*------------------------------------------
       14-15. 주요 원단위 현황 (소모품/도료)
      ------------------------------------------ */
    mainUnitStatus(container) {
        const d = dataManager.getSectionData('consumables');
        const coldLines = ['CPL', 'CRM', 'CGL'];
        const colorLines = ['1CCL', '2CCL', '3CCL'];
        const meta = dataManager.data.meta;

        container.innerHTML = `
            <div class="card" style="margin-bottom:20px">
                <div class="card-header" style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white;">
                    <h3 style="margin:0"><i class="fas fa-brush" style="margin-right:12px; color:#f59e0b"></i>주요 원단위 현황</h3>
                </div>
            </div>
            
            <div class="grid-2">
                <!-- 냉연 소모품 -->
                <div class="card">
                    <div class="card-header">
                        <h3 style="display:flex; align-items:center; gap:8px">
                            <i class="fas fa-brush" style="color:#3b82f6"></i> 냉연 소모품 현황 (원/톤)
                        </h3>
                        <div class="card-actions">
                            <button class="btn-edit" onclick="openBulkEditModal('consumables')"><i class="fas fa-edit"></i> 수정</button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="sub-tabs">
                            ${coldLines.map((line, i) => `<button class="sub-tab ${i === 0 ? 'active' : ''}" data-type="cold" data-line="${line}">${line}</button>`).join('')}
                        </div>
                        <div class="sub-content-container" style="margin-top:15px">
                            ${coldLines.map((line, i) => `
                                <div id="mu-cold-${line}" class="sub-content type-cold ${i === 0 ? 'active' : ''}">
                                    <div class="chart-container" style="height:320px"><canvas id="chart-mu-cold-${line}"></canvas></div>
                                    <div class="comment-box" style="margin-top:10px">
                                        <p style="font-size:13px">• ${meta.month}월 실적: ${formatNumber(d[line]?.costMonthly?.[meta.month - 1])}원/톤 &nbsp; (목표: ${formatNumber(d[line]?.costTarget)})</p>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- 컬러 도료 -->
                <div class="card">
                    <div class="card-header">
                        <h3 style="display:flex; align-items:center; gap:8px">
                            <i class="fas fa-brush" style="color:#3b82f6"></i> 컬러 도료 현황 (kg/톤)
                        </h3>
                        <div class="card-actions">
                            <button class="btn-edit" onclick="openBulkEditModal('consumables')"><i class="fas fa-edit"></i> 수정</button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="sub-tabs">
                            ${colorLines.map((line, i) => `<button class="sub-tab ${i === 0 ? 'active' : ''}" data-type="color" data-line="${line.replace('#', '')}">${line}</button>`).join('')}
                        </div>
                        <div class="sub-content-container" style="margin-top:15px">
                            ${colorLines.map((line, i) => `
                                <div id="mu-color-${line.replace('#', '')}" class="sub-content type-color ${i === 0 ? 'active' : ''}">
                                    <div class="chart-container" style="height:320px"><canvas id="chart-mu-color-${line.replace('#', '')}"></canvas></div>
                                    <div class="comment-box" style="margin-top:10px">
                                        <p style="font-size:13px">• ${meta.month}월 실적: ${formatNumber(d[line]?.unitMonthly?.[meta.month - 1])}kg/톤 &nbsp; (목표: ${formatNumber(d[line]?.unitTarget)})</p>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        const renderCharts = (type, line) => {
            const ld = d[line.includes('CCL') ? line : line] || {};
            const canvasId = `chart-mu-${type}-${line.replace('#', '')}`;
            setTimeout(() => {
                createYearlyMonthlyBarChart(canvasId, {
                    yearly: type === 'cold' ? ld.costYearly : ld.unitYearly,
                    monthly: type === 'cold' ? ld.costMonthly : ld.unitMonthly,
                    target: type === 'cold' ? ld.costTarget : ld.unitTarget,
                    unit: type === 'cold' ? '원/톤' : 'kg/톤',
                    higherIsBad: true
                });
            }, 50);
        };

        // 초기 차트 렌더링
        renderCharts('cold', 'CPL');
        renderCharts('color', '1CCL');

        // 탭 이벤트
        container.querySelectorAll('.sub-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const type = tab.dataset.type;
                const line = tab.dataset.line;
                const parent = tab.closest('.card-body');
                parent.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
                parent.querySelectorAll('.sub-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                parent.querySelector(`#mu-${type}-${line}`).classList.add('active');
                renderCharts(type, line === '1CCL' ? '1CCL' : line === '2CCL' ? '2CCL' : line === '3CCL' ? '3CCL' : line);
            });
        });
    },


    /*------------------------------------------
       17. 고객불만 및 반품
      ------------------------------------------ */
    complaints(container) {
        const d = dataManager.getSectionData('complaints');
        const meta = dataManager.data.meta;
        const icon = 'fas fa-exclamation-circle';

        container.innerHTML = `
            <div class="card" style="margin-bottom:20px">
                <div class="card-header" style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white;">
                    <h3 style="margin:0"><i class="${icon}" style="margin-right:12px; color:#f59e0b"></i>고객불만 및 반품</h3>
                </div>
            </div>
    <div class="grid-2">
                <div class="card">
                    <div class="card-header">
                        <h3 style="display:flex; align-items:center; gap:8px">
                            <i class="${icon}" style="color:#3b82f6"></i> 고객 불만 발생 건수
                        </h3>
                        <div class="card-actions"><button class="btn-edit" onclick="openEditModal('complaints', 'customerComplaints')"><i class="fas fa-edit"></i> 수정</button></div>
                    </div>
                    <div class="card-body">
                        <div class="chart-container" style="height:280px"><canvas id="chart-complaints"></canvas></div>
                        <table class="data-table" style="margin-top:16px">
                            <thead><tr><th>구분</th><th>단위</th><th>${meta.year - 1}년(1~11)</th><th>${meta.year - 1}년(12월)</th><th>${meta.year - 1}년 누적</th><th>${meta.year - 2}년</th></tr></thead>
                            <tbody>
                                <tr><td>접수</td><td>건</td><td>${d.customerComplaints?.count?.total1to11 || '-'}</td><td>${d.customerComplaints?.count?.dec || '-'}</td><td>${d.customerComplaints?.count?.cumulative25 || '-'}</td><td>${d.customerComplaints?.count?.y24 || '-'}</td></tr>
                                <tr><td>종결</td><td>건</td><td>${d.customerComplaints?.closed?.total1to11 || '-'}</td><td>${d.customerComplaints?.closed?.dec || '-'}</td><td>${d.customerComplaints?.closed?.cumulative25 || '-'}</td><td>${d.customerComplaints?.closed?.y24 || '-'}</td></tr>
                                <tr><td>보상</td><td>백만원</td><td>${d.customerComplaints?.compensation?.total1to11 || '-'}</td><td>${d.customerComplaints?.compensation?.dec || '-'}</td><td>${d.customerComplaints?.compensation?.cumulative25 || '-'}</td><td>${d.customerComplaints?.compensation?.y24 || '-'}</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header">
                        <h3 style="display:flex; align-items:center; gap:8px">
                            <i class="${icon}" style="color:#3b82f6"></i> 제품 반품 현황
                        </h3>
                        <div class="card-actions"><button class="btn-edit" onclick="openEditModal('complaints', 'returns')"><i class="fas fa-edit"></i> 수정</button></div>
                    </div>
                    <div class="card-body">
                        <div class="chart-container" style="height:280px"><canvas id="chart-returns"></canvas></div>
                        <table class="data-table" style="margin-top:16px">
                            <thead><tr><th>구분</th><th>단위</th><th>${meta.year - 1}년(1~11)</th><th>${meta.year - 1}년(12월)</th><th>${meta.year - 1}년 누적</th><th>${meta.year - 2}년</th></tr></thead>
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

    /*------------------------------------------
       18. 설비고장
      ------------------------------------------ */
    breakdown(container) {
        const d = dataManager.getSectionData('breakdown');
        const icon = 'fas fa-tools';
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
                <div class="card-header" style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white;">
                    <h3 style="margin:0"><i class="${icon}" style="margin-right:12px; color:#f59e0b"></i>설비고장</h3>
                </div>
            </div>
    <div class="grid-2">
        ${items.map(item => {
            const id = `chart-bd-${item.key}`;
            return `<div class="card">
                <div class="card-header">
                    <h3 style="display:flex; align-items:center; gap:8px">
                        <i class="${icon}" style="color:#3b82f6"></i> ${item.label}
                    </h3>
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
    },

    /*------------------------------------------
       19. 성과개선 종합보고 (통합 개편)
      ------------------------------------------ */
    integratedReport(container) {
        const lines = ['CPL', 'CRM', 'CGL', '1CCL', '2CCL', '3CCL'];
        const meta = dataManager.data.meta;
        const tabs = [
            { id: 'summary', label: '주요지표현황 (종합)' },
            { id: 'maintenance', label: '설비/유틸리티' },
            ...lines.map(line => ({ id: line, label: line }))
        ];

        container.innerHTML = `
            <div class="card" style="margin-bottom:20px">
                <div class="card-header" style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white;">
                    <h3><i class="fas fa-file-contract" style="margin-right:12px; color:#ef4444"></i>성과개선 종합보고 - ${meta.year}년 ${meta.month}월</h3>
                    <div class="card-actions">
                        <button class="btn-edit" onclick="openBulkEditModal('productionColdReports')" style="margin-right:8px; background:rgba(255,255,255,0.1); border-color:rgba(255,255,255,0.2); color:white">
                            <i class="fas fa-edit"></i> 냉연 데이터 수정
                        </button>
                        <button class="btn-edit" onclick="openBulkEditModal('productionColorReports')" style="margin-right:8px; background:rgba(255,255,255,0.1); border-color:rgba(255,255,255,0.2); color:white">
                            <i class="fas fa-edit"></i> 칼라 데이터 수정
                        </button>
                        <button class="btn-edit" onclick="openBulkEditModal('maintenanceTeam')" style="background:rgba(255,255,255,0.1); border-color:rgba(255,255,255,0.2); color:white">
                            <i class="fas fa-tools"></i> 설비/유틸리티 수정
                        </button>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header" style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; overflow-x: auto; padding: 0 16px;">
                    <div class="sub-tabs" style="margin-bottom: -1px; display: flex; white-space: nowrap; min-width: max-content;">
                        ${tabs.map((tab, idx) => `
                            <button class="sub-tab ${idx === 0 ? 'active' : ''}" data-tab="${tab.id}" style="padding:16px 20px; font-weight:600;">${tab.label}</button>
                        `).join('')}
                    </div>
                </div>
                <div class="card-body" id="integrated-report-content" style="padding: 24px; min-height: 500px;">
                    <!-- 탭 컨텐츠 동적 렌더링 -->
                </div>
            </div>
        `;

        const contentArea = container.querySelector('#integrated-report-content');

        const renderTab = (tabId) => {
            if (tabId === 'summary') {
                this.renderTeamSummaryTab(contentArea, lines);
            } else if (tabId === 'maintenance') {
                this.renderMaintenanceTeamReport(contentArea);
            } else {
                const sectionKey = ['CPL', 'CRM', 'CGL'].includes(tabId) ? 'productionColdReports' : 'productionColorReports';
                this.renderLineDetailTab(contentArea, sectionKey, tabId);
            }
        };

        renderTab('summary');

        container.querySelectorAll('.sub-tab').forEach(tab => {
            tab.addEventListener('click', function () {
                container.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                renderTab(this.dataset.tab);
            });
        });
    },


    renderProductionMetricTab(container, tabId, lines, tabs) {
        const coldData = dataManager.getSectionData('productionColdReports');
        const colorData = dataManager.getSectionData('productionColorReports');
        const curIdx = dataManager.data.meta.month - 1;

        const getLineData = (line) => {
            const isCold = ['CPL', 'CRM', 'CGL'].includes(line);

            // 전역 섹션에서 데이터 취합
            const yData = dataManager.getSectionData('yield');
            const oData = dataManager.getSectionData('operationRate');
            const tData = dataManager.getSectionData('tonPower');
            const pData = dataManager.getSectionData('power');
            const lData = dataManager.getSectionData('lng');
            const costData = dataManager.getSectionData('costReduction');

            return {
                mfgCost: {
                    unitCost: costData.lineData?.unitCost?.[line] || {},
                    improvement: costData.lineData?.improvement?.[line] || {}
                },
                metrics: {
                    yield: yData[line] || {},
                    operRate: oData[line] || {},
                    tonPower: tData[line] || {},
                    power: pData[line] || {},
                    lng: lData[line] || {}
                }
            };
        };

        if (tabId === 'summary') {
            this.renderTeamSummaryTab(container, lines);
            return;
        }

        // 공통 테이블 헤더
        let html = `
            <div class="report-header" style="margin-bottom:20px; border-left:4px solid var(--seah-red); padding-left:12px; display:flex; justify-content:space-between; align-items:center;">
                <h4 style="margin:0; font-size:18px;">${tabs.find(t => t.id === tabId).label} 상세 현황</h4>
                <span style="font-size:13px; color:#64748b">단위: ${this.getMetricUnit(tabId)}</span>
            </div>
            <div class="data-table-wrapper">
                <table class="data-table">
                    <thead>
                        <tr style="background:#f1f5f9">
                            <th>구분</th>
                            <th>라인</th>
                            <th>전년 평균</th>
                            <th>전월 실적</th>
                            <th>당월 실적</th>
                            <th>목표</th>
                            <th>달성률/차이</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        lines.forEach(line => {
            const data = getLineData(line);
            let val = '-', prev = '-', y24 = '-', target = '-';
            let higherIsBetter = true;

            const m = data.mfgCost || {};
            const mt = data.metrics || {};

            switch (tabId) {
                case 'mfgCost':
                    val = m.prodActual?.monthly?.[curIdx];
                    target = m.prodTarget?.monthly?.[curIdx];
                    y24 = m.prodActual?.yearly?.[3];
                    prev = curIdx > 0 ? m.prodActual?.monthly?.[curIdx - 1] : '-';
                    break;
                case 'yield':
                    val = mt.yield?.monthly?.[curIdx];
                    target = 99.5;
                    y24 = mt.yield?.yearly?.[3];
                    prev = curIdx > 0 ? mt.yield?.monthly?.[curIdx - 1] : '-';
                    break;
                case 'operRate':
                    val = mt.operRate?.monthly?.[curIdx];
                    target = 90;
                    y24 = mt.operRate?.yearly?.[3];
                    prev = curIdx > 0 ? mt.operRate?.monthly?.[curIdx - 1] : '-';
                    break;
                case 'tonPower':
                    val = mt.tonPower?.monthly?.[curIdx];
                    target = mt.tonPower?.target || 13.5;
                    y24 = mt.tonPower?.yearly?.[3];
                    prev = curIdx > 0 ? mt.tonPower?.monthly?.[curIdx - 1] : '-';
                    break;
                case 'utility':
                    val = mt.electricity?.monthly?.[curIdx];
                    target = mt.electricity?.target || 22.0;
                    y24 = mt.electricity?.yearly?.[3];
                    prev = curIdx > 0 ? mt.electricity?.monthly?.[curIdx - 1] : '-';
                    higherIsBetter = false;
                    break;
                case 'defects':
                    val = mt.yield ? (100 - mt.yield.monthly[curIdx]).toFixed(2) : '-';
                    target = 0.5;
                    higherIsBetter = false;
                    break;
                case 'breakdown':
                    val = mt.irregFail?.monthly?.[curIdx];
                    target = 2.0;
                    y24 = mt.irregFail?.yearly?.[3];
                    prev = curIdx > 0 ? mt.irregFail?.monthly?.[curIdx - 1] : '-';
                    higherIsBetter = false;
                    break;
                case 'unitCost':
                    val = m.variable?.monthly?.[curIdx];
                    target = m.unitCostTarget;
                    y24 = m.variable?.yearly?.[3];
                    prev = curIdx > 0 ? m.variable?.monthly?.[curIdx - 1] : '-';
                    higherIsBetter = false;
                    break;
            }

            const diffVal = (val !== '-' && target !== '-' && target !== 0 && val !== null && target !== null) ?
                (higherIsBetter ? ((val / target) * 100).toFixed(1) + '%' : (val - target).toFixed(2)) : '-';
            const diffColor = (diffVal !== '-' && ((higherIsBetter && parseFloat(diffVal) >= 100) || (!higherIsBetter && parseFloat(diffVal) <= 0))) ? '#10b981' : '#ef4444';

            html += `
                <tr>
                    <td style="color:#64748b; font-size:12px">${['CPL', 'CRM', 'CGL'].includes(line) ? '냉연' : '칼라'}</td>
                    <td><strong>${line}</strong></td>
                    <td>${formatNumber(y24)}</td>
                    <td>${formatNumber(prev)}</td>
                    <td style="font-weight:700; color:var(--seah-red)">${formatNumber(val)}</td>
                    <td>${formatNumber(target)}</td>
                    <td style="font-weight:600; color:${diffColor}">${diffVal}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
            <div class="chart-container" style="height:350px; margin-top:30px; background:#f8fafc; padding:20px; border-radius:12px;">
                <canvas id="chart-metric-detail"></canvas>
            </div>
        `;

        container.innerHTML = html;

        // 차트 렌더링
        setTimeout(() => {
            destroyChart('chart-metric-detail');
            const ctx = document.getElementById('chart-metric-detail').getContext('2d');
            const metricLabel = tabs.find(t => t.id === tabId).label;

            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: lines,
                    datasets: [
                        {
                            label: '당월 실적',
                            data: lines.map(l => {
                                const d = getLineData(l);
                                const m = d.mfgCost || {};
                                const mt = d.metrics || {};
                                switch (tabId) {
                                    case 'mfgCost': return m.prodActual?.monthly?.[curIdx] || 0;
                                    case 'yield': return mt.yield?.monthly?.[curIdx] || 0;
                                    case 'operRate': return mt.operRate?.monthly?.[curIdx] || 0;
                                    case 'tonPower': return mt.tonPower?.monthly?.[curIdx] || 0;
                                    case 'utility': return mt.electricity?.monthly?.[curIdx] || 0;
                                    case 'defects': return mt.yield ? (100 - mt.yield.monthly[curIdx]) : 0;
                                    case 'breakdown': return mt.irregFail?.monthly?.[curIdx] || 0;
                                    case 'unitCost': return m.variable?.monthly?.[curIdx] || 0;
                                    default: return 0;
                                }
                            }),
                            backgroundColor: 'rgba(239, 68, 68, 0.7)',
                            borderColor: '#ef4444',
                            borderWidth: 1,
                            borderRadius: 6
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top' },
                        title: { display: true, text: `라인별 ${metricLabel} 비교` }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: '#e2e8f0' },
                            grace: '15%'
                        },
                        x: { grid: { display: false } }
                    }
                },
                plugins: [{
                    id: 'metricBarLabels',
                    afterDatasetsDraw(chart) {
                        const { ctx: c } = chart;
                        chart.data.datasets[0].data.forEach((value, i) => {
                            if (value === null || value === undefined) return;
                            const bar = chart.getDatasetMeta(0).data[i];
                            if (!bar) return;
                            c.save();
                            c.textAlign = 'center';
                            c.font = 'bold 11px "Noto Sans KR"';
                            c.fillStyle = '#ef4444';
                            const displayVal = Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2);
                            c.fillText(displayVal, bar.x, bar.y - 6);
                            c.restore();
                        });
                    }
                }]
            });
        }, 50);
    },

    getMetricUnit(tabId) {
        switch (tabId) {
            case 'mfgCost': return '톤(Ton)';
            case 'yield': case 'operRate': return '%';
            case 'tonPower': return 'T/H';
            case 'utility': return 'kWh/T';
            case 'defects': return '%';
            case 'breakdown': return '시간(hr)';
            case 'unitCost': return '원/톤';
            default: return '-';
        }
    },

    renderTeamSummaryTab(container, lines) {
        const coldData = dataManager.getSectionData('productionColdReports');
        const colorData = dataManager.getSectionData('productionColorReports');
        const meta = dataManager.data.meta;
        const curIdx = meta.month - 1;

        container.innerHTML = `
            <div class="report-section">
                <div class="report-header" style="display:flex; align-items:center; gap:10px; margin-bottom:20px; border-left:4px solid var(--seah-red); padding-left:12px;">
                    <i class="fas fa-chart-pie" style="color:var(--seah-red); font-size:18px;"></i>
                    <h4 style="margin:0; font-size:18px;">전사 주요 지표 현황 (종합)</h4>
                </div>
                <div class="data-table-wrapper">
                    <table class="data-table">
                        <thead>
                            <tr style="background:#f1f5f9">
                                <th>구분</th>
                                <th>라인</th>
                                <th>생산목표 (톤)</th>
                                <th>생산실적 (톤)</th>
                                <th>달성률 (%)</th>
                                <th>A급 수율 (%)</th>
                                <th>실가동률 (%)</th>
                                <th>톤파워 (T/H)</th>
                                <th>전력 (kWh/T)</th>
                                <th>LNG (Nm3/T)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${lines.map(line => {
            const sectionKey = ['CPL', 'CRM', 'CGL'].includes(line) ? 'productionColdReports' : 'productionColorReports';
            const d = sectionKey === 'productionColdReports' ? coldData : colorData;
            const report = d[line] || {};
            const m = report.mfgCost || { prodTarget: { monthly: [] }, prodActual: { monthly: [] } };
            const mt = report.metrics || { yield: { monthly: [] }, operRate: { monthly: [] }, tonPower: { monthly: [] }, utility: { elec: { monthly: [] }, fuel: { monthly: [] } } };

            const target = m.prodTarget?.monthly?.[curIdx] || 0;
            const actual = m.prodActual?.monthly?.[curIdx] || 0;
            const rate = target > 0 ? Math.round(actual / target * 100) : '-';

            return `
                                    <tr>
                                        <td style="background:#f8fafc; font-weight:500; font-size:12px; color:#64748b">${['CPL', 'CRM', 'CGL'].includes(line) ? '냉연' : '칼라'}</td>
                                        <td><strong>${line}</strong></td>
                                        <td>${formatNumber(target)}</td>
                                        <td>${formatNumber(actual)}</td>
                                        <td class="${rate >= 100 ? 'positive-val' : 'negative-val'}">${rate}%</td>
                                        <td>${mt.yield?.monthly?.[curIdx] || '-'}%</td>
                                        <td>${mt.operRate?.monthly?.[curIdx] || '-'}%</td>
                                        <td>${mt.tonPower?.monthly?.[curIdx] || '-'}</td>
                                        <td>${mt.utility?.elec?.monthly?.[curIdx] || '-'}</td>
                                        <td>${mt.utility?.fuel?.monthly?.[curIdx] || '-'}</td>
                                    </tr>
                                `;
        }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="grid-2" style="margin-top:24px; gap:24px;">
                <div class="card shadow-sm" style="border: 1px solid #e2e8f0; border-radius: 12px;">
                    <div class="card-header" style="padding:16px; border-bottom:1px solid #f1f5f9"><h5 style="margin:0; font-size:15px;"><i class="fas fa-chart-pie" style="margin-right:8px; color:#94a3b8"></i> 전 라인 생산 비중</h5></div>
                    <div class="card-body" style="padding:24px">
                        <div class="chart-container" style="height:280px">
                            <canvas id="chart-team-prod-pie"></canvas>
                        </div>
                    </div>
                </div>
                <div class="card shadow-sm" style="border: 1px solid #e2e8f0; border-radius: 12px;">
                    <div class="card-header" style="padding:16px; border-bottom:1px solid #f1f5f9"><h5 style="margin:0; font-size:15px;"><i class="fas fa-chart-bar" style="margin-right:8px; color:#94a3b8"></i> 라인별 목표 대비 생산 실적</h5></div>
                    <div class="card-body" style="padding:24px">
                        <div class="chart-container" style="height:280px">
                            <canvas id="chart-team-prod-compare"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        `;

        setTimeout(() => {
            const prodData = lines.map(line => {
                const sectionKey = ['CPL', 'CRM', 'CGL'].includes(line) ? 'productionColdReports' : 'productionColorReports';
                const d = sectionKey === 'productionColdReports' ? coldData : colorData;
                return d[line]?.mfgCost?.prodActual?.monthly?.[curIdx] || 0;
            });
            const targetData = lines.map(line => {
                const sectionKey = ['CPL', 'CRM', 'CGL'].includes(line) ? 'productionColdReports' : 'productionColorReports';
                const d = sectionKey === 'productionColdReports' ? coldData : colorData;
                return d[line]?.mfgCost?.prodTarget?.monthly?.[curIdx] || 0;
            });

            destroyChart('chart-team-prod-pie');
            new Chart(document.getElementById('chart-team-prod-pie'), {
                type: 'doughnut',
                data: {
                    labels: lines,
                    datasets: [{
                        data: prodData,
                        backgroundColor: [...CHART_COLORS.lineColors, '#6366f1', '#ec4899'],
                        borderWidth: 0,
                        hoverOffset: 15
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '65%',
                    plugins: {
                        legend: { display: true, position: 'bottom', labels: { usePointStyle: true, padding: 15, font: { size: 11 } } },
                        tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', padding: 12, borderRadius: 8 }
                    }
                },
                plugins: [{
                    id: 'doughnutLabels',
                    afterDatasetsDraw(chart) {
                        const { ctx: c } = chart;
                        const dataset = chart.data.datasets[0];
                        const total = dataset.data.reduce((a, b) => a + (b || 0), 0);
                        const meta = chart.getDatasetMeta(0);
                        meta.data.forEach((arc, i) => {
                            const value = dataset.data[i];
                            if (!value) return;
                            const pct = total > 0 ? Math.round(value / total * 100) : 0;
                            const centerAngle = (arc.startAngle + arc.endAngle) / 2;
                            const outerRadius = arc.outerRadius;
                            const innerRadius = arc.innerRadius;
                            const midRadius = (outerRadius + innerRadius) / 2;
                            const x = arc.x + Math.cos(centerAngle) * midRadius;
                            const y = arc.y + Math.sin(centerAngle) * midRadius;
                            c.save();
                            c.textAlign = 'center';
                            c.textBaseline = 'middle';
                            c.font = 'bold 10px "Noto Sans KR"';
                            c.fillStyle = '#fff';
                            if (pct >= 5) {
                                c.fillText(pct + '%', x, y);
                            }
                            c.restore();
                        });
                    }
                }]
            });

            createGroupedBarChart('chart-team-prod-compare', {
                labels: lines,
                datasets: [
                    { label: '목표', data: targetData },
                    { label: '실적', data: prodData }
                ],
                unit: '톤'
            });
        }, 100);
    },

    renderLineDetailTab(container, sectionKey, line) {
        // 기존 sectionKey(productionColdReports/ColorReports) 외에 
        // 전역 섹션들에서 데이터를 취합하여 일관성 유지
        const yieldData = dataManager.getSectionData('yield')[line] || { yearly: [], monthly: [] };
        const operData = dataManager.getSectionData('operationRate')[line] || { yearly: [], monthly: [] };
        const tonData = dataManager.getSectionData('tonPower')[line] || { yearly: [], monthly: [] };
        const powerData = dataManager.getSectionData('power')[line] || { yearly: [], monthly: [] };
        const lngData = dataManager.getSectionData('lng')[line] || { yearly: [], monthly: [] };
        const costData = dataManager.getSectionData('costReduction').lineData || { unitCost: {}, improvement: {} };

        // 상세 리포트 자체 데이터 (하이라이트, 이슈 등)
        const d = dataManager.getSectionData(sectionKey);
        const report = d[line] || { highlights: '', issues: '', plans: '', pdfUrl: '' };

        const meta = dataManager.data.meta;
        const curIdx = meta.month - 1;

        container.innerHTML = `
            <div class="line-detail-container">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; padding-bottom:16px; border-bottom:2px solid #f1f5f9">
                    <h4 style="margin:0; color:var(--seah-red); font-size:20px;"><i class="fas fa-microchip"></i> ${line} 라인 상세 실적 보고</h4>
                    <button class="btn-edit-sm" onclick="openEditModal('${sectionKey}', '${line}')" style="padding: 8px 14px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer; font-size:13px; font-weight:500;">
                        <i class="fas fa-edit" style="margin-right:6px"></i> 데이터 수정
                    </button>
                </div>

                <!-- 2. 생산실적 -->
                <div class="report-section mb-10">
                    <div class="report-header" style="display:flex; align-items:center; gap:10px; margin-bottom:16px; border-left:4px solid #3b82f6; padding-left:12px;">
                        <i class="fas fa-industry" style="color:#3b82f6"></i>
                        <h4 style="margin:0">생산실적</h4>
                    </div>
                    <div class="grid-2" style="gap:24px">
                        <div class="chart-container shadow-sm" style="height:300px; padding:16px; background:#fff; border:1px solid #f1f5f9; border-radius:12px">
                            <canvas id="chart-prod-trend-${line}"></canvas>
                        </div>
                        <div class="info-side">
                            <div class="data-table-wrapper shadow-sm" style="border-radius:12px; overflow:hidden">
                                <table class="data-table">
                                    <thead>
                                        <tr style="background:#f8fafc"><th>구분</th><th>단위</th><th>목표</th><th>실적</th><th>달성률</th></tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td><strong>당월 생산량</strong></td><td>톤</td>
                                            <td>${formatNumber(dataManager.data.costReduction?.production?.plan)}</td>
                                            <td>${formatNumber(dataManager.data.costReduction?.production?.actual)}</td>
                                            <td class="positive-val"><strong>${dataManager.data.costReduction?.production?.plan ? Math.round(dataManager.data.costReduction.production.actual / dataManager.data.costReduction.production.plan * 100) : '-'}%</strong></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div class="report-text-card" style="margin-top:16px; background:#f8fafc; border:1px dashed #cbd5e1; border-radius:12px; padding:20px; min-height:100px;">
                                <div style="font-weight:700; color:var(--text-primary); margin-bottom:10px; font-size:14px;"><i class="fas fa-comment-alt" style="margin-right:6px; color:#3b82f6"></i> 주요 실적 하이라이트</div>
                                <div style="font-size:13px; line-height:1.7; color:var(--text-secondary)">
                                    ${report.highlights ? report.highlights.replace(/\n/g, '<br>') : '내역 없음'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 3. 제조원가 -->
                <div class="report-section mb-10">
                    <div class="report-header" style="display:flex; align-items:center; gap:10px; margin-bottom:16px; border-left:4px solid #10b981; padding-left:12px;">
                        <i class="fas fa-coins" style="color:#10b981"></i>
                        <h4 style="margin:0">제조원가 분석 (원/톤)</h4>
                    </div>
                    ${this.renderMfgCostTable(line, {
            mfgCost: {
                unitCost: costData.unitCost[line] || {},
                improvement: costData.improvement[line] || {}
            }
        })}
                </div>

                <div class="grid-2 mt-20" style="gap:24px">
                    <div class="report-section">
                        <div class="report-header" style="display:flex; align-items:center; gap:10px; margin-bottom:16px; border-left:4px solid #10b981; padding-left:12px;">
                            <i class="fas fa-bullseye" style="color:#10b981"></i>
                            <h4 style="margin:0">수율 현황 (%)</h4>
                        </div>
                        <div class="chart-container"><canvas id="chart-yield-${line}"></canvas></div>
                    </div>
                    <div class="report-section">
                        <div class="report-header" style="display:flex; align-items:center; gap:10px; margin-bottom:16px; border-left:4px solid #f59e0b; padding-left:12px;">
                            <i class="fas fa-tachometer-alt" style="color:#f59e0b"></i>
                            <h4 style="margin:0">가동률 현황 (%)</h4>
                        </div>
                        <div class="chart-container"><canvas id="chart-oper-${line}"></canvas></div>
                    </div>
                    <div class="report-section">
                        <div class="report-header" style="display:flex; align-items:center; gap:10px; margin-bottom:16px; border-left:4px solid #6366f1; padding-left:12px;">
                            <i class="fas fa-bolt" style="color:#6366f1"></i>
                            <h4 style="margin:0">T/H (톤파워)</h4>
                        </div>
                        <div class="chart-container"><canvas id="chart-tonpower-${line}"></canvas></div>
                    </div>
                    <div class="report-section">
                        <div class="report-header" style="display:flex; align-items:center; gap:10px; margin-bottom:16px; border-left:4px solid #0ea5e9; padding-left:12px;">
                            <i class="fas fa-plug" style="color:#0ea5e9"></i>
                            <h4 style="margin:0">유틸리티 (원단위)</h4>
                        </div>
                        <div class="chart-container"><canvas id="chart-utility-${line}"></canvas></div>
                    </div>
                    <div class="report-section">
                        <div class="report-header" style="display:flex; align-items:center; gap:10px; margin-bottom:16px; border-left:4px solid #ef4444; padding-left:12px;">
                            <i class="fas fa-recycle" style="color:#ef4444"></i>
                            <h4 style="margin:0">불량 및 스크랩</h4>
                        </div>
                        <div class="chart-container"><canvas id="chart-defects-${line}"></canvas></div>
                    </div>
                    <div class="report-section">
                        <div class="report-header" style="display:flex; align-items:center; gap:10px; margin-bottom:16px; border-left:4px solid #f97316; padding-left:12px;">
                            <i class="fas fa-wrench" style="color:#f97316"></i>
                            <h4 style="margin:0">고장 및 비가동</h4>
                        </div>
                        <div class="chart-container"><canvas id="chart-maintenance-${line}"></canvas></div>
                    </div>
                </div>

                <div class="report-section mt-24">
                    <div class="report-header" style="display:flex; align-items:center; gap:10px; margin-bottom:12px; border-left:4px solid #8b5cf6; padding-left:12px;">
                        <i class="fas fa-list-check" style="color:#8b5cf6"></i>
                        <h4 style="margin:0">주요 원단위 현황</h4>
                    </div>
                    <div class="data-table-wrapper" style="border-radius:12px">
                        <table class="data-table">
                            <thead>
                                <tr style="background:#f8fafc">
                                    <th>구분</th><th>단위</th><th>24년 실적</th><th>25년 목표</th><th>전월 (${meta.month - 1}월)</th><th>${meta.month}월 실적</th><th>전월대비</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><strong>전력 원단위</strong></td><td>kW/T</td>
                                    <td>${formatNumber(powerData.yearly?.[0])}</td>
                                    <td>${formatNumber(powerData.target)}</td>
                                    <td>${formatNumber(powerData.monthly?.[curIdx - 1])}</td>
                                    <td>${formatNumber(powerData.monthly?.[curIdx])}</td>
                                    <td>${this.getDiffLabel(powerData.monthly, curIdx)}</td>
                                </tr>
                                <tr>
                                    <td><strong>LNG 원단위</strong></td><td>Nm3/T</td>
                                    <td>${formatNumber(lngData.yearly?.[0])}</td>
                                    <td>${formatNumber(lngData.target)}</td>
                                    <td>${formatNumber(lngData.monthly?.[curIdx - 1])}</td>
                                    <td>${formatNumber(lngData.monthly?.[curIdx])}</td>
                                    <td>${this.getDiffLabel(lngData.monthly, curIdx)}</td>
                                </tr>
                                <tr>
                                    <td><strong>수율</strong></td><td>%</td>
                                    <td>${formatNumber(yieldData.yearly?.[0])}</td>
                                    <td>${formatNumber(yieldData.target)}</td>
                                    <td>${formatNumber(yieldData.monthly?.[curIdx - 1])}</td>
                                    <td>${formatNumber(yieldData.monthly?.[curIdx])}</td>
                                    <td>${this.getDiffLabel(yieldData.monthly, curIdx, true)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        setTimeout(() => {
            const labels = [...YEARS.slice(0, 3), ...MONTHS];
            // 통합된 mt 객체 생성
            const mt = {
                yield: yieldData,
                operRate: operData,
                tonPower: tonData,
                utility: { elec: powerData, fuel: lngData },
                regReplace: report.metrics?.regReplace || { monthly: [] },
                irregFail: report.metrics?.irregFail || { monthly: [] },
                defects: report.metrics?.defects || {}
            };

            // 2. 생산실적 트렌드
            createYearlyMonthlyBarChart(`chart-prod-trend-${line}`, {
                labels: labels,
                yearly: report.mfgCost?.prodTarget?.yearly || [],
                monthly: report.mfgCost?.prodActual?.monthly || [],
                target: report.mfgCost?.prodTarget?.monthly?.[curIdx],
                higherIsBad: false
            });

            // 4. 수율
            createCommonTrendChart(`chart-yield-${line}`, {
                labels: labels,
                datasets: [{ label: '수율 (%)', type: 'line', data: [...(yieldData.yearly || []), ...(yieldData.monthly || [])], borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true }]
            });

            // 5. 가동률
            createCommonTrendChart(`chart-oper-${line}`, {
                labels: labels,
                datasets: [{ label: '가동률 (%)', type: 'line', data: [...(operData.yearly || []), ...(operData.monthly || [])], borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', fill: true }]
            });

            // 6. T/H
            createCommonTrendChart(`chart-tonpower-${line}`, {
                labels: labels,
                datasets: [{ label: 'T/H', type: 'bar', data: [...(tonData.yearly || []), ...(tonData.monthly || [])], backgroundColor: '#8b5cf6' }]
            });

            // 7. 유틸리티
            createCommonTrendChart(`chart-utility-${line}`, {
                labels: labels,
                datasets: [
                    { label: '전력 (kW/T)', type: 'line', data: [...(powerData.yearly || []), ...(powerData.monthly || [])], borderColor: '#3b82f6' },
                    { label: 'LNG (Nm3/T)', type: 'line', data: [...(lngData.yearly || []), ...(lngData.monthly || [])], borderColor: '#f87171' }
                ]
            });

            // 8. 불량
            const colors = ['#f87171', '#fbbf24', '#34d399', '#60a5fa'];
            const defectKeys = Object.keys(mt.defects || {});
            createCommonTrendChart(`chart-defects-${line}`, {
                labels: labels,
                datasets: defectKeys.map((key, idx) => ({
                    label: key, type: 'bar', data: [...(mt.defects[key].yearly || []), ...(mt.defects[key].monthly || [])], backgroundColor: colors[idx % colors.length]
                })),
                yTitle: '(건수)'
            });

            // 9. 고장/비가동
            createCommonTrendChart(`chart-maintenance-${line}`, {
                labels: labels,
                datasets: [
                    { label: '정기수선 (H)', type: 'bar', data: [...(mt.regReplace?.yearly || []), ...(mt.regReplace?.monthly || [])], backgroundColor: '#6366f1' },
                    { label: '고장/비관련 (H)', type: 'bar', data: [...(mt.irregFail?.yearly || []), ...(mt.irregFail?.monthly || [])], backgroundColor: '#ec4899' }
                ],
                yTitle: '(H)'
            });

        }, 100);
    },

    renderMfgCostTable(line, report) {
        const m = report.mfgCost;
        const years = YEARS.slice(0, 3);
        const months = MONTHS;

        let html = `
            <div class="data-table-wrapper" style="overflow-x:auto">
                <table class="data-table">
                    <thead>
                        <tr style="background:#f1f5f9">
                            <th>구분</th>
                            ${years.map(y => `<th>${y}</th>`).join('')}
                            ${months.map(m => `<th>${m}</th>`).join('')}
                            <th>누적/평균</th>
                        </tr>
                    </thead>
                    <tbody>`;

        const rows = [
            { label: '고정비 (원/T)', data: m.fixed },
            { label: '변동비 (원/T)', data: m.variable },
            { label: '생산량 (톤)', data: m.prodActual }
        ];

        rows.forEach(row => {
            html += `<tr><td>${row.label}</td>`;
            years.forEach((_, i) => {
                html += `<td>${formatNumber(row.data.yearly?.[i])}</td>`;
            });
            let sum = 0, count = 0;
            months.forEach((_, i) => {
                const val = row.data.monthly?.[i];
                html += `<td>${formatNumber(val)}</td>`;
                if (val !== null && val !== undefined) { sum += val; count++; }
            });
            const avg = count > 0 ? (row.label.includes('생산량') ? sum : Math.round(sum / count)) : 0;
            html += `<td class="avg-val" style="background:#f8fafc; font-weight:700">${formatNumber(avg)}</td></tr>`;
        });

        html += `</tbody></table></div>`;
        return html;
    },

    /*------------------------------------------
       20. 설비팀 상세실적
      ------------------------------------------ */
    maintenanceTeam(container) {
        this.renderMaintenanceTeamReport(container);
    },

    renderMaintenanceTeamReport(container) {
        const data = dataManager.getSectionData('maintenanceTeam');
        const meta = dataManager.data.meta;
        const curIdx = meta.month - 1;

        container.innerHTML = `
            <div class="card" style="margin-bottom:20px">
                <div class="card-header" style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white;">
                    <h3 style="margin:0"><i class="fas fa-tools" style="margin-right:12px; color:#f59e0b"></i>설비/유틸리티 상세 실적</h3>
                </div>
            </div>

            <div class="report-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 20px;">
                <!-- 1. 에너지 저감 실적 -->
                <div class="card">
                    <div class="card-header" style="background:#f8fafc; border-bottom:1px solid #e2e8f0;">
                        <h4 style="margin:0; font-size:16px;"><i class="fas fa-leaf" style="color:#22c55e; margin-right:8px;"></i>에너지 저감 실적</h4>
                    </div>
                    <div class="card-body">
                        <div style="height:250px;"><canvas id="energy-reduction-chart"></canvas></div>
                        <div class="data-table-wrapper" style="margin-top:15px;">
                            <table class="data-table mini">
                                <thead>
                                    <tr>
                                        <th>구분</th>
                                        <th>라인별</th>
                                        <th>배기폐열</th>
                                        <th>태양광</th>
                                        <th>인버터</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>실적 (MWh)</td>
                                        <td>${formatNumber(data.energyReduction?.byLine?.monthly?.[curIdx])}</td>
                                        <td>${formatNumber(data.energyReduction?.exhaustWasteHeat?.monthly?.[curIdx])}</td>
                                        <td>${formatNumber(data.energyReduction?.solarPower?.monthly?.[curIdx])}</td>
                                        <td>${formatNumber(data.energyReduction?.inverterDrive?.monthly?.[curIdx])}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div class="analysis-box" style="margin-top:10px; padding:10px; background:#f0fdf4; border-left:4px solid #22c55e; font-size:13px; color:#15803d;">
                            <strong>분석:</strong> ${data.energyReduction?.analysis || '데이터가 없습니다.'}
                        </div>
                    </div>
                </div>

                <!-- 2. 설비 비가동 현황 -->
                <div class="card">
                    <div class="card-header" style="background:#f8fafc; border-bottom:1px solid #e2e8f0;">
                        <h4 style="margin:0; font-size:16px;"><i class="fas fa-exclamation-triangle" style="color:#ef4444; margin-right:8px;"></i>설비 비가동 현황</h4>
                    </div>
                    <div class="card-body">
                        <div style="height:250px;"><canvas id="maintenance-downtime-chart"></canvas></div>
                        <div class="data-table-wrapper" style="margin-top:15px;">
                            <table class="data-table mini">
                                <thead>
                                    <tr>
                                        <th>구분</th>
                                        <th>목표 (hr)</th>
                                        <th>실적 (hr)</th>
                                        <th>차이</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>총 비가동 시간</td>
                                        <td>${formatNumber(data.downtime?.total?.target)}</td>
                                        <td>${formatNumber(data.downtime?.total?.monthly?.[curIdx])}</td>
                                        <td>${this.getDiffLabel(data.downtime?.total?.monthly, curIdx, false)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div class="analysis-box" style="margin-top:10px; padding:10px; background:#fef2f2; border-left:4px solid #ef4444; font-size:13px; color:#991b1b;">
                            <strong>분석:</strong> ${data.downtime?.analysis || '데이터가 없습니다.'}
                        </div>
                    </div>
                </div>

                <!-- 3. 수선비 집행실적 -->
                <div class="card">
                    <div class="card-header" style="background:#f8fafc; border-bottom:1px solid #e2e8f0;">
                        <h4 style="margin:0; font-size:16px;"><i class="fas fa-won-sign" style="color:#3b82f6; margin-right:8px;"></i>수선비 집행실적</h4>
                    </div>
                    <div class="card-body">
                        <div style="height:250px;"><canvas id="repair-cost-chart"></canvas></div>
                        <div class="data-table-wrapper" style="margin-top:15px;">
                            <table class="data-table mini">
                                <thead>
                                    <tr>
                                        <th>구분</th>
                                        <th>예산 (백만)</th>
                                        <th>실적 (백만)</th>
                                        <th>집행률 (%)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>총 수선비</td>
                                        <td>${formatNumber(data.repairCost?.total?.target)}</td>
                                        <td>${formatNumber(data.repairCost?.total?.monthly?.[curIdx])}</td>
                                        <td style="font-weight:700">${data.repairCost?.total?.target > 0 ? Math.round(data.repairCost.total.monthly[curIdx] / data.repairCost.total.target * 100) : '-'}%</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div class="analysis-box" style="margin-top:10px; padding:10px; background:#eff6ff; border-left:4px solid #3b82f6; font-size:13px; color:#1e40af;">
                            <strong>분석:</strong> ${data.repairCost?.analysis || '데이터가 없습니다.'}
                        </div>
                    </div>
                </div>

                <!-- 4. 유틸리티 사용 실적 -->
                <div class="card">
                    <div class="card-header" style="background:#f8fafc; border-bottom:1px solid #e2e8f0;">
                        <h4 style="margin:0; font-size:16px;"><i class="fas fa-bolt" style="color:#f59e0b; margin-right:8px;"></i>유틸리티 사용 실적</h4>
                    </div>
                    <div class="card-body">
                        <div style="height:250px;"><canvas id="utility-usage-chart"></canvas></div>
                        <div class="data-table-wrapper" style="margin-top:15px;">
                            <table class="data-table mini">
                                <thead>
                                    <tr>
                                        <th>구분</th>
                                        <th>전력 (kWh/T)</th>
                                        <th>LNG (Nm3/T)</th>
                                        <th>용수 (T)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>사용 원단위</td>
                                        <td>${formatNumber(data.utility?.electricity?.monthly?.[curIdx])}</td>
                                        <td>${formatNumber(data.utility?.lng?.monthly?.[curIdx])}</td>
                                        <td>${formatNumber(data.utility?.water?.monthly?.[curIdx])}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div class="analysis-box" style="margin-top:10px; padding:10px; background:#fffbeb; border-left:4px solid #f59e0b; font-size:13px; color:#92400e;">
                            <strong>분석:</strong> ${data.utility?.analysis || '데이터가 없습니다.'}
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.renderMaintenanceCharts(data, curIdx);
    },

    renderMaintenanceCharts(data, curIdx) {
        // Energy Reduction Chart
        const energyCtx = document.getElementById('energy-reduction-chart').getContext('2d');
        new Chart(energyCtx, {
            type: 'bar',
            data: {
                labels: ['라인별', '배기폐열', '태양광', '인버터'],
                datasets: [{
                    label: '에너지 저감량 (MWh)',
                    data: [
                        data.energyReduction?.byLine?.monthly?.[curIdx] || 0,
                        data.energyReduction?.exhaustWasteHeat?.monthly?.[curIdx] || 0,
                        data.energyReduction?.solarPower?.monthly?.[curIdx] || 0,
                        data.energyReduction?.inverterDrive?.monthly?.[curIdx] || 0
                    ],
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'],
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'MWh' }, grace: '15%' },
                    x: { grid: { display: false } }
                }
            },
            plugins: [{
                id: 'energyBarLabels',
                afterDatasetsDraw(chart) {
                    const { ctx: c } = chart;
                    chart.data.datasets[0].data.forEach((value, i) => {
                        if (!value) return;
                        const bar = chart.getDatasetMeta(0).data[i];
                        if (!bar) return;
                        c.save();
                        c.textAlign = 'center';
                        c.font = 'bold 12px "Noto Sans KR"';
                        c.fillStyle = '#1e293b';
                        c.fillText(value.toFixed(2), bar.x, bar.y - 6);
                        c.restore();
                    });
                }
            }]
        });

        // Downtime Chart (Pie/Doughnut)
        const downtimeCtx = document.getElementById('maintenance-downtime-chart').getContext('2d');
        const lines = ['CPL', 'CRM', 'CGL', '1CCL', '2CCL', '3CCL'];
        new Chart(downtimeCtx, {
            type: 'doughnut',
            data: {
                labels: lines,
                datasets: [{
                    data: lines.map(line => data.downtime?.byLine?.[line]?.monthly?.[curIdx] || 0),
                    backgroundColor: ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#64748b'],
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right' },
                    title: { display: true, text: '라인별 비가동 시간 비중 (hr)' }
                }
            },
            plugins: [{
                id: 'downtimeDoughnutLabels',
                afterDatasetsDraw(chart) {
                    const { ctx: c } = chart;
                    const dataset = chart.data.datasets[0];
                    const total = dataset.data.reduce((a, b) => a + (b || 0), 0);
                    const meta = chart.getDatasetMeta(0);
                    meta.data.forEach((arc, i) => {
                        const value = dataset.data[i];
                        if (!value) return;
                        const pct = total > 0 ? Math.round(value / total * 100) : 0;
                        const centerAngle = (arc.startAngle + arc.endAngle) / 2;
                        const midRadius = (arc.outerRadius + arc.innerRadius) / 2;
                        const x = arc.x + Math.cos(centerAngle) * midRadius;
                        const y = arc.y + Math.sin(centerAngle) * midRadius;
                        c.save();
                        c.textAlign = 'center';
                        c.textBaseline = 'middle';
                        c.font = 'bold 10px "Noto Sans KR"';
                        c.fillStyle = '#fff';
                        if (pct >= 5) {
                            c.fillText(value.toFixed(1) + 'h', x, y);
                        }
                        c.restore();
                    });
                }
            }]
        });

        // Repair Cost Trend Chart
        const repairCtx = document.getElementById('repair-cost-chart').getContext('2d');
        new Chart(repairCtx, {
            type: 'line',
            data: {
                labels: MONTHS,
                datasets: [
                    {
                        label: '목표 (백만)',
                        data: new Array(12).fill(data.repairCost?.total?.target || 0),
                        borderColor: '#ef4444',
                        borderDash: [5, 5],
                        fill: false,
                        pointRadius: 0
                    },
                    {
                        label: '집행실적 (백만)',
                        data: data.repairCost?.total?.monthly || [],
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderColor: '#3b82f6',
                        fill: true,
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, grace: '15%' } }
            },
            plugins: [{
                id: 'repairCostLabels',
                afterDatasetsDraw(chart) {
                    const { ctx: c } = chart;
                    // Only show labels for actual data (dataset index 1)
                    const meta = chart.getDatasetMeta(1);
                    chart.data.datasets[1].data.forEach((value, i) => {
                        if (value === null || value === undefined) return;
                        const point = meta.data[i];
                        if (!point) return;
                        c.save();
                        c.textAlign = 'center';
                        c.font = 'bold 9px "Noto Sans KR"';
                        c.fillStyle = '#3b82f6';
                        c.fillText(value.toLocaleString(), point.x, point.y - 8);
                        c.restore();
                    });
                }
            }]
        });

        // Utility Trend
        const utilityCtx = document.getElementById('utility-usage-chart').getContext('2d');
        new Chart(utilityCtx, {
            type: 'radar',
            data: {
                labels: ['전력', 'LNG', '용수'],
                datasets: [{
                    label: '당월 사용 수준 (목표대비 %)',
                    data: [
                        data.utility?.electricity?.target > 0 ? (data.utility.electricity.monthly[curIdx] / data.utility.electricity.target * 100) : 0,
                        data.utility?.lng?.target > 0 ? (data.utility.lng.monthly[curIdx] / data.utility.lng.target * 100) : 0,
                        data.utility?.water?.target > 0 ? (data.utility.water.monthly[curIdx] / data.utility.water.target * 100) : 0
                    ],
                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                    borderColor: '#f59e0b',
                    pointBackgroundColor: '#f59e0b'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { r: { beginAtZero: true, max: 120, ticks: { stepSize: 20 } } }
            },
            plugins: [{
                id: 'radarValueLabels',
                afterDatasetsDraw(chart) {
                    const { ctx: c } = chart;
                    const meta = chart.getDatasetMeta(0);
                    chart.data.datasets[0].data.forEach((value, i) => {
                        if (value === null || value === undefined) return;
                        const point = meta.data[i];
                        if (!point) return;
                        c.save();
                        c.textAlign = 'center';
                        c.font = 'bold 11px "Noto Sans KR"';
                        c.fillStyle = '#d97706';
                        c.fillText(Math.round(value) + '%', point.x, point.y - 10);
                        c.restore();
                    });
                }
            }]
        });
    },

    getDiffLabel(dataArr, curIdx, higherIsBetter = false) {
        if (!dataArr || curIdx === 0 || dataArr[curIdx] === null || dataArr[curIdx - 1] === null) return '-';
        const diff = dataArr[curIdx] - dataArr[curIdx - 1];
        if (Math.abs(diff) < 0.001) return '<span style="color:#94a3b8">-</span>';
        const isPositive = higherIsBetter ? diff > 0 : diff < 0;
        const color = isPositive ? '#10b981' : '#ef4444';
        const arrow = diff > 0 ? '▲' : '▼';
        return `<span style="color:${color}; font-weight:600">${arrow} ${Math.abs(diff).toFixed(2)}</span>`;
    }
};
