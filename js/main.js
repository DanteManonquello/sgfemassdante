/* ================================================================================
   TESTmess v2.4.0 - Memo del Giorno
   ================================================================================ */

// ===== STORAGE KEYS (per compatibilità con DriveStorage) =====
const STORAGE_KEYS = {
    CRONOLOGIA: 'CRONOLOGIA',
    LAST_MESSAGE: 'LAST_MESSAGE',
    TEMPLATES: 'TEMPLATES',
    OPERATOR_NAME: 'OPERATOR_NAME'
};

// ===== STORAGE WRAPPER (Google Drive o localStorage fallback) =====
async function getStorageItem(key) {
    // TEMPLATES: SEMPRE localStorage (non Drive)
    if (key === STORAGE_KEYS.TEMPLATES) {
        return localStorage.getItem(STORAGE_KEYS.TEMPLATES);
    }
    
    // Altri dati: usa Drive se loggato
    if (window.DriveStorage && window.accessToken) {
        const data = await window.DriveStorage.load(key);
        return data ? JSON.stringify(data) : null;
    }
    
    // Altrimenti null (no fallback per cronologia)
    return null;
}

async function setStorageItem(key, value) {
    // TEMPLATES: SEMPRE localStorage (non Drive)
    if (key === STORAGE_KEYS.TEMPLATES) {
        localStorage.setItem(STORAGE_KEYS.TEMPLATES, value);
        return;
    }
    
    // Altri dati: usa Drive se loggato
    if (window.DriveStorage && window.accessToken) {
        try {
            const data = JSON.parse(value);
            await window.DriveStorage.save(key, data);
        } catch (error) {
            console.error(`❌ Errore salvataggio ${key}:`, error);
        }
    }
    
    // Altrimenti silent fail (no localStorage)
}

// ===== INIZIALIZZAZIONE =====
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 TESTmess v2.5.12 inizializzato - Fix logout automatico + riseleziona data');
    
    setupSidebar();
    setupNavigation();
    await setupEventListeners();
    await loadTemplates();
    await updatePreview();
    await loadLastMessageIndicator();
    await initDefaultDay();
    
    // Imposta data corrente nel date picker calendario
    if (window.setTodayDate) {
        window.setTodayDate();
    }
    
    // Carica eventi e calendari salvati da cache (v2.5.7)
    if (window.loadSavedEvents) {
        window.loadSavedEvents();
    }
    
    // Inizializza nuovi moduli v2.2.27
    if (window.initRubrica) {
        window.initRubrica();
    }
    if (window.initGitHubAutoPush) {
        window.initGitHubAutoPush();
    }
    
    // 🔔 Inizializza Dolce Paranoia
    await renderDolceParanoiaList();
    
    // Migrazione dati (se primo login)
    if (window.DriveStorage && window.accessToken) {
        setTimeout(() => window.DriveStorage.migrate(), 2000);
    }
    
    // Focus campo nome
    document.getElementById('nome').focus();
});

// ===== SIDEBAR =====
function setupSidebar() {
    const hamburger = document.getElementById('hamburgerBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const closeBtn = document.getElementById('closeSidebar');
    
    hamburger.addEventListener('click', () => {
        sidebar.classList.add('active');
        overlay.classList.add('active');
    });
    
    const closeSidebar = () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    };
    
    closeBtn.addEventListener('click', closeSidebar);
    overlay.addEventListener('click', closeSidebar);
}

// ===== NAVIGAZIONE PAGINE =====
function setupNavigation() {
    const links = document.querySelectorAll('.sidebar-link');
    
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            const page = link.dataset.page;
            
            links.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            showPage(page);
            
            document.getElementById('sidebar').classList.remove('active');
            document.getElementById('sidebarOverlay').classList.remove('active');
        });
    });
}

async function showPage(page) {
    const pages = {
        'home': 'mainContent',
        'riconferme': 'riconfermeContent',
        'calendario': 'calendarioContent',
        'messaggi': 'messaggiContent',
        'cronologia': 'cronologiaContent',
        'rubrica': 'rubricaContent',
        'importante': 'importanteContent'
    };
    
    // Nascondi tutte le pagine
    Object.values(pages).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    
    // Mostra pagina richiesta
    const targetPage = pages[page];
    if (targetPage) {
        document.getElementById(targetPage).style.display = 'block';
        
        // Carica contenuto specifico
        if (page === 'cronologia') await loadCronologia();
        if (page === 'messaggi') loadMessaggiList();
        if (page === 'calendario' && window.displayCalendarView) displayCalendarView();
        if (page === 'rubrica' && window.renderRubricaList) window.renderRubricaList();
        if (page === 'importante' && window.updatePushStatus) window.updatePushStatus();
    }
}

// ===== EVENT LISTENERS =====
async function setupEventListeners() {
    // Capitalizzazione nome
    document.getElementById('nome').addEventListener('input', async function(e) {
        e.target.value = capitalizeWords(e.target.value);
        await updatePreview();
    });
    
    document.getElementById('cognome').addEventListener('input', function(e) {
        e.target.value = capitalizeWords(e.target.value);
    });
    
    // Validazione telefono
    document.getElementById('telefono').addEventListener('input', function(e) {
        e.target.value = e.target.value.replace(/[^\d\+\s]/g, '');
    });
    
    // Campo Società - mostra/nascondi input custom
    const societaSelect = document.getElementById('societaSelect');
    const societaCustom = document.getElementById('societaCustom');
    if (societaSelect && societaCustom) {
        societaSelect.addEventListener('change', function() {
            if (this.value === 'Altro') {
                societaCustom.style.display = 'block';
                societaCustom.focus();
            } else {
                societaCustom.style.display = 'none';
                societaCustom.value = '';
            }
        });
    }
    
    // Update preview su tutti i campi + Mostra/Nascondi Dolce Paranoia card
    ['giorno', 'orario', 'servizio', 'tipoMessaggio'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', async () => {
            await updatePreview();
            
            // 🔔 Mostra/Nascondi Dolce Paranoia card
            if (id === 'tipoMessaggio') {
                const card = document.getElementById('dolceParanoiaCard');
                if (card) {
                    if (el.value === 'dolce_paranoia') {
                        card.style.display = 'block';
                        await renderDolceParanoiaList();
                    } else {
                        card.style.display = 'none';
                    }
                }
            }
        });
        if (el && id === 'orario') el.addEventListener('input', async () => await updatePreview());
    });
    
    // Toggle buttons
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const group = this.parentElement;
            group.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            await updatePreview();
        });
    });
    
    // Time buttons
    document.getElementById('decreaseTime1h').addEventListener('click', async () => await adjustTime(-60));
    document.getElementById('decreaseTime30m').addEventListener('click', async () => await adjustTime(-30));
    document.getElementById('increaseTime30m').addEventListener('click', async () => await adjustTime(30));
    document.getElementById('increaseTime1h').addEventListener('click', async () => await adjustTime(60));
    
    // Date navigation buttons (±90 giorni limite)
    const prevDayBtn = document.getElementById('prevDayBtn');
    const nextDayBtn = document.getElementById('nextDayBtn');
    const selectDay = document.getElementById('selectDay');
    
    // Debounce per prevenire click multipli
    let isNavigating = false;
    
    if (prevDayBtn && nextDayBtn && selectDay) {
        prevDayBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Previeni click multipli
            if (isNavigating) {
                console.log('⏳ Navigazione in corso, ignoro click...');
                return;
            }
            isNavigating = true;
            
            // Se nessuna data selezionata, inizializza con oggi
            if (!selectDay.value) {
                const today = new Date();
                selectDay.value = today.toISOString().split('T')[0];
            }
            
            const currentDate = new Date(selectDay.value + 'T12:00:00'); // Usa mezzogiorno per evitare problemi timezone
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Limite: non oltre 90 giorni nel passato
            const minDate = new Date(today);
            minDate.setDate(minDate.getDate() - 90);
            
            if (currentDate > minDate) {
                currentDate.setDate(currentDate.getDate() - 1);
                selectDay.value = currentDate.toISOString().split('T')[0];
                selectDay.dispatchEvent(new Event('change'));
                console.log('📅 ← Giorno precedente:', selectDay.value);
            } else {
                showNotification('⚠️ Limite raggiunto: -90 giorni', 'warning');
            }
            
            // Reset flag dopo 300ms
            setTimeout(() => { isNavigating = false; }, 300);
        });
        
        nextDayBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Previeni click multipli
            if (isNavigating) {
                console.log('⏳ Navigazione in corso, ignoro click...');
                return;
            }
            isNavigating = true;
            
            // Se nessuna data selezionata, inizializza con oggi
            if (!selectDay.value) {
                const today = new Date();
                selectDay.value = today.toISOString().split('T')[0];
            }
            
            const currentDate = new Date(selectDay.value + 'T12:00:00'); // Usa mezzogiorno per evitare problemi timezone
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Limite: non oltre 90 giorni nel futuro
            const maxDate = new Date(today);
            maxDate.setDate(maxDate.getDate() + 90);
            
            if (currentDate < maxDate) {
                currentDate.setDate(currentDate.getDate() + 1);
                selectDay.value = currentDate.toISOString().split('T')[0];
                selectDay.dispatchEvent(new Event('change'));
                console.log('📅 → Giorno successivo:', selectDay.value);
            } else {
                showNotification('⚠️ Limite raggiunto: +90 giorni', 'warning');
            }
            
            // Reset flag dopo 300ms
            setTimeout(() => { isNavigating = false; }, 300);
        });
    }
    
    // Action buttons
    document.getElementById('inviaMessaggio').addEventListener('click', async () => await sendToWhatsApp());
    document.getElementById('generaMessaggio').addEventListener('click', async (e) => await generateMessage(e));
    document.getElementById('copiaMessaggio').addEventListener('click', copyToClipboard);
    document.getElementById('copiaIban').addEventListener('click', copyIban);
    
    // 🔔 Dolce Paranoia refresh
    const refreshDolceParanoiaBtn = document.getElementById('refreshDolceParanoiaBtn');
    if (refreshDolceParanoiaBtn) {
        refreshDolceParanoiaBtn.addEventListener('click', async () => {
            await renderDolceParanoiaList();
            showNotification('🔔 Promemoria aggiornati', 'success');
        });
    }
    
    // Anteprima editabile
    document.getElementById('anteprimaMessaggio').addEventListener('input', function() {
        // L'anteprima è sempre sincronizzata, ma può essere modificata manualmente
    });
}

// ===== CAPITALIZZAZIONE =====
function capitalizeWords(str) {
    return str.split(' ').map(word => {
        if (word.length > 0) {
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }
        return word;
    }).join(' ');
}

// ===== GET SOCIETÀ VALUE =====
function getSocietaValue() {
    const select = document.getElementById('societaSelect');
    const custom = document.getElementById('societaCustom');
    
    if (!select) return 'SG - Lead'; // Fallback
    
    if (select.value === 'Altro' && custom && custom.value.trim()) {
        return custom.value.trim();
    }
    return select.value;
}

// ===== ORARIO =====
async function adjustTime(minutes) {
    const orarioInput = document.getElementById('orario');
    let currentValue = orarioInput.value;
    
    let hours, mins;
    if (currentValue.includes('.') || currentValue.includes(':')) {
        const parts = currentValue.split(/[.:]/).map(n => parseInt(n) || 0);
        hours = parts[0];
        mins = parts[1] || 0;
    } else {
        hours = parseInt(currentValue) || 15;
        mins = 0;
    }
    
    let totalMinutes = hours * 60 + mins + minutes;
    
    // Limiti: 10:00 - 22:00
    totalMinutes = Math.max(600, Math.min(1320, totalMinutes));
    
    hours = Math.floor(totalMinutes / 60);
    mins = totalMinutes % 60;
    
    // Se minuti sono 0, mostra solo l'ora
    if (mins === 0) {
        orarioInput.value = `${hours}`;
    } else {
        orarioInput.value = `${hours}.${String(mins).padStart(2, '0')}`;
    }
    
    await updatePreview();
}

// ===== SALUTI =====
function getSalutoIniziale() {
    const ora = new Date().getHours();
    
    if (ora >= 6 && ora < 13) {
        return "Buongiorno";
    } else if (ora >= 13 && ora < 17) {
        return "Buon pomeriggio";
    } else {
        return "Buonasera";
    }
}

function getSalutoFinale() {
    const ora = new Date().getHours();
    
    if (ora >= 6 && ora < 13) {
        return "una buona giornata";
    } else if (ora >= 13 && ora < 17) {
        return "un buon pomeriggio";
    } else {
        return "una buona serata";
    }
}

// ===== ANTEPRIMA MESSAGGIO =====
async function updatePreview() {
    const nome = document.getElementById('nome').value.trim();
    const tipoMessaggio = document.getElementById('tipoMessaggio').value;
    const assistenteBtn = document.querySelector('.toggle-group .toggle-btn.active[data-value]');
    const assistente = assistenteBtn ? assistenteBtn.dataset.value : 'M';
    const giorno = document.getElementById('giorno').value;
    const orario = document.getElementById('orario').value;
    const modalitaBtn = document.querySelectorAll('.toggle-group')[1].querySelector('.toggle-btn.active');
    const modalita = modalitaBtn ? modalitaBtn.dataset.value : 'LINK';
    const servizio = document.getElementById('servizio').value;
    const operatore = document.getElementById('operatoreName').textContent || 'Dante';
    
    const preview = document.getElementById('anteprimaMessaggio');
    
    if (!nome) {
        preview.value = 'Compila i campi sopra per vedere l\'anteprima...';
        return;
    }
    
    // Carica template (USA SEMPRE localStorage per templates)
    const templatesString = localStorage.getItem('sgmess_templates_local');
    const templates = JSON.parse(templatesString || '[]');
    const template = templates.find(t => t.id === tipoMessaggio);
    
    if (!template) {
        preview.value = 'Template non trovato!';
        console.error('❌ Template non trovato per:', tipoMessaggio);
        return;
    }
    
    // Sostituzioni
    const BB = getSalutoIniziale();
    const NN = nome;
    const YY = assistente === 'M' ? 'il mio' : 'la mia';
    
    // 🆕 LOGICA {GG} DINAMICA per Dolce Paranoia
    let GG = giorno;
    if (tipoMessaggio === 'dolce_paranoia') {
        // Per Dolce Paranoia: usa giorno settimana in lettere (es. "martedì")
        const giornoSelezionato = document.getElementById('giorno').value;
        if (giornoSelezionato) {
            const data = new Date(giornoSelezionato);
            const giornoSettimana = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
            GG = giornoSettimana[data.getDay()];
        }
    }
    
    // 🆕 FORMATO ORARIO SPECIALE per Memo del Giorno
    let HH = orario;
    if (tipoMessaggio === 'memo_giorno') {
        // Formato speciale: 15:00 → "15", 15:30 → "15.30"
        if (orario.includes(':')) {
            const [h, m] = orario.split(':');
            HH = m === '00' ? h : `${h}.${m}`;
        } else if (orario.includes('.')) {
            const [h, m] = orario.split('.');
            HH = m === '00' ? h : `${h}.${m}`;
        }
    }
    
    const VV = modalita === 'LINK' 
        ? 'Ti manderò il link per la videochiamata 10 minuti prima' 
        : 'Ti videochiamerò su WhatsApp come richiesto';
    const TT = getSalutoFinale();
    const OPERATORE = operatore;
    const SERVIZIO = servizio;
    
    let messaggio = template.testo;
    messaggio = messaggio.replace(/{BB}/g, BB);
    messaggio = messaggio.replace(/{NN}/g, NN);
    messaggio = messaggio.replace(/{YY}/g, YY);
    messaggio = messaggio.replace(/{GG}/g, GG);
    messaggio = messaggio.replace(/{HH}/g, HH);
    messaggio = messaggio.replace(/{VV}/g, VV);
    messaggio = messaggio.replace(/{TT}/g, TT);
    messaggio = messaggio.replace(/{OPERATORE}/g, OPERATORE);
    messaggio = messaggio.replace(/{SERVIZIO}/g, SERVIZIO);
    
    preview.value = messaggio;
}

// ===== GENERA MESSAGGIO =====
async function generateMessage(e) {
    if (e) e.preventDefault();
    
    const nome = document.getElementById('nome').value.trim();
    const cognome = document.getElementById('cognome').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const servizio = document.getElementById('servizio').value;
    const societa = getSocietaValue(); // USA LA NUOVA FUNZIONE
    
    if (!nome) {
        showNotification('Inserisci il nome!', 'error');
        return;
    }
    
    // Prendi messaggio dall'anteprima (editabile)
    const messaggio = document.getElementById('anteprimaMessaggio').value;
    
    // Mostra output
    document.getElementById('outputMessaggio').textContent = messaggio;
    document.getElementById('outputCard').style.display = 'block';
    
    // Salva in cronologia (v2.2.27: con servizio e società)
    saveToCronologia(nome, cognome, telefono, messaggio, servizio, societa);
    
    // Salva ultimo messaggio
    saveLastMessage(nome, cognome, telefono);
    
    // Salva in Google Contacts
    if (window.saveContactToGoogle && cognome && telefono) {
        checkAndSaveContact(nome, cognome, telefono, societa);
    }
    
    // Copia automaticamente
    navigator.clipboard.writeText(messaggio).then(() => {
        showNotification('Messaggio generato e copiato!', 'success');
    });
    
    // Reset form
    resetForm();
}

// ===== INVIA SU WHATSAPP =====
async function sendToWhatsApp() {
    const nome = document.getElementById('nome').value.trim();
    const cognome = document.getElementById('cognome').value.trim();
    let telefono = document.getElementById('telefono').value.trim();
    const servizio = document.getElementById('servizio').value;
    const societa = getSocietaValue(); // USA LA NUOVA FUNZIONE
    
    if (!nome) {
        showNotification('Inserisci il nome!', 'error');
        return;
    }
    
    const messaggio = document.getElementById('anteprimaMessaggio').value;
    
    // Se telefono vuoto, usa numero utente (fallback)
    if (!telefono) {
        // TODO: Implementare rilevamento numero utente
        telefono = '393755588371'; // Fallback temporaneo
        showNotification('Nessun numero inserito, invio a te stesso...', 'info');
    }
    
    // Normalizza numero
    telefono = telefono.replace(/\s+/g, '').replace(/^\+/, '');
    if (!telefono.startsWith('39') && telefono.length === 10) {
        telefono = '39' + telefono;
    }
    
    // Salva in cronologia (v2.2.27: con servizio e società)
    saveToCronologia(nome, cognome, telefono, messaggio, servizio, societa);
    saveLastMessage(nome, cognome, telefono);
    
    // Salva in Google Contacts
    if (window.saveContactToGoogle && cognome && telefono) {
        checkAndSaveContact(nome, cognome, telefono, societa);
    }
    
    // Reset form
    resetForm();
    
    // Apri WhatsApp
    const whatsappUrl = `https://wa.me/${telefono}?text=${encodeURIComponent(messaggio)}`;
    window.open(whatsappUrl, '_blank');
    
    showNotification('Apertura WhatsApp...', 'success');
}

// ===== CHECK E SALVA CONTATTO =====
async function checkAndSaveContact(nome, cognome, telefono, societa) {
    const contactData = {
        firstName: nome,
        lastName: cognome,
        phone: telefono,
        company: societa
    };
    
    if (window.saveContactToGoogle) {
        const result = await window.saveContactToGoogle(contactData);
        
        // Gestisci risultato
        if (result && result.success) {
            showNotification('✅ Contatto salvato in rubrica', 'success');
        } else if (result && result.skipped) {
            if (result.reason === 'duplicate') {
                showNotification('ℹ️ Contatto già presente in rubrica', 'info');
                console.log('📇 Contatto già esistente, salvataggio saltato');
            } else if (result.reason === 'conflict') {
                showNotification('ℹ️ Contatto già esistente (conflitto API)', 'info');
            }
        } else {
            // Errore generico
            showNotification('⚠️ Impossibile salvare contatto', 'error');
        }
    }
}

// ===== RESET FORM =====
async function resetForm() {
    document.getElementById('nome').value = '';
    document.getElementById('cognome').value = '';
    document.getElementById('telefono').value = '';
    document.getElementById('orario').value = '15';
    
    await updatePreview();
    document.getElementById('nome').focus();
}

// ===== COPIA NEGLI APPUNTI =====
function copyToClipboard() {
    const messaggio = document.getElementById('outputMessaggio').textContent;
    
    navigator.clipboard.writeText(messaggio).then(() => {
        showNotification('Copiato negli appunti!', 'success');
    }).catch(() => {
        showNotification('Errore copia!', 'error');
    });
}

function copyIban() {
    const iban = document.getElementById('ibanField').value;
    
    navigator.clipboard.writeText(iban).then(() => {
        showNotification('IBAN copiato!', 'success');
    });
}

// ===== NOTIFICHE =====
function showNotification(text, type = 'success') {
    const notifica = document.getElementById('notifica');
    const notificaText = document.getElementById('notificaText');
    
    notificaText.textContent = text;
    notifica.classList.add('show');
    
    setTimeout(() => {
        notifica.classList.remove('show');
    }, 3000);
}

// ===== DOLCE PARANOIA =====
async function getDolceParanoiaLeads() {
    console.log('🔔 Calcolo lead Dolce Paranoia (v2.5.1 - nuova logica)...');
    
    if (!window.accessToken) {
        console.warn('⚠️ No accessToken per Dolce Paranoia');
        return [];
    }
    
    // 1. Carica cronologia da Drive (con fallback localStorage)
    let cronologia = [];
    if (window.DriveStorage) {
        try {
            const driveData = await window.DriveStorage.load(STORAGE_KEYS.CRONOLOGIA);
            if (driveData) {
                cronologia = driveData;
                console.log(`📦 Cronologia da Drive: ${cronologia.length} messaggi`);
            }
        } catch (e) {
            console.warn('⚠️ Drive fallito, uso fallback localStorage');
            // Fallback: localStorage
            const localData = localStorage.getItem(STORAGE_KEYS.CRONOLOGIA);
            if (localData) {
                cronologia = JSON.parse(localData);
                console.log(`💾 Cronologia da localStorage: ${cronologia.length} messaggi`);
            }
        }
    } else {
        // Nessun DriveStorage, uso localStorage
        const localData = localStorage.getItem(STORAGE_KEYS.CRONOLOGIA);
        if (localData) {
            cronologia = JSON.parse(localData);
            console.log(`💾 Cronologia da localStorage: ${cronologia.length} messaggi`);
        }
    }
    
    if (cronologia.length === 0) {
        console.log('⚠️ Nessuna cronologia messaggi - Invia almeno 1 "Primo Messaggio" per usare Dolce Paranoia');
        return [];
    }
    
    // 2. Carica eventi calendario
    const eventsJSON = localStorage.getItem('sgmess_calendar_events');
    const events = JSON.parse(eventsJSON || '[]');
    
    if (events.length === 0) {
        console.log('⚠️ Nessun evento calendario');
        return [];
    }
    
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    
    const dolceParanoiaLeads = [];
    
    // 3. Per ogni evento futuro, controlla se serve promemoria
    events.forEach(event => {
        const dataAppuntamento = new Date(event.start);
        dataAppuntamento.setHours(0, 0, 0, 0);
        
        // Solo eventi futuri
        if (dataAppuntamento <= oggi) return;
        
        // Estrai info lead dall'evento
        const leadInfo = extractLeadFromEvent(event);
        if (!leadInfo.nome) return;
        
        // 🎯 CERCA IL PRIMO MESSAGGIO (tipo "primo_messaggio") inviato a questo lead
        const primoMessaggio = findPrimoMessaggio(leadInfo, cronologia);
        
        if (!primoMessaggio) {
            // Nessun primo messaggio trovato → skip
            console.log(`⏭️ Skip ${leadInfo.nome}: nessun primo messaggio trovato`);
            return;
        }
        
        // Calcola distanza: data_appuntamento - data_primo_messaggio
        const dataPrimoMsg = new Date(primoMessaggio.timestamp);
        dataPrimoMsg.setHours(0, 0, 0, 0);
        
        const diffTime = dataAppuntamento - dataPrimoMsg;
        const giorniDistanza = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        console.log(`📊 ${leadInfo.nome}: distanza fissazione = ${giorniDistanza} giorni`);
        
        // 🎯 REGOLA UNICA: distanza >= 2 giorni
        if (giorniDistanza >= 2) {
            dolceParanoiaLeads.push({
                event: event,
                nome: leadInfo.nome,
                cognome: leadInfo.cognome,
                telefono: leadInfo.telefono,
                dataAppuntamento: new Date(event.start), // Con ora
                giorniDistanza: giorniDistanza,
                dataPrimoMessaggio: primoMessaggio.timestamp
            });
        }
    });
    
    console.log(`✅ Trovati ${dolceParanoiaLeads.length} lead per Dolce Paranoia`);
    return dolceParanoiaLeads;
}

// Helper: trova il PRIMO messaggio (tipo "primo_messaggio") per un lead
function findPrimoMessaggio(leadInfo, cronologia) {
    // Filtra solo messaggi tipo "primo_messaggio"
    const messaggiPrimi = cronologia.filter(entry => 
        entry.tipoMessaggio === 'primo_messaggio' || !entry.tipoMessaggio // Retrocompat: se non ha tipo, assume primo
    );
    
    // Cerca match per telefono o nome+cognome
    const messaggiLead = messaggiPrimi.filter(entry => {
        const matchTelefono = entry.telefono && leadInfo.telefono && 
                             normalizePhone(entry.telefono) === normalizePhone(leadInfo.telefono);
        const matchNome = entry.nome === leadInfo.nome && 
                        (entry.cognome === leadInfo.cognome || !entry.cognome);
        return matchTelefono || matchNome;
    });
    
    if (messaggiLead.length === 0) return null;
    
    // Prendi il messaggio più VECCHIO (primo inviato)
    messaggiLead.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    return messaggiLead[0];
}

function extractLeadFromEvent(event) {
    const summary = event.summary || '';
    const description = event.description || '';
    
    // Estrai nome/cognome
    let nome = '', cognome = '';
    const nomeParts = summary.split(' ').filter(p => p && p !== 'X');
    if (nomeParts.length > 0) nome = nomeParts[0];
    if (nomeParts.length > 1) cognome = nomeParts.slice(1).join(' ');
    
    // Estrai telefono
    let telefono = '';
    const telMatch = description.match(/\+?\d[\d\s\-\(\)]{8,}/);
    if (telMatch) telefono = telMatch[0];
    
    return { nome, cognome, telefono };
}

function normalizePhone(phone) {
    if (!phone) return '';
    return phone.replace(/[\s\-\(\)\+]/g, '');
}

async function renderDolceParanoiaList() {
    const container = document.getElementById('dolceParanoiaList');
    if (!container) return;
    
    if (!window.accessToken) {
        container.innerHTML = '<p class="placeholder-text">🔒 Fai login Google per vedere i promemoria</p>';
        return;
    }
    
    // Mostra loader
    container.innerHTML = '<p style="text-align:center;color:var(--gray-500);"><i class="fas fa-spinner fa-spin"></i> Calcolo lead...</p>';
    
    const leads = await getDolceParanoiaLeads();
    
    if (leads.length === 0) {
        container.innerHTML = `
            <div class="dp-empty">
                <p style="margin-bottom: 10px;">✅ Nessun promemoria necessario</p>
                <p style="font-size: 13px; color: #9ca3af;">
                    💡 Invia almeno 1 "Primo Messaggio" per vedere lead qui
                </p>
            </div>
        `;
        return;
    }
    
    let html = '<div style="margin-bottom: 10px; padding: 10px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px;">';
    html += '<strong style="color: #92400e; font-size: 14px;">🔔 ' + leads.length + ' promemoria da inviare</strong>';
    html += '</div>';
    
    leads.forEach((lead, index) => {
        const dataStr = lead.dataAppuntamento.toLocaleDateString('it-IT');
        const oraStr = lead.dataAppuntamento.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        
        html += `
            <div style="padding: 12px; background: white; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="flex: 1;">
                        <strong style="font-size: 15px; color: var(--gray-900);">📱 ${lead.nome} ${lead.cognome || ''}</strong>
                        <div style="font-size: 13px; color: var(--gray-600); margin-top: 3px;">
                            📅 ${dataStr} ore ${oraStr}
                        </div>
                        <div style="font-size: 12px; color: #f59e0b; margin-top: 2px; font-weight: 600;">
                            📌 Fissato ${lead.giorniDistanza} ${lead.giorniDistanza === 1 ? 'giorno' : 'giorni'} fa
                        </div>
                    </div>
                    <button 
                        type="button" 
                        class="btn btn-primary" 
                        style="padding: 6px 12px; font-size: 13px;"
                        onclick="fillFormFromDolceParanoia(${index})">
                        Seleziona
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Salva leads in window per accesso da fillFormFromDolceParanoia
    window.currentDolceParanoiaLeads = leads;
}

window.fillFormFromDolceParanoia = function(index) {
    const leads = window.currentDolceParanoiaLeads;
    if (!leads || !leads[index]) return;
    
    const lead = leads[index];
    
    // Riempi form
    document.getElementById('nome').value = lead.nome;
    document.getElementById('cognome').value = lead.cognome || '';
    document.getElementById('telefono').value = lead.telefono || '';
    
    // Imposta tipo messaggio a Dolce Paranoia
    const tipoSelect = document.getElementById('tipoMessaggio');
    if (tipoSelect) {
        tipoSelect.value = 'dolce_paranoia';
    }
    
    // 🆕 Imposta giorno (YYYY-MM-DD format)
    const dataStr = lead.dataAppuntamento.toISOString().split('T')[0]; // YYYY-MM-DD
    document.getElementById('giorno').value = dataStr;
    
    // Imposta orario
    const oraStr = lead.dataAppuntamento.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('orario').value = oraStr;
    
    // Scroll to form
    document.getElementById('messageForm').scrollIntoView({ behavior: 'smooth' });
    
    // Update preview
    updatePreview();
    
    showNotification('📝 Form compilato con ' + lead.nome, 'success');
};

// ===== CRONOLOGIA =====
async function saveToCronologia(nome, cognome, telefono, messaggio, servizio, societa) {
    // SOLO DRIVE - Nessun localStorage
    let cronologia = [];
    
    // 🔥 FIX v2.5.14: Carica da Drive O localStorage (backup)
    if (window.DriveStorage && window.accessToken) {
        try {
            const driveData = await window.DriveStorage.load(STORAGE_KEYS.CRONOLOGIA);
            if (driveData) {
                cronologia = driveData;
                console.log('📂 Caricati', cronologia.length, 'messaggi da Drive');
            }
        } catch (error) {
            console.error('❌ Drive fallito, uso localStorage:', error);
            const localData = localStorage.getItem(STORAGE_KEYS.CRONOLOGIA);
            if (localData) {
                cronologia = JSON.parse(localData);
                console.log('📂 Fallback localStorage:', cronologia.length, 'messaggi');
            }
        }
    } else {
        // BACKUP: carica da localStorage se non loggato
        const localData = localStorage.getItem(STORAGE_KEYS.CRONOLOGIA);
        if (localData) {
            cronologia = JSON.parse(localData);
            console.log('📂 Caricati', cronologia.length, 'messaggi da localStorage (offline)');
        }
        console.warn('⚠️ Non loggato Google: cronologia salvata SOLO localmente');
    }
    
    // Aggiungi nuovo entry
    const tipoMessaggio = document.getElementById('tipoMessaggio').value;
    const entry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        nome: nome,
        cognome: cognome,
        telefono: telefono,
        messaggio: messaggio,
        servizio: servizio || '',
        societa: societa || '',
        tipoMessaggio: tipoMessaggio || 'primo_messaggio'
    };
    
    cronologia.unshift(entry);
    
    // Limite 1000 messaggi
    if (cronologia.length > 1000) {
        cronologia = cronologia.slice(0, 1000);
    }
    
    // 🔥 FIX v2.5.14: Salva su Drive E localStorage (backup)
    // 1. Salva SEMPRE su localStorage (backup locale)
    localStorage.setItem(STORAGE_KEYS.CRONOLOGIA, JSON.stringify(cronologia));
    console.log('💾 Salvato localStorage backup:', cronologia.length, 'messaggi');
    
    // 2. Prova a salvare su Drive (se loggato)
    if (window.DriveStorage && window.accessToken) {
        try {
            await window.DriveStorage.save(STORAGE_KEYS.CRONOLOGIA, cronologia);
            console.log('✅ Cronologia salvata su Drive:', cronologia.length, 'messaggi');
        } catch (error) {
            console.error('❌ Drive fallito (403?), dati comunque su localStorage:', error);
            mostraNotifica('⚠️ Messaggio salvato localmente (Drive non disponibile)', 'warning');
        }
    } else {
        console.log('💾 Salvato SOLO localStorage (non loggato Google)');
    }
    
    // Marca lead come contattato
    markLeadAsContactedFromCalendar(nome, cognome, telefono);
}

// ===== MARCA LEAD DA CALENDARIO COME CONTATTATO =====
async function markLeadAsContactedFromCalendar(nome, cognome, telefono) {
    const selectLead = document.getElementById('selectLead');
    if (!selectLead) return;
    
    const selectedOption = selectLead.options[selectLead.selectedIndex];
    
    if (selectedOption && selectedOption.dataset.eventId) {
        const eventData = JSON.parse(selectedOption.dataset.eventData || '{}');
        const eventId = selectedOption.dataset.eventId;
        const eventDate = eventData.start || new Date().toISOString();
        
        // 🔥 Salva su Google Drive invece di localStorage
        if (window.markLeadAsContacted) {
            await window.markLeadAsContacted(eventId, nome, cognome, telefono, eventDate);
        }
        
        console.log('✅ Lead marcato come contattato su Drive:', nome);
        
        // Aggiorna la lista lead dopo aver marcato come contattato
        const selectDay = document.getElementById('selectDay');
        if (selectDay && selectDay.value && window.updateLeadSelector) {
            await window.updateLeadSelector(selectDay.value);
        }
    }
}

async function loadCronologia() {
    // SOLO DRIVE - Nessun localStorage fallback
    let cronologia = [];
    
    // Carica da Drive
    if (window.DriveStorage && window.accessToken) {
        try {
            const driveData = await window.DriveStorage.load(STORAGE_KEYS.CRONOLOGIA);
            if (driveData) {
                cronologia = driveData;
                console.log('✅ Cronologia caricata da Drive:', cronologia.length, 'messaggi');
            }
        } catch (error) {
            console.error('❌ Errore caricamento cronologia:', error);
        }
    }
    
    const listContainer = document.getElementById('cronologiaList');
    
    if (!window.accessToken) {
        listContainer.innerHTML = '<p class="placeholder-text">⚠️ Fai login Google per vedere la cronologia</p>';
        return;
    }
    
    if (cronologia.length === 0) {
        listContainer.innerHTML = '<p class="placeholder-text">Nessun messaggio inviato ancora...</p>';
        return;
    }
    
    let html = '';
    cronologia.forEach(entry => {
        const date = new Date(entry.timestamp);
        const dateStr = date.toLocaleDateString('it-IT');
        const timeStr = date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        
        // Determina badge tipo messaggio
        const tipoLabel = entry.tipoMessaggio === 'memo_giorno' ? 'Memo' : 'Primo Msg';
        const tipoBadge = entry.tipoMessaggio === 'memo_giorno' 
            ? '<span style="display:inline-block;padding:2px 8px;background:#dbeafe;color:#1e40af;border-radius:12px;font-size:11px;font-weight:600;margin-left:8px;">📝 Memo</span>'
            : '<span style="display:inline-block;padding:2px 8px;background:#dcfce7;color:#166534;border-radius:12px;font-size:11px;font-weight:600;margin-left:8px;">💬 Primo Msg</span>';
        
        html += `
            <div class="cronologia-item">
                <div class="cronologia-header">
                    <strong>${entry.nome} ${entry.cognome || ''}</strong>${tipoBadge}
                    <span style="font-size: 13px; color: var(--gray-500);">
                        <i class="fas fa-calendar"></i> ${dateStr} ${timeStr}
                    </span>
                </div>
                <div class="cronologia-message">
                    ${entry.messaggio.replace(/\n/g, '<br>')}
                </div>
            </div>
        `;
    });
    
    listContainer.innerHTML = html;
}

// ===== ULTIMO MESSAGGIO =====
async function saveLastMessage(nome, cognome, telefono) {
    const lastMessage = { nome, cognome, telefono };
    await setStorageItem(STORAGE_KEYS.LAST_MESSAGE, JSON.stringify(lastMessage));
    await loadLastMessageIndicator();
}

async function loadLastMessageIndicator() {
    const lastMessage = JSON.parse((await getStorageItem(STORAGE_KEYS.LAST_MESSAGE)) || 'null');
    const indicator = document.getElementById('lastMessageIndicator');
    const textSpan = document.getElementById('lastMessageText');
    
    if (!lastMessage) {
        indicator.style.display = 'none';
        return;
    }
    
    const nomePreview = lastMessage.nome.substring(0, 3) + '*'.repeat(Math.max(0, lastMessage.nome.length - 3));
    const cognomePreview = lastMessage.cognome ? lastMessage.cognome.substring(0, 3) + '*'.repeat(Math.max(0, lastMessage.cognome.length - 3)) : '';
    const telefonoDigits = lastMessage.telefono.replace(/\D/g, '');
    const telefonoPreview = '*'.repeat(Math.max(0, telefonoDigits.length - 3)) + telefonoDigits.slice(-3);
    
    textSpan.textContent = `Ultimo: ${nomePreview} ${cognomePreview} - ${telefonoPreview}`;
    indicator.style.display = 'flex';
}

// ===== GIORNO DEFAULT (+2 GIORNI) =====
async function initDefaultDay() {
    const oggi = new Date();
    // Fix v2.5.7: Imposta OGGI invece di +2 giorni
    const giorniSettimana = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
    const giornoOggi = giorniSettimana[oggi.getDay()];
    document.getElementById('giorno').value = giornoOggi;
    await updatePreview();
}

// ===== TEMPLATES =====
async function loadTemplates() {
    console.log('🔄 Caricamento templates...');
    
    // FORZA RESET per v2.2.15 (assicura template corretto)
    localStorage.removeItem('sgmess_templates_local');
    
    // USA SEMPRE localStorage per templates (mai Drive)
    let templatesString = localStorage.getItem('sgmess_templates_local');
    console.log('📦 Templates localStorage:', templatesString);
    
    let templates = JSON.parse(templatesString || '[]');
    console.log('📋 Templates parsed:', templates.length);
    
    // Se non ci sono template, crea quelli di default
    if (templates.length === 0) {
        console.log('⚠️ Nessun template trovato, creo default...');
        const defaultTemplates = [
            {
                id: 'primo_messaggio',
                nome: 'Primo Messaggio',
                categoria: 'Primo Messaggio',
                testo: '{BB} {NN}, sono {OPERATORE} di {SERVIZIO}. Hai avuto un colloquio con {YY} assistente e mi ha riferito che abbiamo un appuntamento {GG} alle {HH}. {VV} e, nel frattempo, ti invito a leggere il file che ti è stato inviato, è molto importante. Passa {TT}'
            },
            {
                id: 'memo_giorno',
                nome: 'Memo del Giorno',
                categoria: 'Memo',
                testo: '{BB} {NN}, ti confermo che per le {HH} siam collegati, a dopo. Dammi riscontro, grazie'
            },
            {
                id: 'dolce_paranoia',
                nome: 'Dolce Paranoia',
                categoria: 'Promemoria',
                testo: '{BB} {NN}, ti confermo per {GG} alle {HH}. Dammi riscontro, grazie'
            }
        ];
        templates = defaultTemplates;
        localStorage.setItem('sgmess_templates_local', JSON.stringify(templates));
        console.log('✅ Template default creati e salvati');
    }
    
    // Se esistono solo 2 template (vecchia versione), aggiungi il terzo
    if (templates.length === 2 && !templates.find(t => t.id === 'dolce_paranoia')) {
        console.log('🔄 Aggiornamento: aggiungo Dolce Paranoia...');
        templates.push({
            id: 'dolce_paranoia',
            nome: 'Dolce Paranoia',
            categoria: 'Promemoria',
            testo: '{BB} {NN}, ti confermo per {GG} alle {HH}. Dammi riscontro, grazie'
        });
        localStorage.setItem('sgmess_templates_local', JSON.stringify(templates));
        console.log('✅ Dolce Paranoia aggiunto');
    }
    
    // Se esiste solo 1 template (vecchia versione), aggiungi il secondo
    if (templates.length === 1 && templates[0].id === 'primo_messaggio') {
        console.log('🔄 Aggiornamento: aggiungo Memo del Giorno...');
        templates.push({
            id: 'memo_giorno',
            nome: 'Memo del Giorno',
            categoria: 'Memo',
            testo: '{BB} {NN}, ti confermo che per le {HH} siam collegati, a dopo. Dammi riscontro, grazie'
        });
        localStorage.setItem('sgmess_templates_local', JSON.stringify(templates));
        console.log('✅ Memo del Giorno aggiunto');
    }
    
    // Popola dropdown
    const select = document.getElementById('tipoMessaggio');
    if (!select) {
        console.error('❌ Dropdown tipoMessaggio non trovato!');
        return;
    }
    
    select.innerHTML = '';
    templates.forEach(t => {
        const option = document.createElement('option');
        option.value = t.id;
        option.textContent = t.nome;
        select.appendChild(option);
        console.log(`  ➕ Aggiunta opzione: ${t.nome}`);
    });
    
    console.log(`✅ ${templates.length} template(s) caricati nel dropdown`);
    
    await updatePreview();
}

async function loadMessaggiList() {
    const templates = JSON.parse((await getStorageItem(STORAGE_KEYS.TEMPLATES)) || '[]');
    const container = document.getElementById('messaggiList');
    
    if (templates.length === 0) {
        container.innerHTML = '<p class="placeholder-text">Nessun messaggio creato...</p>';
        return;
    }
    
    let html = '';
    templates.forEach(t => {
        html += `
            <div class="cronologia-item">
                <div class="cronologia-header">
                    <strong>${t.nome}</strong>
                    <span style="font-size: 13px; color: var(--gray-500);">
                        <i class="fas fa-tag"></i> ${t.categoria}
                    </span>
                </div>
                <div class="cronologia-message">
                    ${t.testo}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ===== EXPORT FUNZIONI GLOBALI =====
window.showNotification = showNotification;

console.log('✅ Main.js v2.5.8 caricato');
