/* ==========================================
   Data Manager - SeAH C&M Performance Report
   ========================================== */

const LINES = ['CPL', 'CRM', 'CGL', '1CCL', '2CCL', '3CCL'];
const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
const YEARS = ['23년', '24년', '25년', '26년'];
const YEAR_MONTH_LABELS = [...YEARS, ...MONTHS];
const TEAMS = ['생산팀(냉연)', '생산팀(칼라)', '설비팀', '품질경영팀', '변화관리팀', '안전환경팀'];
const TEAMS_COLD = ['생산팀(냉연)', '설비팀', '품질경영팀']; // 냉연
const TEAMS_COLOR = ['생산팀(칼라)', '변화관리팀', '안전환경팀']; // 칼라

// Firebase 설정 (보안을 위해 외부에서 주입받는 방식으로 변경)
// index.html에서 firebase-config.js를 불러오거나 Vercel 환경변수를 통해 설정됩니다.
const firebaseConfig = window.FIREBASE_CONFIG || {
    // 로컬 테스트용 빈 값 (실제 값은 서버에서 주입)
    apiKey: "DUMMY_KEY_FOR_LOCAL_ONLY",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
};

if (!firebase.apps.length && firebaseConfig.projectId) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.apps.length ? firebase.firestore() : null;
const storage = firebase.apps.length ? firebase.storage() : null;
const COLLECTION = "performance_data";

const STORAGE_KEY = 'seah_cm_report_data';

class DataManager {
    constructor() {
        this.data = this.getEmptyTemplate();
        this.isLoaded = false;
        this.docExists = false;
        this.currentYear = 2026;
        this.currentMonth = 1;
    }

    // 월별 문서 ID 생성 (예: report_2026_01)
    getDocId(year, month) {
        return `report_${year}_${String(month).padStart(2, '0')}`;
    }

    // 현재 활성 문서 ID
    get activeDocId() {
        return this.getDocId(this.currentYear, this.currentMonth);
    }

    // 로컬 스토리지 키 (월별)
    getLocalKey(year, month) {
        return `${STORAGE_KEY}_${year}_${String(month).padStart(2, '0')}`;
    }

    async init() {
        // ★ 구조 변경 후 오래된 로컬 캐시 정리 (한 번만)
        try {
            if (!localStorage.getItem('seah_cm_cache_cleared_v3')) { // 버전을 v3로 올려서 강제 초기화 유도
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && (key.startsWith('seah_cm_report_data') || key.startsWith('seah_cm_last_meta'))) {
                        keysToRemove.push(key);
                    }
                }
                keysToRemove.forEach(k => localStorage.removeItem(k));
                localStorage.setItem('seah_cm_cache_cleared_v3', 'true');
                console.log('✅ 시스템 구조 변경으로 인한 로컬 캐시 전체 초기화 완료');
            }
        } catch (e) { }

        // 로컬에서 마지막 선택한 월 정보 복원
        try {
            const lastMeta = localStorage.getItem('seah_cm_last_meta');
            if (lastMeta) {
                const meta = JSON.parse(lastMeta);
                this.currentYear = meta.year || 2026;
                this.currentMonth = meta.month || 1;
            }
        } catch (e) { }

        // 현재 월 데이터 로드
        await this.loadMonth(this.currentYear, this.currentMonth);

        this.isLoaded = true;
    }


    // 특정 월 데이터 로드 (핵심 메서드)
    async loadMonth(year, month) {
        this.currentYear = year;
        this.currentMonth = month;
        this.docExists = false;

        // ★ 중요: 이전 월 데이터가 남지 않도록 먼저 초기화
        this.data = this.getEmptyTemplate();
        this.data.meta.year = year;
        this.data.meta.month = month;

        const docId = this.getDocId(year, month);
        const localKey = this.getLocalKey(year, month);

        // ★ 레벨별 딥 머지 (Deep Merge): 빈 데이터가 기존의 상세 데이터를 지우지 못하게 함
        const deepMerge = (base, override) => {
            const result = { ...base };
            for (const key in override) {
                const val = override[key];

                if (val && typeof val === 'object' && !Array.isArray(val)) {
                    // 객체인 경우 재귀적으로 병합 (단, override의 객체가 비어있지 않을 때만)
                    if (Object.keys(val).length > 0) {
                        result[key] = deepMerge(result[key] || {}, val);
                    }
                } else if (val !== null && val !== undefined && val !== '') {
                    // 배열이나 기본 타입은 값이 있을 때만 덮어쓰기
                    if (Array.isArray(val)) {
                        if (val.some(item => item !== null && item !== undefined)) {
                            result[key] = val;
                        }
                    } else {
                        result[key] = val;
                    }
                }
            }
            return result;
        };

        // 1. 로컬캐시 먼저 확인
        try {
            const saved = localStorage.getItem(localKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
                    if (parsed.meta && parsed.meta.year === year && parsed.meta.month === month) {
                        const base = (year === 2026 && month === 1) ? this.getDefaultData() : this.getEmptyTemplate();
                        this.data = deepMerge(base, parsed);
                        this.docExists = true;
                    }
                }
            }
        } catch (e) { }

        // 2. Firebase에서 최신 데이터 가져오기
        try {
            const doc = await db.collection(COLLECTION).doc(docId).get();
            if (doc.exists) {
                const fetched = doc.data();
                if (fetched && Object.keys(fetched).length > 0) {
                    const base = (year === 2026 && month === 1) ? this.getDefaultData() : this.getEmptyTemplate();
                    this.data = deepMerge(base, fetched);
                    this.docExists = true;
                } else {
                    console.warn(`ℹ️ ${docId} 문서가 존재하지만 비어있습니다.`);
                    this.docExists = false;
                }
                this.saveLocal();
                console.log(`✅ ${year}년 ${month}월 데이터 로드 완료 (${docId})`);
            } else {
                console.log(`ℹ️ ${year}년 ${month}월 데이터가 없습니다.`);
                this.docExists = false;

                // ★ 26년 1월인 경우에만 기본 샘플 데이터로 복구 (데이터 유실 체감 방지)
                if (year === 2026 && month === 1 && !this.docExists) {
                    console.log('💡 26년 1월 기본 샘플 데이터를 로드합니다.');
                    this.data = this.getDefaultData();
                    this.saveLocal(); // 복구된 샘플 데이터를 로컬에 캐시
                } else {
                    // 그 외 월은 빈 템플릿 유지
                    try { localStorage.removeItem(localKey); } catch (e) { }
                }
            }
        } catch (e) {
            console.error('❌ Firebase 로드 실패:', e);
            // 로드 실패 시에도 26년 1월이면 샘플 데이터라도 보여줌
            if (year === 2026 && month === 1 && (!this.data || Object.keys(this.data).length < 5)) {
                this.data = this.getDefaultData();
            }
        }

        // 메타정보 항상 현재 선택 월로 맞춤
        this.data.meta.year = year;
        this.data.meta.month = month;

        // 마지막 선택 월 기억
        localStorage.setItem('seah_cm_last_meta', JSON.stringify({ year, month }));
    }

    saveLocal() {
        try {
            const localKey = this.getLocalKey(this.currentYear, this.currentMonth);
            localStorage.setItem(localKey, JSON.stringify(this.data));
        } catch (e) {
            console.error('로컬 저장 실패:', e);
        }
    }

    async saveFirebase() {
        // 데이터 정제 및 유효성 검사
        if (!this.data || typeof this.data !== 'object') {
            this.data = this.getEmptyTemplate();
        }

        // 필수 필드(meta 등)가 없거나 필드 수가 너무 적으면(예: 1-2개) 기본 구조와 강제 병합
        // Firestore의 "Document fields must not be empty" 오류를 원천 차단하기 위함
        if (Object.keys(this.data).length < 5 || !this.data.meta) {
            console.warn('⚠️ 데이터 구조가 깨져 있어 기본 템플릿과 강제 병합합니다.');
            const template = this.getEmptyTemplate();
            this.data = { ...template, ...this.data };
            this.data.meta = { ...template.meta, ...this.data.meta };
        }

        // 최종 직렬화 테스트 및 undefined 제거
        let cleanData;
        try {
            cleanData = JSON.parse(JSON.stringify(this.data));
        } catch (e) {
            console.error('데이터 직렬화 실패:', e);
            cleanData = this.getEmptyTemplate();
        }

        try {
            const docId = this.activeDocId;
            await db.collection(COLLECTION).doc(docId).set(cleanData);
            console.log(`✅ Firebase 저장 완료: ${docId}`);
            return true;
        } catch (e) {
            console.error('❌ Firebase 저장 실패:', e);
            throw e;
        }
    }

    async save() {
        this.saveLocal();
        return await this.saveFirebase();
    }

    get(path) {
        return path.split('.').reduce((obj, key) => obj?.[key], this.data);
    }

    async set(path, value) {
        const keys = path.split('.');
        const last = keys.pop();
        const obj = keys.reduce((o, k) => {
            if (!o[k]) o[k] = {};
            return o[k];
        }, this.data);
        obj[last] = value;
        await this.save();
    }

    // 보고 월 변경 (데이터 로드 포함)
    async updateReportMonth(year, month) {
        await this.loadMonth(year, month);
    }

    // 이전 월 데이터 복사하여 새 월 생성
    async copyFromPreviousMonth(targetYear, targetMonth) {
        let prevYear = targetYear;
        let prevMonth = targetMonth - 1;
        if (prevMonth < 1) {
            prevMonth = 12;
            prevYear -= 1;
        }

        const prevDocId = this.getDocId(prevYear, prevMonth);
        try {
            const doc = await db.collection(COLLECTION).doc(prevDocId).get();
            if (doc.exists) {
                this.data = doc.data();
                this.data.meta.year = targetYear;
                this.data.meta.month = targetMonth;
                this.currentYear = targetYear;
                this.currentMonth = targetMonth;
                await this.save();
                return true;
            }
        } catch (e) {
            console.error('이전 월 복사 실패:', e);
        }
        return false;
    }

    // 저장된 월 목록 조회
    async getAvailableMonths() {
        try {
            const snapshot = await db.collection(COLLECTION).get();
            const months = [];
            snapshot.forEach(doc => {
                const match = doc.id.match(/^report_(\d{4})_(\d{2})$/);
                if (match) {
                    months.push({
                        year: parseInt(match[1]),
                        month: parseInt(match[2]),
                        docId: doc.id
                    });
                }
            });
            months.sort((a, b) => (b.year * 100 + b.month) - (a.year * 100 + a.month));
            return months;
        } catch (e) {
            console.error('월 목록 조회 실패:', e);
            return [];
        }
    }

    // 빈 템플릿 (데이터 미등록 월용 - 모든 수치 0/null)
    getEmptyTemplate() {
        return {
            meta: { year: 2026, month: 1, company: '세아씨엠' },
            costReduction: {
                target: 0, actual25: 0, q4Compare: 0, changeRate: 0,
                production: { avg25: 0, plan: 0, actual: 0 },
                analysis: { comment: '', lines: {} },
                lineData: { unitCost: {}, improvement: {} },
                yieldRate: { y24: '-', y25: '-', m_prev: '-', m_goal: '-', m_actual: '-' },
                totalImprovement: { m_actual: 0 },
                productionMonthly: { y24: 0, y25: 0, m_prev: 0, m_goal: 0, m_actual: 0 }
            },
            linePerformance: {
                costReduction: {},
                production: {}
            },
            keyTasks: {
                teamSummary: {
                    '생산팀(냉연)': { division: '냉연', target: 0, monthly: 0, cumulative: 0, rate: 0 },
                    '생산팀(칼라)': { division: '칼라', target: 0, monthly: 0, cumulative: 0, rate: 0 },
                    '설비팀': { target: 0, monthly: 0, cumulative: 0, rate: 0 },
                    '품질경영팀': { target: 0, monthly: 0, cumulative: 0, rate: 0 },
                    '변화관리팀': { target: 0, monthly: 0, cumulative: 0, rate: 0 },
                    '안전환경팀': { target: 0, monthly: 0, cumulative: 0, rate: 0 }
                },
                tasks: {
                    '생산팀(냉연)': [], '생산팀(칼라)': [], '설비팀': [],
                    '품질경영팀': [], '변화관리팀': [], '안전환경팀': []
                }
            },
            equipEfficiency: {},
            scrap: {
                steel: { target: 0, yearly: [null, null, null, null], monthly: new Array(12).fill(null), analysis: '' },
                al: { target: 0, yearly: [null, null, null, null], monthly: new Array(12).fill(null), analysis: '' }
            },
            yield: {
                composite: { target: 0, yearly: [null, null, null, null], monthly: new Array(12).fill(null) },
                CPL: { target: 0, yearly: [null, null, null, null], monthly: new Array(12).fill(null) },
                CGL: { target: 0, yearly: [null, null, null, null], monthly: new Array(12).fill(null) },
                '1CCL': { target: 0, yearly: [null, null, null, null], monthly: new Array(12).fill(null) },
                '2CCL': { target: 0, yearly: [null, null, null, null], monthly: new Array(12).fill(null) },
                '3CCL': { target: 0, yearly: [null, null, null, null], monthly: new Array(12).fill(null) }
            },
            tonPower: {
                composite: { target: 0, yearly: [null, null, null, null], monthly: new Array(12).fill(null) }
            },
            operationRate: {
                CPL: { target: 0, yearly: [null, null, null, null], monthly: new Array(12).fill(null) },
                CRM: { target: 0, yearly: [null, null, null, null], monthly: new Array(12).fill(null) },
                CGL: { target: 0, yearly: [null, null, null, null], monthly: new Array(12).fill(null) },
                '1CCL': { target: 0, yearly: [null, null, null, null], monthly: new Array(12).fill(null) },
                '2CCL': { target: 0, yearly: [null, null, null, null], monthly: new Array(12).fill(null) },
                '3CCL': { target: 0, yearly: [null, null, null, null], monthly: new Array(12).fill(null) }
            },
            lng: {
                CPL: { target: 0, yearly: [null, null, null, null], monthly: new Array(12).fill(null) },
                CGL: { target: 0, yearly: [null, null, null, null], monthly: new Array(12).fill(null) },
                '1CCL': { target: 0, yearly: [null, null, null, null], monthly: new Array(12).fill(null) },
                '3CCL': { target: 0, yearly: [null, null, null, null], monthly: new Array(12).fill(null) }
            },
            power: {
                CPL: { target: 0, yearly: [null, null, null, null], monthly: new Array(12).fill(null) },
                CRM: { target: 0, yearly: [null, null, null, null], monthly: new Array(12).fill(null) },
                CGL: { target: 0, yearly: [null, null, null, null], monthly: new Array(12).fill(null) },
                '1CCL': { target: 0, yearly: [null, null, null, null], monthly: new Array(12).fill(null) },
                '2CCL': { target: 0, yearly: [null, null, null, null], monthly: new Array(12).fill(null) },
                '3CCL': { target: 0, yearly: [null, null, null, null], monthly: new Array(12).fill(null) }
            },
            steam: {
                purchase: { baseline: 0, yearly: [null, null, null, null], monthly: new Array(12).fill(null) },
                usageUnit: { baseline: 0, monthly: new Array(12).fill(null) },
                selfProd2CCL: { baseline: 0, yearly: [null, null, null, null], monthly: new Array(12).fill(null) },
                selfProd3CCL: { baseline: 0, yearly: [null, null, null, null], monthly: new Array(12).fill(null) }
            },
            consumables: {},
            factoryKPI: {
                disposal: { yearly: [null, null, null, null], monthly: new Array(12).fill(null), avgInventory: 0, amount: 0, colors: 0, unitCost: 0, byType: {} },
                disposalCost: { costMonthly: new Array(12).fill(null), unitMonthly: new Array(12).fill(null) },
                semiProduct: { target: new Array(14).fill(0), actual: new Array(14).fill(0), diff: new Array(14).fill(0) }
            },
            complaints: {
                customerComplaints: { yearly: [null, null, null, null], monthly: new Array(12).fill(null), count: { total1to11: 0, dec: 0, cumulative25: 0, y24: 0 }, closed: { total1to11: 0, dec: 0, cumulative25: 0, y24: 0 }, compensation: { total1to11: 0, dec: 0, cumulative25: 0, y24: 0 } },
                returns: { yearly: [null, null, null, null], monthly: new Array(12).fill(null), count: { total1to11: 0, dec: 0, cumulative25: 0 }, volume: { total1to11: 0, dec: 0, cumulative25: 0, y24: 0 }, loss: { total1to11: 0, dec: 0, cumulative25: 0, y24: 0 } }
            },
            breakdown: {
                timeTotal: { target: 0, yearly: [null, null, null, null], monthly: new Array(12).fill(null) },
                countTotal: { target: 0, yearly: [null, null, null, null], monthly: new Array(12).fill(null) },
                timeMech: { target: 0, yearly: [null, null, null, null], monthly: new Array(12).fill(null) },
                countMech: { target: 0, yearly: [null, null, null, null], monthly: new Array(12).fill(null) },
                timeElec: { target: 0, yearly: [null, null, null, null], monthly: new Array(12).fill(null) },
                countElec: { target: 0, yearly: [null, null, null, null], monthly: new Array(12).fill(null) }
            },
            productionColdReports: {
                CPL: {
                    highlights: '', issues: '', plans: '', pdfUrl: '',
                    mfgCost: { fixed: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, variable: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, prodTarget: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, prodActual: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, unitCostTarget: 0 },
                    metrics: {
                        yield: { yearly: [null, null, null], monthly: new Array(12).fill(null) },
                        operRate: { yearly: [null, null, null], monthly: new Array(12).fill(null) },
                        regReplace: { yearly: [null, null, null], monthly: new Array(12).fill(null) },
                        irregFail: { yearly: [null, null, null], monthly: new Array(12).fill(null) },
                        tonPower: { yearly: [null, null, null], monthly: new Array(12).fill(null) },
                        utility: {
                            elec: { yearly: [null, null, null], monthly: new Array(12).fill(null) },
                            fuel: { yearly: [null, null, null], monthly: new Array(12).fill(null) }
                        }
                    }
                },
                CRM: {
                    highlights: '', issues: '', plans: '', pdfUrl: '',
                    mfgCost: { fixed: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, variable: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, prodTarget: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, prodActual: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, unitCostTarget: 0 },
                    metrics: {
                        yield: { yearly: [null, null, null], monthly: new Array(12).fill(null) },
                        operRate: { yearly: [null, null, null], monthly: new Array(12).fill(null) },
                        regReplace: { yearly: [null, null, null], monthly: new Array(12).fill(null) },
                        irregFail: { yearly: [null, null, null], monthly: new Array(12).fill(null) },
                        tonPower: { yearly: [null, null, null], monthly: new Array(12).fill(null) },
                        utility: {
                            elec: { yearly: [null, null, null], monthly: new Array(12).fill(null) },
                            fuel: { yearly: [null, null, null], monthly: new Array(12).fill(null) }
                        }
                    }
                },
                CGL: {
                    highlights: '', issues: '', plans: '', pdfUrl: '',
                    mfgCost: { fixed: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, variable: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, prodTarget: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, prodActual: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, unitCostTarget: 0 },
                    metrics: {
                        yield: { yearly: [null, null, null], monthly: new Array(12).fill(null) },
                        operRate: { yearly: [null, null, null], monthly: new Array(12).fill(null) },
                        regReplace: { yearly: [null, null, null], monthly: new Array(12).fill(null) },
                        irregFail: { yearly: [null, null, null], monthly: new Array(12).fill(null) },
                        tonPower: { yearly: [null, null, null], monthly: new Array(12).fill(null) },
                        utility: {
                            elec: { yearly: [null, null, null], monthly: new Array(12).fill(null) },
                            fuel: { yearly: [null, null, null], monthly: new Array(12).fill(null) }
                        }
                    }
                }
            },
            productionColorReports: {
                '1CCL': {
                    highlights: '', issues: '', plans: '', pdfUrl: '',
                    mfgCost: { fixed: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, variable: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, prodTarget: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, prodActual: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, unitCostTarget: 0 },
                    metrics: {
                        yield: { yearly: [null, null, null], monthly: new Array(12).fill(null) },
                        operRate: { yearly: [null, null, null], monthly: new Array(12).fill(null) },
                        regReplace: { yearly: [null, null, null], monthly: new Array(12).fill(null) },
                        irregFail: { yearly: [null, null, null], monthly: new Array(12).fill(null) },
                        tonPower: { yearly: [null, null, null], monthly: new Array(12).fill(null) },
                        utility: {
                            elec: { yearly: [null, null, null], monthly: new Array(12).fill(null) },
                            fuel: { yearly: [null, null, null], monthly: new Array(12).fill(null) }
                        }
                    }
                },
                '2CCL': {
                    highlights: '', issues: '', plans: '', pdfUrl: '',
                    mfgCost: { fixed: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, variable: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, prodTarget: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, prodActual: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, unitCostTarget: 0 },
                    metrics: {
                        yield: { yearly: [null, null, null], monthly: new Array(12).fill(null) },
                        operRate: { yearly: [null, null, null], monthly: new Array(12).fill(null) },
                        regReplace: { yearly: [null, null, null], monthly: new Array(12).fill(null) },
                        irregFail: { yearly: [null, null, null], monthly: new Array(12).fill(null) },
                        tonPower: { yearly: [null, null, null], monthly: new Array(12).fill(null) },
                        utility: {
                            elec: { yearly: [null, null, null], monthly: new Array(12).fill(null) },
                            fuel: { yearly: [null, null, null], monthly: new Array(12).fill(null) }
                        }
                    }
                },
                '3CCL': {
                    highlights: '', issues: '', plans: '', pdfUrl: '',
                    mfgCost: { fixed: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, variable: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, prodTarget: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, prodActual: { yearly: [null, null, null], monthly: new Array(12).fill(null) }, unitCostTarget: 0 },
                    metrics: {
                        yield: { yearly: [null, null, null], monthly: new Array(12).fill(null) },
                        operRate: { yearly: [null, null, null], monthly: new Array(12).fill(null) },
                        regReplace: { yearly: [null, null, null], monthly: new Array(12).fill(null) },
                        irregFail: { yearly: [null, null, null], monthly: new Array(12).fill(null) },
                        tonPower: { yearly: [null, null, null], monthly: new Array(12).fill(null) },
                        utility: {
                            elec: { yearly: [null, null, null], monthly: new Array(12).fill(null) },
                            fuel: { yearly: [null, null, null], monthly: new Array(12).fill(null) }
                        }
                    }
                }
            }
        };
    }

    // 26년 1월 기본 데이터 (초기 세팅용)
    getDefaultData() {
        return {
            meta: {
                year: 2026,
                month: 1,
                company: '세아씨엠'
            },
            // 1. 제조원가 절감 현황
            costReduction: {
                target: 3.85,
                actual25: 7.57,
                q4Compare: 13.36,
                changeRate: 196,
                production: {
                    avg25: 93552,
                    plan: 95690,
                    actual: 93828
                },
                analysis: {
                    comment: 'CGL, 2CCL, 3CCL 주요 원단위 개선됨',
                    lines: {
                        CPL: { decrease: '소모품(212)', increase: '연료(1,420), 수선비(1,377), 전력(153)' },
                        CRM: { decrease: '', increase: '수선비(2,939), 전력(1,033), 소모품(376)' },
                        CGL: { decrease: '연료(1,396), 수선비(843), 소모품(331)', increase: '전력(311)' },
                        '1CCL': { decrease: '연료(1,116)', increase: '전력(1,947), 소모품(5,043), 수선비(156)' },
                        '2CCL': { decrease: '소모품(19,852), 수선(14,812), 연료(14,761), 전력(8,727)', increase: '' },
                        '3CCL': { decrease: '소모품(6,492), 연료(3,858), 전력(2,369), 수선(1,138)', increase: '' }
                    }
                },
                lineData: {
                    unitCost: {
                        CPL: { y24: 23110, y25: 22326, m1_prev: 21856, m1_goal: 21096, m1: 23773 },
                        CRM: { y24: 40472, y25: 35577, m1_prev: 36841, m1_goal: 33617, m1: 39988 },
                        CGL: { y24: 90477, y25: 86931, m1_prev: 93963, m1_goal: 82142, m1: 80879 },
                        '1CCL': { y24: 101258, y25: 94907, m1_prev: 103179, m1_goal: 89678, m1: 99574 },
                        '2CCL': { y24: 295494, y25: 464929, m1_prev: 398758, m1_goal: 439314, m1: 308048 },
                        '3CCL': { y24: 202176, y25: 191082, m1_prev: 253821, m1_goal: 180554, m1: 156260 }
                    },
                    improvement: {
                        CPL: { m1: -0.36 },
                        CRM: { m1: -1.02 },
                        CGL: { m1: 1.48 },
                        '1CCL': { m1: -0.51 },
                        '2CCL': { m1: 3.97 },
                        '3CCL': { m1: 2.59 },
                        yield: { m1: 1.41 }
                    }
                },
                yieldRate: { y24: '99.47%', y25: '99.45%', m1_prev: '99.37%', m1_goal: '99.54%', m1: '99.63%' },
                totalImprovement: { m1: 7.57 },
                productionMonthly: { y24: 96204, y25: 94066, m1_prev: 91475, m1_goal: 97735, m1: 93828 }
            },

            // 3. 라인별 실적
            linePerformance: {
                costReduction: {
                    CPL: { target: 0.48, y24: -0.34, q4: -0.46 },
                    CRM: { target: 0.57, y24: -1.01, q4: -0.71 },
                    CGL: { target: 1.31, y24: 2.18, q4: 3.90 },
                    '1CCL': { target: 1.24, y24: -0.53, q4: 0.37 },
                    '2CCL': { target: 0.77, y24: 4.09, q4: 2.41 },
                    '3CCL': { target: 1.06, y24: 3.18, q4: 7.85 }
                },
                production: {
                    CPL: { avg24: 24744, plan: 25580, actual: 25491 },
                    CRM: { avg24: 24023, plan: 24640, actual: 23173 },
                    CGL: { avg24: 24188, plan: 24840, actual: 24383 },
                    '1CCL': { avg24: 12789, plan: 12700, actual: 10845 },
                    '2CCL': { avg24: 1947, plan: 1410, actual: 2534 },
                    '3CCL': { avg24: 5861, plan: 6520, actual: 7401 }
                }
            },

            // 4. 주요과제 진행사항
            keyTasks: {
                teamSummary: {
                    '생산팀(냉연)': { division: '냉연', target: 16.02, monthly: 0.00, cumulative: 0.00, rate: 0 },
                    '생산팀(칼라)': { division: '칼라', target: 8.90, monthly: 0.00, cumulative: 0.00, rate: 0 },
                    '설비팀': { target: 16.14, monthly: 1.55, cumulative: 1.55, rate: 10 },
                    '품질경영팀': { target: 1.82, monthly: 0.00, cumulative: 0.00, rate: 0 },
                    '변화관리팀': { target: 2.38, monthly: 0.00, cumulative: 0.00, rate: 0 },
                    '안전환경팀': { target: 0, monthly: 0, cumulative: 0, rate: 0 }
                },
                tasks: {
                    '생산팀(냉연)': [
                        { no: 1, line: 'CPL', name: '선단부 스크랩 저감으로 수율 0.04% 향상', target: 0.2, monthly: 0.03, cumulative: 0.0, rate: 8, person: '이대현', schedule: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
                        { no: 2, line: 'CPL', name: '후판/대폭 생산성 향상 0.6톤/hr 향상', target: 0.9, monthly: 0, cumulative: 0, rate: 0, person: '이대현', schedule: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
                        { no: 3, line: 'CRM', name: '전력 Peak 하향 관리로 전력 원단위 5.4% 개선', target: 1.9, monthly: -0.03, cumulative: -0.03, rate: -2, person: '이대현', schedule: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
                        { no: 4, line: 'CRM', name: '압연유 사용량 저감으로 소모품비 절감', target: 0.4, monthly: 0.0, cumulative: 0.01, rate: 1, person: '이대현', schedule: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
                        { no: 5, line: 'CRM', name: 'CRM 운전 자동화', target: 0, monthly: 0, cumulative: 0, rate: 0, person: '이대현', schedule: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
                        { no: 6, line: 'CGL', name: '불량 스크랩 원인개선으로 수율 향상(0.24%)', target: 4.5, monthly: 0.4, cumulative: 0.4, rate: 9, person: '장훈', schedule: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
                        { no: 7, line: 'CGL', name: '평균 L/S 상향으로 톤파워 0.23 향상', target: 1.5, monthly: -0.1, cumulative: -0.1, rate: -10, person: '장훈', schedule: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
                        { no: 8, line: 'CGL', name: '생산 비가동 저감으로 실가동율 향상 2.4%', target: 2.5, monthly: 0.4, cumulative: 0.4, rate: 14, person: '장훈', schedule: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
                        { no: 9, line: 'CGL', name: '에너지(전력/LNG) 비용 3% 절감', target: 1.1, monthly: 0.2, cumulative: 0.2, rate: 20, person: '장훈', schedule: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
                        { no: 10, line: 'CGL', name: 'Dual Snorkel 효과 극대화', target: 0.4, monthly: 0.0, cumulative: 0.0, rate: 0, person: '장훈', schedule: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
                    ],
                    '생산팀(칼라)': [
                        { no: 1, line: '1CCL', name: '비가동 저감을 통한 가동율 향상(1.21%)', target: 1.8, monthly: -0.6, cumulative: -0.6, rate: -35, person: '황의범', schedule: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
                        { no: 2, line: '2CCL', name: 'Exhaust Fan 가동 관리 강화 → LNG 저감', target: 0.7, monthly: 0.1, cumulative: 0.1, rate: 17, person: '황의범', schedule: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
                        { no: 3, line: '2CCL', name: 'Tension Leveller 오염 개선 실가동율 향상', target: 0.4, monthly: 0.3, cumulative: 0.3, rate: 72, person: '황의범', schedule: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
                        { no: 4, line: '3CCL', name: 'Print Pint 제품 Speed 향상 톤파워 향상', target: 2.3, monthly: -0.5, cumulative: -0.5, rate: -21, person: '유진상', schedule: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
                        { no: 5, line: '3CCL', name: 'Print 제품 단판 관리를 통한 실가동율 향상', target: 3.1, monthly: 1.2, cumulative: 1.2, rate: 39, person: '유진상', schedule: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
                        { no: 6, line: '3CCL', name: '작업방법 변경 및 Waiting Mode 활용 LNG 저감', target: 0.7, monthly: 0.1, cumulative: 0.1, rate: 12, person: '유진상', schedule: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
                    ],
                    '설비팀': [
                        { no: 1, line: '기계', name: 'AIR COMPRESSOR 합리화', target: 2.1, monthly: 0.0, cumulative: 0.0, rate: 0, person: '안봉찬', schedule: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
                        { no: 2, line: '기계', name: '#1CCL 배기폐열 회수시스템 도입', target: 3.5, monthly: 0.3, cumulative: 0.3, rate: 8, person: '이상민', schedule: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
                        { no: 3, line: '기계', name: 'CGL 배기폐열 회수시스템 도입', target: 4.6, monthly: 0.5, cumulative: 0.5, rate: 12, person: '이상민', schedule: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
                        { no: 4, line: '기계', name: 'CGL 퍼니스 공연비관리 체계화', target: 0.7, monthly: 0.0, cumulative: 0.0, rate: 0, person: '이상민', schedule: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
                        { no: 5, line: '전기', name: '태양광발전 자가사용 (1기, 3기, 자재창고)', target: 4.0, monthly: 0.4, cumulative: 0.4, rate: 10, person: '홍준오', schedule: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
                        { no: 6, line: '전기', name: 'BLOW FAN & 냉각탑 전력절감개선', target: 1.3, monthly: 0.2, cumulative: 0.2, rate: 19, person: '박성만', schedule: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
                        { no: 7, line: '전기', name: '전력 피크 기본료 감축', target: 0.1, monthly: 0.1, cumulative: 0.1, rate: 100, person: '이정석', schedule: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
                    ],
                    '품질경영팀': [
                        { no: 1, line: '품질', name: '고객 불만 개선으로 손실비용 절감', target: 1.3, monthly: 0.01, cumulative: 0.0, rate: 1, person: '김상순', schedule: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
                        { no: 2, line: '품질', name: '결로 예방을 통한 백청 Loss 절감', target: 0.5, monthly: 0.00, cumulative: 0.0, rate: 0, person: '황정연', schedule: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
                        { no: 3, line: '품질', name: '구매소재 Claim 강화', target: 0, monthly: 0, cumulative: 0, rate: 0, person: '황정연', schedule: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
                        { no: 4, line: '품질', name: '품질 인증 유지 및 PO(KS, JIS) 신규취득', target: 0, monthly: 0, cumulative: 0, rate: 0, person: '이종혁', schedule: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
                    ],
                    '변화관리팀': [
                        { no: 1, line: '변·관', name: '거점 물류 창고 운영 및 적재 환경개선', target: 2.4, monthly: 0.0, cumulative: 0.0, rate: 0, person: '최예찬', schedule: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
                        { no: 2, line: '변·관', name: '로컬 창고 전산화로 재고관리 체계 구축', target: 0, monthly: 0, cumulative: 0, rate: 0, person: '-', schedule: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
                        { no: 3, line: '변·관', name: '반제품 장기재고 50% 감소', target: 0, monthly: 0, cumulative: 0, rate: 0, person: '이정호', schedule: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
                        { no: 4, line: '변·관', name: '보세공장을 통한 경쟁력 강화', target: 0, monthly: 0, cumulative: 0, rate: 0, person: '김윤성', schedule: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
                    ],
                    '안전환경팀': [
                        { no: 1, line: '환경', name: '환경 시설 법적 RISK 상시 관리 시행', target: 0, monthly: 0, cumulative: 0, rate: 0, person: '박주현', schedule: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
                        { no: 2, line: '안전', name: '자율 안전문화 조성', target: 0, monthly: 0, cumulative: 0, rate: 0, person: '정지원', schedule: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
                        { no: 3, line: '안전', name: '안전 환경 시스템 고도화(PSM, ISO)', target: 0, monthly: 0, cumulative: 0, rate: 0, person: '황준하', schedule: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
                        { no: 4, line: '업·지', name: '계층별 소통 활성화', target: 0, monthly: 0, cumulative: 0, rate: 0, person: '이기호', schedule: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
                        { no: 5, line: '업·지', name: '직무역량 교육 강화', target: 0, monthly: 0, cumulative: 0, rate: 0, person: '이기호', schedule: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
                    ]
                }
            },

            productionColdReports: {
                CPL: {
                    highlights: 'CPL 당월 주요 실적 내용입니다.', issues: '', plans: '', pdfUrl: '',
                    mfgCost: {
                        fixed: { yearly: [119273, 116832, 116820], monthly: [91207, null, null, null, null, null, null, null, null, null, null, null] },
                        variable: { yearly: [103056, 85354, 80402], monthly: [65053, null, null, null, null, null, null, null, null, null, null, null] },
                        prodTarget: { yearly: [null, 5524, 5549], monthly: [6200, null, null, null, null, null, null, null, null, null, null, null] },
                        prodActual: { yearly: [4368, 5275, 5522], monthly: [7445, null, null, null, null, null, null, null, null, null, null, null] },
                        unitCostTarget: 159166
                    },
                    metrics: {
                        yield: { yearly: [99.2, 99.4, 99.4], monthly: [99.5, null, null, null, null, null, null, null, null, null, null, null] },
                        operRate: { yearly: [85, 88, 90], monthly: [92, null, null, null, null, null, null, null, null, null, null, null] },
                        regReplace: { yearly: [120, 115, 110], monthly: [105, null, null, null, null, null, null, null, null, null, null, null] },
                        irregFail: { yearly: [45, 38, 30], monthly: [2, null, null, null, null, null, null, null, null, null, null, null] },
                        tonPower: { yearly: [12.5, 13.2, 13.5], monthly: [13.8, null, null, null, null, null, null, null, null, null, null] },
                        utility: {
                            elec: { yearly: [25, 24, 23], monthly: [22.5, null, null, null, null, null, null, null, null, null, null, null] },
                            fuel: { yearly: [15, 14, 14], monthly: [13.8, null, null, null, null, null, null, null, null, null, null, null] }
                        }
                    }
                },
                CRM: {
                    highlights: 'CRM 실적 내용입니다.', issues: '', plans: '', pdfUrl: '',
                    mfgCost: { fixed: { yearly: [85000, 82000, 81000], monthly: [80500, null, null, null, null, null, null, null, null, null, null, null] }, variable: { yearly: [120000, 115000, 110000], monthly: [108000, null, null, null, null, null, null, null, null, null, null, null] }, prodTarget: { yearly: [5000, 5100, 5200], monthly: [5300, null, null, null, null, null, null, null, null, null, null, null] }, prodActual: { yearly: [4800, 5050, 5150], monthly: [5250, null, null, null, null, null, null, null, null, null, null, null] }, unitCostTarget: 190000 },
                    metrics: {
                        yield: { yearly: [98.5, 98.8, 99.0], monthly: [99.2, null, null, null, null, null, null, null, null, null, null, null] },
                        operRate: { yearly: [82, 85, 87], monthly: [88, null, null, null, null, null, null, null, null, null, null, null] },
                        regReplace: { yearly: [150, 145, 140], monthly: [135, null, null, null, null, null, null, null, null, null, null, null] },
                        irregFail: { yearly: [55, 48, 42], monthly: [3, null, null, null, null, null, null, null, null, null, null, null] },
                        tonPower: { yearly: [10.5, 11.2, 11.5], monthly: [11.8, null, null, null, null, null, null, null, null, null, null, null] },
                        utility: {
                            elec: { yearly: [220, 215, 210], monthly: [208, null, null, null, null, null, null, null, null, null, null, null] },
                            fuel: { yearly: [2, 2, 2], monthly: [1.9, null, null, null, null, null, null, null, null, null, null, null] }
                        }
                    }
                },
                CGL: {
                    highlights: 'CGL 실적 내용입니다.', issues: '', plans: '', pdfUrl: '',
                    mfgCost: { fixed: { yearly: [150000, 145000, 140000], monthly: [138000, null, null, null, null, null, null, null, null, null, null, null] }, variable: { yearly: [250000, 240000, 230000], monthly: [225000, null, null, null, null, null, null, null, null, null, null, null] }, prodTarget: { yearly: [8000, 8200, 8400], monthly: [8500, null, null, null, null, null, null, null, null, null, null, null] }, prodActual: { yearly: [7800, 8100, 8300], monthly: [8450, null, null, null, null, null, null, null, null, null, null, null] }, unitCostTarget: 360000 },
                    metrics: {
                        yield: { yearly: [99.0, 99.2, 99.3], monthly: [99.5, null, null, null, null, null, null, null, null, null, null, null] },
                        operRate: { yearly: [88, 90, 91], monthly: [93, null, null, null, null, null, null, null, null, null, null, null] },
                        regReplace: { yearly: [200, 190, 185], monthly: [180, null, null, null, null, null, null, null, null, null, null, null] },
                        irregFail: { yearly: [35, 30, 25], monthly: [1, null, null, null, null, null, null, null, null, null, null, null] },
                        tonPower: { yearly: [15.5, 16.2, 16.5], monthly: [16.8, null, null, null, null, null, null, null, null, null, null, null] },
                        utility: {
                            elec: { yearly: [180, 175, 170], monthly: [168, null, null, null, null, null, null, null, null, null, null, null] },
                            fuel: { yearly: [45, 43, 42], monthly: [41, null, null, null, null, null, null, null, null, null, null, null] }
                        }
                    }
                }
            },
            productionColorReports: {
                '1CCL': {
                    highlights: '1CCL 실적 내용입니다.', issues: '', plans: '', pdfUrl: '',
                    mfgCost: { fixed: { yearly: [60000, 58000, 57000], monthly: [56500, null, null, null, null, null, null, null, null, null, null, null] }, variable: { yearly: [40000, 38000, 37000], monthly: [36500, null, null, null, null, null, null, null, null, null, null, null] }, prodTarget: { yearly: [3000, 3100, 3200], monthly: [3300, null, null, null, null, null, null, null, null, null, null, null] }, prodActual: { yearly: [2900, 3050, 3150], monthly: [3250, null, null, null, null, null, null, null, null, null, null, null] }, unitCostTarget: 90000 },
                    metrics: {
                        yield: { yearly: [98.8, 99.0, 99.1], monthly: [99.3, null, null, null, null, null, null, null, null, null, null, null] },
                        operRate: { yearly: [78, 82, 84], monthly: [86, null, null, null, null, null, null, null, null, null, null, null] },
                        regReplace: { yearly: [300, 280, 270], monthly: [260, null, null, null, null, null, null, null, null, null, null, null] },
                        irregFail: { yearly: [65, 55, 45], monthly: [4, null, null, null, null, null, null, null, null, null, null, null] },
                        tonPower: { yearly: [8.5, 9.2, 9.5], monthly: [9.8, null, null, null, null, null, null, null, null, null, null, null] },
                        utility: {
                            elec: { yearly: [120, 115, 110], monthly: [108, null, null, null, null, null, null, null, null, null, null, null] },
                            fuel: { yearly: [35, 33, 32], monthly: [31, null, null, null, null, null, null, null, null, null, null, null] }
                        }
                    }
                },
                '2CCL': {
                    highlights: '2CCL 실적 내용입니다.', issues: '', plans: '', pdfUrl: '',
                    mfgCost: { fixed: { yearly: [70000, 68000, 67000], monthly: [66500, null, null, null, null, null, null, null, null, null, null, null] }, variable: { yearly: [50000, 48000, 47000], monthly: [46500, null, null, null, null, null, null, null, null, null, null, null] }, prodTarget: { yearly: [4000, 4100, 4200], monthly: [4300, null, null, null, null, null, null, null, null, null, null, null] }, prodActual: { yearly: [3900, 4050, 4150], monthly: [4250, null, null, null, null, null, null, null, null, null, null, null] }, unitCostTarget: 110000 },
                    metrics: {
                        yield: { yearly: [98.5, 98.7, 98.9], monthly: [99.1, null, null, null, null, null, null, null, null, null, null, null] },
                        operRate: { yearly: [80, 83, 85], monthly: [87, null, null, null, null, null, null, null, null, null, null, null] },
                        regReplace: { yearly: [350, 330, 310], monthly: [300, null, null, null, null, null, null, null, null, null, null, null] },
                        irregFail: { yearly: [75, 65, 55], monthly: [5, null, null, null, null, null, null, null, null, null, null, null] },
                        tonPower: { yearly: [9.5, 10.2, 10.5], monthly: [10.8, null, null, null, null, null, null, null, null, null, null, null] },
                        utility: {
                            elec: { yearly: [140, 135, 130], monthly: [128, null, null, null, null, null, null, null, null, null, null, null] },
                            fuel: { yearly: [40, 38, 37], monthly: [36, null, null, null, null, null, null, null, null, null, null, null] }
                        }
                    }
                },
                '3CCL': {
                    highlights: '3CCL 실적 내용입니다.', issues: '', plans: '', pdfUrl: '',
                    mfgCost: { fixed: { yearly: [65000, 63000, 62000], monthly: [61500, null, null, null, null, null, null, null, null, null, null, null] }, variable: { yearly: [45000, 43000, 42000], monthly: [41500, null, null, null, null, null, null, null, null, null, null, null] }, prodTarget: { yearly: [3500, 3600, 3700], monthly: [3800, null, null, null, null, null, null, null, null, null, null, null] }, prodActual: { yearly: [3400, 3550, 3650], monthly: [3750, null, null, null, null, null, null, null, null, null, null, null] }, unitCostTarget: 100000 },
                    metrics: {
                        yield: { yearly: [98.7, 98.9, 99.0], monthly: [99.2, null, null, null, null, null, null, null, null, null, null, null] },
                        operRate: { yearly: [84, 86, 88], monthly: [90, null, null, null, null, null, null, null, null, null, null, null] },
                        regReplace: { yearly: [320, 300, 280], monthly: [265, null, null, null, null, null, null, null, null, null, null, null] },
                        irregFail: { yearly: [65, 55, 45], monthly: [4, null, null, null, null, null, null, null, null, null, null, null] },
                        tonPower: { yearly: [8.5, 9.2, 9.5], monthly: [9.8, null, null, null, null, null, null, null, null, null, null, null] },
                        utility: {
                            elec: { yearly: [130, 125, 120], monthly: [118, null, null, null, null, null, null, null, null, null, null, null] },
                            fuel: { yearly: [38, 36, 35], monthly: [34, null, null, null, null, null, null, null, null, null, null, null] }
                        }
                    }
                }
            },

            // 주요지표 - 설비종합효율
            equipEfficiency: {
                CGL: {
                    target: 87.72,
                    yearly: [85.3, 82.0, 86.7, 88.13],
                    monthly: [89.8, 88.4, 86.7, 87.2, 87.9, 91.8, 89.4, 88.5, 87.9, 86.4, 85.2, 88.3],
                    analysis: '목표대비 0.6%p 향상, 실가동율 99.97%, 25년 월 최고 수준'
                },
                '1CCL': {
                    target: 62.83,
                    yearly: [null, 55.3, 63.9, 61.65],
                    monthly: [60.8, 63.3, 62.1, 65.5, 61.4, 61.3, 63.7, 62.6, 63.9, 64.4, 59.7, 52.3],
                    analysis: '목표대비 10.53%p 미달, 전월대비 실가동율 3.41%하락'
                },
                '3CCL': {
                    target: 45,
                    yearly: [45.9, 45.8, 43.4, 44.5],
                    monthly: [42.1, 41.1, 34.1, 50.3, 47.4, 43.4, 42.9, 37.9, 55.2, 46.9, 46.5, null],
                    analysis: '목표대비 1.53%p 초과'
                }
            },

            // 주요지표 - 스크랩 현황
            scrap: {
                steel: {
                    target: 15,
                    yearly: [14.7, 17.8, 17.1, 15.8],
                    monthly: new Array(12).fill(null),
                    input: 0, scrapSales: 0,
                    analysis: ''
                },
                al: {
                    target: 30,
                    yearly: [27.7, 27.7, 32.8, 27.4],
                    monthly: new Array(12).fill(null),
                    input: 0, scrapSales: 0,
                    analysis: ''
                }
            },

            // 주요지표 - A급 수율
            yield: {
                composite: { target: 99.57, yearly: [99.43, 99.47, 99.43, 99.63], monthly: [99.63, null, null, null, null, null, null, null, null, null, null, null] },
                CPL: { target: 97.82, yearly: [97.72, 97.71, 97.78, 97.80], monthly: [97.80, null, null, null, null, null, null, null, null, null, null, null] },
                CGL: { target: 99.85, yearly: [99.82, 99.80, 99.81, 99.85], monthly: [99.85, null, null, null, null, null, null, null, null, null, null, null] },
                '1CCL': { target: 99.70, yearly: [99.65, 99.67, 99.61, 99.70], monthly: [99.70, null, null, null, null, null, null, null, null, null, null, null] },
                '2CCL': { target: 99.80, yearly: [99.78, 99.75, 99.82, 99.85], monthly: [99.85, null, null, null, null, null, null, null, null, null, null, null] },
                '3CCL': { target: 99.85, yearly: [99.80, 99.79, 99.84, 99.90], monthly: [99.90, null, null, null, null, null, null, null, null, null, null, null] }
            },

            // 주요지표 - 실가동률
            operationRate: {
                composite: { target: 90.87, yearly: [88.03, 86.48, 86.47, 88.50], monthly: [88.50, null, null, null, null, null, null, null, null, null, null, null] },
                CRM: { target: 96.60, yearly: [95.68, 96.02, 96.55, 96.60], monthly: [96.60, null, null, null, null, null, null, null, null, null, null, null] },
                CGL: { target: 95.0, yearly: [92.1, 93.4, 94.5, 96.2], monthly: [96.2, null, null, null, null, null, null, null, null, null, null, null] },
                '1CCL': { target: 85.0, yearly: [80.5, 82.1, 84.4, 86.5], monthly: [86.5, null, null, null, null, null, null, null, null, null, null, null] },
                '2CCL': { target: 80.0, yearly: [75.2, 78.4, 79.1, 81.2], monthly: [81.2, null, null, null, null, null, null, null, null, null, null, null] },
                '3CCL': { target: 70.0, yearly: [65.4, 68.1, 69.4, 72.3], monthly: [72.3, null, null, null, null, null, null, null, null, null, null, null] }
            },

            // 주요지표 - LNG원단위
            lng: {
                composite: { target: 17.13, yearly: [19.70, 20.60, 18.42, 16.57], monthly: [16.57, null, null, null, null, null, null, null, null, null, null, null] },
                CPL: { target: 2.90, yearly: [6.41, 4.64, 2.94, 2.94], monthly: [2.94, null, null, null, null, null, null, null, null, null, null, null] },
                CGL: { target: 20.0, yearly: [22.4, 21.5, 20.8, 19.5], monthly: [19.5, null, null, null, null, null, null, null, null, null, null, null] },
                '1CCL': { target: 35.0, yearly: [38.2, 37.1, 36.4, 34.2], monthly: [34.2, null, null, null, null, null, null, null, null, null, null, null] },
                '2CCL': { target: 45.0, yearly: [48.5, 47.1, 46.2, 44.1], monthly: [44.1, null, null, null, null, null, null, null, null, null, null, null] },
                '3CCL': { target: 40.0, yearly: [42.1, 41.5, 40.8, 38.5], monthly: [38.5, null, null, null, null, null, null, null, null, null, null, null] }
            },

            // 주요지표 - 전력원단위
            power: {
                composite: { target: 71, yearly: [73, 77, 73, 71], monthly: new Array(12).fill(null) },
                CRM: { target: 86, yearly: [88, 88, 89, 84], monthly: new Array(12).fill(null) },
                CGL: { target: 99, yearly: [107, 110, 102, 99], monthly: new Array(12).fill(null) },
                '1CCL': { target: 68, yearly: [66, 80, 71, 68.00], monthly: new Array(12).fill(null) },
                '2CCL': { target: 165, yearly: [178, 158, 171, 204.08], monthly: new Array(12).fill(null) },
                '3CCL': { target: 100, yearly: [117, 103, 103, 100.00], monthly: new Array(12).fill(null) }
            },

            // 주요지표 - 스팀
            steam: {
                purchase: {
                    baseline: 1600,
                    yearly: [1370, 1886, 817, 759.00],
                    monthly: new Array(12).fill(null)
                },
                usageUnit: {
                    baseline: 1492,
                    monthly: new Array(12).fill(null)
                },
                selfProd2CCL: {
                    baseline: 420,
                    yearly: [362, 486, 435, 441.42],
                    monthly: new Array(12).fill(null)
                },
                selfProd3CCL: {
                    baseline: 1025,
                    yearly: [null, null, null, 1055],
                    monthly: [725, 1059, 994, 1045, 950, 1110, 891, 1187, 1234, 1351, 1054, null]
                }
            },

            // 주요지표 - 소모품 원단위
            consumables: {
                CPL: { costTarget: 990, unitTarget: 400, costYearly: [394, 210, 554, 1022], costMonthly: [317, 846, 900, 3469, 523, 1734, 1875, 335, 335, 301, 1203, 635], unitYearly: [736, null, null, null], unitMonthly: [424, 453, 413, 115, 352, 1496, 417, 196, 716, 653, 433, 150] },
                CRM: { costTarget: 7050, unitTarget: 2940, costYearly: [5408, 6135, 6961, 6006], costMonthly: [8296, 7415, 7303, 6165, 6194, 7329, 7213, 6711, 6469, 2951, 2350, 4396], unitYearly: [2651, 2892, 2974, 2636], unitMonthly: [2529, 2558, 3248, 3243, 2483, 3479, 2985, 2732, 2981, 2440, 1192, 1041] },
                CGL: { costTarget: 28090, unitTarget: 11836, costYearly: [20125, 25104, 28012, 23546], costMonthly: [27292, 26163, 22476, 19282, 26910, 22432, 26040, 21887, 20693, 20879, 26316, 22187], unitYearly: [9604, 11895, 11849, 9804], unitMonthly: [12189, 12121, 11432, 10930, 9750, 7166, 8911, 10167, 9093, 9905, 8475, 8209] },
                '1CCL': { costTarget: 16050, unitTarget: 12500, costYearly: [16911, 16651, 14800, 13987], costMonthly: [19367, 20056, 17330, 16294, 13027, 16863, 14890, 15028, 11073, 12102, null, null], unitYearly: [15304, 12901, 13281, 11511], unitMonthly: [14989, 14693, 12844, 11637, 9848, 12515, 13009, 11205, 8922, 9415, null, null] },
                '2CCL': { costTarget: 6260, unitTarget: 29900, costYearly: [11696, 9511, 8112, 8113], costMonthly: [9149, 9676, 14150, 7570, 5719, 10949, 7214, 9406, 8269, 4371, 3719, null], unitYearly: [39569, 30499, 40680, 42125], unitMonthly: [39449, 53185, 61445, 40821, 29254, 29965, 56941, 49062, 35343, 30857, 26022, null] },
                '3CCL': { costTarget: 12530, unitTarget: 22100, costYearly: [12835, 12047, 13630, 14413], costMonthly: [11196, 15580, 17703, 15816, 15028, 10727, 20885, 12210, 12823, 15161, 12293, null], unitYearly: [29400, 22800, 23279, 26012], unitMonthly: [27345, 35542, 37617, 25842, 21996, 19089, 19514, 31210, 19800, 21758, 21891, null] }
            },

            // 주요지표 - 공장KPI (폐기/재고)
            factoryKPI: {
                disposal: {
                    yearly: [5375, 6505, 470662, 422340],
                    monthly: [5634, 5497, 5323, 5383, 5532, 5880, 4832, 6692, 5674, 5789, 5900, 5515],
                    avgInventory: 271579,
                    amount: 5596,
                    colors: 41,
                    unitCost: 12362,
                    byType: { '불소': 628, RMP: 2671, HPP: 838, EPOXY: 72, '기타': 1387 }
                },
                disposalCost: {
                    costMonthly: [12023, 13144, 11375, 12725, 11375, 18486, 13240, 11013, 8789, 17739, 10619, 10035],
                    unitMonthly: [65, 86, 72, 62, 71, 61, 52, 56, 60, 58, 69, 85]
                },
                semiProduct: {
                    target: [16433, 19800, 18800, 18800, 16800, 16800, 16800, 15800, 15800, 13510, 14600, 14800, 14100, 14100],
                    actual: [18527, 21544, 23337, 23139, 20433, 17810, 16102, 17939, 17169, 18038, 16848, 15733, 16440, 15833],
                    diff: [2094, 1744, 4537, 4339, 3633, 1010, -698, 2139, 1369, 4528, 2248, 933, 2340, 1733]
                }
            },

            // 주요지표 - 고객불만 및 반품 (PDF 데이터 반영)
            complaints: {
                customerComplaints: {
                    yearly: [15, 12, 12, 1], // 22, 23, 24, 25.1월
                    monthly: [1, null, null, null, null, null, null, null, null, null, null, null],
                    count: { total1to11: 0, dec: 1, cumulative25: 1, y24: 12 },
                    closed: { total1to11: 0, dec: 1, cumulative25: 1, y24: 12 },
                    compensation: { total1to11: 0, dec: 5.6, cumulative25: 5.6, y24: 44.5 }
                },
                returns: {
                    yearly: [5, 4, 4, 0],
                    monthly: [0, null, null, null, null, null, null, null, null, null, null, null],
                    count: { total1to11: 0, dec: 0, cumulative25: 0 },
                    volume: { total1to11: 0, dec: 0, cumulative25: 0, y24: 15.2 },
                    loss: { total1to11: 0, dec: 0, cumulative25: 0, y24: 21.8 }
                }
            },

            // 주요지표 - 설비고장 (PDF 데이터 반영)
            breakdown: {
                timeTotal: { target: 12.0, yearly: [15.2, 14.5, 13.8, 12.5], monthly: [12.5, null, null, null, null, null, null, null, null, null, null, null] },
                countTotal: { target: 10, yearly: [12, 11, 10, 8], monthly: [8, null, null, null, null, null, null, null, null, null, null, null] },
                timeMech: { target: 7.0, yearly: [9.2, 8.5, 7.8, 7.2], monthly: [7.2, null, null, null, null, null, null, null, null, null, null, null] },
                countMech: { target: 6, yearly: [7, 6, 6, 5], monthly: [5, null, null, null, null, null, null, null, null, null, null, null] },
                timeElec: { target: 5.0, yearly: [6.0, 6.0, 6.0, 5.3], monthly: [5.3, null, null, null, null, null, null, null, null, null, null, null] },
                countElec: { target: 4, yearly: [5, 5, 4, 3], monthly: [3, null, null, null, null, null, null, null, null, null, null, null] }
            },
            productionColdReports: {
                CPL: {
                    highlights: 'CPL 당월 주요 실적 내용입니다.', issues: 'CPL 문제점 및 대책 내용입니다.', plans: 'CPL 차월 계획 내용입니다.', pdfUrl: '',
                    mfgCost: {
                        fixed: { yearly: [119273, 116832, 116820], monthly: [91207, null, null, null, null, null, null, null, null, null, null, null] },
                        variable: { yearly: [103056, 85354, 80402], monthly: [65053, null, null, null, null, null, null, null, null, null, null, null] },
                        prodTarget: { yearly: [null, 5524, 5549], monthly: [6200, null, null, null, null, null, null, null, null, null, null, null] },
                        prodActual: { yearly: [4368, 5275, 5522], monthly: [7445, null, null, null, null, null, null, null, null, null, null, null] },
                        unitCostTarget: 159166
                    },
                    metrics: {
                        yield: { yearly: [99.2, 99.4, 99.4], monthly: [99.5, null, null, null, null, null, null, null, null, null, null, null] },
                        operRate: { yearly: [85, 88, 90], monthly: [92, null, null, null, null, null, null, null, null, null, null, null] },
                        regReplace: { yearly: [120, 115, 110], monthly: [105, null, null, null, null, null, null, null, null, null, null, null] },
                        irregFail: { yearly: [45, 38, 30], monthly: [2, null, null, null, null, null, null, null, null, null, null, null] },
                        tonPower: { yearly: [12.5, 13.2, 13.5], monthly: [13.8, null, null, null, null, null, null, null, null, null, null, null] },
                        utility: {
                            elec: { yearly: [25, 24, 23], monthly: [22.5, null, null, null, null, null, null, null, null, null, null, null] },
                            fuel: { yearly: [15, 14, 14], monthly: [13.8, null, null, null, null, null, null, null, null, null, null, null] }
                        }
                    }
                },
                CRM: {
                    highlights: 'CRM 실적 내용입니다.', issues: 'CRM 이슈입니다.', plans: 'CRM 계획입니다.', pdfUrl: '',
                    mfgCost: { fixed: { yearly: [85000, 82000, 81000], monthly: [80500, null, null, null, null, null, null, null, null, null, null, null] }, variable: { yearly: [120000, 115000, 110000], monthly: [108000, null, null, null, null, null, null, null, null, null, null, null] }, prodTarget: { yearly: [5000, 5100, 5200], monthly: [5300, null, null, null, null, null, null, null, null, null, null, null] }, prodActual: { yearly: [4800, 5050, 5150], monthly: [5250, null, null, null, null, null, null, null, null, null, null, null] }, unitCostTarget: 190000 },
                    metrics: {
                        yield: { yearly: [98.5, 98.8, 99.0], monthly: [99.2, null, null, null, null, null, null, null, null, null, null, null] },
                        operRate: { yearly: [82, 85, 87], monthly: [88, null, null, null, null, null, null, null, null, null, null, null] },
                        regReplace: { yearly: [150, 145, 140], monthly: [135, null, null, null, null, null, null, null, null, null, null, null] },
                        irregFail: { yearly: [55, 48, 42], monthly: [3, null, null, null, null, null, null, null, null, null, null, null] },
                        tonPower: { yearly: [10.5, 11.2, 11.5], monthly: [11.8, null, null, null, null, null, null, null, null, null, null, null] },
                        utility: {
                            elec: { yearly: [220, 215, 210], monthly: [208, null, null, null, null, null, null, null, null, null, null, null] },
                            fuel: { yearly: [2, 2, 2], monthly: [1.9, null, null, null, null, null, null, null, null, null, null, null] }
                        }
                    }
                },
                CGL: {
                    highlights: 'CGL 실적 내용입니다.', issues: 'CGL 이슈입니다.', plans: 'CGL 계획입니다.', pdfUrl: '',
                    mfgCost: { fixed: { yearly: [150000, 145000, 140000], monthly: [138000, null, null, null, null, null, null, null, null, null, null, null] }, variable: { yearly: [250000, 240000, 230000], monthly: [225000, null, null, null, null, null, null, null, null, null, null, null] }, prodTarget: { yearly: [8000, 8200, 8400], monthly: [8500, null, null, null, null, null, null, null, null, null, null, null] }, prodActual: { yearly: [7800, 8100, 8300], monthly: [8450, null, null, null, null, null, null, null, null, null, null, null] }, unitCostTarget: 360000 },
                    metrics: {
                        yield: { yearly: [99.0, 99.2, 99.3], monthly: [99.5, null, null, null, null, null, null, null, null, null, null, null] },
                        operRate: { yearly: [88, 90, 91], monthly: [93, null, null, null, null, null, null, null, null, null, null, null] },
                        regReplace: { yearly: [200, 190, 185], monthly: [180, null, null, null, null, null, null, null, null, null, null, null] },
                        irregFail: { yearly: [35, 30, 25], monthly: [1, null, null, null, null, null, null, null, null, null, null, null] },
                        tonPower: { yearly: [15.5, 16.2, 16.5], monthly: [16.8, null, null, null, null, null, null, null, null, null, null, null] },
                        utility: {
                            elec: { yearly: [180, 175, 170], monthly: [168, null, null, null, null, null, null, null, null, null, null, null] },
                            fuel: { yearly: [45, 43, 42], monthly: [41, null, null, null, null, null, null, null, null, null, null, null] }
                        }
                    }
                }
            },
            productionColorReports: {
                '1CCL': {
                    highlights: '1CCL 실적 내용입니다.', issues: '1CCL 이슈입니다.', plans: '1CCL 계획입니다.', pdfUrl: '',
                    mfgCost: { fixed: { yearly: [60000, 58000, 57000], monthly: [56500, null, null, null, null, null, null, null, null, null, null, null] }, variable: { yearly: [40000, 38000, 37000], monthly: [36500, null, null, null, null, null, null, null, null, null, null, null] }, prodTarget: { yearly: [3000, 3100, 3200], monthly: [3300, null, null, null, null, null, null, null, null, null, null, null] }, prodActual: { yearly: [2900, 3050, 3150], monthly: [3250, null, null, null, null, null, null, null, null, null, null, null] }, unitCostTarget: 90000 },
                    metrics: {
                        yield: { yearly: [98.8, 99.0, 99.1], monthly: [99.3, null, null, null, null, null, null, null, null, null, null, null] },
                        operRate: { yearly: [78, 82, 84], monthly: [86, null, null, null, null, null, null, null, null, null, null, null] },
                        regReplace: { yearly: [300, 280, 270], monthly: [260, null, null, null, null, null, null, null, null, null, null, null] },
                        irregFail: { yearly: [65, 55, 45], monthly: [4, null, null, null, null, null, null, null, null, null, null, null] },
                        tonPower: { yearly: [8.5, 9.2, 9.5], monthly: [9.8, null, null, null, null, null, null, null, null, null, null, null] },
                        utility: {
                            elec: { yearly: [120, 115, 110], monthly: [108, null, null, null, null, null, null, null, null, null, null, null] },
                            fuel: { yearly: [35, 33, 32], monthly: [31, null, null, null, null, null, null, null, null, null, null, null] }
                        }
                    }
                },
                '2CCL': {
                    highlights: '2CCL 실적 내용입니다.', issues: '2CCL 이슈입니다.', plans: '2CCL 계획입니다.', pdfUrl: '',
                    mfgCost: { fixed: { yearly: [70000, 68000, 67000], monthly: [66500, null, null, null, null, null, null, null, null, null, null, null] }, variable: { yearly: [50000, 48000, 47000], monthly: [46500, null, null, null, null, null, null, null, null, null, null, null] }, prodTarget: { yearly: [4000, 4100, 4200], monthly: [4300, null, null, null, null, null, null, null, null, null, null, null] }, prodActual: { yearly: [3900, 4050, 4150], monthly: [4250, null, null, null, null, null, null, null, null, null, null, null] }, unitCostTarget: 110000 },
                    metrics: {
                        yield: { yearly: [98.5, 98.7, 98.9], monthly: [99.1, null, null, null, null, null, null, null, null, null, null, null] },
                        operRate: { yearly: [80, 83, 85], monthly: [87, null, null, null, null, null, null, null, null, null, null, null] },
                        regReplace: { yearly: [350, 330, 310], monthly: [300, null, null, null, null, null, null, null, null, null, null, null] },
                        irregFail: { yearly: [75, 65, 55], monthly: [5, null, null, null, null, null, null, null, null, null, null, null] },
                        tonPower: { yearly: [9.5, 10.2, 10.5], monthly: [10.8, null, null, null, null, null, null, null, null, null, null, null] },
                        utility: {
                            elec: { yearly: [140, 135, 130], monthly: [128, null, null, null, null, null, null, null, null, null, null, null] },
                            fuel: { yearly: [40, 38, 37], monthly: [36, null, null, null, null, null, null, null, null, null, null, null] }
                        }
                    }
                },
                '3CCL': {
                    highlights: '3CCL 실적 내용입니다.', issues: '3CCL 이슈입니다.', plans: '3CCL 계획입니다.', pdfUrl: '',
                    mfgCost: { fixed: { yearly: [65000, 63000, 62000], monthly: [61500, null, null, null, null, null, null, null, null, null, null, null] }, variable: { yearly: [45000, 43000, 42000], monthly: [41500, null, null, null, null, null, null, null, null, null, null, null] }, prodTarget: { yearly: [3500, 3600, 3700], monthly: [3800, null, null, null, null, null, null, null, null, null, null, null] }, prodActual: { yearly: [3400, 3550, 3650], monthly: [3750, null, null, null, null, null, null, null, null, null, null, null] }, unitCostTarget: 100000 },
                    metrics: {
                        yield: { yearly: [98.7, 98.9, 99.0], monthly: [99.2, null, null, null, null, null, null, null, null, null, null, null] },
                        operRate: { yearly: [84, 86, 88], monthly: [90, null, null, null, null, null, null, null, null, null, null, null] },
                        regReplace: { yearly: [320, 300, 280], monthly: [265, null, null, null, null, null, null, null, null, null, null, null] },
                        irregFail: { yearly: [65, 55, 45], monthly: [4, null, null, null, null, null, null, null, null, null, null, null] },
                        tonPower: { yearly: [8.5, 9.2, 9.5], monthly: [9.8, null, null, null, null, null, null, null, null, null, null, null] },
                        utility: {
                            elec: { yearly: [130, 125, 120], monthly: [118, null, null, null, null, null, null, null, null, null, null, null] },
                            fuel: { yearly: [38, 36, 35], monthly: [34, null, null, null, null, null, null, null, null, null, null, null] }
                        }
                    }
                }
            }
        };
    }

    // 특정 섹션 데이터 가져오기
    getSectionData(sectionId) {
        return this.data[sectionId] || {};
    }

    // 특정 섹션 데이터 업데이트
    async updateSectionData(sectionId, newData) {
        this.data[sectionId] = { ...this.data[sectionId], ...newData };
        await this.save();
    }

    // 데이터 내보내기
    exportData() {
        const blob = new Blob([JSON.stringify(this.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `seah_cm_report_${this.data.meta.year}_${this.data.meta.month}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // 데이터 가져오기
    async importData(jsonString) {
        try {
            this.data = JSON.parse(jsonString);
            await this.save();
            return true;
        } catch (e) {
            console.error('데이터 가져오기 실패:', e);
            return false;
        }
    }

    // 현재 월 데이터 초기화 (삭제 처리하여 '신규 작성' 상태로 되돌림)
    async reset() {
        const docId = this.activeDocId;
        const localKey = this.getLocalKey(this.currentYear, this.currentMonth);

        try {
            // 1. Firebase에서 문서 과감히 삭제
            await db.collection(COLLECTION).doc(docId).delete();
        } catch (e) {
            console.warn('Firebase 문서 삭제 실패 (이미 없거나 권한 문제):', e);
        }

        // 2. 로컬 캐시 무조건 삭제
        localStorage.removeItem(localKey);

        // 3. 상태를 완전히 깨끗한 템플릿으로 교체
        const template = this.getEmptyTemplate();
        template.meta.year = this.currentYear;
        template.meta.month = this.currentMonth;
        this.data = template;
        this.docExists = false;

        // 4. 깨끗해진 상태를 다시 저장 (구조 복구 완료)
        await this.save();
    }

    // 파일 업로드 (Firebase Storage)
    async uploadFile(file, path) {
        try {
            const fileRef = storage.ref().child(path);
            const snapshot = await fileRef.put(file);
            const url = await snapshot.ref.getDownloadURL();
            return url;
        } catch (e) {
            console.error('파일 업로드 실패:', e);
            throw e;
        }
    }

    // Storage 파일 목록 조회
    async listStorageFiles(folderPath = '') {
        try {
            const listRef = storage.ref().child(folderPath || '/');
            const result = await listRef.listAll();
            const files = [];

            // 파일 정보 수집
            for (const itemRef of result.items) {
                try {
                    const url = await itemRef.getDownloadURL();
                    const metadata = await itemRef.getMetadata();
                    files.push({
                        name: itemRef.name,
                        fullPath: itemRef.fullPath,
                        url: url,
                        size: metadata.size,
                        contentType: metadata.contentType,
                        updated: metadata.updated,
                        timeCreated: metadata.timeCreated
                    });
                } catch (e) {
                    console.warn('파일 정보 로드 실패:', itemRef.name, e);
                }
            }

            // 하위 폴더도 탐색
            const folders = result.prefixes.map(p => ({
                name: p.name,
                fullPath: p.fullPath
            }));

            return { files, folders };
        } catch (e) {
            console.error('Storage 목록 조회 실패:', e);
            return { files: [], folders: [] };
        }
    }
}

// 전역 데이터 매니저 인스턴스
const dataManager = new DataManager();
