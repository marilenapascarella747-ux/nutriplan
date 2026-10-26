/* =========================================================
   NUTRIPLAN ASL - SCRIPT DEFINITIVO TABELLA CORRETTA
   ========================================================= */

let dataSelezionata = new Date().toISOString().split('T')[0];
if(document.getElementById('select-date-picker')) {
    document.getElementById('select-date-picker').value = dataSelezionata;
}

let bicchieriAcqua = 0;
let obiettivoAcqua = parseInt(localStorage.getItem('nutri_obiettivo_acqua')) || 8;
let modalitaGiorno = 'Casa';
let pastoInModifica = '';

let registroGiornaliero = JSON.parse(localStorage.getItem('nutri_registro_giorni')) || {};

let catalogoNutrizionista = JSON.parse(localStorage.getItem('nutri_catalogo')) || [
    { cat: 'Colazione', cibo: 'Yogurt Greco 0% (150g) + Avena (30g) + Noci (10g)' },
    { cat: 'Colazione', cibo: 'Latte P.S. (200ml) + 3 Fette biscottate integrali' },
    { cat: 'Pranzo', cibo: 'Riso integrale (70g) + Pollo (120g) + Zucchine' },
    { cat: 'Pranzo', cibo: 'Panino integrale (80g) con Bresaola (60g) (Pranzo Uni)' },
    { cat: 'Cena', cibo: 'Orata al forno (180g) + Insalata mista + Pane (40g)' },
    { cat: 'Cena', cibo: 'Petto di Tacchino ai ferri (150g) + Finocchi' },
    { cat: 'Spuntino', cibo: 'Mela (150g) + Mandorle (15g)' }
];

function avviaApp() {
    if(document.getElementById('water-goal-select')) {
        document.getElementById('water-goal-select').value = obiettivoAcqua;
    }
    caricaDataCorrente();
    renderCatalogo();
    renderDiarioASL();
    calcolaBMR();
}

function cambiaDataSelezionata(nuovaData) {
    dataSelezionata = nuovaData;
    caricaDataCorrente();
}

function caricaDataCorrente() {
    const elNome = document.getElementById('display-giorno-nome');
    if(elNome) {
        const d = new Date(dataSelezionata + 'T00:00:00');
        elNome.innerText = d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'short' });
    }

    if (!registroGiornaliero[dataSelezionata]) {
        registroGiornaliero[dataSelezionata] = {
            pasti: {
                'Colazione': catalogoNutrizionista.find(c => c.cat === 'Colazione')?.cibo || 'Colazione',
                'Spuntino M.': catalogoNutrizionista.find(c => c.cat === 'Spuntino')?.cibo || 'Spuntino',
                'Pranzo': catalogoNutrizionista.find(c => c.cat === 'Pranzo')?.cibo || 'Pranzo',
                'Merenda': catalogoNutrizionista.find(c => c.cat === 'Spuntino')?.cibo || 'Merenda',
                'Cena': catalogoNutrizionista.find(c => c.cat === 'Cena')?.cibo || 'Cena'
            },
            acqua: 0
        };
    }

    bicchieriAcqua = registroGiornaliero[dataSelezionata].acqua || 0;
    renderPastiOggi();
    renderWaterTracker();
    renderDiarioASL();
}

function salvaRegistroGiornaliero() {
    localStorage.setItem('nutri_registro_giorni', JSON.stringify(registroGiornaliero));
}

function cambiaScheda(schedaId, btn) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.getElementById(schedaId).classList.add('active');
    btn.classList.add('active');
}

function setModalitaGiorno(luogo) {
    modalitaGiorno = luogo;
    const btnCasa = document.getElementById('btn-mode-casa');
    const btnUni = document.getElementById('btn-mode-uni');
    if(btnCasa) btnCasa.classList.toggle('active', luogo === 'Casa');
    if(btnUni) btnUni.classList.toggle('active', luogo === 'Uni');

    let pasti = registroGiornaliero[dataSelezionata].pasti;
    if (luogo === 'Uni') {
        let ciboUni = catalogoNutrizionista.find(c => c.cibo.toLowerCase().includes('uni') || c.cibo.toLowerCase().includes('panino') || c.cibo.toLowerCase().includes('bresaola'))?.cibo;
        pasti['Pranzo'] = ciboUni || 'Panino integrale con bresaola (Pranzo Uni)';
    } else {
        let ciboCasa = catalogoNutrizionista.find(c => c.cat === 'Pranzo' && !c.cibo.toLowerCase().includes('uni'))?.cibo;
        pasti['Pranzo'] = ciboCasa || 'Pranzo a casa';
    }
    salvaEDisegnaPasti();
}

function cambiaObiettivoAcqua(valore) {
    obiettivoAcqua = parseInt(valore);
    localStorage.setItem('nutri_obiettivo_acqua', obiettivoAcqua);
    renderWaterTracker();
}

function registraAcqua(n) {
    bicchieriAcqua = n;
    registroGiornaliero[dataSelezionata].acqua = bicchieriAcqua;
    salvaRegistroGiornaliero();
    renderWaterTracker();
}

function aggiungiBicchiereExtra() {
    bicchieriAcqua++;
    registroGiornaliero[dataSelezionata].acqua = bicchieriAcqua;
    salvaRegistroGiornaliero();
    renderWaterTracker();
}

function renderWaterTracker() {
    const textEl = document.getElementById('water-text');
    if(textEl) textEl.innerText = `${bicchieriAcqua} / ${obiettivoAcqua} bicchieri`;
    const container = document.getElementById('water-container');
    if(!container) return;
    container.innerHTML = '';

    for (let i = 1; i <= Math.max(obiettivoAcqua, bicchieriAcqua); i++) {
        const filled = i <= bicchieriAcqua ? 'filled' : '';
        container.innerHTML += `<button class="glass-btn ${filled}" onclick="registraAcqua(${i})">🥛</button>`;
    }
}

function renderPastiOggi() {
    const container = document.getElementById('lista-pasti-oggi');
    if(!container) return;
    container.innerHTML = '';
    let pasti = registroGiornaliero[dataSelezionata].pasti;

    for (let [cat, val] of Object.entries(pasti)) {
        let badgeClass = 'badge-colazione';
        if (cat.includes('Pranzo')) badgeClass = 'badge-pranzo';
        if (cat.includes('Cena')) badgeClass = 'badge-cena';
        if (cat.includes('Spuntino') || cat.includes('Merenda')) badgeClass = 'badge-spuntino';

        container.innerHTML += `
            <div class="meal-row">
                <div>
                    <span class="meal-badge ${badgeClass}">${cat}</span>
                    <div class="meal-title">${val}</div>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="apriEditPasto('${cat}', '${val.replace(/'/g, "\\'")}')">✏️ Modifica</button>
            </div>
        `;
    }
}

function apriEditPasto(cat, val) {
    pastoInModifica = cat;
    document.getElementById('modal-cat-name').innerText = 'Pasto: ' + cat;
    document.getElementById('modal-pasto-input').value = val;
    document.getElementById('modal-edit-pasto').classList.add('active');
}

function salvaModificaPasto() {
    const nuovoValore = document.getElementById('modal-pasto-input').value.trim();
    if (nuovoValore !== '') {
        registroGiornaliero[dataSelezionata].pasti[pastoInModifica] = nuovoValore;
        salvaEDisegnaPasti();
        chiudiModale('modal-edit-pasto');
    }
}

function salvaEDisegnaPasti() {
    salvaRegistroGiornaliero();
    renderPastiOggi();
    renderDiarioASL();
}

function chiudiModale(id) {
    document.getElementById(id).classList.remove('active');
}

function renderCatalogo() {
    const container = document.getElementById('lista-catalogo-cibi');
    if(!container) return;
    container.innerHTML = '';

    catalogoNutrizionista.forEach((item, index) => {
        container.innerHTML += `
            <div class="meal-row">
                <div>
                    <span class="meal-badge badge-colazione">${item.cat}</span>
                    <div class="meal-title">${item.cibo}</div>
                </div>
                <button class="btn btn-secondary btn-sm" style="color:#ef4444;" onclick="eliminaCiboCatalogo(${index})">🗑️</button>
            </div>
        `;
    });
}

function apriModalNuovoCibo() {
    document.getElementById('modal-nuovo-cibo').classList.add('active');
}

function salvaNuovoCiboCatalogo() {
    const cat = document.getElementById('new-cibo-cat').value;
    const nome = document.getElementById('new-cibo-nome').value.trim();

    if (nome) {
        catalogoNutrizionista.push({ cat: cat, cibo: nome });
        localStorage.setItem('nutri_catalogo', JSON.stringify(catalogoNutrizionista));
        renderCatalogo();
        document.getElementById('new-cibo-nome').value = '';
        chiudiModale('modal-nuovo-cibo');
    }
}

function eliminaCiboCatalogo(index) {
    if (confirm("Vuoi rimuovere questo alimento dal tuo catalogo?")) {
        catalogoNutrizionista.splice(index, 1);
        localStorage.setItem('nutri_catalogo', JSON.stringify(catalogoNutrizionista));
        renderCatalogo();
    }
}

function renderDiarioASL() {
    const tbody = document.getElementById('asl-table-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    const giorni = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

    giorni.forEach((g) => {
        let d = new Date();
        let giornoCorrente = d.getDay() || 7; 
        let diff = giorni.indexOf(g) + 1 - giornoCorrente;
        d.setDate(d.getDate() + diff);
        let dataIso = d.toISOString().split('T')[0];

        let pastiGiorno = registroGiornaliero[dataIso]?.pasti || {
            'Colazione': catalogoNutrizionista.find(c => c.cat === 'Colazione')?.cibo || '-',
            'Spuntino M.': catalogoNutrizionista.find(c => c.cat === 'Spuntino')?.cibo || '-',
            'Pranzo': catalogoNutrizionista.find(c => c.cat === 'Pranzo')?.cibo || '-',
            'Merenda': catalogoNutrizionista.find(c => c.cat === 'Spuntino')?.cibo || '-',
            'Cena': catalogoNutrizionista.find(c => c.cat === 'Cena')?.cibo || '-'
        };

        tbody.innerHTML += `
            <tr>
                <td><strong>${g}</strong></td>
                <td>${pastiGiorno['Colazione'] || '-'}</td>
                <td>${pastiGiorno['Spuntino M.'] || '-'}</td>
                <td>${pastiGiorno['Pranzo'] || '-'}</td>
                <td>${pastiGiorno['Merenda'] || '-'}</td>
                <td>${pastiGiorno['Cena'] || '-'}</td>
            </tr>
        `;
    });
}

function generaSettimanaAuto() {
    const tbody = document.getElementById('lista-piano-settimana');
    if(!tbody) return;
    tbody.innerHTML = '';
    const giorni = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
    
    const chks = document.querySelectorAll('.chk-uni:checked');
    const giorniUni = Array.from(chks).map(c => c.value);

    const cibiColazione = catalogoNutrizionista.filter(c => c.cat === 'Colazione');
    const cibiPranzo = catalogoNutrizionista.filter(c => c.cat === 'Pranzo');
    const cibiCena = catalogoNutrizionista.filter(c => c.cat === 'Cena');
    const cibiSpuntino = catalogoNutrizionista.filter(c => c.cat === 'Spuntino');

    giorni.forEach((g, idx) => {
        const isUni = giorniUni.includes(g);
        
        let colazioneScelta = cibiColazione.length > 0 ? cibiColazione[idx % cibiColazione.length].cibo : 'Colazione';
        let spuntinoScelto = cibiSpuntino.length > 0 ? cibiSpuntino[idx % cibiSpuntino.length].cibo : 'Spuntino';
        let merendaScelta = cibiSpuntino.length > 1 ? cibiSpuntino[(idx + 1) % cibiSpuntino.length].cibo : spuntinoScelto;
        let pranzoScelto = '';
        
        if (isUni) {
            let cibiUniList = cibiPranzo.filter(c => c.cibo.toLowerCase().includes('uni') || c.cibo.toLowerCase().includes('panino') || c.cibo.toLowerCase().includes('bresaola'));
            if (cibiUniList.length > 0) {
                pranzoScelto = cibiUniList[idx % cibiUniList.length].cibo;
            } else {
                pranzoScelto = cibiPranzo.length > 0 ? cibiPranzo[idx % cibiPranzo.length].cibo : 'Pranzo Università';
            }
        } else {
            let cibiCasaList = cibiPranzo.filter(c => !c.cibo.toLowerCase().includes('uni') && !c.cibo.toLowerCase().includes('panino') && !c.cibo.toLowerCase().includes('bresaola'));
            if (cibiCasaList.length > 0) {
                pranzoScelto = cibiCasaList[idx % cibiCasaList.length].cibo;
            } else {
                pranzoScelto = cibiPranzo.length > 0 ? cibiPranzo[idx % cibiPranzo.length].cibo : 'Pranzo Casa';
            }
        }

        let cenaScelta = cibiCena.length > 0 ? cibiCena[idx % cibiCena.length].cibo : 'Cena';

        tbody.innerHTML += `
            <tr>
                <td><strong>${g}</strong> ${isUni ? '🎓' : '🏠'}</td>
                <td>${colazioneScelta}</td>
                <td>${spuntinoScelto}</td>
                <td>${pranzoScelto}</td>
                <td>${merendaScelta}</td>
                <td>${cenaScelta}</td>
            </tr>
        `;
    });
    alert("Tabella menù generata correttamente!");
}

function stampaMenuFamiglia() { 
    window.print(); 
}

function calcolaBMR() {
    const peso = parseFloat(document.getElementById('input-peso')?.value) || 0;
    const altezza = parseFloat(document.getElementById('input-altezza')?.value) || 0;
    const eta = parseInt(document.getElementById('input-eta')?.value) || 0;
    const bmr = (10 * peso) + (6.25 * altezza) - (5 * eta) - 161;
    const out = document.getElementById('bmr-output');
    if(out) out.innerText = Math.round(bmr);
}

avviaApp();
