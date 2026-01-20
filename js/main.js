/* ================================================================================
   TESTmess v2.2.26 - Lead colorati + Cronologia persistente + Date navigation
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
    console.log('🚀 TESTmess v2.2.27 inizializzato');
    
    setupSidebar();
    setupNavigation();
    await setupEventListeners();
    await loadTemplates();
    await updatePreview();
    await loadLastMessageIndicator();
    await initDefaultDay();
    
    // Inizializza nuovi moduli v2.2.27
    if (window.initRubrica) {
        window.initRubrica();
    }
    if (window.initGitHubAutoPush) {
        window.initGitHubAutoPush();
    }
    
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
    
    // Update preview su tutti i campi
    ['giorno', 'orario', 'servizio', 'tipoMessaggio'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', async () => await updatePreview());
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
    
    if (prevDayBtn && nextDayBtn && selectDay) {
        prevDayBtn.addEventListener('click', () => {
            if (!selectDay.value) return;
            
            const currentDate = new Date(selectDay.value + 'T00:00:00');
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Limite: non oltre 90 giorni nel passato
            const minDate = new Date(today);
            minDate.setDate(minDate.getDate() - 90);
            
            if (currentDate > minDate) {
                currentDate.setDate(currentDate.getDate() - 1);
                selectDay.value = currentDate.toISOString().split('T')[0];
                selectDay.dispatchEvent(new Event('change'));
            }
        });
        
        nextDayBtn.addEventListener('click', () => {
            if (!selectDay.value) return;
            
            const currentDate = new Date(selectDay.value + 'T00:00:00');
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Limite: non oltre 90 giorni nel futuro
            const maxDate = new Date(today);
            maxDate.setDate(maxDate.getDate() + 90);
            
            if (currentDate < maxDate) {
                currentDate.setDate(currentDate.getDate() + 1);
                selectDay.value = currentDate.toISOString().split('T')[0];
                selectDay.dispatchEvent(new Event('change'));
            }
        });
    }
    
    // Action buttons
    document.getElementById('inviaMessaggio').addEventListener('click', async () => await sendToWhatsApp());
    document.getElementById('generaMessaggio').addEventListener('click', async (e) => await generateMessage(e));
    document.getElementById('copiaMessaggio').addEventListener('click', copyToClipboard);
    document.getElementById('copiaIban').addEventListener('click', copyIban);
    
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
    const GG = giorno;
    const HH = orario;
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

// ===== CRONOLOGIA =====
async function saveToCronologia(nome, cognome, telefono, messaggio, servizio, societa) {
    // STEP 1: Carica cronologia esistente (priorità Drive, fallback localStorage)
    let cronologia = [];
    
    // Prova a caricare da Drive
    if (window.DriveStorage && window.accessToken) {
        try {
            const driveData = await window.DriveStorage.load(STORAGE_KEYS.CRONOLOGIA);
            if (driveData) {
                cronologia = driveData;
            }
        } catch (error) {
            console.warn('⚠️ Drive non disponibile, uso localStorage:', error);
        }
    }
    
    // Fallback: localStorage
    if (cronologia.length === 0) {
        const localData = localStorage.getItem('CRONOLOGIA_BACKUP');
        if (localData) {
            try {
                cronologia = JSON.parse(localData);
            } catch (e) {
                cronologia = [];
            }
        }
    }
    
    // STEP 2: Aggiungi nuovo entry
    const entry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        nome: nome,
        cognome: cognome,
        telefono: telefono,
        messaggio: messaggio,
        servizio: servizio || '',
        societa: societa || ''
    };
    
    cronologia.unshift(entry);
    
    // STEP 3: Limite 1000 messaggi
    if (cronologia.length > 1000) {
        cronologia = cronologia.slice(0, 1000);
    }
    
    // STEP 4: Salva su entrambi i storage
    // 4a) Salva su Drive (principale)
    if (window.DriveStorage && window.accessToken) {
        try {
            await window.DriveStorage.save(STORAGE_KEYS.CRONOLOGIA, cronologia);
            console.log('✅ Cronologia salvata su Drive:', cronologia.length, 'messaggi');
        } catch (error) {
            console.error('❌ Errore salvataggio Drive:', error);
        }
    }
    
    // 4b) Salva su localStorage (cache locale)
    try {
        localStorage.setItem('CRONOLOGIA_BACKUP', JSON.stringify(cronologia));
        console.log('✅ Cronologia salvata su localStorage (backup)');
    } catch (error) {
        console.warn('⚠️ localStorage pieno, salto backup locale');
    }
    
    // Marca lead come contattato se selezionato da calendario
    markLeadAsContactedFromCalendar(nome, cognome, telefono);
}

// ===== MARCA LEAD DA CALENDARIO COME CONTATTATO =====
function markLeadAsContactedFromCalendar(nome, cognome, telefono) {
    const selectLead = document.getElementById('selectLead');
    if (!selectLead) return;
    
    const selectedOption = selectLead.options[selectLead.selectedIndex];
    
    if (selectedOption && selectedOption.dataset.eventId) {
        // Usa localStorage diretto per CONTACTED_LEADS (non su Drive)
        const contactedLeads = JSON.parse(localStorage.getItem('sgmess_contacted_leads') || '[]');
        
        const contactedEntry = {
            eventId: selectedOption.dataset.eventId,
            nome: nome,
            cognome: cognome,
            telefono: telefono,
            timestamp: new Date().toISOString()
        };
        
        // Evita duplicati
        const exists = contactedLeads.some(lead => lead.eventId === selectedOption.dataset.eventId);
        if (!exists) {
            contactedLeads.push(contactedEntry);
            localStorage.setItem('sgmess_contacted_leads', JSON.stringify(contactedLeads));
            
            console.log('✅ Lead marcato come contattato:', nome);
            
            // Aggiorna la lista lead dopo aver marcato come contattato
            const selectDay = document.getElementById('selectDay');
            if (selectDay && selectDay.value && window.updateLeadSelector) {
                window.updateLeadSelector(selectDay.value);
            }
        }
    }
}

async function loadCronologia() {
    // STEP 1: Carica cronologia (priorità Drive, fallback localStorage)
    let cronologia = [];
    
    // Prova a caricare da Drive
    if (window.DriveStorage && window.accessToken) {
        try {
            const driveData = await window.DriveStorage.load(STORAGE_KEYS.CRONOLOGIA);
            if (driveData) {
                cronologia = driveData;
                console.log('✅ Cronologia caricata da Drive:', cronologia.length, 'messaggi');
            }
        } catch (error) {
            console.warn('⚠️ Drive non disponibile:', error);
        }
    }
    
    // Fallback: localStorage
    if (cronologia.length === 0) {
        const localData = localStorage.getItem('CRONOLOGIA_BACKUP');
        if (localData) {
            try {
                cronologia = JSON.parse(localData);
                console.log('✅ Cronologia caricata da localStorage:', cronologia.length, 'messaggi');
            } catch (e) {
                cronologia = [];
            }
        }
    }
    
    const listContainer = document.getElementById('cronologiaList');
    
    if (cronologia.length === 0) {
        listContainer.innerHTML = '<p class="placeholder-text">Nessun messaggio inviato ancora...</p>';
        return;
    }
    
    let html = '';
    cronologia.forEach(entry => {
        const date = new Date(entry.timestamp);
        const dateStr = date.toLocaleDateString('it-IT');
        const timeStr = date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        
        html += `
            <div class="cronologia-item">
                <div class="cronologia-header">
                    <strong>${entry.nome} ${entry.cognome || ''}</strong>
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
    oggi.setDate(oggi.getDate() + 2);
    const giorniSettimana = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
    const giornoTraDueGiorni = giorniSettimana[oggi.getDay()];
    document.getElementById('giorno').value = giornoTraDueGiorni;
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
    
    // Se non ci sono template, crea quello di default
    if (templates.length === 0) {
        console.log('⚠️ Nessun template trovato, creo default...');
        const defaultTemplate = {
            id: 'primo_messaggio',
            nome: 'Primo Messaggio',
            categoria: 'Primo Messaggio',
            testo: '{BB} {NN}, sono {OPERATORE} di {SERVIZIO}. Hai avuto un colloquio con {YY} assistente e mi ha riferito che abbiamo un appuntamento {GG} alle {HH}. {VV} e, nel frattempo, ti invito a leggere il file che ti è stato inviato, è molto importante. Passa {TT}'
        };
        templates = [defaultTemplate];
        localStorage.setItem('sgmess_templates_local', JSON.stringify(templates));
        console.log('✅ Template default creato e salvato');
        console.log('📝 Template testo:', defaultTemplate.testo);
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

console.log('✅ Main.js v2.2.26 caricato');
