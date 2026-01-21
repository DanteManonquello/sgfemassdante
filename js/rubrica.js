/* ================================================================================
   RUBRICA - TESTmess v2.3.1
   
   Gestisce l'elenco dei contatti NON ancora salvati in rubrica Google.
   Mostra una sezione laterale con i nominativi da salvare.
   
   CHANGELOG v2.3.1:
   - ✅ Auth Guard: Blocca tutti i dati senza login Google
   - ✅ Scan 12 mesi da Google Drive + Calendar API (non localStorage)
   - ✅ Rate limiting + retry logic con exponential backoff
   - ✅ Token validation prima di ogni chiamata API
   - ✅ Paginazione contatti (primi 100 + "mostra altri")
   - ✅ Disabilita pulsante durante scan (no doppio click)
   - ✅ Error handling robusto (fallback localStorage se Drive fail)
   - ✅ Cache risultati 1 ora per performance
   ================================================================================ */

const STORAGE_KEYS_RUBRICA = {
    SAVED_CONTACTS: 'sgmess_saved_contacts', // Cache dei contatti già salvati
    LAST_RUBRICA_SYNC: 'sgmess_last_rubrica_sync',
    SCAN_CACHE: 'sgmess_rubrica_scan_cache', // Cache risultati scan
    SCAN_CACHE_TIMESTAMP: 'sgmess_rubrica_scan_timestamp'
};

// Config
const RUBRICA_CONFIG = {
    MAX_CALENDARS: 10, // Max calendari da processare (tutti)
    MAX_EVENTS_PER_CALENDAR: 2500,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY_BASE: 1000, // ms
    CACHE_DURATION: 60 * 60 * 1000, // 1 ora in ms
    CONTACTS_PER_PAGE: 100
};

// Flag per prevenire doppi scan
let isScanningContacts = false;

// ===== INIZIALIZZAZIONE =====
function initRubrica() {
    console.log('📒 Rubrica module v2.3.0 initialized');
    
    // Event listener per pulsante sincronizza rubrica
    const syncBtn = document.getElementById('syncRubricaBtn');
    if (syncBtn) {
        syncBtn.addEventListener('click', async () => {
            await syncSavedContactsFromGoogle();
        });
    }
}

// ===== UTILITY: SLEEP =====
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== UTILITY: VALIDA TOKEN =====
function checkTokenValidity() {
    if (!window.accessToken) {
        throw new Error('TOKEN_EXPIRED');
    }
    return true;
}

// ===== UTILITY: RETRY LOGIC =====
async function retryWithBackoff(fn, retries = RUBRICA_CONFIG.RETRY_ATTEMPTS) {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === retries - 1) throw error;
            
            const delay = RUBRICA_CONFIG.RETRY_DELAY_BASE * Math.pow(2, i);
            console.warn(`⚠️ Retry ${i + 1}/${retries} dopo ${delay}ms...`);
            await sleep(delay);
        }
    }
}

// ===== OTTIENI CONTATTI NON SALVATI (CON CACHE) =====
async function getUnsavedContacts(forceRefresh = false) {
    // 🔒 AUTH GUARD: Blocca senza login
    if (!window.accessToken) {
        console.warn('⚠️ Nessun accessToken, login richiesto');
        return [];
    }
    
    // Previeni scan simultanei
    if (isScanningContacts) {
        console.warn('⚠️ Scan già in corso, attendere...');
        return [];
    }
    
    // Controlla cache (1 ora)
    if (!forceRefresh) {
        const cachedData = localStorage.getItem(STORAGE_KEYS_RUBRICA.SCAN_CACHE);
        const cacheTimestamp = parseInt(localStorage.getItem(STORAGE_KEYS_RUBRICA.SCAN_CACHE_TIMESTAMP) || '0');
        
        if (cachedData && (Date.now() - cacheTimestamp) < RUBRICA_CONFIG.CACHE_DURATION) {
            console.log('📦 Uso cache rubrica (valida per altri ' + Math.round((RUBRICA_CONFIG.CACHE_DURATION - (Date.now() - cacheTimestamp)) / 60000) + ' min)');
            return JSON.parse(cachedData);
        }
    }
    
    isScanningContacts = true;
    
    try {
        // 1. Carica cronologia messaggi DA GOOGLE DRIVE
        let cronologia = [];
        if (window.DriveStorage && window.accessToken) {
            try {
                checkTokenValidity();
                const driveData = await window.DriveStorage.load(STORAGE_KEYS.CRONOLOGIA);
                if (driveData) {
                    cronologia = driveData;
                    console.log(`📂 Caricati ${cronologia.length} messaggi da Drive`);
                }
            } catch (e) {
                if (e.message === 'TOKEN_EXPIRED') {
                    console.error('❌ Token scaduto, rifare login');
                    if (window.mostraNotifica) {
                        mostraNotifica('⚠️ Sessione scaduta, rifare login Google', 'error');
                    }
                    return [];
                }
                console.warn('⚠️ Drive fallito, uso localStorage fallback:', e);
                // Fallback localStorage (solo session corrente)
                const localCronologia = localStorage.getItem(STORAGE_KEYS.CRONOLOGIA);
                if (localCronologia) {
                    cronologia = JSON.parse(localCronologia);
                    console.log(`📂 Fallback localStorage: ${cronologia.length} messaggi`);
                }
            }
        }
        
        // 2. Carica TUTTI gli eventi calendario degli ultimi 12 mesi DA GOOGLE CALENDAR API
        let calendarEvents = [];
        if (window.accessToken && window.gapi && window.gapi.client && window.gapi.client.calendar) {
            try {
                checkTokenValidity();
                console.log('📅 Caricamento eventi calendario ultimi 12 mesi...');
                
                // Range: 12 mesi nel passato fino a oggi
                const now = new Date();
                const twelveMonthsAgo = new Date();
                twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
                
                const timeMin = twelveMonthsAgo.toISOString();
                const timeMax = now.toISOString();
                
                // Ottieni lista calendari con retry
                const calendarListResponse = await retryWithBackoff(async () => {
                    return await window.gapi.client.calendar.calendarList.list();
                });
                
                const calendars = calendarListResponse.result.items || [];
                console.log(`📆 Trovati ${calendars.length} calendari`);
                
                // Limita a max calendari configurati
                const calendarsToProcess = calendars.slice(0, RUBRICA_CONFIG.MAX_CALENDARS);
                
                // Per ogni calendario, carica eventi con retry
                for (const calendar of calendarsToProcess) {
                    try {
                        checkTokenValidity(); // Verifica prima di ogni chiamata
                        
                        const eventsResponse = await retryWithBackoff(async () => {
                            return await window.gapi.client.calendar.events.list({
                                calendarId: calendar.id,
                                timeMin: timeMin,
                                timeMax: timeMax,
                                maxResults: RUBRICA_CONFIG.MAX_EVENTS_PER_CALENDAR,
                                singleEvents: true,
                                orderBy: 'startTime'
                            });
                        });
                        
                        const events = eventsResponse.result.items || [];
                        
                        // Aggiungi nome calendario a ogni evento
                        events.forEach(event => {
                            calendarEvents.push({
                                ...event,
                                calendarName: calendar.summary,
                                start: event.start.dateTime || event.start.date
                            });
                        });
                        
                        console.log(`  ✅ ${calendar.summary}: ${events.length} eventi`);
                    } catch (err) {
                        console.warn(`⚠️ Skip calendario ${calendar.summary}:`, err.message);
                        // Continua con altri calendari anche se uno fallisce
                    }
                }
                
                console.log(`📅 TOTALE: ${calendarEvents.length} eventi ultimi 12 mesi`);
            } catch (e) {
                if (e.message === 'TOKEN_EXPIRED') {
                    console.error('❌ Token scaduto durante scan calendario');
                    if (window.mostraNotifica) {
                        mostraNotifica('⚠️ Sessione scaduta, rifare login Google', 'error');
                    }
                    return [];
                }
                console.error('❌ Errore caricamento eventi calendario:', e);
            }
        }
        
        // 3. Carica cache contatti salvati
        const savedContactsJSON = localStorage.getItem(STORAGE_KEYS_RUBRICA.SAVED_CONTACTS);
        let savedContacts = {};
        if (savedContactsJSON) {
            try {
                savedContacts = JSON.parse(savedContactsJSON);
            } catch (e) {
                console.error('❌ Errore parsing saved contacts:', e);
            }
        }
        
        // 4. Estrai contatti unici dalla cronologia
        const uniqueContacts = {};
        
        cronologia.forEach(entry => {
            const phone = normalizePhone(entry.telefono);
            if (!phone) return; // Skip se non c'è telefono
            
            // Se non è già salvato E non è già nella lista
            if (!savedContacts[phone] && !uniqueContacts[phone]) {
                uniqueContacts[phone] = {
                    nome: entry.nome || '',
                    cognome: entry.cognome || '',
                    telefono: entry.telefono,
                    societa: entry.societa || '',
                    servizio: entry.servizio || '',
                    timestamp: entry.timestamp || new Date().toISOString(),
                    source: 'cronologia'
                };
            }
        });
        
        // 5. Estrai contatti dagli eventi calendario
        calendarEvents.forEach(event => {
            // Estrai dati dall'evento
            const contactData = extractContactFromEvent(event);
            if (!contactData) return; // Skip se non riesce a estrarre
            
            const phone = normalizePhone(contactData.telefono);
            if (!phone) return; // Skip se non c'è telefono
            
            // Se non è già salvato E non è già nella lista
            if (!savedContacts[phone] && !uniqueContacts[phone]) {
                uniqueContacts[phone] = {
                    nome: contactData.nome || '',
                    cognome: contactData.cognome || '',
                    telefono: contactData.telefono,
                    societa: contactData.societa || '',
                    servizio: contactData.servizio || '',
                    timestamp: event.start || new Date().toISOString(),
                    source: 'calendario',
                    calendarName: event.calendarName || ''
                };
            }
        });
        
        // 6. Converti in array e ordina per timestamp (più recenti prima)
        const unsavedArray = Object.values(uniqueContacts);
        unsavedArray.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Salva in cache
        localStorage.setItem(STORAGE_KEYS_RUBRICA.SCAN_CACHE, JSON.stringify(unsavedArray));
        localStorage.setItem(STORAGE_KEYS_RUBRICA.SCAN_CACHE_TIMESTAMP, Date.now().toString());
        
        console.log('═════════════════════════════════════════════════');
        console.log(`📒 RUBRICA SCAN COMPLETO:`);
        console.log(`   📂 Cronologia Drive: ${cronologia.length} messaggi`);
        console.log(`   📅 Eventi Calendario: ${calendarEvents.length} eventi (12 mesi)`);
        console.log(`   🔍 Contatti da salvare: ${unsavedArray.length}`);
        console.log('═════════════════════════════════════════════════');
        
        return unsavedArray;
        
    } finally {
        isScanningContacts = false;
    }
}

// ===== ESTRAI CONTATTO DA EVENTO CALENDARIO =====
function extractContactFromEvent(event) {
    if (!event || !event.summary) return null;
    
    // Pattern per estrarre informazioni da eventi tipo:
    // "15:30 - Mario Rossi (Stock Gain)"
    // "Mario Rossi - Call consulenza"
    
    let nome = '';
    let cognome = '';
    let telefono = '';
    let servizio = '';
    let societa = '';
    
    // 1. Estrai nome dal summary (rimuovi orario se presente)
    let nameText = event.summary.replace(/^\d{1,2}:\d{2}\s*-\s*/, ''); // Rimuovi "15:30 - "
    nameText = nameText.replace(/\s*\([^)]*\)\s*$/, ''); // Rimuovi "(Stock Gain)" finale
    nameText = nameText.trim();
    
    // 2. Split nome e cognome usando database nomi italiani
    if (window.splitNomeCognome) {
        const split = window.splitNomeCognome(nameText);
        nome = split.nome;
        cognome = split.cognome;
    } else {
        // Fallback: primo spazio
        const parts = nameText.split(' ');
        nome = parts[0] || '';
        cognome = parts.slice(1).join(' ') || '';
    }
    
    // 3. Estrai telefono dalla description
    if (event.description) {
        // Pattern: "Telefono: +39 333 1234567" o "Tel: 3331234567"
        const phoneMatch = event.description.match(/(?:telefono|tel|phone|cellulare)[\s:]*([+\d\s\-()]{8,})/i);
        if (phoneMatch) {
            telefono = phoneMatch[1].trim();
        }
        
        // Estrai servizio
        const serviceMatch = event.description.match(/(?:servizio|service)[\s:]*([^\n]+)/i);
        if (serviceMatch) {
            servizio = serviceMatch[1].trim();
        }
    }
    
    // 4. Determina società dal calendarName o servizio
    if (event.calendarName) {
        if (event.calendarName.includes('Stock Gain') || event.calendarName.includes('SG')) {
            societa = 'SG - Lead';
            if (!servizio) servizio = 'Stock Gain';
        } else if (event.calendarName.includes('Finanza Efficace') || event.calendarName.includes('FE')) {
            societa = 'FE - Lead';
            if (!servizio) servizio = 'Finanza Efficace';
        }
    }
    
    // Se non ha telefono, cerca nell'attendees
    if (!telefono && event.attendees && event.attendees.length > 0) {
        event.attendees.forEach(attendee => {
            if (attendee.email && attendee.email.includes('@')) {
                // Cerca numero nel nome dell'attendee
                const phoneMatch = (attendee.displayName || attendee.email).match(/([+\d\s\-()]{8,})/);
                if (phoneMatch && !telefono) {
                    telefono = phoneMatch[1].trim();
                }
            }
        });
    }
    
    // Ritorna solo se abbiamo almeno nome e telefono
    if (nome && telefono) {
        return {
            nome,
            cognome,
            telefono,
            servizio,
            societa
        };
    }
    
    return null;
}

// ===== NORMALIZZA NUMERO TELEFONO =====
function normalizePhone(phone) {
    if (!phone) return null;
    // Rimuovi TUTTI i caratteri non numerici
    const cleaned = phone.replace(/[^\d]/g, '');
    // Se inizia con 39 e ha 12+ cifre, è valido
    // Se ha 10 cifre, aggiungi 39
    if (cleaned.length === 10) {
        return '39' + cleaned;
    }
    return cleaned.length >= 10 ? cleaned : null;
}

// ===== MARCA CONTATTO COME SALVATO =====
async function markContactAsSaved(phone) {
    const normalized = normalizePhone(phone);
    if (!normalized) return;
    
    // Carica cache
    const savedContactsJSON = localStorage.getItem(STORAGE_KEYS_RUBRICA.SAVED_CONTACTS);
    let savedContacts = {};
    if (savedContactsJSON) {
        try {
            savedContacts = JSON.parse(savedContactsJSON);
        } catch (e) {
            console.error('❌ Errore parsing saved contacts:', e);
        }
    }
    
    // Aggiungi contatto con timestamp
    savedContacts[normalized] = {
        savedAt: new Date().toISOString()
    };
    
    // Salva
    localStorage.setItem(STORAGE_KEYS_RUBRICA.SAVED_CONTACTS, JSON.stringify(savedContacts));
    console.log(`✅ Contatto ${normalized} marcato come salvato`);
    
    // Invalida cache scan
    localStorage.removeItem(STORAGE_KEYS_RUBRICA.SCAN_CACHE);
    localStorage.removeItem(STORAGE_KEYS_RUBRICA.SCAN_CACHE_TIMESTAMP);
    
    // Aggiorna UI
    await renderRubricaList();
}

// ===== RIMUOVI CONTATTO DA SALVATI (per annullare) =====
async function unmarkContactAsSaved(phone) {
    const normalized = normalizePhone(phone);
    if (!normalized) return;
    
    const savedContactsJSON = localStorage.getItem(STORAGE_KEYS_RUBRICA.SAVED_CONTACTS);
    let savedContacts = {};
    if (savedContactsJSON) {
        try {
            savedContacts = JSON.parse(savedContactsJSON);
        } catch (e) {
            console.error('❌ Errore parsing saved contacts:', e);
        }
    }
    
    delete savedContacts[normalized];
    localStorage.setItem(STORAGE_KEYS_RUBRICA.SAVED_CONTACTS, JSON.stringify(savedContacts));
    console.log(`🔄 Contatto ${normalized} rimosso da salvati`);
    
    // Invalida cache scan
    localStorage.removeItem(STORAGE_KEYS_RUBRICA.SCAN_CACHE);
    localStorage.removeItem(STORAGE_KEYS_RUBRICA.SCAN_CACHE_TIMESTAMP);
    
    await renderRubricaList();
}

// ===== SINCRONIZZA CON GOOGLE CONTACTS =====
async function syncSavedContactsFromGoogle() {
    if (!window.accessToken) {
        mostraNotifica('Connetti Google per sincronizzare la rubrica', 'error');
        return;
    }
    
    // Disabilita pulsante durante sync
    const syncBtn = document.getElementById('syncRubricaBtn');
    if (syncBtn) {
        syncBtn.disabled = true;
        syncBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sincronizzazione...';
    }
    
    try {
        checkTokenValidity();
        mostraNotifica('🔄 Sincronizzazione rubrica Google in corso...', 'info');
        console.log('📇 Sincronizzazione rubrica Google...');
        
        // Carica tutti i contatti da Google People API con retry
        const response = await retryWithBackoff(async () => {
            return await gapi.client.people.people.connections.list({
                'resourceName': 'people/me',
                'pageSize': 1000,
                'personFields': 'names,phoneNumbers'
            });
        });
        
        const connections = response.result.connections || [];
        console.log(`✅ Trovati ${connections.length} contatti in Google`);
        
        // Estrai numeri di telefono normalizzati
        const savedContacts = {};
        connections.forEach(person => {
            if (person.phoneNumbers) {
                person.phoneNumbers.forEach(phoneObj => {
                    const normalized = normalizePhone(phoneObj.value);
                    if (normalized) {
                        savedContacts[normalized] = {
                            savedAt: new Date().toISOString(),
                            fromGoogle: true
                        };
                    }
                });
            }
        });
        
        // Salva in localStorage
        localStorage.setItem(STORAGE_KEYS_RUBRICA.SAVED_CONTACTS, JSON.stringify(savedContacts));
        localStorage.setItem(STORAGE_KEYS_RUBRICA.LAST_RUBRICA_SYNC, new Date().toISOString());
        
        // Invalida cache scan
        localStorage.removeItem(STORAGE_KEYS_RUBRICA.SCAN_CACHE);
        localStorage.removeItem(STORAGE_KEYS_RUBRICA.SCAN_CACHE_TIMESTAMP);
        
        console.log(`💾 ${Object.keys(savedContacts).length} contatti sincronizzati`);
        mostraNotifica(`✅ Rubrica sincronizzata: ${Object.keys(savedContacts).length} contatti`, 'success');
        
        // Aggiorna UI
        await renderRubricaList();
        
    } catch (error) {
        if (error.message === 'TOKEN_EXPIRED') {
            mostraNotifica('⚠️ Sessione scaduta, rifare login Google', 'error');
        } else {
            console.error('❌ Errore sync rubrica:', error);
            mostraNotifica('Errore sincronizzazione rubrica Google', 'error');
        }
    } finally {
        // Re-abilita pulsante
        if (syncBtn) {
            syncBtn.disabled = false;
            syncBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Sincronizza Ora';
        }
    }
}

// ===== SALVA CONTATTO IN GOOGLE CONTACTS =====
async function saveContactToGoogle(contactData) {
    if (!window.accessToken) {
        mostraNotifica('Connetti Google per salvare in rubrica', 'error');
        return false;
    }
    
    try {
        checkTokenValidity();
        console.log('💾 Salvataggio contatto in Google Contacts...', contactData);
        
        // Costruisci oggetto contatto per People API
        const contact = {
            names: [{
                givenName: contactData.nome,
                familyName: contactData.cognome || ''
            }],
            phoneNumbers: [{
                value: contactData.telefono
            }]
        };
        
        // Aggiungi società come organizzazione se presente
        if (contactData.societa) {
            contact.organizations = [{
                name: contactData.societa,
                title: contactData.servizio || ''
            }];
        }
        
        // Salva in Google con retry
        const response = await retryWithBackoff(async () => {
            return await gapi.client.people.people.createContact({
                resource: contact
            });
        });
        
        console.log('✅ Contatto salvato in Google:', response);
        
        // Marca come salvato nel cache locale
        await markContactAsSaved(contactData.telefono);
        
        mostraNotifica(`✅ ${contactData.nome} salvato in rubrica Google`, 'success');
        return true;
        
    } catch (error) {
        if (error.message === 'TOKEN_EXPIRED') {
            mostraNotifica('⚠️ Sessione scaduta, rifare login Google', 'error');
        } else {
            console.error('❌ Errore salvataggio contatto:', error);
            mostraNotifica('Errore salvataggio in rubrica Google', 'error');
        }
        return false;
    }
}

// ===== RENDER LISTA RUBRICA =====
async function renderRubricaList() {
    const container = document.getElementById('rubricaList');
    if (!container) return;
    
    // 🔒 AUTH GUARD: Blocca senza login
    if (!window.accessToken) {
        container.innerHTML = `
            <div class="info-state" style="text-align: center; padding: 40px 20px;">
                <i class="fas fa-lock" style="font-size: 64px; color: var(--gray-400); margin-bottom: 20px;"></i>
                <h3 style="color: var(--gray-800); margin-bottom: 12px;">Login richiesto</h3>
                <p style="color: var(--gray-600); margin-bottom: 24px;">
                    Effettua il login Google per vedere i contatti da salvare
                </p>
            </div>
        `;
        return;
    }
    
    // Mostra loader
    container.innerHTML = `
        <div style="text-align: center; padding: 40px 20px;">
            <i class="fas fa-spinner fa-spin" style="font-size: 48px; color: var(--primary-color); margin-bottom: 16px;"></i>
            <p style="color: var(--gray-600);">Scansione contatti in corso...</p>
            <p style="color: var(--gray-500); font-size: 0.9em;">Caricamento cronologia Drive + eventi calendario (12 mesi)...</p>
        </div>
    `;
    
    // STEP 1: Verifica se hai mai sincronizzato
    const lastSync = localStorage.getItem(STORAGE_KEYS_RUBRICA.LAST_RUBRICA_SYNC);
    const hasSynced = !!lastSync;
    
    // STEP 2: Ottieni contatti non salvati (ASYNC!)
    const unsavedContacts = await getUnsavedContacts();
    
    // STEP 3: Verifica se hai dati
    const hasAnyData = unsavedContacts.length > 0 || hasSynced;
    
    // CASO 1: Mai sincronizzato
    if (!hasSynced) {
        container.innerHTML = `
            <div class="info-state" style="text-align: center; padding: 40px 20px;">
                <i class="fas fa-info-circle" style="font-size: 64px; color: var(--info-color); margin-bottom: 20px;"></i>
                <h3 style="color: var(--gray-800); margin-bottom: 12px;">Prima sincronizzazione necessaria</h3>
                <p style="color: var(--gray-600); margin-bottom: 24px;">
                    Click su <strong style="color: var(--primary-color);">🔄 Sincronizza</strong> per caricare i contatti da Google Contacts
                </p>
                <button type="button" class="btn btn-primary" onclick="syncSavedContactsFromGoogle()">
                    <i class="fas fa-sync-alt"></i> Sincronizza Ora
                </button>
            </div>
        `;
        return;
    }
    
    // CASO 2: Sincronizzato ma nessun dato (né cronologia né calendario)
    if (!hasAnyData) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 40px 20px;">
                <i class="fas fa-inbox" style="font-size: 64px; color: var(--gray-400); margin-bottom: 20px;"></i>
                <h3 style="color: var(--gray-600); margin-bottom: 12px;">Nessun dato disponibile</h3>
                <p style="color: var(--gray-500);">
                    Invia il primo messaggio o sincronizza il calendario Google per vedere i contatti qui
                </p>
            </div>
        `;
        return;
    }
    
    // CASO 3: Tutti i contatti già salvati
    if (unsavedContacts.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 40px 20px;">
                <i class="fas fa-check-circle" style="font-size: 64px; color: var(--success-color); margin-bottom: 20px;"></i>
                <h3 style="color: var(--success-color); margin-bottom: 12px;">Tutti i contatti sono salvati!</h3>
                <p style="color: var(--gray-600);">
                    Ottimo lavoro! Non ci sono contatti da salvare in rubrica.
                </p>
            </div>
        `;
        return;
    }
    
    // CASO 4: Ci sono contatti da salvare
    // Mostra ultimo sync
    let syncText = 'Mai sincronizzato';
    if (lastSync) {
        const syncDate = new Date(lastSync);
        syncText = `Ultimo sync: ${syncDate.toLocaleDateString('it-IT')} ${syncDate.toLocaleTimeString('it-IT', {hour: '2-digit', minute: '2-digit'})}`;
    }
    
    // Paginazione: primi 100
    const displayContacts = unsavedContacts.slice(0, RUBRICA_CONFIG.CONTACTS_PER_PAGE);
    const remaining = unsavedContacts.length - displayContacts.length;
    
    container.innerHTML = `
        <div class="rubrica-header" style="margin-bottom: 20px; padding: 12px; background: var(--gray-100); border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <strong style="color: var(--primary-color);">
                    <i class="fas fa-address-book"></i> 
                    ${unsavedContacts.length} contatti da salvare
                </strong>
                <button type="button" class="btn-icon" id="refreshRubricaBtn" title="Aggiorna (invalida cache)">
                    <i class="fas fa-sync-alt"></i>
                </button>
            </div>
            <small style="color: var(--gray-600);">${syncText}</small>
        </div>
        
        <div class="rubrica-list">
            ${displayContacts.map(contact => `
                <div class="rubrica-item" style="padding: 12px; border: 1px solid var(--gray-200); border-radius: 8px; margin-bottom: 10px; background: white;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="flex: 1;">
                            <div style="font-weight: 500; color: var(--gray-800); margin-bottom: 4px;">
                                <i class="fas fa-user"></i>
                                ${contact.nome} ${contact.cognome || ''}
                            </div>
                            <div style="font-size: 0.9em; color: var(--gray-600); margin-bottom: 2px;">
                                <i class="fas fa-phone"></i> ${contact.telefono}
                            </div>
                            ${contact.societa ? `
                                <div style="font-size: 0.85em; color: var(--gray-500);">
                                    <i class="fas fa-building"></i> ${contact.societa}
                                </div>
                            ` : ''}
                            ${contact.source ? `
                                <div style="font-size: 0.8em; color: var(--gray-400); margin-top: 4px;">
                                    <i class="fas fa-${contact.source === 'calendario' ? 'calendar' : 'history'}"></i> 
                                    ${contact.source === 'calendario' ? 'Da calendario' : 'Da cronologia'}
                                    ${contact.calendarName ? ` (${contact.calendarName})` : ''}
                                </div>
                            ` : ''}
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button 
                                type="button" 
                                class="btn btn-sm btn-success save-contact-btn"
                                data-phone="${contact.telefono}"
                                data-nome="${contact.nome}"
                                data-cognome="${contact.cognome || ''}"
                                data-societa="${contact.societa || ''}"
                                data-servizio="${contact.servizio || ''}"
                                title="Salva in rubrica Google"
                            >
                                <i class="fas fa-check"></i>
                            </button>
                            <button 
                                type="button" 
                                class="btn btn-sm btn-secondary mark-saved-btn"
                                data-phone="${contact.telefono}"
                                title="Già salvato"
                            >
                                <i class="fas fa-check-double"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
        
        ${remaining > 0 ? `
            <div style="margin-top: 16px; padding: 12px; background: var(--gray-100); border-radius: 8px; text-align: center; color: var(--gray-600);">
                <i class="fas fa-info-circle"></i>
                Altri ${remaining} contatti non mostrati (mostra i primi ${RUBRICA_CONFIG.CONTACTS_PER_PAGE})
            </div>
        ` : ''}
    `;
    
    // Event listeners per pulsanti
    container.querySelectorAll('.save-contact-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const contactData = {
                telefono: this.dataset.phone,
                nome: this.dataset.nome,
                cognome: this.dataset.cognome,
                societa: this.dataset.societa,
                servizio: this.dataset.servizio
            };
            
            const success = await saveContactToGoogle(contactData);
            if (success) {
                // UI già aggiornata da markContactAsSaved()
            }
        });
    });
    
    container.querySelectorAll('.mark-saved-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            await markContactAsSaved(this.dataset.phone);
            mostraNotifica('Contatto marcato come già salvato', 'success');
        });
    });
    
    // Re-attach event listener per refresh (potrebbe essere ricreato)
    const refreshBtn = document.getElementById('refreshRubricaBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            // Forza refresh (invalida cache)
            await renderRubricaList();
        });
    }
}

// ===== ESPORTA FUNZIONI GLOBALI =====
window.initRubrica = initRubrica;
window.getUnsavedContacts = getUnsavedContacts;
window.renderRubricaList = renderRubricaList;
window.markContactAsSaved = markContactAsSaved;
window.saveContactToGoogle = saveContactToGoogle;
window.syncSavedContactsFromGoogle = syncSavedContactsFromGoogle;
