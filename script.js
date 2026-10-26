/* =========================================================
   NUTRIPLAN ASL - SCRIPT DEFINITIVO CON SINCRONIZZAZIONE GIORNALIERA
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
let archivioSettimane = JSON.parse(localStorage.getItem('nutri_archivio')) || [];
window.menuAslSalvato = JSON.parse(localStorage.getItem('nutri_menu_asl')) || {};

let catalogoNutrizionista = JSON.parse(localStorage.getItem('nutri_catalogo')) || [
    { cat: 'Colazione', cibo: 'Yogurt Greco 0% (150g) + Avena (30g) + Noci (10g)' },
    { cat: 'Colazione', cibo: 'Latte P.S. (200ml) + 3 Fette biscottate integrali' },
    { cat: 'Pranzo', cibo: 'Riso integrale (70g) + Pollo (120g) + Zucchine' },
    { cat: 'Pranzo', cibo: 'Panino integrale (80g) + Bresaola (60g)' },
    { cat: 'Cena', cibo: 'Orata al forno (180g) + Insalata mista + Pane (40g)' },
    { cat: 'Cena', cibo: 'Petto di Tacchino ai ferri (150g) + Finocchi' },
    { cat: 'Spuntino', cibo: 'Mela (150g) + Mandorle (15g)' }
];

let menuQuizTemporaneo = {};
let giorniQuizList = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
let indiceQuizCorrente = 0;

function avviaApp() {
    if(document.getElementById('water-goal-select')) {
        document.getElementById('water-goal-select').value = obiettivoAcqua;
    }
    caricaDataCorrente();
    renderCatalogo();

    if (Object.keys(window.menuAslSalvato).length === 0) {
        generaSettimanaAutoSilenzioso();
    } else {
        renderTabellaPianoSalvata();
        renderDiarioASL();
    }

    renderArchivio();
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
        let ciboUni = catalogoNutrizionista.find(c => c.cibo.toLowerCase().includes('panino') || c.cibo.toLowerCase().includes('bresaola'))?.cibo;
        pasti['Pranzo'] = ciboUni || 'Panino integrale con bresaola (Pranzo Uni)';
    } else {
        let ciboCasa = catalogoNutrizionista.find(c => c.cat === 'Pranzo' && !c.cibo.toLowerCase().includes('panino'))?.cibo;
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
        container.innerHTML += `<button type="button" class="glass-btn ${filled}" onclick="registraAcqua(${i})">🥛</button>`;
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
                <button type="button" class="btn btn-secondary btn-sm" onclick="apriEditPasto('${cat}', '${val.replace(/'/g, "\\'")}')">✏️ Modifica</button>
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
    renderDiarioASL(); // Aggiorna subito anche il diario ASL con la modifica fatta in "Oggi"
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
                <button type="button" class="btn btn-secondary btn-sm" style="color:#ef4444;" onclick="eliminaCiboCatalogo(${index})">🗑️</button>
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

/* DIARIO ASL CHE PRENDE LA PRIORITÀ DALLE MODIFICHE FATTE IN "OGGI" */
function renderDiarioASL() {
    const tbody = document.getElementById('asl-table-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    const giorni = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

    giorni.forEach((g) => {
        // Calcola la data esatta della settimana corrente per quel giorno
        let d = new Date();
        let giornoCorrente = d.getDay() || 7; 
        let diff = giorni.indexOf(g) + 1 - giornoCorrente;
        d.setDate(d.getDate() + diff);
        let dataIso = d.toISOString().split('T')[0];

        // 1. Controlla se c'è una modifica diretta fatta nella scheda "Oggi" per quella specifica data
        let pastiGiorno = registroGiornaliero[dataIso]?.pasti;

        // 2. Se non ci sono modifiche in "Oggi", prende il menù settimanale generato
        if (!pastiGiorno) {
            pastiGiorno = window.menuAslSalvato[g] || {
                'Colazione': '-', 'Spuntino M.': '-', 'Pranzo': '-', 'Merenda': '-', 'Cena': '-'
            };
        }

        tbody.innerHTML += `
            <tr>
                <td><strong>${g}</strong></td>
                <td>${pastiGiorno['Colazione'] || '-'}</td>
                <td>${pastiGiorno['Spuntino M.'] || pastiGiorno['Spuntino'] || '-'}</td>
                <td>${pastiGiorno['Pranzo'] || '-'}</td>
                <td>${pastiGiorno['Merenda'] || '-'}</td>
                <td>${pastiGiorno['Cena'] || '-'}</td>
            </tr>
        `;
    });
}

function renderTabellaPianoSalvata() {
    const tbody = document.getElementById('lista-piano-settimana');
    if(!tbody) return;
    tbody.innerHTML = '';

    if (Object.keys(window.menuAslSalvato).length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#6b7280; padding: 15px;">Clicca su "Genera con un click" o usa il quiz.</td></tr>`;
        return;
    }

    giorniQuizList.forEach(g => {
        let dati = window.menuAslSalvato[g];
        if(!dati) return;

        tbody.innerHTML += `
            <tr>
                <td><strong>${g}</strong></td>
                <td>${dati['Colazione']}</td>
                <td>${dati['Spuntino M.']}</td>
                <td>${dati['Pranzo']}</td>
                <td>${dati['Merenda']}</td>
                <td>${dati['Cena']}</td>
            </tr>
        `;
    });
}

function caricaFoglioASL(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const imgData = e.target.result;
            const imgElement = document.getElementById('asl-background-img');
            if(imgElement) {
                imgElement.src = imgData;
                imgElement.style.display = 'block';
            }
            localStorage.setItem('nutri_foglio_asl_bg', imgData);
            alert("Foglio caricato con successo!");
        };
        reader.readAsDataURL(file);
    }
}

/* RITUALE DELLA DOMENICA */
function avviaRitualeDomenica() {
    const modalContent = document.getElementById('rituale-step-content');
    if(!modalContent) return;

    let giorniVuoti = [];
    giorniQuizList.forEach(g => {
        if (!window.menuAslSalvato[g] || Object.values(window.menuAslSalvato[g]).some(val => !val || val === '-')) {
            giorniVuoti.push(g);
        }
    });

    let htmlReport = `<p><strong>Controllo Settimanale:</strong></p>`;
    if (giorniVuoti.length > 0) {
        htmlReport += `<p style="color:#ef4444; margin-top:6px;">⚠️ Attenzione! Risultano incompleti o vuoti i seguenti giorni: <strong>${giorniVuoti.join(', ')}</strong>.</p>`;
        htmlReport += `<p style="margin-top:6px;">Vuoi procedere comunque o completare il menù?</p>`;
    } else {
        htmlReport += `<p style="color:#10b981; margin-top:6px;">✅ Perfetto! Tutti i giorni della settimana sono compilati correttamente.</p>`;
    }

    htmlReport += `
        <div class="btn-row" style="margin-top:14px;">
            <button type="button" class="btn btn-primary" onclick="confermaArchiviazioneDomenica()">Archivia e Prepara Stampa</button>
            <button type="button" class="btn btn-secondary" onclick="chiudiModale('modal-rituale')">Annulla</button>
        </div>
    `;

    modalContent.innerHTML = htmlReport;
    document.getElementById('modal-rituale').classList.add('active');
}

function confermaArchiviazioneDomenica() {
    const dataStr = new Date().toLocaleDateString('it-IT');
    archivioSettimane.unshift({ data: dataStr, menu: window.menuAslSalvato });
    localStorage.setItem('nutri_archivio', JSON.stringify(archivioSettimane));
    renderArchivio();
    chiudiModale('modal-rituale');

    alert("Settimana archiviata con successo! Ora puoi andare nella scheda 'ASL' per stamparla.");
    cambiaScheda('page-asl', document.querySelectorAll('.nav-item')[3]);
}

function renderArchivio() {
    const container = document.getElementById('lista-archivio-settimane');
    if(!container) return;
    container.innerHTML = '';

    if (archivioSettimane.length === 0) {
        container.innerHTML = '<p class="subtitle">Nessuna settimana archiviata finora.</p>';
        return;
    }

    archivioSettimane.forEach((sett) => {
        container.innerHTML += `
            <div class="meal-row">
                <div>
                    <strong>Domenica ${sett.data}:</strong> Settimana archiviata e pronta
                </div>
            </div>
        `;
    });
}

/* GENERAZIONE AUTOMATICA CON UN CLICK */
function generaSettimanaAutoSilenzioso() {
    const chks = document.querySelectorAll('.chk-uni:checked');
    const giorniUni = Array.from(chks).map(c => c.value);

    const cibiColazione = catalogoNutrizionista.filter(c => c.cat === 'Colazione');
    const cibiPranzo = catalogoNutrizionista.filter(c => c.cat === 'Pranzo');
    const cibiCena = catalogoNutrizionista.filter(c => c.cat === 'Cena');
    const cibiSpuntino = catalogoNutrizionista.filter(c => c.cat === 'Spuntino');

    window.menuAslSalvato = {};

    giorniQuizList.forEach((g, idx) => {
        const isUni = giorniUni.includes(g);
        
        let colazioneScelta = cibiColazione.length > 0 ? cibiColazione[idx % cibiColazione.length].cibo : 'Colazione';
        let spuntinoScelto = cibiSpuntino.length > 0 ? cibiSpuntino[idx % cibiSpuntino.length].cibo : 'Spuntino';
        let merendaScelta = cibiSpuntino.length > 1 ? cibiSpuntino[(idx + 1) % cibiSpuntino.length].cibo : spuntinoScelto;
        let cenaScelta = cibiCena.length > 0 ? cibiCena[idx % cibiCena.length].cibo : 'Cena';
        let pranzoScelta = '';

        if (isUni) {
            let cibiUniList = cibiPranzo.filter(c => c.cibo.toLowerCase().includes('panino') || c.cibo.toLowerCase().includes('bresaola') || c.cibo.toLowerCase().includes('sacco'));
            pranzoScelta = cibiUniList.length > 0 ? cibiUniList[idx % cibiUniList.length].cibo : (cibiPranzo.length > 0 ? cibiPranzo[0].cibo : 'Pranzo al sacco');
        } else {
            let cibiCasaList = cibiPranzo.filter(c => !c.cibo.toLowerCase().includes('panino') && !c.cibo.toLowerCase().includes('bresaola'));
            pranzoScelta = cibiCasaList.length > 0 ? cibiCasaList[idx % cibiCasaList.length].cibo : (cibiPranzo.length > 0 ? cibiPranzo[idx % cibiPranzo.length].cibo : 'Pranzo');
        }

        window.menuAslSalvato[g] = {
            'Colazione': colazioneScelta,
            'Spuntino M.': spuntinoScelto,
            'Pranzo': pranzoScelta,
            'Merenda': merendaScelta,
            'Cena': cenaScelta
        };
    });

    localStorage.setItem('nutri_menu_asl', JSON.stringify(window.menuAslSalvato));
    renderTabellaPianoSalvata();
    renderDiarioASL();
}

function generaSettimanaAuto() {
    generaSettimanaAutoSilenzioso();
    alert("Menù generato con un click! I giorni in Università hanno il pranzo al sacco e tutto è sincronizzato.");
}

/* QUIZ MANUALE (CREA IL TUO MENÙ) */
function avviaQuizMenu() {
    menuQuizTemporaneo = {};
    indiceQuizCorrente = 0;
    const box = document.getElementById('box-quiz-menu');
    if(box) box.style.display = 'block';
    renderPassoQuiz();
}

function annullaQuizMenu() {
    const box = document.getElementById('box-quiz-menu');
    if(box) box.style.display = 'none';
}

function renderPassoQuiz() {
    if (indiceQuizCorrente >= giorniQuizList.length) {
        componiTabellaDaQuiz();
        const box = document.getElementById('box-quiz-menu');
        if(box) box.style.display = 'none';
        alert("Ottimo! Il tuo menù personalizzato tramite quiz è pronto.");
        return;
    }

    let giorno = giorniQuizList[indiceQuizCorrente];
    document.getElementById('quiz-titolo-giorno').innerText = `Giorno: ${giorno} (${indiceQuizCorrente + 1}/7)`;
    document.getElementById('quiz-istruzioni').innerText = `Seleziona cosa vuoi mangiare per ${giorno}:`;

    let container = document.getElementById('quiz-campi-container');
    container.innerHTML = '';

    let catColazione = catalogoNutrizionista.filter(c => c.cat === 'Colazione');
    let catSpuntino = catalogoNutrizionista.filter(c => c.cat === 'Spuntino');
    let catPranzo = catalogoNutrizionista.filter(c => c.cat === 'Pranzo');
    let catCena = catalogoNutrizionista.filter(c => c.cat === 'Cena');

    container.innerHTML += `
        <label>☕ <strong>Colazione:</strong>
            <select id="quiz-colazione" class="form-control" style="margin-top:2px;">
                ${catColazione.map(c => `<option value="${c.cibo}">${c.cibo}</option>`).join('')}
            </select>
        </label>
        <label>🍏 <strong>Spuntino:</strong>
            <select id="quiz-spuntino" class="form-control" style="margin-top:2px;">
                ${catSpuntino.map(c => `<option value="${c.cibo}">${c.cibo}</option>`).join('')}
            </select>
        </label>
        <label>🍝 <strong>Pranzo:</strong>
            <select id="quiz-pranzo" class="form-control" style="margin-top:2px;">
                ${catPranzo.map(c => `<option value="${c.cibo}">${c.cibo}</option>`).join('')}
            </select>
        </label>
        <label>🥐 <strong>Merenda:</strong>
            <select id="quiz-merenda" class="form-control" style="margin-top:2px;">
                ${catSpuntino.map(c => `<option value="${c.cibo}">${c.cibo}</option>`).join('')}
            </select>
        </label>
        <label>🐟 <strong>Cena:</strong>
            <select id="quiz-cena" class="form-control" style="margin-top:2px;">
                ${catCena.map(c => `<option value="${c.cibo}">${c.cibo}</option>`).join('')}
            </select>
        </label>
    `;
}

function proseguiQuizMenu() {
    let giorno = giorniQuizList[indiceQuizCorrente];
    menuQuizTemporaneo[giorno] = {
        'Colazione': document.getElementById('quiz-colazione')?.value || '-',
        'Spuntino M.': document.getElementById('quiz-spuntino')?.value || '-',
        'Pranzo': document.getElementById('quiz-pranzo')?.value || '-',
        'Merenda': document.getElementById('quiz-merenda')?.value || '-',
        'Cena': document.getElementById('quiz-cena')?.value || '-'
    };

    indiceQuizCorrente++;
    renderPassoQuiz();
}

function componiTabellaDaQuiz() {
    window.menuAslSalvato = menuQuizTemporaneo;
    localStorage.setItem('nutri_menu_asl', JSON.stringify(window.menuAslSalvato));
    renderTabellaPianoSalvata();
    renderDiarioASL();
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
