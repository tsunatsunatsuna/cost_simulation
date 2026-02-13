const Calc = {
    getLoanMonthly(p, r, n) {
        if(r === 0) return { total: p / (n * 12) };
        const ir = r / 100 / 12, im = n * 12;
        const total = p * ir * Math.pow(1 + ir, im) / (Math.pow(1 + ir, im) - 1);
        return { total };
    },
    getLoanRemAtYear(p, r, n, y) {
        if (y === 0) return p; if (y >= n) return 0;
        const ir = r / 100 / 12, tm = n * 12, pm = y * 12;
        return Math.max(0, p * (Math.pow(1 + ir, tm) - Math.pow(1 + ir, pm)) / (Math.pow(1 + ir, tm) - 1));
    },
    getAssetValue(price, depr, year, minRes) {
        const val = Math.max(price * (1 - (depr / 100) * year), price * (minRes / 100));
        return val * 0.96; // 売却時手数料を反映
    }
};
