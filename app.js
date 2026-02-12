/* ==========================================
   Main Application - SeAH C&M Performance Report
   ========================================== */

(function () {
    'use strict';

    // ==========================================
    // State
    // ==========================================
    let currentSection = 'dashboard';
    let currentModalData = null;

    // Section titles mapping
    const SECTION_TITLES = {
        dashboard: '종합 대시보드',
        costReduction: '제조원가 절감 현황',
        linePerformance: '라인별 실적',
        keyTasks: '주요과제 진행사항',
        equipEfficiency: '설비종합효율',
        scrap: '스크랩 현황',
        yield: 'A급 수율',
        tonPower: '톤파워',
        operationRate: '실가동률',
        lng: 'LNG원단위',
        power: '전력원단위',
        steam: '스팀',
        consumables: '소모품 원단위',
        factoryKPI: '공장KPI (폐기/재고)',
        complaints: '고객불만 및 반품',
        breakdown: '설비고장'
    };

    // ==========================================
    // DOM References
    // ==========================================
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menuToggle');
    const contentArea = document.getElementById('contentArea');
    const pageTitle = document.getElementById('pageTitle');
    const reportMonth = document.getElementById('reportMonth');
    const selectYear = document.getElementById('selectYear');
    const selectMonth = document.getElementById('selectMonth');
    const modalOverlay = document.getElementById('modalOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const modalClose = document.getElementById('modalClose');
    const modalCancel = document.getElementById('modalCancel');
    const modalConfirm = document.getElementById('modalConfirm');
    const btnSaveAll = document.getElementById('btnSaveAll');
    const btnExport = document.getElementById('btnExport');
    const toast = document.getElementById('toast');

    // ==========================================
    // Navigation
    // ==========================================
    function navigateTo(sectionId) {
        if (!SectionRenderers[sectionId]) {
            console.warn(`섹션 '${sectionId}'에 대한 렌더러가 없습니다.`);
            showEmptyState(sectionId);
            return;
        }

        currentSection = sectionId;

        // Update active menu item
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.toggle('active', item.dataset.section === sectionId);
        });

        // Update title
        pageTitle.textContent = SECTION_TITLES[sectionId] || sectionId;

        // Destroy existing charts
        destroyAllCharts();

        // Render section
        SectionRenderers[sectionId](contentArea);

        // Close mobile sidebar
        sidebar.classList.remove('open');
    }

    function showEmptyState(sectionId) {
        contentArea.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <div class="empty-state">
                        <i class="fas fa-chart-area"></i>
                        <p>${SECTION_TITLES[sectionId] || sectionId} 섹션</p>
                        <p class="hint">이 섹션은 아직 구현 준비 중입니다.</p>
                    </div>
                </div>
            </div>
        `;
    }

    // ==========================================
    // Modal - Data Input
    // ==========================================
    function openModal(title, content, onSave) {
        modalTitle.textContent = title;
        modalBody.innerHTML = content;
        currentModalData = onSave;
        modalOverlay.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modalOverlay.classList.remove('show');
        document.body.style.overflow = '';
        currentModalData = null;
    }

    // 편집 모달 - 특정 섹션의 특정 서브키
    window.openEditModal = function (sectionId, subKey) {
        const data = dataManager.getSectionData(sectionId);
        let formHtml = '';
        let title = `${SECTION_TITLES[sectionId]} - 데이터 수정`;

        // 연도별+월별 데이터 패턴 (가장 일반적)
        const yearlyMonthlyPattern = (keyData, label) => {
            return `
                <div class="form-section-title">${label} - 연도별 평균</div>
                <div class="form-grid">
                    ${YEARS.map((y, i) => `
                        <div class="form-group">
                            <label>${y}</label>
                            <input type="number" step="any" name="yearly_${i}" value="${keyData?.yearly?.[i] ?? ''}" placeholder="-">
                        </div>
                    `).join('')}
                </div>
                <div class="form-section-title">${label} - 월별 데이터</div>
                <div class="form-grid">
                    ${MONTHS.map((m, i) => `
                        <div class="form-group">
                            <label>${m}</label>
                            <input type="number" step="any" name="monthly_${i}" value="${keyData?.monthly?.[i] ?? ''}" placeholder="-">
                        </div>
                    `).join('')}
                </div>
                <div class="form-section-title">목표값</div>
                <div class="form-grid">
                    <div class="form-group">
                        <label>목표</label>
                        <input type="number" step="any" name="target" value="${keyData?.target ?? ''}" placeholder="목표값">
                    </div>
                </div>
                ${keyData?.analysis !== undefined ? `
                    <div class="form-section-title">분석 코멘트</div>
                    <div class="form-group">
                        <textarea name="analysis" rows="3" style="width:100%">${keyData?.analysis || ''}</textarea>
                    </div>
                ` : ''}
            `;
        };

        // 섹션별 분기
        if (sectionId === 'costReduction') {
            if (subKey === 'summary') {
                formHtml = `
                    <div class="form-grid">
                        <div class="form-group"><label>목표 (억원)</label><input type="number" step="any" name="target" value="${data.target}"></div>
                        <div class="form-group"><label>실적 24년대비</label><input type="number" step="any" name="actual24" value="${data.actual24}"></div>
                        <div class="form-group"><label>4분기 대비</label><input type="number" step="any" name="q4Compare" value="${data.q4Compare}"></div>
                        <div class="form-group"><label>변동율 (%)</label><input type="number" step="any" name="changeRate" value="${data.changeRate}"></div>
                    </div>
                `;
            } else if (subKey === 'production') {
                formHtml = `
                    <div class="form-grid">
                        <div class="form-group"><label>24년 평균</label><input type="number" name="avg24" value="${data.production?.avg24 || ''}"></div>
                        <div class="form-group"><label>계획</label><input type="number" name="plan" value="${data.production?.plan || ''}"></div>
                        <div class="form-group"><label>실적</label><input type="number" name="actual" value="${data.production?.actual || ''}"></div>
                    </div>
                `;
            } else if (subKey === 'analysis') {
                formHtml = `
                    <div class="form-group" style="margin-bottom:16px">
                        <label>분석 코멘트</label>
                        <textarea name="comment" rows="2" style="width:100%">${data.analysis?.comment || ''}</textarea>
                    </div>
                    ${LINES.map(l => `
                        <div class="form-section-title">${l}</div>
                        <div class="form-grid" style="grid-template-columns:1fr 1fr">
                            <div class="form-group"><label>감소</label><input type="text" name="decrease_${l}" value="${data.analysis?.lines?.[l]?.decrease || ''}"></div>
                            <div class="form-group"><label>증가</label><input type="text" name="increase_${l}" value="${data.analysis?.lines?.[l]?.increase || ''}"></div>
                        </div>
                    `).join('')}
                `;
            } else if (subKey === 'lineData') {
                formHtml = `<p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">라인별 원단위(원/톤)과 개선금액(억원) 데이터를 입력해주세요.</p>`;
                LINES.forEach(l => {
                    const uc = data.lineData?.unitCost?.[l] || {};
                    const imp = data.lineData?.improvement?.[l] || {};
                    formHtml += `
                        <div class="form-section-title">${l} - 원단위</div>
                        <div class="form-grid">
                            <div class="form-group"><label>24'4</label><input type="number" name="uc_${l}_y24_4" value="${uc.y24_4 ?? ''}"></div>
                            <div class="form-group"><label>24년</label><input type="number" name="uc_${l}_y24" value="${uc.y24 ?? ''}"></div>
                            ${['m7', 'm8', 'm9', 'm10', 'm11', 'm12'].map(m => `
                                <div class="form-group"><label>${m.replace('m', '')}월</label><input type="number" name="uc_${l}_${m}" value="${uc[m] ?? ''}"></div>
                            `).join('')}
                        </div>
                        <div class="form-section-title">${l} - 개선금액</div>
                        <div class="form-grid">
                            ${['m5', 'm6', 'm7', 'm8', 'm9', 'm10', 'm11', 'm12'].map(m => `
                                <div class="form-group"><label>${m.replace('m', '')}월</label><input type="number" step="any" name="imp_${l}_${m}" value="${imp[m] ?? ''}"></div>
                            `).join('')}
                        </div>
                    `;
                });
            }
        } else if (sectionId === 'linePerformance') {
            if (subKey === 'costReduction') {
                formHtml = LINES.map(l => {
                    const v = data.costReduction?.[l] || {};
                    return `
                        <div class="form-section-title">${l}</div>
                        <div class="form-grid">
                            <div class="form-group"><label>목표</label><input type="number" step="any" name="cr_${l}_target" value="${v.target ?? ''}"></div>
                            <div class="form-group"><label>24년 대비</label><input type="number" step="any" name="cr_${l}_y24" value="${v.y24 ?? ''}"></div>
                            <div class="form-group"><label>4분기 대비</label><input type="number" step="any" name="cr_${l}_q4" value="${v.q4 ?? ''}"></div>
                        </div>
                    `;
                }).join('');
            } else if (subKey === 'production') {
                formHtml = LINES.map(l => {
                    const v = data.production?.[l] || {};
                    return `
                        <div class="form-section-title">${l}</div>
                        <div class="form-grid">
                            <div class="form-group"><label>24월평균</label><input type="number" name="pr_${l}_avg24" value="${v.avg24 ?? ''}"></div>
                            <div class="form-group"><label>계획량</label><input type="number" name="pr_${l}_plan" value="${v.plan ?? ''}"></div>
                            <div class="form-group"><label>생산량</label><input type="number" name="pr_${l}_actual" value="${v.actual ?? ''}"></div>
                        </div>
                    `;
                }).join('');
            }
        } else if (sectionId === 'keyTasks') {
            if (subKey === 'teamSummary') {
                formHtml = TEAMS.map(team => {
                    const v = data.teamSummary?.[team] || {};
                    return `
                        <div class="form-section-title">${team}</div>
                        <div class="form-grid">
                            <div class="form-group"><label>목표</label><input type="number" step="any" name="kt_${team}_target" value="${v.target ?? ''}"></div>
                            <div class="form-group"><label>당월</label><input type="number" step="any" name="kt_${team}_monthly" value="${v.monthly ?? ''}"></div>
                            <div class="form-group"><label>누적</label><input type="number" step="any" name="kt_${team}_cumulative" value="${v.cumulative ?? ''}"></div>
                            <div class="form-group"><label>진도율(%)</label><input type="number" name="kt_${team}_rate" value="${v.rate ?? ''}"></div>
                        </div>
                    `;
                }).join('');
            } else {
                // 과제 상세는 복잡하므로 간단한 안내
                formHtml = `<p>과제 상세 편집은 추후 지원 예정입니다.</p>`;
            }
        } else {
            // 공통 패턴: 연도별+월별 데이터
            const keyData = data[subKey] || data;
            if (keyData.yearly || keyData.monthly) {
                formHtml = yearlyMonthlyPattern(keyData, subKey);
            } else {
                formHtml = `<p>이 섹션의 편집 양식은 준비 중입니다.</p>`;
            }
        }

        openModal(title, formHtml, () => {
            saveModalData(sectionId, subKey);
        });
    };

    // 대량 편집 모달
    window.openBulkEditModal = function (sectionId) {
        const data = dataManager.getSectionData(sectionId);
        let formHtml = '';
        const keys = Object.keys(data);

        keys.forEach(key => {
            const kd = data[key];
            if (kd && (kd.yearly || kd.monthly)) {
                const displayName = key === 'composite' ? '종합' : key;
                formHtml += `
                    <div class="form-section-title">${displayName} (목표: ${kd.target || '-'})</div>
                    <div class="form-grid">
                        <div class="form-group"><label>목표</label><input type="number" step="any" name="bulk_${key}_target" value="${kd.target ?? ''}"></div>
                        ${YEARS.map((y, i) => `
                            <div class="form-group"><label>${y}</label><input type="number" step="any" name="bulk_${key}_y${i}" value="${kd.yearly?.[i] ?? ''}"></div>
                        `).join('')}
                        ${MONTHS.map((m, i) => `
                            <div class="form-group"><label>${m}</label><input type="number" step="any" name="bulk_${key}_m${i}" value="${kd.monthly?.[i] ?? ''}"></div>
                        `).join('')}
                    </div>
                `;
            }
        });

        openModal(`${SECTION_TITLES[sectionId]} - 전체 데이터 수정`, formHtml, () => {
            saveBulkModalData(sectionId);
        });
    };

    async function saveModalData(sectionId, subKey) {
        const form = modalBody;
        const inputs = form.querySelectorAll('input, textarea, select');
        const values = {};
        inputs.forEach(inp => {
            const name = inp.name;
            if (!name) return;
            let val = inp.value.trim();
            if (inp.type === 'number') {
                val = val === '' ? null : parseFloat(val);
            }
            values[name] = val;
        });

        const data = dataManager.getSectionData(sectionId);

        // 섹션별 데이터 매핑
        if (sectionId === 'costReduction') {
            if (subKey === 'summary') {
                data.target = values.target;
                data.actual24 = values.actual24;
                data.q4Compare = values.q4Compare;
                data.changeRate = values.changeRate;
            } else if (subKey === 'production') {
                data.production = { avg24: values.avg24, plan: values.plan, actual: values.actual };
            } else if (subKey === 'analysis') {
                data.analysis = data.analysis || { lines: {} };
                data.analysis.comment = values.comment;
                LINES.forEach(l => {
                    if (!data.analysis.lines[l]) data.analysis.lines[l] = {};
                    data.analysis.lines[l].decrease = values[`decrease_${l}`] || '';
                    data.analysis.lines[l].increase = values[`increase_${l}`] || '';
                });
            } else if (subKey === 'lineData') {
                if (!data.lineData) data.lineData = { unitCost: {}, improvement: {} };
                LINES.forEach(l => {
                    if (!data.lineData.unitCost[l]) data.lineData.unitCost[l] = {};
                    if (!data.lineData.improvement[l]) data.lineData.improvement[l] = {};
                    ['y24_4', 'y24', 'm7', 'm8', 'm9', 'm10', 'm11', 'm12'].forEach(k => {
                        const v = values[`uc_${l}_${k}`];
                        if (v !== undefined) data.lineData.unitCost[l][k] = v;
                    });
                    ['m5', 'm6', 'm7', 'm8', 'm9', 'm10', 'm11', 'm12'].forEach(k => {
                        const v = values[`imp_${l}_${k}`];
                        if (v !== undefined) data.lineData.improvement[l][k] = v;
                    });
                });
            }
        } else if (sectionId === 'linePerformance') {
            if (subKey === 'costReduction') {
                LINES.forEach(l => {
                    if (!data.costReduction[l]) data.costReduction[l] = {};
                    data.costReduction[l].target = values[`cr_${l}_target`];
                    data.costReduction[l].y24 = values[`cr_${l}_y24`];
                    data.costReduction[l].q4 = values[`cr_${l}_q4`];
                });
            } else if (subKey === 'production') {
                LINES.forEach(l => {
                    if (!data.production[l]) data.production[l] = {};
                    data.production[l].avg24 = values[`pr_${l}_avg24`];
                    data.production[l].plan = values[`pr_${l}_plan`];
                    data.production[l].actual = values[`pr_${l}_actual`];
                });
            }
        } else if (sectionId === 'keyTasks' && subKey === 'teamSummary') {
            TEAMS.forEach(team => {
                if (!data.teamSummary[team]) data.teamSummary[team] = {};
                data.teamSummary[team].target = values[`kt_${team}_target`];
                data.teamSummary[team].monthly = values[`kt_${team}_monthly`];
                data.teamSummary[team].cumulative = values[`kt_${team}_cumulative`];
                data.teamSummary[team].rate = values[`kt_${team}_rate`];
            });
        } else {
            // 공통 패턴: 연도별+월별 데이터
            if (!data[subKey]) data[subKey] = {};
            const keyData = data[subKey];
            if (values.target !== undefined) keyData.target = values.target;
            if (values.analysis !== undefined) keyData.analysis = values.analysis;
            const yearly = [];
            const monthly = [];
            for (let i = 0; i < 4; i++) {
                yearly.push(values[`yearly_${i}`] ?? null);
            }
            for (let i = 0; i < 12; i++) {
                monthly.push(values[`monthly_${i}`] ?? null);
            }
            if (yearly.some(v => v !== null)) keyData.yearly = yearly;
            if (monthly.some(v => v !== null)) keyData.monthly = monthly;
        }

        await dataManager.updateSectionData(sectionId, data);
        closeModal();
        navigateTo(currentSection);
        showToast('데이터가 파이어베이스에 저장되었습니다.');
    }

    async function saveBulkModalData(sectionId) {
        const form = modalBody;
        const inputs = form.querySelectorAll('input');
        const values = {};
        inputs.forEach(inp => {
            const name = inp.name;
            if (!name) return;
            values[name] = inp.value.trim() === '' ? null : parseFloat(inp.value);
        });

        const data = dataManager.getSectionData(sectionId);
        Object.keys(data).forEach(key => {
            const kd = data[key];
            if (!kd || (!kd.yearly && !kd.monthly)) return;

            const targetVal = values[`bulk_${key}_target`];
            if (targetVal !== undefined) kd.target = targetVal;

            for (let i = 0; i < 4; i++) {
                const v = values[`bulk_${key}_y${i}`];
                if (v !== undefined && kd.yearly) kd.yearly[i] = v;
            }
            for (let i = 0; i < 12; i++) {
                const v = values[`bulk_${key}_m${i}`];
                if (v !== undefined && kd.monthly) kd.monthly[i] = v;
            }
        });

        await dataManager.updateSectionData(sectionId, data);
        closeModal();
        navigateTo(currentSection);
        showToast('전체 데이터가 파이어베이스에 저장되었습니다.');
    }

    // ==========================================
    // Toast
    // ==========================================
    function showToast(message) {
        const toastMsg = document.getElementById('toastMessage');
        toastMsg.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // ==========================================
    // Event Listeners
    // ==========================================
    async function init() {
        // 데이터 매니저 초기화 (Firebase 연동 대기)
        await dataManager.init();

        // Menu navigation
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                if (section) navigateTo(section);
            });
        });

        // Mobile menu toggle
        menuToggle?.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });

        // Close sidebar on overlay click (mobile)
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 1024 && sidebar.classList.contains('open')) {
                if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                    sidebar.classList.remove('open');
                }
            }
        });

        // Month selector
        const updateMonth = async () => {
            const year = parseInt(selectYear.value);
            const month = parseInt(selectMonth.value);
            await dataManager.updateReportMonth(year, month);
            reportMonth.textContent = `${year}년 ${month}월`;
            navigateTo(currentSection);
        };
        selectYear.addEventListener('change', updateMonth);
        selectMonth.addEventListener('change', updateMonth);

        // Modal close
        modalClose.addEventListener('click', closeModal);
        modalCancel.addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeModal();
        });
        modalConfirm.addEventListener('click', async () => {
            if (currentModalData) await currentModalData();
        });

        // Save all
        btnSaveAll.addEventListener('click', async () => {
            await dataManager.save();
            showToast('모든 데이터가 파이어베이스에 저장되었습니다.');
        });

        // Export
        btnExport.addEventListener('click', () => {
            dataManager.exportData();
            showToast('보고서 데이터가 내보내졌습니다.');
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modalOverlay.classList.contains('show')) {
                closeModal();
            }
        });

        // Set initial report month display
        const meta = dataManager.data.meta;
        selectYear.value = meta.year;
        selectMonth.value = meta.month;
        reportMonth.textContent = `${meta.year}년 ${meta.month}월`;

        // Load initial section
        navigateTo('dashboard');

        console.log('✅ 세아씨엠 성과개선 보고 시스템이 초기화되었습니다 (Firebase 연동됨).');
    }

    // 주요과제 상세 편집 모달
    window.openKeyTaskEditModal = function (team) {
        const data = dataManager.getSectionData('keyTasks');
        const tasks = data.tasks?.[team] || [];

        let formHtml = `
            <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">
                <strong>${team}</strong>의 주요 과제 목록을 관리합니다. (간트 차트 상태는 화면의 셀을 직접 클릭해서 변경하세요)
            </p>
            <div class="data-table-wrapper">
                <table class="modal-task-table">
                    <thead>
                        <tr>
                            <th style="width:50px">No</th>
                            <th style="width:80px">라인</th>
                            <th>과제명</th>
                            <th style="width:70px">목표</th>
                            <th style="width:70px">당월</th>
                            <th style="width:70px">누격</th>
                            <th style="width:60px">진도%</th>
                            <th style="width:70px">담당</th>
                            <th style="width:40px">삭제</th>
                        </tr>
                    </thead>
                    <tbody id="modalTaskTableBody">
                        ${tasks.map((t, i) => `
                            <tr>
                                <td><input type="number" name="no_${i}" value="${t.no || i + 1}"></td>
                                <td><input type="text" name="line_${i}" value="${t.line || ''}"></td>
                                <td><input type="text" name="name_${i}" value="${t.name || ''}"></td>
                                <td><input type="number" step="any" name="target_${i}" value="${t.target ?? ''}"></td>
                                <td><input type="number" step="any" name="monthly_${i}" value="${t.monthly ?? ''}"></td>
                                <td><input type="number" step="any" name="cumulative_${i}" value="${t.cumulative ?? ''}"></td>
                                <td><input type="number" name="rate_${i}" value="${t.rate ?? ''}"></td>
                                <td><input type="text" name="person_${i}" value="${t.person || ''}"></td>
                                <td><button class="btn-remove-task" onclick="removeTaskRow(this)">&times;</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <button class="btn-add-task" onclick="addTaskRow()">
                <i class="fas fa-plus"></i> 새 과제 추가
            </button>
        `;

        // 행 삭제 함수 (전역 노출 필요없음, 모달 내에서만 사용)
        window.removeTaskRow = (btn) => {
            btn.closest('tr').remove();
        };

        // 행 추가 함수
        window.addTaskRow = () => {
            const tbody = document.getElementById('modalTaskTableBody');
            const idx = tbody.children.length;
            const newRow = document.createElement('tr');
            newRow.innerHTML = `
                <td><input type="number" name="no_${idx}" value="${idx + 1}"></td>
                <td><input type="text" name="line_${idx}" value=""></td>
                <td><input type="text" name="name_${idx}" value=""></td>
                <td><input type="number" step="any" name="target_${idx}" value=""></td>
                <td><input type="number" step="any" name="monthly_${idx}" value=""></td>
                <td><input type="number" step="any" name="cumulative_${idx}" value=""></td>
                <td><input type="number" name="rate_${idx}" value=""></td>
                <td><input type="text" name="person_${idx}" value=""></td>
                <td><button class="btn-remove-task" onclick="removeTaskRow(this)">&times;</button></td>
            `;
            tbody.appendChild(newRow);
        };

        openModal(`${team} - 주요 과제 편집`, formHtml, () => {
            saveKeyTaskData(team);
        });
    };

    async function saveKeyTaskData(team) {
        const tbody = document.getElementById('modalTaskTableBody');
        const rows = tbody.querySelectorAll('tr');
        const newTasks = [];
        const originalData = dataManager.getSectionData('keyTasks');
        const oldTasks = originalData.tasks?.[team] || [];

        rows.forEach((row, i) => {
            const inputs = row.querySelectorAll('input');
            const task = {};
            inputs.forEach(inp => {
                const key = inp.name.split('_')[0];
                let val = inp.value.trim();
                if (inp.type === 'number') {
                    val = val === '' ? 0 : parseFloat(val);
                }
                task[key] = val;
            });

            // 기존 스케줄 유지 또는 새로 생성
            const existingTask = oldTasks.find(t => t.name === task.name);
            task.schedule = existingTask ? existingTask.schedule : new Array(12).fill(0);

            newTasks.push(task);
        });

        if (!originalData.tasks) originalData.tasks = {};
        originalData.tasks[team] = newTasks;

        await dataManager.updateSectionData('keyTasks', originalData);
        closeModal();
        navigateTo(currentSection);
        showToast(`${team} 과제 데이터가 파이어베이스에 저장되었습니다.`);
    }

    // ==========================================
    // Start
    // ==========================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
