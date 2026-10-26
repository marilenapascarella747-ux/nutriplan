/* =========================================================
   NUTRIPLAN ASL - LOGICA JAVASCRIPT AGGIORNATA
   ========================================================= */

let dataSelezionata = new Date().toISOString().split('T')[0];
document.getElementById('select-date-picker').value = dataSelezionata;

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
    document.getElementById('water-goal-select').value = obiettivoAcqua;
    caricaDataCorrente();
    renderCatalogo();
    renderDiarioASL();
    calcolaBMR();
    renderArchivio();
    caricaOrariNotifiche();
    avviaControlloNotifiche();
}

function cambiaDataSelezionata(nuovaData) {
    dataSelezionata = nuovaData;
    caricaDataCorrente();
}

function caricaDataCorrente() {
    const d = new Date(dataSelezionata + 'T00:00:00');
    document.getElementById('display-giorno-nome').innerText = d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'short' });

    if (!registroGiornaliero[dataSelezionata]) {
        registroGiornaliero[dataSelezionata] = {
            pasti: {
                'Colazione': catalogoNutrizionista.find(c => c.cat === 'Colazione')?.cibo || 'Colazione standard',
                'Spuntino M.': catalogoNutrizionista.find(c => c.cat === 'Spuntino')?.cibo || 'Spuntino standard',
                'Pranzo': catalogoNutrizionista.find(c => c.cat === 'Pranzo')?.cibo || 'Pranzo standard',
                'Merenda': catalogoNutrizionista.find(c => c.cat === 'Spuntino')?.cibo || 'Merenda standard',
                'Cena': catalogoNutrizionista.find(c => c.cat === 'Cena')?.cibo || 'Cena standard'
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
    document.getElementById('btn-mode-casa').classList.toggle('active', luogo === 'Casa');
    document.getElementById('btn-mode-uni').classList.toggle('active', luogo === 'Uni');

    let pasti = registroGiornaliero[dataSelezionata].pasti;
    if (luogo === 'Uni') {
        let ciboUni = catalogoNutrizionista.find(c => c.cibo.toLowerCase().includes('uni') || c.cibo.toLowerCase().includes('panino'))?.cibo;
        pasti['Pranzo'] = ciboUni || 'Panino integrale con bresaola (Pranzo Uni)';
    } else {
        let ciboCasa = catalogoNutrizionista.find(c => c.cat === 'Pranzo' && !c.cibo.toLowerCase().includes('uni'))?.cibo;
        pasti['Pranzo'] = ciboCasa || 'Riso integrale + Pollo';
    }
    salvaEDisegnaPasti();
}

/* ACQUA */
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
    document.getElementById('water-text').innerText = `${bicchieriAcqua} / ${obiettivoAcqua} bicchieri`;
    const container = document.getElementById('water-container');
    container.innerHTML = '';

    for (let i = 1; i <= Math.max(obiettivoAcqua, bicchieriAcqua); i++) {
        const filled = i <= bicchieriAcqua ? 'filled' : '';
        container.innerHTML += `<button class="glass-btn ${filled}" onclick="registraAcqua(${i})">🥛</button>`;
    }
}

/* RENDERING PASTI */
function renderPastiOggi() {
    const container = document.getElementById('lista-pasti-oggi');
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

/* CATALOGO NUTRIZIONISTA */
function renderCatalogo() {
    const container = document.getElementById('lista-catalogo-cibi');
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

/* DIARIO ASL */
function renderDiarioASL() {
    const tbody = document.getElementById('asl-table-body');
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
            imgElement.src = imgData;
            imgElement.style.display = 'block';
            localStorage.setItem('nutri_foglio_asl_bg', imgData);
            alert("Foglio caricato con successo!");
        };
        reader.readAsDataURL(file);
    }
}

/* GENERAZIONE PIANO PESANDO DAL CATALOGO REALE */
function generaSettimanaAuto() {
    const container = document.getElementById('lista-piano-settimana');
    container.innerHTML = '';
    const giorni = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
    
    const chks = document.querySelectorAll('.chk-uni:checked');
    const giorniUni = Array.from(chks).map(c => c.value);

    // Filtriamo i cibi dal catalogo inserito dall'utente
    const cibiColazione = catalogoNutrizionista.filter(c => c.cat === 'Colazione');
    const cibiPranzo = catalogoNutrizionista.filter(c => c.cat === 'Pranzo');
    const cibiCena = catalogoNutrizionista.filter(c => c.cat === 'Cena');

    giorni.forEach((g, idx) => {
        const isUni = giorniUni.includes(g);
        
        // Scegliamo in modo casuale o sequenziale tra i cibi reali del tuo catalogo
        let colazioneScelta = cibiColazione.length > 0 ? cibiColazione[idx % cibiColazione.length].cibo : 'Colazione';
        let pranzoScelto = '';
        
        if (isUni) {
            let pranzoUni = cibiPranzo.find(c => c.cibo.toLowerCase().includes('uni') || c.cibo.toLowerCase().includes('panino') || c.cibo.toLowerCase().includes('bresaola'));
            pranzoScelto = pranzoUni ? pranzoUni.cibo : (cibiPranzo[0]?.cibo || 'Pranzo Uni');
        } else {
            let pranzoCasa = cibiPranzo.filter(c => !c.cibo.toLowerCase().includes('uni'));
            pranzoScelto = pranzoCasa.length > 0 ? pranzoCasa[idx % pranzoCasa.length].cibo : (cibiPranzo[0]?.cibo || 'Pranzo Casa');
        }

        let cenaScelta = cibiCena.length > 0 ? cibiCena[idx % cibiCena.length].cibo : 'Cena';

        container.innerHTML += `
            <div class="meal-row">
                <div>
                    <strong>${g} ${isUni ? '🎓' : '🏠'}:</strong><br>
                    ☕ ${colazioneScelta}<br>
                    🍝 <strong>Pranzo:</strong> ${pranzoScelto}<br>
                    🐟 <strong>Cena:</strong> ${cenaScelta}
                </div>
            </div>
        `;
    });
    alert("Menù generato usando i tuoi cibi personalizzati!");
}

function stampaMenuFamiglia() { window.print(); }

/* PROFILO & BMR */
function calcolaBMR() {
    const peso = parseFloat(document.getElementById('input-peso').value) || 0;
    const altezza = parseFloat(document.getElementById('input-altezza').value) || 0;
    const eta = parseInt(document.getElementById('input-eta').value) || 0;
    const bmr = (10 * peso) + (6.25 * altezza) - (5 * eta) - 161;
    document.getElementById('bmr-output').innerText = Math.round(bmr);
}

function salvaProfilo() {
    const email = document.getElementById('input-email').value;
    localStorage.setItem('nutri_user_email', email);
}

function renderArchivio() {
    const container = document.getElementById('lista-archivio-settimane');
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
                <div style="display:flex; gap:4px;">
                    <button class="btn btn-sm btn-secondary" onclick="apriDiarioArchivio(${idx})">📋 ASL</button>
                    <button class="btn btn-sm btn-secondary" onclick="inviaEmailArchivio('${sett.data}')">✉️ Email</button>
                </div>
            </div>
        `;
    });
}

function inviaEmailArchivio(dataSettimana) {
    const email = localStorage.getItem('nutri_user_email') || '';
    if (!email) {
        alert("Inserisci prima la tua email nella sezione Profilo!");
        return;
    }
    const subject = encodeURIComponent("NutriPlan ASL - Diario Settimana " + dataSettimana);
    const body = encodeURIComponent("In allegato/riassunto il diario alimentare ASL e il menù settimanale della settimana del " + dataSettimana);
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
}

function apriRitualeDomenica() {
    const modalContent = document.getElementById('rituale-step-content');
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
    modalContent.innerHTML = `
        <p class="subtitle"><strong>Fase 2: Salvataggio & Nuova Settimana</strong></p>
        <p style="font-size:0.85rem; margin-top:8px;">✅ Settimana salvata in Archivio!</p>
        <div class="btn-row" style="margin-top:14px;">
            <button class="btn btn-primary" onclick="chiudiModale('modal-rituale'); cambiaScheda('page-asl', document.querySelectorAll('.nav-item')[3]); window.print();">📋 Stampa ASL PDF</button>
            <button class="btn btn-secondary" onclick="chiudiModale('modal-rituale'); cambiaScheda('page-piano', document.querySelectorAll('.nav-item')[1]);">📅 Pianifica Nuova Settimana</button>
        </div>
    `;
}

avviaApp();

function cambiaScheda(schedaId, btn) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.getElementById(schedaId).classList.add('active');
    btn.classList.add('active');
}

function setModalitaGiorno(luogo) {
    modalitaGiorno = luogo;
    document.getElementById('btn-mode-casa').classList.toggle('active', luogo === 'Casa');
    document.getElementById('btn-mode-uni').classList.toggle('active', luogo === 'Uni');

    let pasti = registroGiornaliero[dataSelezionata].pasti;
    if (luogo === 'Uni') {
        pasti['Pranzo'] = 'Panino integrale (80g) con Bresaola (60g) (Pranzo Uni)';
    } else {
        pasti['Pranzo'] = 'Riso integrale (70g) + Pollo (120g) + Zucchine';
    }
    salvaEDisegnaPasti();
}

/* ACQUA */
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
    document.getElementById('water-text').innerText = `${bicchieriAcqua} / ${obiettivoAcqua} bicchieri`;
    const container = document.getElementById('water-container');
    container.innerHTML = '';

    for (let i = 1; i <= Math.max(obiettivoAcqua, bicchieriAcqua); i++) {
        const filled = i <= bicchieriAcqua ? 'filled' : '';
        container.innerHTML += `<button class="glass-btn ${filled}" onclick="registraAcqua(${i})">🥛</button>`;
    }
}

/* RENDERING PASTI */
function renderPastiOggi() {
    const container = document.getElementById('lista-pasti-oggi');
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

/* CATALOGO NUTRIZIONISTA */
function renderCatalogo() {
    const container = document.getElementById('lista-catalogo-cibi');
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

/* DIARIO ASL */
function renderDiarioASL() {
    const tbody = document.getElementById('asl-table-body');
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
            imgElement.src = imgData;
            imgElement.style.display = 'block';
            localStorage.setItem('nutri_foglio_asl_bg', imgData);
            alert("Foglio caricato con successo!");
        };
        reader.readAsDataURL(file);
    }
}

/* NOTIFICHE REALI E PROMEMORIA */
function attivaNotificheBrowser() {
    if (!("Notification" in window)) {
        alert("Il tuo browser/telefono non supporta le notifiche.");
        return;
    }

    Notification.requestPermission().then(permission => {
        if (permission === "granted") {
            document.getElementById('notif-status-text').innerText = "✅ Notifiche Attive per Pasti & Acqua!";
            new Notification("NutriPlan ASL 🥗", { body: "Le notifiche sono ora attive sul tuo telefono!" });
        } else {
            document.getElementById('notif-status-text').innerText = "⚠️ Notifiche disattivate dalle impostazioni.";
        }
    });
}

function salvaOrariNotifiche() {
    const orari = {
        colazione: document.getElementById('time-colazione').value,
        pranzo: document.getElementById('time-pranzo').value,
        cena: document.getElementById('time-cena').value
    };
    localStorage.setItem('nutri_orari_notifiche', JSON.stringify(orari));
}

function caricaOrariNotifiche() {
    const orari = JSON.parse(localStorage.getItem('nutri_orari_notifiche'));
    if (orari) {
        document.getElementById('time-colazione').value = orari.colazione || "08:00";
        document.getElementById('time-pranzo').value = orari.pranzo || "13:00";
        document.getElementById('time-cena').value = orari.cena || "20:00";
    }
}

function avviaControlloNotifiche() {
    setInterval(() => {
        if (Notification.permission !== "granted") return;

        const oraAttuale = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        const orari = JSON.parse(localStorage.getItem('nutri_orari_notifiche')) || {};

        if (oraAttuale === orari.colazione) {
            new Notification("NutriPlan ASL 🍳", { body: "È ora di colazione! Registra cosa hai mangiato." });
        } else if (oraAttuale === orari.pranzo) {
            new Notification("NutriPlan ASL 🍝", { body: "È ora di pranzo! Segna il pasto nell'app." });
        } else if (oraAttuale === orari.cena) {
            new Notification("NutriPlan ASL 🥗", { body: "È ora di cena! Registra il pasto di stasera." });
        }
    }, 60000); // Controlla ogni minuto
}

/* GENERAZIONE PIANO & FAMIGLIA */
function generaSettimanaAuto() {
    const container = document.getElementById('lista-piano-settimana');
    container.innerHTML = '';
    const giorni = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
    
    const chks = document.querySelectorAll('.chk-uni:checked');
    const giorniUni = Array.from(chks).map(c => c.value);

    giorni.forEach(g => {
        const isUni = giorniUni.includes(g);
        const pranzo = isUni ? 'Panino Integrale con Bresaola (Pranzo Uni)' : 'Riso Integrale + Pollo e Zucchine';
        container.innerHTML += `
            <div class="meal-row">
                <div>
                    <strong>${g} ${isUni ? '🎓' : '🏠'}:</strong> ${pranzo} | Cena: Orata/Tacchino + Verdure
                </div>
            </div>
        `;
    });
    alert("Nuovo menù generato!");
}

function stampaMenuFamiglia() { window.print(); }

/* PROFILO & BMR */
function calcolaBMR() {
    const peso = parseFloat(document.getElementById('input-peso').value) || 0;
    const altezza = parseFloat(document.getElementById('input-altezza').value) || 0;
    const eta = parseInt(document.getElementById('input-eta').value) || 0;
    const bmr = (10 * peso) + (6.25 * altezza) - (5 * eta) - 161;
    document.getElementById('bmr-output').innerText = Math.round(bmr);
}

function salvaProfilo() {
    const email = document.getElementById('input-email').value;
    localStorage.setItem('nutri_user_email', email);
}

function renderArchivio() {
    const container = document.getElementById('lista-archivio-settimane');
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
                <div style="display:flex; gap:4px;">
                    <button class="btn btn-sm btn-secondary" onclick="apriDiarioArchivio(${idx})">📋 ASL</button>
                    <button class="btn btn-sm btn-secondary" onclick="inviaEmailArchivio('${sett.data}')">✉️ Email</button>
                </div>
            </div>
        `;
    });
}

function inviaEmailArchivio(dataSettimana) {
    const email = localStorage.getItem('nutri_user_email') || '';
    if (!email) {
        alert("Inserisci prima la tua email nella sezione Profilo!");
        return;
    }
    const subject = encodeURIComponent("NutriPlan ASL - Diario Settimana " + dataSettimana);
    const body = encodeURIComponent("In allegato/riassunto il diario alimentare ASL e il menù settimanale della settimana del " + dataSettimana);
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
}

function apriRitualeDomenica() {
    const modalContent = document.getElementById('rituale-step-content');
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
    modalContent.innerHTML = `
        <p class="subtitle"><strong>Fase 2: Salvataggio & Nuova Settimana</strong></p>
        <p style="font-size:0.85rem; margin-top:8px;">✅ Settimana salvata in Archivio!</p>
        <div class="btn-row" style="margin-top:14px;">
            <button class="btn btn-primary" onclick="chiudiModale('modal-rituale'); cambiaScheda('page-asl', document.querySelectorAll('.nav-item')[3]); window.print();">📋 Stampa ASL PDF</button>
            <button class="btn btn-secondary" onclick="chiudiModale('modal-rituale'); cambiaScheda('page-piano', document.querySelectorAll('.nav-item')[1]);">📅 Pianifica Nuova Settimana</button>
        </div>
    `;
}

avviaApp();
