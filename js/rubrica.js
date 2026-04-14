/* ================================================================================
   RUBRICA - TESTmess v2.5.8
   
   Gestisce l'elenco dei contatti NON ancora salvati in rubrica Google.
   Mostra una sezione laterale con i nominativi da salvare.
   
   CHANGELOG v2.5.8:
   - 🐛 FIX CRITICO: mostraNotifica → showNotification (era undefined)
   - 🐛 FIX CRITICO: Export showNotification in main.js
   - ✅ Auto-logout forzato su errore 401 (token scaduto)
   - ✅ Messaggio notifica ora funziona correttamente
   
   CHANGELOG v2.5.6:
   - 🐛 FIX CRITICO: Corretto syncSavedContactsFromGoogle() - ora usa API corretta
   - 🐛 FIX CRITICO: markContactAsSaved() ora SALVA DAVVERO in Google Contacts
   - 🐛 FIX CRITICO: saveContactToGoogle() unificato con normalizzazione corretta
   - ✅ Spinner e disable pulsanti durante salvataggio (no doppio click)
   - ✅ Error handling specifico (401, 403, 409, 429, 500)
   - ✅ Cache ridotta a 10 minuti (era 1 ora)
   - ✅ Auto-refresh UI dopo ogni operazione
   
   CHANGELOG v2.3.1:
   - ✅ Auth Guard: Blocca tutti i dati senza login Google
   - ✅ Scan 12 mesi da Google Drive + Calendar API (non localStorage)
   - ✅ Rate limiting + retry logic con exponential backoff
   - ✅ Token validation prima di ogni chiamata API
   - ✅ Paginazione contatti (primi 100 + "mostra altri")
   - ✅ Disabilita pulsante durante scan (no doppio click)
   - ✅ Error handling robusto (fallback localStorage se Drive fail)
   ================================================================================ */

const STORAGE_KEYS_RUBRICA = {
    SAVED_CONTACTS: 'sgmess_saved_contacts', // Cache dei contatti già salvati
    LAST_RUBRICA_SYNC: 'sgmess_last_rubrica_sync',
    SCAN_CACHE: 'sgmess_rubrica_scan_cache', // Cache risultati scan
    SCAN_CACHE_TIMESTAMP: 'sgmess_rubrica_scan_timestamp',
    DATE_RANGE_START: 'sgmess_rubrica_date_start', // v2.5.22: Data inizio filtro
    DATE_RANGE_END: 'sgmess_rubrica_date_end' // v2.5.22: Data fine filtro
};

// Config
const RUBRICA_CONFIG = {
    MAX_CALENDARS: 10, // Max calendari da processare (tutti)
    MAX_EVENTS_PER_CALENDAR: 2500,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY_BASE: 1000, // ms
    CACHE_DURATION: 10 * 60 * 1000, // 10 minuti in ms (ridotto da 1 ora)
    CONTACTS_PER_PAGE: 100,
    DEFAULT_DAYS_BACK: 7, // v2.5.22: Default giorni indietro
    DEFAULT_DAYS_FORWARD: 10, // v2.5.22: Default giorni avanti
    MAX_DAYS_RANGE: 180 // v2.5.22: Max range selezionabile (90 + 90)
};

// Flag per prevenire doppi scan
let isScanningContacts = false;

// ===== INIZIALIZZAZIONE =====
function initRubrica() {
    console.log('📒 Rubrica module v2.5.26 initialized - Controllo incongruenze società + aggiornamento contatti');
    
    // Inizializza date picker con valori default
    initDateRangePicker();
    
    // Event listener per pulsante sincronizza rubrica
    const syncBtn = document.getElementById('syncRubricaBtn');
    if (syncBtn) {
        syncBtn.addEventListener('click', async () => {
            await syncSavedContactsFromGoogle();
        });
    }
    
    // Event listener per pulsante applica filtro date
    const applyFilterBtn = document.getElementById('applyDateFilterBtn');
    if (applyFilterBtn) {
        applyFilterBtn.addEventListener('click', async () => {
            await applyDateRangeFilter();
        });
    }
    
    // Event listener per cambio date (aggiorna contatore giorni)
    const dateStartInput = document.getElementById('rubricaDateStart');
    const dateEndInput = document.getElementById('rubricaDateEnd');
    
    if (dateStartInput && dateEndInput) {
        dateStartInput.addEventListener('change', updateDateRangeInfo);
        dateEndInput.addEventListener('change', updateDateRangeInfo);
    }
}

// ===== INIZIALIZZA DATE RANGE PICKER =====
function initDateRangePicker() {
    const dateStartInput = document.getElementById('rubricaDateStart');
    const dateEndInput = document.getElementById('rubricaDateEnd');
    
    if (!dateStartInput || !dateEndInput) return;
    
    // Leggi date salvate o usa default
    const savedStart = localStorage.getItem(STORAGE_KEYS_RUBRICA.DATE_RANGE_START);
    const savedEnd = localStorage.getItem(STORAGE_KEYS_RUBRICA.DATE_RANGE_END);
    
    const today = new Date();
    
    // Data inizio: oggi - 7 giorni (default ottimale per performance)
    const defaultStart = new Date(today);
    defaultStart.setDate(defaultStart.getDate() - RUBRICA_CONFIG.DEFAULT_DAYS_BACK);
    
    // Data fine: oggi + 10 giorni
    const defaultEnd = new Date(today);
    defaultEnd.setDate(defaultEnd.getDate() + RUBRICA_CONFIG.DEFAULT_DAYS_FORWARD);
    
    // Imposta valori (usa salvati se esistono, altrimenti default)
    dateStartInput.value = savedStart || defaultStart.toISOString().split('T')[0];
    dateEndInput.value = savedEnd || defaultEnd.toISOString().split('T')[0];
    
    // Imposta limiti min/max
    const minDate = new Date(today);
    minDate.setDate(minDate.getDate() - 90);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 90);
    
    dateStartInput.min = minDate.toISOString().split('T')[0];
    dateStartInput.max = maxDate.toISOString().split('T')[0];
    dateEndInput.min = minDate.toISOString().split('T')[0];
    dateEndInput.max = maxDate.toISOString().split('T')[0];
    
    // Aggiorna info range
    updateDateRangeInfo();
    
    console.log(`📅 Date picker inizializzato: ${dateStartInput.value} → ${dateEndInput.value}`);
}

// ===== AGGIORNA INFO RANGE GIORNI =====
function updateDateRangeInfo() {
    const dateStartInput = document.getElementById('rubricaDateStart');
    const dateEndInput = document.getElementById('rubricaDateEnd');
    const dateRangeDays = document.getElementById('dateRangeDays');
    
    if (!dateStartInput || !dateEndInput || !dateRangeDays) return;
    
    const start = new Date(dateStartInput.value);
    const end = new Date(dateEndInput.value);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        dateRangeDays.textContent = '0';
        return;
    }
    
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    dateRangeDays.textContent = diffDays;
    
    // Warning se range troppo grande
    if (diffDays > RUBRICA_CONFIG.MAX_DAYS_RANGE) {
        dateRangeDays.parentElement.style.color = 'var(--error-color)';
        dateRangeDays.parentElement.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Range troppo grande: ${diffDays} giorni (max ${RUBRICA_CONFIG.MAX_DAYS_RANGE})`;
    } else {
        dateRangeDays.parentElement.style.color = 'var(--gray-600)';
        dateRangeDays.parentElement.innerHTML = `<i class="fas fa-info-circle"></i> Range: <span id="dateRangeDays">${diffDays}</span> giorni`;
    }
}

// ===== APPLICA FILTRO DATE =====
async function applyDateRangeFilter() {
    const dateStartInput = document.getElementById('rubricaDateStart');
    const dateEndInput = document.getElementById('rubricaDateEnd');
    
    if (!dateStartInput || !dateEndInput) return;
    
    const start = new Date(dateStartInput.value);
    const end = new Date(dateEndInput.value);
    
    // Validazione
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        showNotification('⚠️ Seleziona date valide', 'error');
        return;
    }
    
    if (start > end) {
        showNotification('⚠️ Data inizio deve essere prima della data fine', 'error');
        return;
    }
    
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > RUBRICA_CONFIG.MAX_DAYS_RANGE) {
        showNotification(`⚠️ Range troppo grande (${diffDays} giorni, max ${RUBRICA_CONFIG.MAX_DAYS_RANGE})`, 'error');
        return;
    }
    
    // Salva date in localStorage
    localStorage.setItem(STORAGE_KEYS_RUBRICA.DATE_RANGE_START, dateStartInput.value);
    localStorage.setItem(STORAGE_KEYS_RUBRICA.DATE_RANGE_END, dateEndInput.value);
    
    console.log(`✅ Filtro applicato: ${dateStartInput.value} → ${dateEndInput.value} (${diffDays} giorni)`);
    showNotification(`✅ Filtro applicato: ${diffDays} giorni`, 'success');
    
    // Ricarica contatti con nuovo filtro
    await renderRubricaList();
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
            const parsed = JSON.parse(cachedData);
            // v2.5.23: Supporta vecchio formato (array) e nuovo (object con unsaved/toUpdate)
            if (Array.isArray(parsed)) {
                return { unsaved: parsed, toUpdate: [] }; // Vecchio formato
            }
            return parsed; // Nuovo formato
        }
    }
    
    isScanningContacts = true;
    
    try {
        // 1. Carica cronologia messaggi DA GOOGLE DRIVE (con fallback localStorage)
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
                    if (window.showNotification) {
                        showNotification('⚠️ Sessione scaduta, rifare login Google', 'error');
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
        } else {
            // 🔥 FIX v2.5.14: Se non loggato, usa localStorage comunque
            const localCronologia = localStorage.getItem(STORAGE_KEYS.CRONOLOGIA);
            if (localCronologia) {
                cronologia = JSON.parse(localCronologia);
                console.log(`📂 Caricati ${cronologia.length} messaggi da localStorage (offline)`);
            }
        }
        
        // 2. Carica TUTTI gli eventi calendario degli ultimi 12 mesi DA GOOGLE CALENDAR API
        let calendarEvents = [];
        if (window.accessToken && window.gapi && window.gapi.client && window.gapi.client.calendar) {
            try {
                checkTokenValidity();
                
                // v2.5.22: Usa date range da localStorage o default
                const savedStart = localStorage.getItem(STORAGE_KEYS_RUBRICA.DATE_RANGE_START);
                const savedEnd = localStorage.getItem(STORAGE_KEYS_RUBRICA.DATE_RANGE_END);
                
                let timeMin, timeMax;
                
                if (savedStart && savedEnd) {
                    // Usa range salvato
                    timeMin = new Date(savedStart).toISOString();
                    timeMax = new Date(savedEnd + 'T23:59:59').toISOString(); // Fine giornata
                    console.log(`📅 Caricamento eventi calendario con filtro: ${savedStart} → ${savedEnd}`);
                } else {
                    // Fallback: oggi - 7 giorni → oggi + 10 giorni
                    const now = new Date();
                    const startDate = new Date();
                    startDate.setDate(startDate.getDate() - RUBRICA_CONFIG.DEFAULT_DAYS_BACK);
                    const endDate = new Date();
                    endDate.setDate(endDate.getDate() + RUBRICA_CONFIG.DEFAULT_DAYS_FORWARD);
                    
                    timeMin = startDate.toISOString();
                    timeMax = endDate.toISOString();
                    console.log(`📅 Caricamento eventi calendario (default range: -${RUBRICA_CONFIG.DEFAULT_DAYS_BACK} / +${RUBRICA_CONFIG.DEFAULT_DAYS_FORWARD} giorni)`);
                }
                
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
                    if (window.showNotification) {
                        showNotification('⚠️ Sessione scaduta, rifare login Google', 'error');
                    }
                    return [];
                }
                console.error('❌ Errore caricamento eventi calendario:', e);
            }
        }
        
        // 3. Carica cache contatti salvati E crea Map per O(1) lookup
        const savedContactsJSON = localStorage.getItem(STORAGE_KEYS_RUBRICA.SAVED_CONTACTS);
        let savedContacts = {};
        const savedNumbersSet = new Set(); // v2.5.22: Set per confronto veloce
        
        if (savedContactsJSON) {
            try {
                savedContacts = JSON.parse(savedContactsJSON);
                // Popola Set con numeri normalizzati per confronto
                Object.keys(savedContacts).forEach(phone => {
                    const normalized = normalizeForComparison(phone);
                    if (normalized) savedNumbersSet.add(normalized);
                });
                console.log(`📞 Caricati ${savedNumbersSet.size} numeri già salvati (Set per confronto veloce)`);
            } catch (e) {
                console.error('❌ Errore parsing saved contacts:', e);
            }
        }
        
        // 4. Estrai contatti unici dalla cronologia
        const uniqueContacts = {};
        const contactsToUpdate = {}; // v2.5.23: NUOVO - contatti con incongruenze
        
        cronologia.forEach(entry => {
            const phone = normalizePhone(entry.telefono);
            if (!phone) return; // Skip se non c'è telefono
            
            // v2.5.22: Usa normalizeForComparison per check duplicati (+39 agnostic)
            const phoneForComparison = normalizeForComparison(phone);
            const isDuplicate = savedNumbersSet.has(phoneForComparison);
            
            // Se non è già salvato E non è già nella lista
            if (!isDuplicate && !uniqueContacts[phoneForComparison]) {
                uniqueContacts[phoneForComparison] = {
                    nome: entry.nome || '',
                    cognome: entry.cognome || '',
                    telefono: entry.telefono,
                    societa: entry.societa || '',
                    servizio: entry.servizio || '',
                    timestamp: entry.timestamp || new Date().toISOString(),
                    source: 'cronologia'
                };
            }
            // v2.5.23: NUOVO - Se è già salvato, verifica incongruenze società
            else if (isDuplicate) {
                const savedContact = savedContacts[phone] || savedContacts[phoneForComparison];
                if (savedContact && savedContact.societa !== undefined) {
                    const updateCheck = needsSocietaUpdate(savedContact.societa, entry.societa);
                    if (updateCheck.needsUpdate) {
                        contactsToUpdate[phoneForComparison] = {
                            nome: entry.nome || savedContact.nome || '',
                            cognome: entry.cognome || '',
                            telefono: entry.telefono,
                            societaSalvata: savedContact.societa || '',
                            societaEvento: entry.societa || '',
                            servizio: entry.servizio || '',
                            timestamp: entry.timestamp || new Date().toISOString(),
                            source: 'cronologia',
                            updateReason: updateCheck.reason,
                            updatePriority: updateCheck.priority,
                            resourceName: savedContact.resourceName // Per update Google
                        };
                    }
                }
            }
        });
        
        // 5. Estrai contatti dagli eventi calendario
        calendarEvents.forEach(event => {
            // Estrai dati dall'evento
            const contactData = extractContactFromEvent(event);
            if (!contactData) return; // Skip se non riesce a estrarre
            
            const phone = normalizePhone(contactData.telefono);
            if (!phone) return; // Skip se non c'è telefono
            
            // v2.5.22: Usa normalizeForComparison per check duplicati (+39 agnostic)
            const phoneForComparison = normalizeForComparison(phone);
            const isDuplicate = savedNumbersSet.has(phoneForComparison);
            
            // Se non è già salvato E non è già nella lista
            if (!isDuplicate && !uniqueContacts[phoneForComparison]) {
                uniqueContacts[phoneForComparison] = {
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
            // v2.5.23: NUOVO - Se è già salvato, verifica incongruenze società
            else if (isDuplicate && !contactsToUpdate[phoneForComparison]) { // Evita duplicati cronologia
                const savedContact = savedContacts[phone] || savedContacts[phoneForComparison];
                if (savedContact && savedContact.societa !== undefined) {
                    const updateCheck = needsSocietaUpdate(savedContact.societa, contactData.societa);
                    if (updateCheck.needsUpdate) {
                        contactsToUpdate[phoneForComparison] = {
                            nome: contactData.nome || savedContact.nome || '',
                            cognome: contactData.cognome || '',
                            telefono: contactData.telefono,
                            societaSalvata: savedContact.societa || '',
                            societaEvento: contactData.societa || '',
                            servizio: contactData.servizio || '',
                            timestamp: event.start || new Date().toISOString(),
                            source: 'calendario',
                            calendarName: event.calendarName || '',
                            updateReason: updateCheck.reason,
                            updatePriority: updateCheck.priority,
                            resourceName: savedContact.resourceName // Per update Google
                        };
                    }
                }
            }
        });
        
        // 6. Converti in array e ordina per timestamp (più recenti prima)
        const unsavedArray = Object.values(uniqueContacts);
        unsavedArray.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // v2.5.23: Ordina contatti da aggiornare per priorità
        const toUpdateArray = Object.values(contactsToUpdate);
        const priorityOrder = { 'ALTA': 1, 'MEDIA': 2, 'BASSA': 3 };
        toUpdateArray.sort((a, b) => {
            const priorityDiff = priorityOrder[a.updatePriority] - priorityOrder[b.updatePriority];
            if (priorityDiff !== 0) return priorityDiff;
            return new Date(b.timestamp) - new Date(a.timestamp);
        });
        
        // Salva in cache (ENTRAMBE le liste)
        const cacheData = {
            unsaved: unsavedArray,
            toUpdate: toUpdateArray // v2.5.23: NUOVO
        };
        localStorage.setItem(STORAGE_KEYS_RUBRICA.SCAN_CACHE, JSON.stringify(cacheData));
        localStorage.setItem(STORAGE_KEYS_RUBRICA.SCAN_CACHE_TIMESTAMP, Date.now().toString());
        
        console.log('═════════════════════════════════════════════════');
        console.log(`📒 RUBRICA SCAN COMPLETO (v2.5.23):`);
        console.log(`   📂 Cronologia Drive: ${cronologia.length} messaggi`);
        console.log(`   📅 Eventi Calendario: ${calendarEvents.length} eventi`);
        console.log(`   🆕 Contatti da salvare: ${unsavedArray.length}`);
        console.log(`   ⚠️ Contatti da aggiornare: ${toUpdateArray.length}`);
        if (toUpdateArray.length > 0) {
            console.log(`      - Priorità ALTA: ${toUpdateArray.filter(c => c.updatePriority === 'ALTA').length}`);
            console.log(`      - Priorità MEDIA: ${toUpdateArray.filter(c => c.updatePriority === 'MEDIA').length}`);
            console.log(`      - Priorità BASSA: ${toUpdateArray.filter(c => c.updatePriority === 'BASSA').length}`);
        }
        console.log('═════════════════════════════════════════════════');
        
        // v2.5.23: Restituisci ENTRAMBE le liste
        return {
            unsaved: unsavedArray,
            toUpdate: toUpdateArray
        };
        
    } finally {
        isScanningContacts = false;
    }
}

// ===== HELPER: CAPITALIZZA NOME =====
function capitalizeNome(text) {
    if (!text) return '';
    // Capitalizza ogni parola (Mario Rossi, De Luca, etc)
    return text.toLowerCase().split(' ').map(word => {
        if (word.length === 0) return word;
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
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
    
    // 🔴 FIX v2.5.10: Rimuovi description/note dal nome (es: "Nome: Note" → "Nome")
    nameText = nameText.split(':')[0].trim(); // Prendi solo la parte prima di ":"
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
    
    // 4. Determina società e servizio usando la funzione condivisa
    if (window.extractServiceFromEvent) {
        const serviceData = window.extractServiceFromEvent(event);
        servizio = serviceData.servizio;
        societa = serviceData.societa;
    } else {
        // Fallback se funzione non disponibile (non dovrebbe mai succedere)
        if (event.calendarName) {
            if (event.calendarName.includes('Stock Gain') || event.calendarName.includes('SG')) {
                societa = 'SG - Lead';
                if (!servizio) servizio = 'Stock Gain';
            } else if (event.calendarName.includes('Finanza Efficace') || event.calendarName.includes('FE')) {
                societa = 'FE - Lead';
                if (!servizio) servizio = 'Finanza Efficace';
            }
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
            nome: capitalizeNome(nome),
            cognome: capitalizeNome(cognome),
            telefono,
            servizio,
            societa
        };
    }
    
    return null;
}

// ===== NORMALIZZA NUMERO TELEFONO (UNIFICATO) =====
function normalizePhone(phone) {
    if (!phone) return null;
    
    // Rimuovi TUTTI i caratteri non numerici (spazi, +, -, (, ), ecc)
    let cleaned = phone.replace(/[^\d]/g, '');
    
    // Rimuovi prefisso 00 se presente (es: 00393331234567 → 393331234567)
    if (cleaned.startsWith('00')) {
        cleaned = cleaned.substring(2);
    }
    
    // Se ha 10 cifre e inizia con 3, aggiungi prefisso Italia 39
    if (cleaned.length === 10 && cleaned.startsWith('3')) {
        cleaned = '39' + cleaned;
    }
    
    // Valida lunghezza finale (minimo 10 cifre)
    return cleaned.length >= 10 ? cleaned : null;
}

// ===== NORMALIZZA PER CONFRONTO DUPLICATI (v2.5.22) =====
// Rimuove prefisso +39 in modo che +393331234567 === 3331234567
function normalizeForComparison(phone) {
    if (!phone) return null;
    
    // Rimuovi tutti i caratteri non numerici
    let cleaned = phone.replace(/[^\d]/g, '');
    
    // Rimuovi prefisso 00 se presente
    if (cleaned.startsWith('00')) {
        cleaned = cleaned.substring(2);
    }
    
    // CRITICO: Rimuovi prefisso 39 per confronto locale
    // +393331234567 → 3331234567
    // 393331234567 → 3331234567
    if (cleaned.startsWith('39') && cleaned.length > 10) {
        cleaned = cleaned.substring(2);
    }
    
    // Valida lunghezza (minimo 9 cifre dopo rimozione prefisso)
    return cleaned.length >= 9 ? cleaned : null;
}

// ===== FORMATTA TELEFONO PER GOOGLE (con +) =====
function formatPhoneForGoogle(phone) {
    const normalized = normalizePhone(phone);
    if (!normalized) return null;
    
    // Aggiungi + se non c'è già
    return normalized.startsWith('+') ? normalized : '+' + normalized;
}

// ===== VERIFICA INCONGRUENZA SOCIETÀ (v2.5.23) =====
// Restituisce {needsUpdate: bool, reason: string, priority: string}
function needsSocietaUpdate(savedSocieta, eventSocieta) {
    const saved = (savedSocieta || '').trim();
    const event = (eventSocieta || '').trim();
    
    // 1. Se rubrica è vuota → SERVE UPDATE
    if (!saved || saved === '') {
        return { 
            needsUpdate: true, 
            reason: 'Campo società vuoto', 
            priority: 'MEDIA',
            savedValue: '(vuoto)',
            eventValue: event || '(nessuna info)'
        };
    }
    
    // 2. Formati vecchi (Stock Gain, Finanza Efficace)
    const oldFormats = ['Stock Gain', 'Finanza Efficace', 'stock gain', 'finanza efficace', 'STOCK GAIN', 'FINANZA EFFICACE'];
    if (oldFormats.some(old => saved.toLowerCase() === old.toLowerCase())) {
        return { 
            needsUpdate: true, 
            reason: 'Formato vecchio (pre-2024)', 
            priority: 'MEDIA',
            savedValue: saved,
            eventValue: event || 'SG - Lead / FE - Lead'
        };
    }
    
    // 3. Refusi comuni (senza trattino, maiuscolo sbagliato, etc)
    const refusi = [
        'SG Lead', 'SG lead', 'sg lead', 'sg - lead',
        'FE Lead', 'FE lead', 'fe lead', 'fe - lead',
        'SG-Lead', 'FE-Lead', 'Sg - Lead', 'Fe - Lead'
    ];
    if (refusi.some(refuso => saved === refuso)) {
        return { 
            needsUpdate: true, 
            reason: 'Refuso formato (maiuscolo/trattino)', 
            priority: 'BASSA',
            savedValue: saved,
            eventValue: event
        };
    }
    
    // 4. Verifica servizio diverso (SG vs FE) → PRIORITÀ ALTA
    const savedService = saved.includes('SG') ? 'SG' : saved.includes('FE') ? 'FE' : null;
    const eventService = event.includes('SG') ? 'SG' : event.includes('FE') ? 'FE' : null;
    
    if (savedService && eventService && savedService !== eventService) {
        return { 
            needsUpdate: true, 
            reason: `⚠️ SERVIZIO DIVERSO: ${savedService} ≠ ${eventService}`, 
            priority: 'ALTA',
            savedValue: saved,
            eventValue: event
        };
    }
    
    // 5. Società generica vs specifica
    const genericFormats = ['SG - Lead', 'FE - Lead'];
    const isGenericSaved = genericFormats.includes(saved);
    const isGenericEvent = genericFormats.includes(event);
    
    if (isGenericSaved && !isGenericEvent && event) {
        return { 
            needsUpdate: true, 
            reason: 'Disponibile versione più specifica', 
            priority: 'BASSA',
            savedValue: saved + ' (generico)',
            eventValue: event + ' (specifico)'
        };
    }
    
    // 6. Formato non riconosciuto (text random)
    const validPatterns = ['SG', 'FE', 'Stock', 'Finanza'];
    const hasValidPattern = validPatterns.some(pattern => saved.includes(pattern));
    
    if (!hasValidPattern && event) {
        return { 
            needsUpdate: true, 
            reason: 'Formato non riconosciuto (testo casuale)', 
            priority: 'ALTA',
            savedValue: saved,
            eventValue: event
        };
    }
    
    // 7. Tutto OK
    return { needsUpdate: false };
}

// ===== MARCA CONTATTO COME GIÀ SALVATO (SENZA SALVARE IN GOOGLE) =====
// Questa funzione NON salva in Google, solo marca nel cache locale
async function markContactAsAlreadySaved(phone) {
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
        savedAt: new Date().toISOString(),
        manuallyMarked: true // Flag per distinguere da sync Google
    };
    
    // Salva
    localStorage.setItem(STORAGE_KEYS_RUBRICA.SAVED_CONTACTS, JSON.stringify(savedContacts));
    console.log(`✅ Contatto ${normalized} marcato come già salvato (solo cache locale)`);
    
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

// ===== SINCRONIZZA CON GOOGLE CONTACTS (API CORRETTA) =====
async function syncSavedContactsFromGoogle() {
    if (!window.accessToken) {
        showNotification('Connetti Google per sincronizzare la rubrica', 'error');
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
        showNotification('🔄 Sincronizzazione rubrica Google in corso...', 'info');
        console.log('📇 Sincronizzazione rubrica Google...');
        
        // ✅ CORRETTO: Usa gapi.client.request con URL diretto
        // API: https://people.googleapis.com/v1/people/me/connections
        // v2.5.23: Aggiungi organizations per controllo società
        const response = await retryWithBackoff(async () => {
            return await gapi.client.request({
                'path': 'https://people.googleapis.com/v1/people/me/connections',
                'method': 'GET',
                'params': {
                    'resourceName': 'people/me',
                    'pageSize': 1000,
                    'personFields': 'names,phoneNumbers,organizations' // ✅ AGGIUNTO organizations
                }
            });
        });
        
        const connections = response.result.connections || [];
        console.log(`✅ Trovati ${connections.length} contatti in Google`);
        
        // Estrai numeri di telefono normalizzati + società
        const savedContacts = {};
        connections.forEach(person => {
            if (person.phoneNumbers) {
                // Estrai società (organization)
                let societa = '';
                if (person.organizations && person.organizations.length > 0) {
                    societa = person.organizations[0].name || '';
                }
                
                // Estrai nome completo
                let nomeCompleto = '';
                if (person.names && person.names.length > 0) {
                    nomeCompleto = person.names[0].displayName || '';
                }
                
                person.phoneNumbers.forEach(phoneObj => {
                    const normalized = normalizePhone(phoneObj.value);
                    if (normalized) {
                        savedContacts[normalized] = {
                            savedAt: new Date().toISOString(),
                            fromGoogle: true,
                            societa: societa, // ✅ NUOVO: salva società
                            nome: nomeCompleto, // ✅ NUOVO: salva nome
                            resourceName: person.resourceName // ✅ NUOVO: per update
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
        showNotification(`✅ Rubrica sincronizzata: ${Object.keys(savedContacts).length} contatti`, 'success');
        
        // Aggiorna UI
        await renderRubricaList();
        
    } catch (error) {
        console.error('❌ Errore sync rubrica completo:', error);
        
        // Error handling specifico
        if (error.message === 'TOKEN_EXPIRED') {
            showNotification('⚠️ Sessione scaduta, rifare login Google', 'error');
            // Forza logout
            if (window.handleSignoutClick) {
                setTimeout(() => window.handleSignoutClick(), 1500);
            }
        } else if (error.status === 401) {
            showNotification('❌ Token scaduto - Rifare login', 'error');
            // Forza logout
            if (window.handleSignoutClick) {
                setTimeout(() => window.handleSignoutClick(), 1500);
            }
        } else if (error.status === 403) {
            showNotification('❌ ERRORE 403: Abilita People API su Google Cloud Console', 'error');
            console.error('🔴 ISTRUZIONI: https://console.cloud.google.com/apis/library/people.googleapis.com → ABILITA');
        } else if (error.status === 429) {
            showNotification('⏳ Troppi tentativi, riprova tra qualche minuto', 'error');
        } else {
            showNotification('❌ Errore sincronizzazione rubrica Google', 'error');
        }
    } finally {
        // Re-abilita pulsante
        if (syncBtn) {
            syncBtn.disabled = false;
            syncBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Sincronizza Ora';
        }
    }
}

// ===== SALVA CONTATTO IN GOOGLE CONTACTS (CORRETTO) =====
async function saveContactToGoogle(contactData) {
    if (!window.accessToken) {
        showNotification('Connetti Google per salvare in rubrica', 'error');
        return false;
    }
    
    try {
        checkTokenValidity();
        console.log('💾 Salvataggio contatto in Google Contacts...', contactData);
        
        // Normalizza e formatta telefono con prefisso +
        const formattedPhone = formatPhoneForGoogle(contactData.telefono);
        if (!formattedPhone) {
            showNotification('❌ Numero di telefono non valido', 'error');
            return false;
        }
        
        // Costruisci oggetto contatto per People API
        const contact = {
            names: [{
                givenName: contactData.nome,
                familyName: contactData.cognome || ''
            }],
            phoneNumbers: [{
                value: formattedPhone,
                type: 'mobile'
            }]
        };
        
        // Aggiungi società come organizzazione se presente
        if (contactData.societa) {
            contact.organizations = [{
                name: contactData.societa
                // NON aggiungere title (qualifica) - non serve
            }];
        }
        
        // ✅ CORRETTO: Usa gapi.client.request con URL diretto
        const response = await retryWithBackoff(async () => {
            return await gapi.client.request({
                'path': 'https://people.googleapis.com/v1/people:createContact',
                'method': 'POST',
                'body': contact
            });
        });
        
        console.log('✅ Contatto salvato in Google:', response);
        
        // Marca come salvato nel cache locale (DOPO conferma Google)
        const normalized = normalizePhone(contactData.telefono);
        const savedContactsJSON = localStorage.getItem(STORAGE_KEYS_RUBRICA.SAVED_CONTACTS);
        let savedContacts = {};
        if (savedContactsJSON) {
            try {
                savedContacts = JSON.parse(savedContactsJSON);
            } catch (e) {
                console.error('❌ Errore parsing saved contacts:', e);
            }
        }
        
        savedContacts[normalized] = {
            savedAt: new Date().toISOString(),
            fromGoogle: true
        };
        
        localStorage.setItem(STORAGE_KEYS_RUBRICA.SAVED_CONTACTS, JSON.stringify(savedContacts));
        
        // Invalida cache scan
        localStorage.removeItem(STORAGE_KEYS_RUBRICA.SCAN_CACHE);
        localStorage.removeItem(STORAGE_KEYS_RUBRICA.SCAN_CACHE_TIMESTAMP);
        
        showNotification(`✅ ${contactData.nome} salvato in rubrica Google`, 'success');
        
        // Aggiorna UI
        await renderRubricaList();
        
        return true;
        
    } catch (error) {
        console.error('❌ Errore salvataggio contatto completo:', error);
        
        // Error handling specifico
        if (error.message === 'TOKEN_EXPIRED') {
            showNotification('⚠️ Sessione scaduta, rifare login Google', 'error');
            // Forza logout
            if (window.handleSignoutClick) {
                setTimeout(() => window.handleSignoutClick(), 1500);
            }
        } else if (error.status === 401) {
            showNotification('❌ Token scaduto - Rifare login', 'error');
            // Forza logout
            if (window.handleSignoutClick) {
                setTimeout(() => window.handleSignoutClick(), 1500);
            }
        } else if (error.status === 403) {
            showNotification('❌ ERRORE 403: Devi abilitare le API su Google Cloud Console', 'error');
            console.error('🔴 ISTRUZIONI PER RISOLVERE 403:');
            console.error('1️⃣ Vai su: https://console.cloud.google.com/apis/library/people.googleapis.com');
            console.error('2️⃣ Clicca "ABILITA" sulla People API');
            console.error('3️⃣ Vai su: https://console.cloud.google.com/apis/library/sheets.googleapis.com');
            console.error('4️⃣ Clicca "ABILITA" sulla Sheets API');
            console.error('5️⃣ Vai su: https://console.cloud.google.com/apis/library/drive.googleapis.com');
            console.error('6️⃣ Clicca "ABILITA" sulla Drive API');
            console.error('7️⃣ Disconnetti e riconnetti Google su TESTmess');
            console.error('✅ Dopo questi passaggi, il salvataggio funzionerà!');
        } else if (error.status === 409) {
            showNotification('ℹ️ Contatto già esistente in rubrica', 'info');
            // Marca comunque come salvato nel cache locale
            await markContactAsAlreadySaved(contactData.telefono);
            return true; // Consideriamo successo
        } else if (error.status === 429) {
            showNotification('⏳ Troppi tentativi, riprova tra qualche minuto', 'error');
        } else {
            showNotification('❌ Errore salvataggio in rubrica Google', 'error');
        }
        return false;
    }
}


// ===== v2.5.23: HELPER per renderizzare contatto da aggiornare =====
function renderContactToUpdate(contact) {
    const priorityColors = {
        'ALTA': 'var(--error-color)',
        'MEDIA': 'var(--warning-color)',
        'BASSA': 'var(--info-color)'
    };
    const color = priorityColors[contact.updatePriority] || 'var(--gray-600)';
    
    return `
        <div class="rubrica-item" style="padding: 12px; border: 2px solid ${color}; border-radius: 8px; margin-bottom: 10px; background: white;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: var(--gray-800); margin-bottom: 6px;">
                        <i class="fas fa-user"></i>
                        ${contact.nome} ${contact.cognome || ''}
                    </div>
                    <div style="font-size: 0.9em; color: var(--gray-600); margin-bottom: 4px;">
                        <i class="fas fa-phone"></i> ${contact.telefono}
                    </div>
                    <div style="font-size: 0.85em; margin-top: 8px; padding: 8px; background: #f8f9fa; border-left: 3px solid ${color}; border-radius: 4px;">
                        <div style="font-weight: 500; color: ${color}; margin-bottom: 4px;">
                            <i class="fas fa-exclamation-circle"></i> ${contact.updateReason}
                        </div>
                        <div style="display: flex; gap: 16px; margin-top: 6px;">
                            <div style="flex: 1;">
                                <div style="font-size: 0.8em; color: var(--gray-500); margin-bottom: 2px;">In Rubrica:</div>
                                <div style="font-weight: 500; color: var(--error-color);">
                                    ❌ ${contact.societaSalvata || '(vuoto)'}
                                </div>
                            </div>
                            <div style="flex: 1;">
                                <div style="font-size: 0.8em; color: var(--gray-500); margin-bottom: 2px;">Nell'Evento:</div>
                                <div style="font-weight: 500; color: var(--success-color);">
                                    ✅ ${contact.societaEvento || '(nessuna info)'}
                                </div>
                            </div>
                        </div>
                    </div>
                    ${contact.source ? `
                        <div style="font-size: 0.8em; color: var(--gray-400); margin-top: 6px;">
                            <i class="fas fa-${contact.source === 'calendario' ? 'calendar' : 'history'}"></i> 
                            ${contact.source === 'calendario' ? 'Da calendario' : 'Da cronologia'}
                            ${contact.calendarName ? ` (${contact.calendarName})` : ''}
                        </div>
                    ` : ''}
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px; margin-left: 12px;">
                    <button 
                        type="button" 
                        class="btn btn-sm btn-success update-contact-btn"
                        data-phone="${contact.telefono}"
                        data-nome="${contact.nome}"
                        data-cognome="${contact.cognome || ''}"
                        data-societa="${contact.societaEvento || ''}"
                        data-servizio="${contact.servizio || ''}"
                        data-resource="${contact.resourceName || ''}"
                        title="Aggiorna con dati corretti"
                        style="white-space: nowrap;"
                    >
                        <i class="fas fa-sync"></i> Aggiorna
                    </button>
                    <button 
                        type="button" 
                        class="btn btn-sm btn-secondary ignore-update-btn"
                        data-phone="${contact.telefono}"
                        title="Ignora (lascia così)"
                        style="white-space: nowrap;"
                    >
                        <i class="fas fa-times"></i> Ignora
                    </button>
                </div>
            </div>
        </div>
    `;
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
    
    // STEP 2: Ottieni contatti (ASYNC!) - v2.5.23: ritorna {unsaved, toUpdate}
    const contactsData = await getUnsavedContacts();
    const unsavedContacts = contactsData.unsaved || [];
    const contactsToUpdate = contactsData.toUpdate || [];
    
    // STEP 3: Verifica se hai dati
    const hasAnyData = (unsavedContacts.length > 0 || contactsToUpdate.length > 0) || hasSynced;
    
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
    
    // Event listeners per pulsanti CON SPINNER E DISABLE
    container.querySelectorAll('.save-contact-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            // Previeni doppio click
            if (this.disabled) return;
            
            // Salva stato originale
            const originalHTML = this.innerHTML;
            
            // Disabilita e mostra spinner
            this.disabled = true;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            
            const contactData = {
                telefono: this.dataset.phone,
                nome: this.dataset.nome,
                cognome: this.dataset.cognome,
                societa: this.dataset.societa,
                servizio: this.dataset.servizio
            };
            
            const success = await saveContactToGoogle(contactData);
            
            if (!success) {
                // Ripristina pulsante solo se fallito
                this.disabled = false;
                this.innerHTML = originalHTML;
            }
            // Se successo, la UI viene aggiornata da renderRubricaList()
        });
    });
    
    container.querySelectorAll('.mark-saved-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            // Previeni doppio click
            if (this.disabled) return;
            
            // Salva stato originale
            const originalHTML = this.innerHTML;
            
            // Disabilita e mostra spinner
            this.disabled = true;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            
            await markContactAsAlreadySaved(this.dataset.phone);
            showNotification('✅ Contatto marcato come già salvato', 'success');
            
            // UI viene aggiornata da renderRubricaList()
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
window.markContactAsAlreadySaved = markContactAsAlreadySaved; // Rinominato
window.saveContactToGoogle = saveContactToGoogle;
window.syncSavedContactsFromGoogle = syncSavedContactsFromGoogle;
window.normalizePhone = normalizePhone;
window.formatPhoneForGoogle = formatPhoneForGoogle;
