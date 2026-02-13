/**
 * ==========================================
 * CONFIG (初期値・マスターデータの資材)
 * ==========================================
 */

// 1. 住宅ローン控除限度額マスター (2024-2025年居住ベース)
// 借入限度額（万円）: [一般世帯, 子育て・若夫婦世帯]
const TAX_LIMIT_MASTER = {
    "4500": [4500, 5000], // 長期優良住宅・低炭素住宅
    "3500": [3500, 4500], // ZEH水準省エネ住宅
    "3000": [3000, 4000], // 省エネ基準適合住宅
    "2000": [2000, 2000], // 一般中古住宅・その他の住宅
    "none": [0, 0]        // 賃貸等
};

// 2. 物件タイプ別初期設定
const CONFIG = {
    rent: { label: '賃貸', color: '#16a34a' },
    nm: { label: '新築マンション', color: '#2563eb' },
    om: { label: '中古マンション', color: '#0ea5e9' },
    nh: { label: '新築戸建て', color: '#ea580c' },
    oh: { label: '中古戸建て', color: '#8b5cf6' }
};

// 3. 各プランのデフォルトパラメータ（残価基準値など）
let store = {
    rent: { 
        price: 18, 
        taxType: 'none', 
        depr: 0, 
        minRes: 0 
    },
    nm: { 
        price: 7000, 
        maint: 1.5,     // 管理費
        shuzen: 1.5,    // 修繕積立金
        rate_inc: 3.0,  // 修繕金上昇率(%)
        taxType: '4500', 
        depr: 1.8,      // 年間減価率(%)
        minRes: 45,     // 資産価値下限(%)
        kotei: 15       // 固定資産税/年
    },
    om: { 
        price: 5500, 
        ref: 300,       // リフォーム費
        maint: 1.8, 
        shuzen: 2.0, 
        rate_inc: 2.0, 
        taxType: '3000', 
        depr: 1.2, 
        minRes: 55, 
        kotei: 12 
    },
    nh: { 
        price: 6500, 
        shuzen_total: 500, // 35年間の修繕費総額目安
        span: 15,          // 大規模修繕周期
        taxType: '4500', 
        depr: 4.0,      // 戸建ては減価が早い
        minRes: 35,     // 主に土地値
        kotei: 12 
    },
    oh: { 
        price: 5000, 
        ref: 500, 
        shuzen_total: 500, 
        span: 15, 
        taxType: '2000', 
        depr: 2.5, 
        minRes: 45, 
        kotei: 10 
    }
};
