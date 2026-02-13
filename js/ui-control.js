const UI = {
    activeTab: 'rent',
    chart: null,

    switchTab(type, btn) {
        this.saveCurrentValues();
        this.activeTab = type;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderInputs();
        this.liveCalc();
    },

    saveCurrentValues() {
        const pInput = document.getElementById('val_price');
        if(!pInput) return;
        const s = store[this.activeTab];
        s.price = parseFloat(pInput.value || 0);
        if(this.activeTab !== 'rent') {
            ['ref','maint','shuzen','rate_inc','shuzen_total','span','depr','minres','kotei'].forEach(key => {
                const el = document.getElementById('val_' + key);
                if(el) s[key === 'minres' ? 'minRes' : key] = parseFloat(el.value || 0);
            });
            s.taxType = document.getElementById('val_tax_type').value;
        }
    },

    renderInputs() {
        const area = document.getElementById('input-area');
        const s = store[this.activeTab];
        let html = `<div class="field"><label>${this.activeTab==='rent'?'家賃':'価格'} (万)</label><input type="number" id="val_price" value="${s.price}"></div>`;
        if(this.activeTab !== 'rent') {
            if(this.activeTab.includes('o')) html += `<div class="field"><label>改装費 (万)</label><input type="number" id="val_ref" value="${s.ref}"></div>`;
            if(this.activeTab.includes('m')) {
                html += `<div class="field"><label>管修/月 (万)</label><input type="number" id="val_maint" value="${s.maint + s.shuzen}"></div>`;
            } else {
                html += `<div class="field"><label>想定修繕/月</label><input type="number" id="val_shuzen_total" value="${(s.shuzen_total/(s.span*12)).toFixed(1)}"></div>`;
            }
            html += `<div class="field"><label>固税/年</label><input type="number" id="val_kotei" value="${s.kotei}"></div><div class="field"><label>減価%</label><input type="number" id="val_depr" value="${s.depr}"></div><div class="field"><label>下限%</label><input type="number" id="val_minres" value="${s.minRes}"></div><div class="field"><label>区分</label><select id="val_tax_type"><option value="4500">長期優良</option><option value="3000">一般新築</option><option value="2000">中古</option></select></div>`;
        }
        area.innerHTML = html;
        area.querySelectorAll('input, select').forEach(el => el.addEventListener('input', () => this.liveCalc()));
    },

    liveCalc() {
        this.saveCurrentValues();
        const grid = document.getElementById('comp_grid');
        grid.innerHTML = '';
        Object.keys(CONFIG).forEach(id => {
            const s = store[id];
            const r = parseFloat(document.getElementById('global_rate').value);
            const res = id === 'rent' ? {total: s.price} : Calc.getLoanMonthly(s.price, r, 35);
            const m = id.includes('m') ? (s.maint + s.shuzen + s.kotei/12) : (id==='rent'?0:s.shuzen_total/180 + s.kotei/12);
            grid.innerHTML += `<div style="text-align:center; padding:8px; background:#f8fafc; border-radius:6px;"><div style="color:${CONFIG[id].color}; font-weight:bold; font-size:0.6rem;">${CONFIG[id].label}</div><div style="font-size:0.85rem; font-weight:bold;">${(res.total + m).toFixed(1)}<span style="font-size:0.6rem">万</span></div></div>`;
        });
    },

runSimulation() {
    this.saveCurrentValues();
    document.getElementById('resultArea').style.display = 'block';
    
    const exitYear = parseInt(document.getElementById('exit_year').value);
    const pair = parseInt(document.getElementById('is_pair').value);
    const child = parseInt(document.getElementById('is_child').value); // 0:一般, 1:子育て
    const rate = parseFloat(document.getElementById('global_rate').value);
    const term = parseInt(document.getElementById('global_term').value);
    
    let datasets = [], rows = '';

    Object.keys(CONFIG).forEach(id => {
        const s = store[id];
        let hGross = [], hNet = [], cMaint = 0, cTax = 0;
        
        // 住宅ローンの毎月支払額（元利均等）
        const res = Calc.getLoanMonthly(s.price, rate, term);
        
        // 初期費用の計算（賃貸は5ヶ月分、購入は8%＋リフォーム）
        const init = id === 'rent' ? s.price * 5 : (s.price * 0.08) + (s.ref || 0);

        for(let y = 1; y <= 50; y++) {
            if(id === 'rent') {
                // 賃貸の計算：賃料＋2年ごとの更新料（家賃1ヶ月分）
                cMaint += (s.price * 12 + (y % 2 === 0 ? s.price : 0));
                const totalOut = init + cMaint;
                hGross.push(totalOut);
                hNet.push(totalOut); // 賃貸は資産価値ゼロのため
            } else {
                // 購入の計算
                const paidLoan = (y <= term) ? (res.total * 12 * y) : (res.total * 12 * term);
                
                // 維持費の計算（マンションは修繕積立金上昇を考慮、戸建ては定額積み立て仮想）
                const monthlyMaint = id.includes('m') 
                    ? (s.maint + (s.shuzen * Math.pow(1 + (s.rate_inc/100), Math.floor(y/5)))) 
                    : (s.shuzen_total / (s.span || 15) / 12);
                cMaint += (monthlyMaint * 12) + s.kotei;

                // 【修正ポイント】住宅ローン控除：マスターデータから限度額を判定
                if(y <= 13) {
                    const limits = TAX_LIMIT_MASTER[s.taxType] || [0, 0];
                    const yearlyLimit = limits[child]; // 子育て世帯ならインデックス[1]を参照
                    
                    // 年末時点の元金残高を取得
                    const loanBalance = Calc.getLoanRemAtYear(s.price, rate, term, y);
                    
                    // 控除額 ＝ min(年末残高, 限度額 * 人数) * 0.7%
                    const annualTaxCredit = Math.min(loanBalance, yearlyLimit * pair) * 0.007;
                    cTax += annualTaxCredit;
                }

                // 現時点の資産価値（売却手残り）
                const currentAsset = Calc.getAssetValue(s.price, s.depr, y, s.minRes);
                
                const gross = Math.round(init + paidLoan + cMaint);
                const net = Math.round(gross - currentAsset - cTax);
                
                hGross.push(gross);
                hNet.push(net);
            }

            // 指定した経過年数時点での詳細データを表にまとめる
            if(y === exitYear) {
                const finalAsset = id === 'rent' ? 0 : Calc.getAssetValue(s.price, s.depr, y, s.minRes);
                const paidLoanVal = id === 'rent' ? 0 : (y <= term ? res.total * 12 * y : res.total * 12 * term);
                
                rows += `
                <tr>
                    <td style="text-align:left; border-left:4px solid ${CONFIG[id].color}">${CONFIG[id].label}</td>
                    <td>${Math.round(paidLoanVal).toLocaleString()}万</td>
                    <td>${Math.round(init).toLocaleString()}万</td>
                    <td>${Math.round(cMaint).toLocaleString()}万</td>
                    <td style="color:#16a34a">-${Math.round(cTax).toLocaleString()}万</td>
                    <td style="background:#fff7ed">${Math.round(finalAsset).toLocaleString()}万</td>
                    <td style="font-weight:bold; background:#f0f9ff;">${Math.round(hNet[y-1]).toLocaleString()}万円</td>
                </tr>`;
            }
        }
        
        // グラフデータの追加
        datasets.push({ label: CONFIG[id].label + '(総支出)', data: hGross, borderColor: CONFIG[id].color, pointRadius: 0, tension: 0.1, hidden: false });
        datasets.push({ label: CONFIG[id].label + '(実質)', data: hNet, borderColor: CONFIG[id].color, borderDash: [5, 5], pointRadius: 0, tension: 0.1 });
    });

    // Chart.js の更新
    if(this.chart) this.chart.destroy();
    this.chart = new Chart(document.getElementById('mainChart').getContext('2d'), {
        type: 'line',
        data: { labels: Array.from({length: 50}, (_, i) => i + 1 + "年目"), datasets },
        options: {
            maintainAspectRatio: false,
            plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } },
            scales: { y: { ticks: { callback: v => v.toLocaleString() + '万' } } }
        }
    });
    
    document.getElementById('resTable').querySelector('tbody').innerHTML = rows;
},
    openModal() {
        document.getElementById('info-title').innerText = INFO_CONTENT.title;
        document.getElementById('info-body').innerHTML = INFO_CONTENT.sections.map(s => `<div style="margin-bottom:12px;"><b>${s.h}</b><br><small>${s.p}</small></div>`).join('');
        document.getElementById('modalInfo').style.display = 'flex';
    },
    closeModal() { document.getElementById('modalInfo').style.display = 'none'; }
};

window.onload = () => { UI.renderInputs(); UI.liveCalc(); };
