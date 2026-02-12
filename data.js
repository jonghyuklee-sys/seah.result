/* ==========================================
   Data Manager - SeAH C&M Performance Report
   ========================================== */

const LINES = ['CPL', 'CRM', 'CGL', '1CCL', '2CCL', '3CCL'];
const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
const YEARS = ['22년', '23년', '24년', '25년'];
const YEAR_MONTH_LABELS = [...YEARS, ...MONTHS];
const TEAMS = ['생산팀', '설비팀', '품질경영팀', '변화관리팀', '안전환경팀'];

// Firebase 설정 (스크린샷 기반 실제 설정값 반영)
const firebaseConfig = {
    apiKey: "AIzaSyArAJX9RF00aGWrptwKG5bMX8gtDl7aKJw",
    authDomain: "conden-mgmt-common.firebaseapp.com",
    projectId: "conden-mgmt-common",
    storageBucket: "conden-mgmt-common.firebasestorage.app",
    messagingSenderId: "1056648535315",
    appId: "1:1056648535315:web:545b6a117284c551c4cee6"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const DOC_ID = "report_v1";
const COLLECTION = "performance_data";

const STORAGE_KEY = 'seah_cm_report_data';

class DataManager {
    constructor() {
        this.data = this.getDefaultData(); // 초기값 설정
        this.isLoaded = false;
    }

    async init() {
        // 1. LocalStorage 우선 로드
        const localData = this.loadLocal();
        if (localData) {
            this.data = localData;
        }

        // 2. Firebase Firestore에서 최신 데이터 가져오기
        try {
            const doc = await db.collection(COLLECTION).doc(DOC_ID).get();
            if (doc.exists) {
                this.data = doc.data();
                this.saveLocal(); // 로컬 캐시 업데이트
                console.log('✅ Firebase 데이터 동기화 완료');
            } else {
                console.log('ℹ️ Firebase에 데이터가 없습니다. 기본 데이터를 업로드합니다.');
                await this.saveFirebase();
            }
        } catch (e) {
            console.error('❌ Firebase 로드 실패:', e);
        }
        this.isLoaded = true;
    }

    loadLocal() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            return null;
        }
    }

    saveLocal() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        } catch (e) {
            console.error('로컬 저장 실패:', e);
        }
    }

    async saveFirebase() {
        try {
            await db.collection(COLLECTION).doc(DOC_ID).set(this.data);
            return true;
        } catch (e) {
            console.error('Firebase 저장 실패:', e);
            return false;
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

    getDefaultData() {
        return {
            meta: {
                year: 2025,
                month: 12,
                company: '세아씨엠'
            },
            // 1. 제조원가 절감 현황
            costReduction: {
                target: 5.43,
                actual24: -4.39,
                q4Compare: 3.62,
                changeRate: -81,
                production: {
                    avg24: 92433,
                    plan: 95350,
                    actual: 88867
                },
                analysis: {
                    comment: '2CCL 제외 주요 지표 개선됨',
                    lines: {
                        CPL: { decrease: '연료(1,207), 소모품(807)', increase: '수선비(1,635), 전력(597)' },
                        CRM: { decrease: '소모품(2,563), 수선비(798)', increase: '전력(1,910)' },
                        CGL: { decrease: '연료(3,003), 수선비(2,635), 소모품(1,164)', increase: '전력(1,833)' },
                        '1CCL': { decrease: '연료(7,222), 수선비(2,636)', increase: '전력(1,528), 소모품(438)' },
                        '2CCL': { decrease: '', increase: '전력(43,066), 연료(24,904), 수선(6,417), 소모품(19,957)' },
                        '3CCL': { decrease: '연료(10,285), 수선(8,438)', increase: '소모품(6,104), 전력(4,020)' }
                    }
                },
                lineData: {
                    unitCost: {
                        CPL: { y24_4: 21984, y24: 23110, m7: 28422, m8: 22704, m9: 18774, m10: 18484, m11: 21649, m12: 23419 },
                        CRM: { y24_4: 38812, y24: 40472, m7: 45287, m8: 37518, m9: 29373, m10: 28689, m11: 30945, m12: 37994 },
                        CGL: { y24_4: 83115, y24: 90477, m7: 98721, m8: 91252, m9: 78120, m10: 80024, m11: 76217, m12: 87260 },
                        '1CCL': { y24_4: 93313, y24: 101258, m7: 112384, m8: 102283, m9: 85122, m10: 88224, m11: 104529, m12: 106347 },
                        '2CCL': { y24_4: 282412, y24: 295494, m7: 580158, m8: 669495, m9: 446154, m10: 664002, m11: 486704, m12: 613608 },
                        '3CCL': { y24_4: 180577, y24: 202176, m7: 218846, m8: 182866, m9: 164213, m10: 156785, m11: 180442, m12: 213402 }
                    },
                    improvement: {
                        CPL: { m5: 0.93, m6: 0.94, m7: -1.53, m8: 0.09, m9: 1.20, m10: 1.16, m11: 0.33, m12: -0.07 },
                        CRM: { m5: 1.83, m6: 1.31, m7: -1.27, m8: 0.66, m9: 2.94, m10: 2.92, m11: 2.15, m12: 0.56 },
                        CGL: { m5: 2.57, m6: 1.66, m7: -2.12, m8: -0.20, m9: 3.36, m10: 2.53, m11: 3.61, m12: 0.75 },
                        '1CCL': { m5: 1.75, m6: 3.51, m7: -1.50, m8: -0.12, m9: 2.16, m10: 1.61, m11: -0.42, m12: -0.62 },
                        '2CCL': { m5: -3.14, m6: -0.69, m7: -4.69, m8: -5.49, m9: -3.52, m10: -5.22, m11: -2.73, m12: -4.59 },
                        '3CCL': { m5: 3.56, m6: 5.49, m7: -1.12, m8: 1.21, m9: 2.46, m10: 3.16, m11: 1.22, m12: -0.67 }
                    }
                },
                yieldRate: { y24_4: '99.46%', y24: '99.47%', m7: '99.46%', m8: '99.39%', m9: '99.23%', m10: '99.45%', m11: '99.56%', m12: '99.52%' },
                totalImprovement: { m5: 7.52, m6: 11.82, m7: -11.92, m8: -4.44, m9: 7.15, m10: 6.17, m11: 4.41, m12: -4.39 },
                productionMonthly: { y24_4: 96204, y24: 92433, m7: 102537, m8: 88071, m9: 103764, m10: 94928, m11: 90220, m12: null }
            },

            // 3. 라인별 실적
            linePerformance: {
                costReduction: {
                    CPL: { target: 0.48, y24: 0.24, q4: 1.02 },
                    CRM: { target: 0.57, y24: 0.59, q4: 0.99 },
                    CGL: { target: 1.31, y24: 0.61, q4: 2.54 },
                    '1CCL': { target: 1.24, y24: -0.71, q4: 0.40 },
                    '2CCL': { target: 0.77, y24: -4.27, q4: -4.82 },
                    '3CCL': { target: 1.06, y24: -0.30, q4: 2.94 }
                },
                production: {
                    CPL: { avg24: 24097, plan: 24900, actual: 23419 },
                    CRM: { avg24: 23408, plan: 24400, actual: 22519 },
                    CGL: { avg24: 23639, plan: 24400, actual: 23499 },
                    '1CCL': { avg24: 12902, plan: 13930, actual: 12055 },
                    '2CCL': { avg24: 3116, plan: 2750, actual: 1442 },
                    '3CCL': { avg24: 5272, plan: 4970, actual: 5932 }
                }
            },

            // 4. 주요과제 진행사항
            keyTasks: {
                teamSummary: {
                    '생산팀': { target: 32.8, monthly: 3.25, cumulative: 37.1, rate: 113 },
                    '설비팀': { target: 39.4, monthly: 2.39, cumulative: 38.90, rate: 99 },
                    '품질경영팀': { target: 3.86, monthly: 0.06, cumulative: 0.09, rate: 2 },
                    '변화관리팀': { target: 4.5, monthly: 1.15, cumulative: 11.45, rate: 255 },
                    '안전환경팀': { target: 0, monthly: 0, cumulative: 0, rate: 0 }
                },
                tasks: {
                    '생산팀': [
                        { no: 1, line: 'CGL', name: 'Line Speed 최적화를 통한 생산성 37.8 T/Hr 달성', target: 2.2, monthly: 1.1, cumulative: 13.9, rate: 630, person: '장훈', schedule: [0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2] },
                        { no: 2, line: 'CGL', name: '소재 Loss 저감을 통한 A급 수율 0.07% 향상', target: 2.3, monthly: -0.2, cumulative: -3.6, rate: -157, person: '장훈', schedule: [0, 0, 2, 2, 2, 3, 2, 2, 2, 2, 2, 2] },
                        { no: 3, line: 'CGL', name: '도금 Pot 관련 대기 전력 1,200kWh/월 저감', target: 0.6, monthly: 0.2, cumulative: 1.3, rate: 218, person: '장훈', schedule: [0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2] },
                        { no: 4, line: 'CGL', name: '공연비 관리 고도화를 통한 LNG 19.96Nm³ 달성', target: 2.3, monthly: 0.0, cumulative: 1.4, rate: 63, person: '장훈', schedule: [0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2] },
                        { no: 5, line: 'CGL', name: 'Mode Change 시간 단축 통한 가동율 91% 달성-1', target: 2.5, monthly: 0.0, cumulative: 0.0, rate: 0, person: '장훈', schedule: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
                        { no: 6, line: 'CGL', name: 'Pot Roll 사용기간 증대 통한 가공비 220원/톤 절감', target: 0.6, monthly: 0.1, cumulative: 2.8, rate: 464, person: '장훈', schedule: [0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2] },
                        { no: 7, line: 'CRM', name: '짝수 Pass율 30% 달성', target: 6.3, monthly: 0.1, cumulative: 4.6, rate: 73, person: '장훈', schedule: [0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2] },
                        { no: 8, line: 'CPL', name: '발주폭 조정을 통한 Chopper Scrap 저감', target: 1.9, monthly: 0.3, cumulative: 0.9, rate: 46, person: '이대현', schedule: [0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2] }
                    ],
                    '설비팀': [],
                    '품질경영팀': [],
                    '변화관리팀': [],
                    '안전환경팀': []
                }
            },

            // 주요지표 - 설비종합효율
            equipEfficiency: {
                CGL: {
                    target: 87.72,
                    yearly: [85.3, 82.0, 86.7, 88.13],
                    monthly: new Array(12).fill(null),
                    analysis: ''
                },
                '1CCL': {
                    target: 62.83,
                    yearly: [null, 55.3, 63.9, 61.65],
                    monthly: new Array(12).fill(null),
                    analysis: ''
                },
                '3CCL': {
                    target: 45,
                    yearly: [45.9, 45.8, 43.4, 44.5],
                    monthly: new Array(12).fill(null),
                    analysis: ''
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
                composite: { target: 99.57, yearly: [99.43, 99.47, 99.43, 99.44], monthly: new Array(12).fill(null) },
                CPL: { target: 97.82, yearly: [97.72, 97.71, 97.78, 97.77], monthly: new Array(12).fill(null) },
                CGL: { target: 100.4, yearly: [99.93, 99.92, 100.07, 100.08], monthly: new Array(12).fill(null) },
                '1CCL': { target: 100.4, yearly: [99.99, 100.29, 100.23, 100.48], monthly: new Array(12).fill(null) },
                '2CCL': { target: 100.3, yearly: [100.15, 100.12, 99.68, 99.59], monthly: new Array(12).fill(null) },
                '3CCL': { target: 99.82, yearly: [100.03, 100.35, 99.49, 99.71], monthly: new Array(12).fill(null) }
            },

            // 주요지표 - 톤파워
            tonPower: {
                CGL: {
                    target: 37.8,
                    yearly: [37.00, 35.50, 37.50, 39.58],
                    monthly: new Array(12).fill(null),
                    index: new Array(16).fill(null),
                    analysis: ''
                },
                '1CCL': {
                    target: 25.5,
                    yearly: [22.80, 23.90, 24.05, 23.65],
                    monthly: new Array(12).fill(null),
                    index: new Array(16).fill(null),
                    analysis: ''
                }
            },

            // 주요지표 - 실가동률
            operationRate: {
                composite: { target: 90.87, yearly: [88.03, 86.48, 86.47, 86.48], monthly: new Array(12).fill(null) },
                CRM: { target: 96.60, yearly: [95.68, 96.02, 96.55, 96.60], monthly: new Array(12).fill(null) },
                CGL: { target: 99.00, yearly: [98.78, 98.84, 98.38, 98.44], monthly: new Array(12).fill(null) },
                '1CCL': { target: 85.00, yearly: [84.62, 80.09, 77.46, 82.06], monthly: new Array(12).fill(null) },
                '2CCL': { target: 72.00, yearly: [70.98, 70.25, 67.91, 68.32], monthly: new Array(12).fill(null) },
                '3CCL': { target: 75.00, yearly: [69.46, 72.10, 64.73, 69.34], monthly: new Array(12).fill(null) }
            },

            // 주요지표 - LNG원단위
            lng: {
                composite: { target: 17.13, yearly: [19.70, 20.60, 18.42, 16.57], monthly: new Array(12).fill(null) },
                CPL: { target: 2.90, yearly: [6.41, 4.64, 2.94, 2.94], monthly: new Array(12).fill(null) },
                CGL: { target: 19.96, yearly: [20.02, 21.14, 20.83, 20.25], monthly: new Array(12).fill(null) },
                '1CCL': { target: 22.04, yearly: [25.56, 25.93, 24.77, 19.88], monthly: new Array(12).fill(null) },
                '2CCL': { target: 54.00, yearly: [67.46, 70.99, 58.40, 67.29], monthly: new Array(12).fill(null) },
                '3CCL': { target: 35.57, yearly: [79.80, 52.02, 38.79, 38.74], monthly: new Array(12).fill(null) }
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

            // 주요지표 - 고객불만 및 반품
            complaints: {
                customerComplaints: {
                    yearly: [2.3, 2.2, 1.83, null],
                    monthly: new Array(12).fill(null),
                    count: { total1to11: 0, dec: 0, cumulative25: 0, y24: 27 },
                    closed: { total1to11: 0, dec: 0, cumulative25: 0, y24: 26 },
                    compensation: { total1to11: 0, dec: 0, cumulative25: 0, y24: 2.4 }
                },
                returns: {
                    yearly: [47, 55, 52.33, null],
                    monthly: new Array(12).fill(null),
                    count: { total1to11: 0, dec: 0, cumulative25: 0 },
                    volume: { total1to11: 0, dec: 0, cumulative25: 0, y24: 569 },
                    loss: { total1to11: 0, dec: 0, cumulative25: 0, y24: 16.2 }
                }
            },

            // 주요지표 - 설비고장
            breakdown: {
                timeTotal: { target: 11.45, yearly: [12, 13, 11, 11.75], monthly: new Array(12).fill(null) },
                countTotal: { target: 7.3, yearly: [6, null, 10, 6.67], monthly: new Array(12).fill(null) },
                timeMech: { target: 5.4, yearly: [6, 12, 6, 5.58], monthly: new Array(12).fill(null) },
                countMech: { target: 3.6, yearly: [3, 5, 3, 2.92], monthly: new Array(12).fill(null) },
                timeElec: { target: 6.0, yearly: [6, 21, 7, 6.33], monthly: new Array(12).fill(null) },
                countElec: { target: 5.1, yearly: [3, 12, 6, 4.00], monthly: new Array(12).fill(null) }
            }
        };
    }

    // 보고 월 업데이트
    async updateReportMonth(year, month) {
        this.data.meta.year = year;
        this.data.meta.month = month;
        await this.save();
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

    // 데이터 초기화
    async reset() {
        this.data = this.getDefaultData();
        await this.save();
    }
}

// 전역 데이터 매니저 인스턴스
const dataManager = new DataManager();
