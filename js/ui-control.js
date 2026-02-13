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
        const child = parseInt(document.getElementById('is_child').value);
        const rate = parseFloat(document.getElementById('global_rate').value);
        const term = parseInt(document.getElementById('global_term').value);
        let datasets = [], rows = '';

        Object.keys(CONFIG).forEach(id => {
            const s = store[id];
            let hGross = [], hNet = [], cMaint = 0, cTax = 0;
            const res = Calc.getLoanMonthly(s.price, rate, term);
            const init = id === 'rent' ? s.price * 5 : s.price * 0.08 + (s.ref || 0);

            for(let y=1; y<=50; y++) {
                if(id === 'rent') {
                    cMaint += (s.price * 12 + (y%2===0?s.price:0));
                    hGross.push(init + cMaint); hNet.push(init + cMaint);
                } else {
                    const paid = res.total * 12 * Math.min(y, term);
                    cMaint += (id.includes('m') ? (s.maint+s.shuzen)*12 : (s.shuzen_total/15)*12) + s.kotei;
                    if(y <= 13) {
                        let limit = parseInt(s.taxType);
                        if(child == 1) limit += 500;
                        cTax += Math.min(Calc.getLoanRemAtYear(s.price, rate, term, y), limit * pair) * 0.007;
                    }
                    const asset = Calc.getAssetValue(s.price, s.depr, y, s.minRes);
                    hGross.push(Math.round(init + paid + cMaint)); 
                    hNet.push(Math.round(init + paid + cMaint - asset - cTax));
                }
                if(y === exitYear) {
                    const curAsset = id === 'rent' ? 0 : Calc.getAssetValue(s.price, s.depr, y, s.minRes);
                    rows += `<tr><td style="text-align:left; border-left:4px solid ${CONFIG[id].color}">${CONFIG[id].label}</td><td>${Math.round(hGross[y-1]-cMaint-init).toLocaleString()}</td><td>${Math.round(init)}</td><td>${Math.round(cMaint).toLocaleString()}</td><td>${Math.round(cTax).toLocaleString()}</td><td>${Math.round(curAsset).toLocaleString()}</td><td style="font-weight:bold;">${Math.round(hNet[y-1]).toLocaleString()}</td></tr>`;
                }
            }
            datasets.push({ label: CONFIG[id].label, data: hGross, borderColor: CONFIG[id].color, pointRadius: 0, tension: 0.1 });
            datasets.push({ label: CONFIG[id].label + '(実)', data: hNet, borderColor: CONFIG[id].color, borderDash: [5, 5], pointRadius: 0, tension: 0.1 });
        });

        if(this.chart) this.chart.destroy();
        this.chart = new Chart(document.getElementById('mainChart').getContext('2d'), { type: 'line', data: { labels: Array.from({length: 50}, (_, i) => i + 1 + "年"), datasets }, options: { maintainAspectRatio: false, plugins: { legend: { display: false } } } });
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
