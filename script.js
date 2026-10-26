/* =========================================================
   NUTRIPLAN ASL - LOGICA DEFINITIVA CATALOGO E STAMPA
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

let archivioSettimane = JSON.parse(localStorage.getItem('nutri_archivio')) || [];

function avviaApp() {
    if(document.getElementById('water-goal-select')) {
        document.getElementById('water-goal-select').value = obiettivoAcqua;
    }
    caricaDataCorrente();
    renderCatalogo();
    renderDiarioASL();
    calcolaBMR();
    renderArchivio();
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
    let pasti = registroGiornaliero[dataSelezionata].pasti;

    giorni.forEach(g => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${g}</strong></td>
                <td>${pasti['Colazione'] || '-'}</td>
                <td>${pasti['Spuntino M.'] || '-'}</td>
                <td>${pasti['Pranzo'] || '-'}</td>
                <td>${pasti['Merenda'] || '-'}</td>
                <td>${pasti['Cena'] || '-'}</td>
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

/* GENERAZIONE SETTIMANA VARIATA DAL CATALOGO (GIORNO PER GIORNO) */
function generaSettimanaAuto() {
    const container = document.getElementById('lista-piano-settimana');
    if(!container) return;
    container.innerHTML = '';
    const giorni = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
    
    const chks = document.querySelectorAll('.chk-uni:checked');
    const giorniUni = Array.from(chks).map(c => c.value);

    // Filtriamo dal TUO catalogo reale
    const cibiColazione = catalogoNutrizionista.filter(c => c.cat === 'Colazione');
    const cibiPranzo = catalogoNutrizionista.filter(c => c.cat === 'Pranzo');
    const cibiCena = catalogoNutrizionista.filter(c => c.cat === 'Cena');
    const cibiSpuntino = catalogoNutrizionista.filter(c => c.cat === 'Spuntino');

    giorni.forEach((g, idx) => {
        const isUni = giorniUni.includes(g);
        
        // Rotazione intelligente: prende i cibi diversi che hai inserito tu in sequenza (idx % lunghezza)
        let colazioneScelta = cibiColazione.length > 0 ? cibiColazione[idx % cibiColazione.length].cibo : 'Colazione';
        let spuntinoScelto = cibiSpuntino.length > 0 ? cibiSpuntino[idx % cibiSpuntino.length].cibo : 'Spuntino';
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

        container.innerHTML += `
            <div class="meal-row" style="margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 8px;">
                <div>
                    <strong>${g} ${isUni ? '🎓 (Università)' : '🏠 (Casa)'}:</strong><br>
                    ☕ <strong>Colazione:</strong> ${colazioneScelta}<br>
                    🍏 <strong>Spuntino:</strong> ${spuntinoScelto}<br>
                    🍝 <strong>Pranzo:</strong> ${pranzoScelto}<br>
                    🐟 <strong>Cena:</strong> ${cenaScelta}
                </div>
            </div>
        `;
    });
    alert("Menù generato variando i tuoi cibi personalizzati per ogni giorno!");
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

function salvaProfilo() {
    const email = document.getElementById('input-email')?.value || '';
    localStorage.setItem('nutri_user_email', email);
}

function renderArchivio() {
    const container = document.getElementById('lista-archivio-settimane');
    if(!container) return;
    container.innerHTML = '';

    if (archivioSettimane.length === 0) {
        container.innerHTML = '<p class="subtitle">Nessuna settimana salvata finora.</p>';
        return;
    }

    archivioSettimane.forEach((sett, idx) => {
        container.innerHTML += `
            <div class="meal-row">
                <div>
                    <strong>Domenica ${sett.data}:</strong> Diario ASL & Menù Famiglia
                </div>
            </div>
        `;
    });
}

function apriRitualeDomenica() {
    const modalContent = document.getElementById('rituale-step-content');
    if(!modalContent) return;
    modalContent.innerHTML = `
        <p class="subtitle"><strong>Fase 1: Controllo Pasti Mancanti</strong></p>
        <p style="font-size:0.85rem; margin-top:8px;">Hai registrato tutti i pasti di questa settimana per il foglio ASL?</p>
        <div class="btn-row" style="margin-top:14px;">
            <button class="btn btn-primary" onclick="concludiRitualeStep2()">Sì, Tutto Registrato</button>
            <button class="btn btn-secondary" onclick="chiudiModale('modal-rituale')">Fammi Controllare</button>
        </div>
    `;
    document.getElementById('modal-rituale').classList.add('active');
}

function concludiRitualeStep2() {
    const dataStr = new Date().toLocaleDateString('it-IT');
    archivioSettimane.unshift({ data: dataStr });
    localStorage.setItem('nutri_archivio', JSON.stringify(archivioSettimane));
    renderArchivio();

    const modalContent = document.getElementById('rituale-step-content');
    if(!modalContent) return;
    modalContent.innerHTML = `
        <p class="subtitle"><strong>Fase 2: Salvataggio & Nuova Settimana</strong></p>
        <p style="font-size:0.85rem; margin-top:8px;">✅ Settimana salvata in Archivio!</p>
        <div class="btn-row" style="margin-top:14px;">
            <button class="btn btn-primary" onclick="chiudiModale('modal-rituale'); window.print();">📋 Stampa Menù</button>
        </div>
    `;
}

avviaApp();
