/* ================================================================================
   GOOGLE CALENDAR SYNC - TESTmess v2.2.38
   
   CHANGELOG v2.2.38:
   - ✅ DROPDOWN HOME: Aggiunto filtro calendario nella sezione "Appuntamenti del Giorno"
   - ✅ SELEZIONE PERSISTENTE: Scelta calendario salvata in localStorage
   - ✅ FILTRO DINAMICO: Lead filtrati automaticamente per calendario selezionato
   - ✅ UX MIGLIORATA: Notifica quando si cambia filtro calendario
   
   CHANGELOG v2.2.37:
   - 🔧 FIX SINTASSI: Rimosso blocco try-catch duplicato (righe 261-269)
   - ✅ RISOLTO: Errore "Unexpected token '}'" che bloccava sync calendario
   - ✅ HAMBURGER MENU: Ora funziona correttamente (era bloccato dall'errore JS)
   
   CHANGELOG v2.2.29:
   - ✅ RANGE DATE PICKER: Sostituito "Carica Mesi Precedenti" con date picker custom
   - ✅ DEFAULT RANGE: Oggi + 14 giorni (modificabile)
   - ✅ FILTRO EVENTI "X": Esclusi automaticamente eventi con titolo "X"
   - ✅ CHECKBOX CALENDARI: Multi-select per filtrare quali calendari visualizzare
   - ✅ HOME/RUBRICA: Range fisso mese corrente + successivo (automatico)
   
   CHANGELOG v2.2.25:
   - ✅ EVENTI PASSATI: Carica ultimi 90 giorni + prossimi 30 giorni
   - ✅ MULTI-CALENDARIO AUTO: Tutti i calendari automaticamente (no hardcode)
   - ✅ INDICATORE CALENDARIO: Mostra "(Nome Calendario)" nel dropdown
   - ✅ FILTRO INTELLIGENTE: Solo calendari con pattern "SG -" o contenenti "Lead"
   - ✅ RANGE ESTESO: 120 giorni totali (90 passati + 30 futuri)
   
   CHANGELOG v2.2.2:
   - ✅ PULIZIA DROPDOWN: Rimossi metadati inutili (solo "HH:MM - Nome Cognome")
   - ✅ PARSING INTELLIGENTE: Separazione automatica Nome/Cognome con database nomi
   - ✅ AUTO-DETECT SERVIZIO: Estrae "SERVIZIO:" da description
   - ✅ AUTO-COMPILA SOCIETÀ: Stock Gain → SG - Lead, Finanza Efficace → FE - Lead
   ================================================================================ */

const STORAGE_KEYS_CALENDAR = {
    CALENDAR_EVENTS: 'sgmess_calendar_events',
    LAST_SYNC: 'sgmess_last_sync',
    CONTACTED_LEADS: 'sgmess_contacted_leads', // Lead a cui abbiamo già mandato messaggi
    LOADED_DAYS_BACK: 'sgmess_loaded_days_back', // Quanti giorni indietro abbiamo caricato
    SELECTED_CALENDARS: 'sgmess_selected_calendars', // Calendari selezionati per il filtro (sezione calendario)
    HOME_CALENDAR_FILTER: 'sgmess_home_calendar_filter', // Calendario selezionato nella home
    AVAILABLE_CALENDARS: 'sgmess_available_calendars' // Lista calendari disponibili (v2.5.7)
};

let calendarSyncInterval = null;
let isLoadingMoreEvents = false; // Flag per evitare chiamate multiple
let availableCalendars = []; // Lista calendari disponibili
let isFormProgrammaticUpdate = false; // v2.5.19: Flag per evitare re-trigger del listener selectDay

// ===== INIT CALENDAR SYNC =====
function initCalendarSync() {
    // Carica eventi salvati all'avvio
    loadSavedEvents();
    
    // Inizializza date picker con default (oggi + 14 giorni)
    initDateRangePicker();
    
    // Setup auto-refresh ogni 5 minuti quando autenticato
    if (calendarSyncInterval) {
        clearInterval(calendarSyncInterval);
    }
    
    calendarSyncInterval = setInterval(() => {
        if (window.accessToken) {
            syncCalendarEvents(true); // Silent sync
        }
    }, 5 * 60 * 1000); // 5 minuti
}

// ===== INIZIALIZZA DATE RANGE PICKER =====
function initDateRangePicker() {
    const startDateInput = document.getElementById('calendarStartDate');
    const endDateInput = document.getElementById('calendarEndDate');
    
    if (!startDateInput || !endDateInput) return;
    
    // Default: OGGI - 30 giorni (per vedere anche eventi passati recenti)
    const today = new Date();
    const pastDate = new Date();
    pastDate.setDate(today.getDate() - 30);
    const startDate = pastDate.toISOString().split('T')[0];
    
    // Default: oggi + 14 giorni
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + 14);
    const endDate = futureDate.toISOString().split('T')[0];
    
    startDateInput.value = startDate;
    endDateInput.value = endDate;
    
    console.log('📅 Date range picker inizializzato:', startDate, '→', endDate);
}

// ===== FILTRA EVENTO "X" =====
function shouldSkipEvent(event) {
    if (!event || !event.summary) return false;
    
    // Filtra eventi con titolo "X" (case-insensitive, trim)
    const title = event.summary.trim().toLowerCase();
    return title === 'x';
}

// ===== GET RANGE DATE DA HOME/RUBRICA (mese corrente + successivo) =====
function getHomeRubricaDateRange() {
    const today = new Date();
    
    // Inizio mese corrente
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Fine mese successivo (ultimo giorno)
    const endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    
    return {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
    };
}

// ===== SINCRONIZZA EVENTI =====
async function syncCalendarEvents(silent = false, loadMore = false) {
    if (!window.accessToken) {
        if (!silent) {
            showNotification('Connetti Google per sincronizzare il calendario', 'error');
        }
        return;
    }
    
    // Evita chiamate multiple simultanee
    if (isLoadingMoreEvents) {
        console.log('⏳ Caricamento già in corso, skip...');
        return;
    }
    
    isLoadingMoreEvents = true;
    
    try {
        if (!silent) {
            showNotification('🔄 Sincronizzazione calendario in corso...', 'info');
        }
        
        console.log('📅 Caricamento eventi calendario...');
        
        // VERIFICA che gapi.client.calendar sia inizializzato
        if (!gapi || !gapi.client || !gapi.client.calendar) {
            console.error('❌ GAPI Calendar non inizializzato');
            if (!silent) showNotification('Errore: Google Calendar API non disponibile', 'error');
            isLoadingMoreEvents = false;
            return;
        }
        
        // STEP 1: Carica tutti i calendari disponibili
        console.log('🔍 Caricamento lista calendari...');
        const calendarListResponse = await gapi.client.calendar.calendarList.list();
        const allCalendars = calendarListResponse.result.items || [];
        console.log(`✅ Trovati ${allCalendars.length} calendari totali`);
        
        // STEP 2: Usa TUTTI i calendari (rimosso filtro SG)
        // Prende tutti i calendari disponibili
        const targetCalendars = allCalendars;
        
        if (targetCalendars.length === 0) {
            console.warn('⚠️ Nessun calendario trovato');
            if (!silent) {
                showNotification('⚠️ Nessun calendario Google trovato', 'warning');
            }
            isLoadingMoreEvents = false;
            return;
        }
        
        console.log(`✅ Trovati ${targetCalendars.length} calendari:`, targetCalendars.map(c => c.summary));
        
        // Salva lista calendari disponibili globalmente
        availableCalendars = targetCalendars;
        
        // Salva calendari in localStorage per uso futuro (v2.5.7)
        localStorage.setItem(STORAGE_KEYS_CALENDAR.AVAILABLE_CALENDARS, JSON.stringify(targetCalendars));
        
        // Popola dropdown home con calendari
        populateHomeCalendarDropdown(targetCalendars);
        
        // STEP 3: Determina range temporale
        let timeMin, timeMax;
        
        // Se siamo nella sezione calendario, usa i date picker
        const startDateInput = document.getElementById('calendarStartDate');
        const endDateInput = document.getElementById('calendarEndDate');
        
        if (startDateInput && endDateInput && startDateInput.value && endDateInput.value) {
            // SEZIONE CALENDARIO: usa date picker custom
            timeMin = new Date(startDateInput.value + 'T00:00:00').toISOString();
            timeMax = new Date(endDateInput.value + 'T23:59:59').toISOString();
            console.log('📅 Range da date picker:', startDateInput.value, '→', endDateInput.value);
        } else {
            // HOME/RUBRICA: usa range fisso (ultimi 90 giorni + prossimi 90 giorni)
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 90);
            timeMin = pastDate.toISOString();
            
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 90);
            timeMax = futureDate.toISOString();
            console.log('📅 Range default (home/rubrica): -90gg → +90gg');
        }
        
        console.log('🔎 Richiesta eventi da', timeMin, 'a', timeMax);
        
        let allEvents = [];
        
        for (const calendar of targetCalendars) {
            console.log(`📥 Scaricamento eventi da: ${calendar.summary}`);
            
            const response = await gapi.client.calendar.events.list({
                'calendarId': calendar.id,
                'timeMin': timeMin,
                'timeMax': timeMax,
                'showDeleted': false,
                'singleEvents': true,
                'orderBy': 'startTime',
                'conferenceDataVersion': 1  // 🆕 v2.5.39: Richiedi conferenceData (per Meet)
                // 🆕 v2.5.39: extendedProperties.private viene sempre restituito automaticamente
            });
            
            const events = response.result.items || [];
            console.log(`  ✅ ${events.length} eventi trovati in "${calendar.summary}"`);
            
            // Aggiungi informazione calendario a ogni evento
            const eventsWithCalendar = events.map(event => ({
                ...event,
                calendarName: calendar.summary,
                calendarId: calendar.id
            }));
            
            allEvents = allEvents.concat(eventsWithCalendar);
        }
        
        console.log(`✅ Totale eventi ricevuti: ${allEvents.length}`);
        
        // STEP 4: Filtra eventi "X"
        const filteredEvents = allEvents.filter(event => !shouldSkipEvent(event));
        const skippedCount = allEvents.length - filteredEvents.length;
        if (skippedCount > 0) {
            console.log(`🚫 Filtrati ${skippedCount} eventi con titolo "X"`);
        }
        
        // Salva eventi in localStorage
        const eventsData = filteredEvents.map(event => ({
            id: event.id,
            summary: event.summary || 'Senza titolo',
            description: event.description || '',
            start: event.start.dateTime || event.start.date,
            end: event.end.dateTime || event.end.date,
            attendees: event.attendees || [],
            location: event.location || '',
            calendarName: event.calendarName,
            calendarId: event.calendarId,
            hangoutLink: event.hangoutLink || null,  // 🆕 v2.5.39: Salva Meet link legacy
            conferenceData: event.conferenceData || null,  // 🆕 v2.5.39: Salva conferenceData
            extendedProperties: event.extendedProperties || null  // 🆕 v2.5.39: Salva extendedProperties (incluso videocallMode)
        }));
        
        localStorage.setItem(STORAGE_KEYS_CALENDAR.CALENDAR_EVENTS, JSON.stringify(eventsData));
        localStorage.setItem(STORAGE_KEYS_CALENDAR.LAST_SYNC, new Date().toISOString());
        
        console.log('💾 Eventi salvati in localStorage');
        
        // Aggiorna UI
        updateDaySelector();
        updateLeadsList(); // Aggiorna lista lead per data corrente
        displayCalendarView(); // Aggiorna vista calendario
        
        if (!silent) {
            showNotification(`✅ ${filteredEvents.length} appuntamenti sincronizzati dai calendari SG`, 'success');
        }
        
        console.log(`✅ Sincronizzati ${filteredEvents.length} eventi dai calendari SG`);
        
        isLoadingMoreEvents = false;
        
    } catch (error) {
        console.error('❌ Errore sync calendario:', error);
        if (!silent) {
            showNotification('Errore sincronizzazione calendario', 'error');
        }
        isLoadingMoreEvents = false;
    }
}

// ===== RENDER CHECKBOX CALENDARI =====
function renderCalendarCheckboxes(calendars) {
    const container = document.getElementById('calendarFilterCheckboxes');
    if (!container) return;
    
    // Carica calendari selezionati da localStorage
    const selectedCalendarsJSON = localStorage.getItem(STORAGE_KEYS_CALENDAR.SELECTED_CALENDARS);
    let selectedCalendars = [];
    if (selectedCalendarsJSON) {
        try {
            selectedCalendars = JSON.parse(selectedCalendarsJSON);
        } catch (e) {
            selectedCalendars = [];
        }
    }
    
    // Se è il primo render, seleziona tutti i calendari di default
    if (selectedCalendars.length === 0) {
        selectedCalendars = calendars.map(c => c.id);
        localStorage.setItem(STORAGE_KEYS_CALENDAR.SELECTED_CALENDARS, JSON.stringify(selectedCalendars));
    }
    
    // Genera HTML checkbox
    let html = '';
    calendars.forEach(calendar => {
        const isChecked = selectedCalendars.includes(calendar.id);
        html += `
            <div style="margin-bottom: 8px;">
                <label style="display: flex; align-items: center; cursor: pointer;">
                    <input 
                        type="checkbox" 
                        class="calendar-checkbox" 
                        data-calendar-id="${calendar.id}"
                        ${isChecked ? 'checked' : ''}
                        style="margin-right: 8px;"
                    >
                    <span style="color: var(--gray-700);">${calendar.summary}</span>
                </label>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Event listeners per checkbox
    container.querySelectorAll('.calendar-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const calendarId = this.dataset.calendarId;
            
            // Aggiorna lista calendari selezionati
            let selectedCalendars = [];
            const savedJSON = localStorage.getItem(STORAGE_KEYS_CALENDAR.SELECTED_CALENDARS);
            if (savedJSON) {
                try {
                    selectedCalendars = JSON.parse(savedJSON);
                } catch (e) {
                    selectedCalendars = [];
                }
            }
            
            if (this.checked) {
                // Aggiungi calendario
                if (!selectedCalendars.includes(calendarId)) {
                    selectedCalendars.push(calendarId);
                }
            } else {
                // Rimuovi calendario
                selectedCalendars = selectedCalendars.filter(id => id !== calendarId);
            }
            
            // Salva
            localStorage.setItem(STORAGE_KEYS_CALENDAR.SELECTED_CALENDARS, JSON.stringify(selectedCalendars));
            
            // Aggiorna vista calendario
            displayCalendarView();
            
            console.log('📅 Calendari selezionati:', selectedCalendars.length);
        });
    });
}

// ===== GET CALENDARI SELEZIONATI =====
function getSelectedCalendars() {
    const selectedJSON = localStorage.getItem(STORAGE_KEYS_CALENDAR.SELECTED_CALENDARS);
    if (!selectedJSON) return [];
    
    try {
        return JSON.parse(selectedJSON);
    } catch (e) {
        return [];
    }
}

// ===== RENDER CHECKBOX CALENDARI =====
function renderCalendarCheckboxes(calendars) {
    const container = document.getElementById('calendarFilterCheckboxes');
    if (!container) return;
    
    // Carica selezione salvata
    const savedSelection = JSON.parse(localStorage.getItem(STORAGE_KEYS_CALENDAR.SELECTED_CALENDARS) || '[]');
    
    // Se prima volta, seleziona tutti
    const selectedCalendars = savedSelection.length > 0 ? savedSelection : calendars.map(c => c.id);
    
    let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
    
    calendars.forEach(calendar => {
        const isChecked = selectedCalendars.includes(calendar.id);
        html += `
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                <input 
                    type="checkbox" 
                    class="calendar-checkbox" 
                    data-calendar-id="${calendar.id}"
                    ${isChecked ? 'checked' : ''}
                    style="cursor: pointer;"
                >
                <span style="color: var(--gray-800);">${calendar.summary}</span>
            </label>
        `;
    });
    
    html += '</div>';
    
    container.innerHTML = html;
    
    // Event listeners per checkbox
    container.querySelectorAll('.calendar-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const calendarId = this.dataset.calendarId;
            const isChecked = this.checked;
            
            // Aggiorna selezione
            let selectedCalendars = JSON.parse(localStorage.getItem(STORAGE_KEYS_CALENDAR.SELECTED_CALENDARS) || '[]');
            
            if (isChecked && !selectedCalendars.includes(calendarId)) {
                selectedCalendars.push(calendarId);
            } else if (!isChecked) {
                selectedCalendars = selectedCalendars.filter(id => id !== calendarId);
            }
            
            localStorage.setItem(STORAGE_KEYS_CALENDAR.SELECTED_CALENDARS, JSON.stringify(selectedCalendars));
            
            // Aggiorna vista calendario
            displayCalendarView();
            
            console.log('📅 Calendari selezionati aggiornati:', selectedCalendars.length);
        });
    });
    
    // Salva selezione iniziale se prima volta
    if (savedSelection.length === 0) {
        localStorage.setItem(STORAGE_KEYS_CALENDAR.SELECTED_CALENDARS, JSON.stringify(selectedCalendars));
    }
}

// ===== GET EVENTI FILTRATI PER CALENDARIO =====
function getFilteredEventsByCalendar() {
    const allEvents = JSON.parse(localStorage.getItem(STORAGE_KEYS_CALENDAR.CALENDAR_EVENTS) || '[]');
    const selectedCalendars = JSON.parse(localStorage.getItem(STORAGE_KEYS_CALENDAR.SELECTED_CALENDARS) || '[]');
    
    // Se nessun calendario selezionato, mostra tutti
    if (selectedCalendars.length === 0) {
        return allEvents.filter(event => !shouldSkipEvent(event));
    }
    
    // Filtra per calendari selezionati + escludi "X"
    return allEvents.filter(event => {
        return selectedCalendars.includes(event.calendarId) && !shouldSkipEvent(event);
    });
}

// ===== POPOLA DROPDOWN CALENDARIO NELLA HOME =====
function populateHomeCalendarDropdown(calendars) {
    const dropdown = document.getElementById('selectCalendarFilter');
    if (!dropdown) return;
    
    // Carica selezione salvata
    const savedCalendar = localStorage.getItem(STORAGE_KEYS_CALENDAR.HOME_CALENDAR_FILTER) || 'all';
    
    // Reset dropdown
    dropdown.innerHTML = '<option value="all">-- Tutti i Calendari --</option>';
    
    // Aggiungi opzione per ogni calendario
    calendars.forEach(calendar => {
        const option = document.createElement('option');
        option.value = calendar.id;
        option.textContent = calendar.summary;
        if (calendar.id === savedCalendar) {
            option.selected = true;
        }
        dropdown.appendChild(option);
    });
    
    console.log(`✅ Dropdown home popolato con ${calendars.length} calendari`);
}

// ===== GET CALENDARIO SELEZIONATO NELLA HOME =====
function getHomeSelectedCalendar() {
    const dropdown = document.getElementById('selectCalendarFilter');
    if (!dropdown) return 'all';
    return dropdown.value || 'all';
}

function loadSavedEvents() {
    const eventsJSON = localStorage.getItem(STORAGE_KEYS_CALENDAR.CALENDAR_EVENTS);
    if (eventsJSON) {
        const events = JSON.parse(eventsJSON);
        
        // 🆕 v2.5.40: Check se cache è vecchio (senza conferenceData/extendedProperties)
        const hasNewFields = events.length > 0 && events[0].hasOwnProperty('conferenceData');
        
        if (!hasNewFields && events.length > 0) {
            console.warn('⚠️ [v2.5.40] Cache eventi vecchio (pre-v2.5.39) - ricarico da API...');
            // Cancella cache vecchio e forza ricarica
            localStorage.removeItem(STORAGE_KEYS_CALENDAR.CALENDAR_EVENTS);
            localStorage.removeItem(STORAGE_KEYS_CALENDAR.LAST_SYNC);
            
            // 🆕 v2.5.41: FIX - Ricarica IMMEDIATAMENTE gli eventi dall'API
            console.log('🔄 [v2.5.41] Avvio download automatico eventi da Google...');
            // Aspetta che gapi sia pronto, poi scarica
            setTimeout(() => {
                if (window.accessToken && gapi?.client?.calendar) {
                    loadMoreCalendarEvents(false); // Scarica silenziosamente
                } else {
                    console.warn('⚠️ [v2.5.41] Google non ancora connesso, l\'utente deve fare login');
                }
            }, 1000); // Aspetta 1 secondo per dare tempo al login
            
            // Non caricare dal cache vecchio
            return;
        }
        
        console.log(`📅 Caricati ${events.length} eventi dal cache`);
        updateDaySelector();
    }
    
    // v2.5.7: Carica anche lista calendari dal cache
    const calendarsJSON = localStorage.getItem(STORAGE_KEYS_CALENDAR.AVAILABLE_CALENDARS);
    if (calendarsJSON) {
        try {
            const calendars = JSON.parse(calendarsJSON);
            availableCalendars = calendars;
            populateHomeCalendarDropdown(calendars);
            console.log(`📅 Caricati ${calendars.length} calendari dal cache`);
        } catch (e) {
            console.warn('⚠️ Errore caricamento calendari da cache:', e);
        }
    }
}

// ===== IMPOSTA DATA CORRENTE NEL PICKER =====
function setTodayDate() {
    const selectDay = document.getElementById('selectDay');
    if (!selectDay) return;
    
    const today = new Date();
    const todayString = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    selectDay.value = todayString;
    
    console.log('📅 Data picker impostata su oggi:', todayString);
    
    // Carica automaticamente lead di oggi
    updateLeadSelectorByDate(todayString);
}

// ===== AGGIORNA DATE PICKER E INIZIALIZZA CON OGGI =====
function updateDaySelector() {
    setTodayDate();
}

// ===== AGGIORNA LISTA LEAD (ALIAS) =====
async function updateLeadsList() {
    const selectDay = document.getElementById('selectDay');
    if (selectDay && selectDay.value) {
        await updateLeadSelectorByDate(selectDay.value);
    }
}

// ===== AGGIORNA LEAD SELECTOR DA DATA PICKER =====
async function updateLeadSelectorByDate(dateString) {
    if (!dateString) return;
    
    const selectLead = document.getElementById('selectLead');
    if (!selectLead) return;
    
    // 🔒 AUTH GUARD: Blocca senza login
    if (!window.accessToken) {
        selectLead.innerHTML = '<option value="">🔒 Effettua il login Google per vedere i lead</option>';
        selectLead.disabled = true;
        return;
    }
    
    // ⏳ LOADING STATE
    selectLead.innerHTML = '<option value="">⏳ Caricamento lead...</option>';
    selectLead.disabled = true;
    
    const selectedDate = new Date(dateString + 'T00:00:00');
    
    // Carica TUTTI gli eventi salvati (non filtrati)
    const allEventsJSON = localStorage.getItem(STORAGE_KEYS_CALENDAR.CALENDAR_EVENTS);
    const allEvents = JSON.parse(allEventsJSON || '[]');
    
    console.log(`📊 Eventi totali in localStorage: ${allEvents.length}`);
    if (allEvents.length === 0) {
        console.warn('⚠️ NESSUN EVENTO nel localStorage! Sincronizzazione necessaria.');
    }
    
    // 🔥 CARICA LEAD CONTATTATI con fallback robusto
    let contactedLeads = [];
    try {
        if (window.DriveStorage && window.accessToken) {
            contactedLeads = await window.DriveStorage.getContactedLeads();
            console.log('✅ Lead contattati caricati da Drive:', contactedLeads.length);
        } else {
            // Fallback localStorage
            contactedLeads = JSON.parse(localStorage.getItem(STORAGE_KEYS_CALENDAR.CONTACTED_LEADS) || '[]');
            console.log('⚠️ Lead contattati da localStorage (fallback):', contactedLeads.length);
        }
    } catch (error) {
        console.warn('⚠️ Errore caricamento lead contattati, uso localStorage:', error);
        contactedLeads = JSON.parse(localStorage.getItem(STORAGE_KEYS_CALENDAR.CONTACTED_LEADS) || '[]');
    }
    
    // Ottieni calendario selezionato nella home
    const homeCalendarFilter = getHomeSelectedCalendar();
    
    // Filtra eventi per la data selezionata + escludi "X" + filtra per calendario home
    const dayEvents = allEvents.filter(event => {
        const eventDate = new Date(event.start);
        const isCorrectDate = eventDate.toDateString() === selectedDate.toDateString();
        const isNotX = !shouldSkipEvent(event);
        
        // Filtra per calendario home (se non è "all")
        const isSelectedCalendar = homeCalendarFilter === 'all' || event.calendarId === homeCalendarFilter;
        
        return isCorrectDate && isNotX && isSelectedCalendar;
    });
    
    console.log(`📅 Filtro applicato per ${dateString}:`);
    console.log(`   - Eventi dopo filtro data: ${allEvents.filter(e => new Date(e.start).toDateString() === selectedDate.toDateString()).length}`);
    console.log(`   - Eventi dopo esclusione "X": ${allEvents.filter(e => !shouldSkipEvent(e)).length}`);
    console.log(`   - Calendario selezionato: ${homeCalendarFilter}`);
    console.log(`   - Eventi finali per questo giorno: ${dayEvents.length}`);
    
    // Popola select - TUTTI I LEAD sempre visibili
    selectLead.innerHTML = '<option value="">-- Seleziona lead --</option>';
    
    if (dayEvents.length === 0) {
        console.warn(`⚠️ NESSUN EVENTO trovato per ${dateString}!`);
        console.warn(`   Possibili cause:`);
        console.warn(`   1. Nessun evento in questa data`);
        console.warn(`   2. Tutti gli eventi hanno titolo "X" (esclusi)`);
        console.warn(`   3. Filtro calendario esclude gli eventi`);
        console.warn(`   4. Eventi non sincronizzati dal Google Calendar`);
        selectLead.innerHTML = '<option value="">-- Nessun appuntamento per questo giorno --</option>';
        selectLead.disabled = true;
        return;
    }
    
    selectLead.disabled = false;
    
    // 🎯 TUTTI I LEAD (contattati e non) nello stesso elenco
    dayEvents.forEach((event, index) => {
        const eventTime = new Date(event.start).toLocaleTimeString('it-IT', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const leadName = extractNameFromEvent(event);
        const calendarLabel = event.calendarName ? ` (${event.calendarName})` : '';
        
        // Verifica se già contattato
        const isContacted = contactedLeads.some(contacted => 
            contacted.eventId === event.id || 
            (contacted.nome === leadName && 
             new Date(contacted.date).toDateString() === selectedDate.toDateString())
        );
        
        const option = document.createElement('option');
        option.value = index;
        option.dataset.eventId = event.id;
        option.dataset.eventData = JSON.stringify(event);
        option.dataset.isContacted = isContacted ? 'true' : 'false';
        
        if (isContacted) {
            // ✅ Lead GIÀ contattato - Verde con checkmark
            option.textContent = `✅ ${eventTime} - ${leadName}${calendarLabel}`;
            option.style.color = '#059669'; // Verde scuro
            option.style.fontWeight = '600';
        } else {
            // ❌ Lead NON contattato - Rosso con X
            option.textContent = `❌ ${eventTime} - ${leadName}${calendarLabel}`;
            option.style.color = '#DC2626'; // Rosso
            option.style.fontWeight = '400';
        }
        
        selectLead.appendChild(option);
    });
    
    const contactedCount = dayEvents.filter((e, i) => {
        const leadName = extractNameFromEvent(e);
        return contactedLeads.some(c => 
            c.eventId === e.id || 
            (c.nome === leadName && new Date(c.date).toDateString() === selectedDate.toDateString())
        );
    }).length;
    
    console.log(`✅ Trovati ${dayEvents.length} lead totali (${contactedCount} già contattati) per ${dateString}`);
}

// ===== MANTIENI FUNZIONE ORIGINALE PER COMPATIBILITÀ =====
async function updateLeadSelector(selectedDay) {
    const selectLead = document.getElementById('selectLead');
    if (!selectLead) return;
    
    // 🔒 AUTH GUARD: Blocca senza login
    if (!window.accessToken) {
        selectLead.innerHTML = '<option value="">🔒 Effettua il login Google per vedere i lead</option>';
        selectLead.disabled = true;
        return;
    }
    
    // ⏳ LOADING STATE
    selectLead.innerHTML = '<option value="">⏳ Caricamento lead...</option>';
    selectLead.disabled = true;
    
    // USA EVENTI FILTRATI (escludi "X" + filtra per calendario)
    const events = getFilteredEventsByCalendar();
    
    // 🔥 CARICA LEAD CONTATTATI con fallback robusto
    let contactedLeads = [];
    try {
        if (window.DriveStorage && window.accessToken) {
            contactedLeads = await window.DriveStorage.getContactedLeads();
            console.log('✅ Lead contattati caricati da Drive:', contactedLeads.length);
        } else {
            // Fallback localStorage
            contactedLeads = JSON.parse(localStorage.getItem(STORAGE_KEYS_CALENDAR.CONTACTED_LEADS) || '[]');
            console.log('⚠️ Lead contattati da localStorage (fallback):', contactedLeads.length);
        }
    } catch (error) {
        console.warn('⚠️ Errore caricamento lead contattati, uso localStorage:', error);
        contactedLeads = JSON.parse(localStorage.getItem(STORAGE_KEYS_CALENDAR.CONTACTED_LEADS) || '[]');
    }
    
    // Filtra eventi per il giorno selezionato
    const dayEvents = events.filter(event => {
        const eventDate = new Date(event.start);
        const dateKey = eventDate.toLocaleDateString('it-IT', { 
            weekday: 'long', 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        });
        return dateKey === selectedDay;
    });
    
    // Popola select - TUTTI I LEAD sempre visibili
    selectLead.innerHTML = '<option value="">-- Seleziona lead --</option>';
    
    if (dayEvents.length === 0) {
        selectLead.innerHTML = '<option value="">-- Nessun appuntamento per questo giorno --</option>';
        selectLead.disabled = true;
        return;
    }
    
    selectLead.disabled = false;
    
    // 🎯 TUTTI I LEAD (contattati e non) nello stesso elenco
    dayEvents.forEach((event, index) => {
        const eventTime = new Date(event.start).toLocaleTimeString('it-IT', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const leadName = extractNameFromEvent(event);
        const calendarLabel = event.calendarName ? ` (${event.calendarName})` : '';
        
        // Verifica se già contattato
        const isContacted = contactedLeads.some(contacted => 
            contacted.eventId === event.id || 
            (contacted.nome === leadName && contacted.date === event.start)
        );
        
        const option = document.createElement('option');
        option.value = index;
        option.dataset.eventId = event.id;
        option.dataset.eventData = JSON.stringify(event);
        option.dataset.isContacted = isContacted ? 'true' : 'false';
        
        if (isContacted) {
            // ✅ Lead GIÀ contattato - Verde con checkmark
            option.textContent = `✅ ${eventTime} - ${leadName}${calendarLabel}`;
            option.style.color = '#059669'; // Verde scuro
            option.style.fontWeight = '600';
        } else {
            // ❌ Lead NON contattato - Rosso con X
            option.textContent = `❌ ${eventTime} - ${leadName}${calendarLabel}`;
            option.style.color = '#DC2626'; // Rosso
            option.style.fontWeight = '400';
        }
        
        selectLead.appendChild(option);
    });
}

// ===== ESTRAI NOME DA EVENTO (PULITO) =====
function extractNameFromEvent(event) {
    let name = '';
    
    // PRIORITÀ 1: Attendee displayName
    if (event.attendees && event.attendees.length > 0) {
        const attendee = event.attendees[0];
        if (attendee.displayName) {
            name = attendee.displayName;
        } else if (attendee.email) {
            name = attendee.email.split('@')[0].replace(/[._]/g, ' ');
        }
    }
    
    // PRIORITÀ 2: Summary (titolo evento)
    if (!name && event.summary) {
        name = event.summary;
    }
    
    // PRIORITÀ 3: Fallback
    if (!name) {
        return 'Senza nome';
    }
    
    // PULIZIA PATTERN COMUNI
    name = name
        .replace(/(appuntamento con|call con|meeting con|videocall con|chiamata con|videochiamata con)/gi, '')
        .trim();
    
    // RIMUOVI METADATI (tutto dopo : o ( )
    // Esempio: "Fabio Marano: Hight Ticket (11-45K) (Dante)" → "Fabio Marano"
    name = name.split(':')[0].trim();  // Rimuovi tutto dopo ":"
    name = name.split('(')[0].trim();  // Rimuovi tutto dopo "("
    name = name.split('[')[0].trim();  // Rimuovi tutto dopo "["
    name = name.split('-')[0].trim();  // Rimuovi tutto dopo "-" (se solo metadati)
    
    // RIMUOVI SPAZI MULTIPLI
    name = name.replace(/\s+/g, ' ').trim();
    
    // CAPITALIZZAZIONE: "MARIO ROSSI" o "mario rossi" → "Mario Rossi"
    name = name
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    
    return name || 'Senza nome';
}

// ===== ESTRAI TELEFONO DA EVENTO =====
function extractPhoneFromEvent(event) {
    // Cerca numero di telefono in description o location
    const text = `${event.description || ''} ${event.location || ''}`;
    
    // Pattern migliorato per numeri italiani
    // Cerca pattern come "Telefono: +393478351560" o "Tel: 333 1234567"
    const phonePatterns = [
        /(?:telefono|tel|phone|cell|cellulare)[:\s]+([+]?39)?[\s]?([0-9]{9,13})/gi,
        /([+]39|0039)[\s]?([3][0-9]{2})[\s]?([0-9]{6,7})/g,
        /([3][0-9]{2})[\s]?([0-9]{6,7})/g,
        /([+]39|0039)[\s]?([0-9]{2,4})[\s]?([0-9]{6,8})/g
    ];
    
    for (const pattern of phonePatterns) {
        const match = text.match(pattern);
        if (match && match[0]) {
            // Pulisci e formatta
            let phone = match[0].replace(/[^0-9+]/g, '');
            // Aggiungi +39 se manca e inizia con 3
            if (phone.startsWith('3') && !phone.startsWith('+39')) {
                phone = '+39' + phone;
            }
            return phone;
        }
    }
    
    return '';
}

// ===== COMPILA FORM DA EVENTO =====
function fillFormFromEvent(event) {
    // v2.5.19: Attiva flag per bloccare re-trigger del listener selectDay
    isFormProgrammaticUpdate = true;
    
    const leadName = extractNameFromEvent(event);
    const phone = extractPhoneFromEvent(event);
    
    // PARSING INTELLIGENTE NOME/COGNOME con database nomi
    const { firstName, lastName } = parseNameSurname(leadName);
    
    document.getElementById('nome').value = firstName;
    document.getElementById('cognome').value = lastName;
    document.getElementById('telefono').value = phone;
    
    // AUTO-DETECT SERVIZIO E SOCIETÀ
    const { servizio, societa } = extractServiceFromEvent(event);
    document.getElementById('servizio').value = servizio;
    document.getElementById('societaSelect').value = societa;
    
    // Compila giorno e orario dall'evento (v2.5.24: oggi/domani)
    // 🆕 v2.5.34: FIX - Usa event.start.dateTime o event.start.date, non event.start diretto
    const eventStartString = event.start.dateTime || event.start.date || event.start;
    const eventDate = new Date(eventStartString);
    
    console.log('📅 [v2.5.34] DEBUG giorno/orario:', { 
        eventStart: event.start,
        eventStartString,
        eventDate, 
        isValidDate: !isNaN(eventDate.getTime()) 
    });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const eventDateOnly = new Date(eventDate);
    eventDateOnly.setHours(0, 0, 0, 0);
    
    let giornoValue;
    if (eventDateOnly.getTime() === today.getTime()) {
        giornoValue = 'oggi';
    } else if (eventDateOnly.getTime() === tomorrow.getTime()) {
        giornoValue = 'domani';
    } else {
        const giorniSettimana = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
        giornoValue = giorniSettimana[eventDate.getDay()];
    }
    
    document.getElementById('giorno').value = giornoValue;
    console.log('📅 [v2.5.34] Giorno impostato:', giornoValue);
    
    const hours = eventDate.getHours();
    const minutes = eventDate.getMinutes();
    let orarioValue = hours.toString();
    if (minutes > 0) {
        orarioValue += `.${minutes.toString().padStart(2, '0')}`;
    }
    document.getElementById('orario').value = orarioValue;
    console.log('⏰ [v2.5.34] Orario impostato:', orarioValue, { hours, minutes });
    
    // 🆕 v2.5.33: Mostra bottone Google Meet SEMPRE + Check COMPLETO Meet
    // Check TUTTI i formati possibili per Meet:
    // 1. hangoutLink (legacy)
    // 2. conferenceData.entryPoints[].uri (nuovo)
    // 3. conferenceData.conferenceId (fallback)
    // 4. descrizione contiene "meet.google.com" (fallback sicuro)
    const hasMeetLegacy = !!event.hangoutLink;
    const hasMeetNew = !!(event.conferenceData && event.conferenceData.entryPoints && 
                         event.conferenceData.entryPoints.find(ep => ep.entryPointType === 'video'));
    const hasMeetId = !!(event.conferenceData && event.conferenceData.conferenceId);
    const hasMeetInDescription = !!(event.description && event.description.includes('meet.google.com'));
    
    const meetLink = event.hangoutLink || 
                   (event.conferenceData?.entryPoints?.find(ep => ep.entryPointType === 'video')?.uri) ||
                   (hasMeetInDescription ? event.description.match(/https:\/\/meet\.google\.com\/[a-z\-]+/)?.[0] : null);
    
    const hasMeet = hasMeetLegacy || hasMeetNew || hasMeetId || hasMeetInDescription;
    
    console.log('🔍 [v2.5.33] DEBUG Meet check:', { 
        hasMeetLegacy, 
        hasMeetNew, 
        hasMeetId, 
        hasMeetInDescription,
        hasMeet,
        meetLink,
        eventId: event.id
    });
    
    const meetContainer = document.getElementById('googleMeetContainer');
    if (meetContainer) {
        if (hasMeet && meetLink) {
            // Meet esiste → link verde
            meetContainer.innerHTML = `
                <div class="google-meet-link">
                    <a href="${meetLink}" target="_blank" class="btn-meet">
                        <i class="fas fa-video"></i> Apri Google Meet
                    </a>
                </div>
            `;
            meetContainer.style.display = 'block';
            console.log('📹 [v2.5.33] Google Meet disponibile:', meetLink);
        } else if (hasMeet && !meetLink) {
            // Meet ID presente ma link mancante → nascondi bottone
            meetContainer.style.display = 'none';
            console.warn('⚠️ [v2.5.33] Meet presente ma link non trovato, bottone nascosto');
        } else {
            // Meet NON esiste → bottone blu "+ Aggiungi Meet"
            meetContainer.innerHTML = `
                <div class="google-meet-link">
                    <button onclick="addMeetToEventFromForm('${event.id}', '${event.calendarId || 'primary'}')" 
                            class="btn-meet btn-meet-add" 
                            id="addMeetBtnForm">
                        <i class="fas fa-video"></i> + Aggiungi Meet
                    </button>
                </div>
            `;
            meetContainer.style.display = 'block';
            console.log('📹 [v2.5.33] Bottone "+ Aggiungi Meet" mostrato (evento senza Meet)');
        }
    }
    
    // 🆕 v2.5.39: DEBUG - Log completo evento per verificare extendedProperties
    console.log('🔍 [v2.5.39] DEBUG Evento completo:', {
        id: event.id,
        summary: event.summary,
        hasExtendedProperties: !!event.extendedProperties,
        extendedProperties: event.extendedProperties,
        videocallModeInExtended: event.extendedProperties?.private?.videocallMode,
        descriptionPreview: (event.description || '').substring(0, 100)
    });
    
    // 🆕 v2.5.38: Leggi modalità videocall da extendedProperties (PRIORITÀ ALTA)
    let videocallMode = null;
    if (event.extendedProperties && event.extendedProperties.private && event.extendedProperties.private.videocallMode) {
        videocallMode = event.extendedProperties.private.videocallMode;
        console.log('✅ [v2.5.39] Modalità videocall da extendedProperties:', videocallMode);
    }
    
    // 🆕 v2.5.37: Auto-attiva toggle WhatsApp se evento contiene wa.me (FALLBACK se extendedProperties manca)
    if (!videocallMode) {
        const eventDescription = event.description || '';
        const isWhatsAppCall = eventDescription.includes('wa.me/') || 
                              eventDescription.toLowerCase().includes('videochiamerò su whatsapp') ||
                              eventDescription.toLowerCase().includes('whatsapp come richiesto');
        
        if (isWhatsAppCall) {
            videocallMode = 'WA';
            console.log('📱 [v2.5.37] Evento contiene WhatsApp in descrizione → Modalità WA (fallback)');
        } else {
            videocallMode = 'LINK'; // Default
            console.log('🔗 [v2.5.37] Evento NON contiene WhatsApp → Modalità LINK (default)');
        }
    }
    
    // Imposta toggle basandosi su videocallMode
    const toggleGroup = document.querySelectorAll('.toggle-group')[1]; // Secondo toggle group (modalità videocall)
    if (toggleGroup) {
        const linkBtn = toggleGroup.querySelector('[data-value="LINK"]');
        const waBtn = toggleGroup.querySelector('[data-value="WA"]');
        
        if (videocallMode === 'WA' && waBtn && linkBtn) {
            // Evento è WhatsApp → attiva toggle WhatsApp
            linkBtn.classList.remove('active');
            waBtn.classList.add('active');
            console.log('✅ [v2.5.38] Toggle WhatsApp ATTIVATO');
        } else if (linkBtn && waBtn) {
            // Evento è Link → attiva toggle Link (default)
            waBtn.classList.remove('active');
            linkBtn.classList.add('active');
            console.log('✅ [v2.5.38] Toggle Link ATTIVATO (default)');
        }
    }
    
    // ✨ NUOVO: Controllo genere SETTER (non lead) per {YY}
    if (window.checkSetterGenderFromEvent) {
        window.checkSetterGenderFromEvent(event);
    }
    
    // Aggiorna anteprima
    if (window.updatePreview) {
        updatePreview();
    }
    
    // v2.5.19: Resetta flag dopo 100ms (attende che tutti gli event listener siano processati)
    setTimeout(() => {
        isFormProgrammaticUpdate = false;
        console.log('🔓 Flag isFormProgrammaticUpdate resettato');
    }, 100);
    
    console.log('✅ Form compilato da evento:', leadName, '→', firstName, lastName, '|', servizio, '→', societa);
}

// ===== PARSING INTELLIGENTE NOME/COGNOME =====
function parseNameSurname(fullName) {
    if (!fullName || fullName === 'Senza nome') {
        return { firstName: '', lastName: '' };
    }
    
    const words = fullName.trim().split(/\s+/);
    
    // Caso semplice: una sola parola
    if (words.length === 1) {
        return { firstName: words[0], lastName: '' };
    }
    
    // Caso: due parole
    if (words.length === 2) {
        return { firstName: words[0], lastName: words[1] };
    }
    
    // Caso: tre o più parole → usa database nomi
    // Cerca quale parola è un nome italiano conosciuto
    const nomiMaschili = window.NOMI_MASCHILI || [];
    const nomiFemminili = window.NOMI_FEMMINILI || [];
    const tuttiNomi = [...nomiMaschili, ...nomiFemminili];
    
    let firstNameIndex = 0;
    
    for (let i = 0; i < words.length; i++) {
        const wordLower = words[i].toLowerCase();
        if (tuttiNomi.includes(wordLower)) {
            firstNameIndex = i;
            break;
        }
    }
    
    // Tutto prima dell'indice = nome, resto = cognome
    const firstName = words.slice(0, firstNameIndex + 1).join(' ');
    const lastName = words.slice(firstNameIndex + 1).join(' ');
    
    return { firstName, lastName };
}

// ===== ESTRAI SERVIZIO DA EVENTO =====
function extractServiceFromEvent(event) {
    const description = event.description || '';
    const calendarName = event.calendarName || '';
    
    console.log('🔍 [extractServiceFromEvent] Evento:', event.summary);
    console.log('   📅 Calendario:', calendarName);
    console.log('   📝 Description:', description ? description.substring(0, 100) : '(vuota)');
    
    // PRIORITÀ 1: Cerca pattern "SERVIZIO: Stock Gain" in description
    const serviceMatch = description.match(/SERVIZIO[:\s]+(.+?)(?:\n|$)/i);
    
    if (serviceMatch) {
        const servizioText = serviceMatch[1].trim().toLowerCase();
        console.log('   ✅ Trovato SERVIZIO in description:', servizioText);
        
        // Mapping servizio → società
        if (servizioText.includes('stock gain') || servizioText.includes('sg')) {
            return {
                servizio: 'Stock Gain',
                societa: 'SG - Lead'
            };
        } else if (servizioText.includes('finanza efficace') || servizioText.includes('fe')) {
            return {
                servizio: 'Finanza Efficace',
                societa: 'FE - Lead'
            };
        }
    }
    
    // PRIORITÀ 2: Inferisci da nome calendario
    const calendarLower = calendarName.toLowerCase();
    
    // Pattern Finanza Efficace
    if (calendarLower.includes('fe -') || 
        calendarLower.includes('finanza efficace') ||
        calendarLower.includes('fe lead')) {
        console.log('   ✅ Rilevato FE da calendario:', calendarName);
        return {
            servizio: 'Finanza Efficace',
            societa: 'FE - Lead'
        };
    }
    
    // Pattern Stock Gain (default per calendari SG)
    if (calendarLower.includes('sg -') || 
        calendarLower.includes('stock gain') ||
        calendarLower.includes('sg lead') ||
        calendarLower.includes('call consulenza') ||
        calendarLower.includes('call interne') ||
        calendarLower.includes('follow up')) {
        console.log('   ✅ Rilevato SG da calendario:', calendarName);
        return {
            servizio: 'Stock Gain',
            societa: 'SG - Lead'
        };
    }
    
    // Default: Stock Gain (se calendario non riconosciuto)
    console.log('   ⚠️ Calendario non riconosciuto, default a Stock Gain');
    return {
        servizio: 'Stock Gain',
        societa: 'SG - Lead'
    };
}

// ===== RILEVA GENERE DA NOME SETTER (DEPRECATA - Ora usiamo Google Sheets) =====
// Questa funzione non viene più usata, il genere viene gestito da google-sheets-assistenti.js
function detectGenderFromName(name) {
    console.log('⚠️ detectGenderFromName deprecata - usa checkSetterGenderFromEvent');
}

// ===== MARCA LEAD COME CONTATTATO =====
async function markLeadAsContacted(eventId, nome, cognome, telefono, eventDate, videocallMode) {
    const contactedEntry = {
        eventId: eventId,
        nome: nome,
        cognome: cognome || '',
        telefono: telefono || '',
        date: eventDate,
        timestamp: new Date().toISOString()
    };
    
    // 🔥 FIX v2.5.15: Salva PRIMA su localStorage (backup), POI prova Drive
    // 1. Carica array esistente
    let contactedLeads = JSON.parse(localStorage.getItem(STORAGE_KEYS_CALENDAR.CONTACTED_LEADS) || '[]');
    
    // 2. Evita duplicati
    const exists = contactedLeads.some(lead => 
        lead.eventId === eventId || (lead.nome === nome && lead.date === eventDate)
    );
    
    if (!exists) {
        // 3. SALVA SEMPRE su localStorage (backup primario)
        contactedLeads.push(contactedEntry);
        localStorage.setItem(STORAGE_KEYS_CALENDAR.CONTACTED_LEADS, JSON.stringify(contactedLeads));
        console.log('💾 Lead salvato in localStorage (backup primario):', nome);
        
        // 4. PROVA a salvare anche su Drive (sync cloud)
        try {
            if (window.DriveStorage && window.accessToken) {
                await window.DriveStorage.saveContactedLead(contactedEntry);
                console.log('✅ Lead sincronizzato su Drive:', nome);
            } else {
                console.log('⚠️ Non loggato Google: dati SOLO su localStorage');
            }
        } catch (error) {
            console.warn('⚠️ Drive fallito (403?), dati comunque salvati su localStorage:', error.message);
        }
        
        // 5. 🆕 v2.5.24: Aggiungi link WhatsApp nella descrizione evento
        // 🆕 v2.5.27: Rinomina evento con solo Nome Cognome
        // 🆕 v2.5.38: Salva modalità videocall in extendedProperties
        try {
            await addWhatsAppLinkToEvent(eventId, telefono, nome, cognome, videocallMode);
        } catch (error) {
            console.warn('⚠️ Non riesco ad aggiornare evento con link WhatsApp:', error.message);
        }
    } else {
        console.log('ℹ️ Lead già marcato come contattato:', nome);
    }
    
    // 6. 🔥 FIX v2.5.15: Refresh UI DOPO salvataggio
    const selectDay = document.getElementById('selectDay');
    if (selectDay && selectDay.value) {
        await updateLeadSelectorByDate(selectDay.value);
        console.log('🔄 UI aggiornata dopo salvataggio lead');
    }
}

// ===== v2.5.24: AGGIUNGI LINK WHATSAPP NELLA DESCRIZIONE EVENTO =====
// ===== v2.5.27: RINOMINA EVENTO CON SOLO NOME COGNOME =====
// ===== v2.5.31: FIX - Rename SEMPRE attivo (anche eventi già esistenti) =====
// ===== v2.5.38: SALVA MODALITÀ VIDEOCALL IN EXTENDED PROPERTIES =====
async function addWhatsAppLinkToEvent(eventId, telefono, nome, cognome, videocallMode) {
    if (!window.gapi || !window.gapi.client || !window.gapi.client.calendar) {
        console.warn('⚠️ Google Calendar API non inizializzata');
        return;
    }
    
    if (!telefono) {
        console.warn('⚠️ Nessun telefono fornito per link WhatsApp');
        return;
    }
    
    try {
        // Normalizza numero per WhatsApp
        let phoneClean = telefono.replace(/\s+/g, '').replace(/^\\+/, '');
        if (!phoneClean.startsWith('39') && phoneClean.length === 10) {
            phoneClean = '39' + phoneClean;
        }
        
        // Genera link WhatsApp
        const whatsappLink = `https://wa.me/${phoneClean}`;
        
        // 1. Ottieni evento corrente
        const calendarId = 'primary'; // Assumiamo calendario primario
        const event = await window.gapi.client.calendar.events.get({
            calendarId: calendarId,
            eventId: eventId
        });
        
        const currentDescription = event.result.description || '';
        
        // 2. Controlla se link già presente
        const needsWhatsAppLink = !currentDescription.includes('wa.me/');
        
        // 3. 🆕 v2.5.27: Calcola nuovo titolo evento (solo Nome Cognome)
        const newTitle = cognome ? `${nome} ${cognome}`.trim() : nome;
        const currentTitle = event.result.summary || '';
        const needsTitleUpdate = currentTitle !== newTitle;
        
        // 4. Prepara aggiornamenti
        const updates = {};
        
        if (needsWhatsAppLink) {
            // 🆕 v2.5.33: Aggiungi link WhatsApp IN CIMA alla descrizione
            const newDescription = `📱 WhatsApp: ${whatsappLink}` +
                (currentDescription ? '\n\n' + currentDescription : '');
            updates.description = newDescription;
            console.log('📱 [v2.5.33] Aggiungo link WhatsApp in cima:', whatsappLink);
        }
        
        if (needsTitleUpdate) {
            updates.summary = newTitle;
            console.log('✏️ Rinomino evento:', currentTitle, '→', newTitle);
        }
        
        // 🆕 v2.5.38: Salva modalità videocall in extendedProperties
        if (videocallMode) {
            updates.extendedProperties = {
                private: {
                    videocallMode: videocallMode // 'LINK' o 'WA'
                }
            };
            console.log('📹 [v2.5.39] Salvo modalità videocall in extendedProperties:', {
                videocallMode,
                eventId,
                willUpdate: true
            });
        }
        
        // 5. Aggiorna evento solo se necessario
        if (Object.keys(updates).length > 0) {
            console.log('🔄 [v2.5.39] Invio PATCH a Google Calendar:', updates);
            
            await window.gapi.client.calendar.events.patch({
                calendarId: calendarId,
                eventId: eventId,
                resource: updates
            });
            
            console.log('✅ [v2.5.39] Evento Google Calendar aggiornato con successo');
            
            // 🆕 v2.5.39: Verifica immediata che extendedProperties sia stato salvato
            const verifyEvent = await window.gapi.client.calendar.events.get({
                calendarId: calendarId,
                eventId: eventId
            });
            console.log('🔍 [v2.5.39] Verifica post-update:', {
                hasExtendedProperties: !!verifyEvent.result.extendedProperties,
                videocallMode: verifyEvent.result.extendedProperties?.private?.videocallMode
            });
        } else {
            console.log('ℹ️ Evento già aggiornato, nessuna modifica necessaria');
        }
        
    } catch (error) {
        console.error('❌ Errore aggiornamento evento:', error);
        throw error;
    }
}

// ===== v2.5.31: CONTROLLA E CORREGGI TITOLO EVENTO (quando selezioni lead) =====
// ===== v2.5.32: AGGIUNGI ANCHE WHATSAPP LINK SE MANCANTE =====
async function ensureEventTitleCorrect(event) {
    if (!window.gapi || !window.gapi.client || !window.gapi.client.calendar) {
        return; // API non pronta, skip silenzioso
    }
    
    if (!event || !event.id) {
        return; // Evento invalido
    }
    
    try {
        // Estrai nome e cognome dal nome lead
        let leadName = (event.summary || '').trim();
        if (!leadName || leadName === 'Senza nome') {
            return; // Skip se nome vuoto
        }
        
        // 🆕 v2.5.33: Rimuovi tutto dopo ":" (es. "ARTURO ALVARI: Finanza..." → "ARTURO ALVARI")
        if (leadName.includes(':')) {
            leadName = leadName.split(':')[0].trim();
            console.log('🔪 [v2.5.33] Rimosso testo dopo ":", nuovo nome:', leadName);
        }
        
        // 🆕 v2.5.33: Rimuovi tutto dopo " - " (es. "Mario Rossi - SG Lead" → "Mario Rossi")
        if (leadName.includes(' - ')) {
            leadName = leadName.split(' - ')[0].trim();
            console.log('🔪 [v2.5.33] Rimosso testo dopo " - ", nuovo nome:', leadName);
        }
        
        // 🆕 v2.5.33: Rimuovi tutto tra parentesi (es. "Mario Rossi (Dante)" → "Mario Rossi")
        leadName = leadName.replace(/\s*\([^)]*\)/g, '').trim();
        
        // Parsing nome/cognome (stesso algoritmo di fillFormFromEvent)
        const { firstName, lastName } = parseNameSurname(leadName);
        const newTitle = lastName ? `${firstName} ${lastName}`.trim() : firstName;
        
        console.log('✏️ [v2.5.33] Parsing:', { original: event.summary, cleaned: leadName, newTitle });
        
        // Controlla se titolo è già corretto
        const titleNeedsUpdate = event.summary !== newTitle;
        
        // 🆕 v2.5.32: Controlla se manca WhatsApp link
        const telefono = document.getElementById('telefono')?.value.trim();
        let whatsappNeedsUpdate = false;
        
        if (telefono) {
            // Verifica se evento ha già WhatsApp link
            const currentEvent = await window.gapi.client.calendar.events.get({
                calendarId: event.calendarId || 'primary',
                eventId: event.id
            });
            
            const currentDescription = currentEvent.result.description || '';
            whatsappNeedsUpdate = !currentDescription.includes('wa.me/');
            
            console.log('📱 [v2.5.32] Check WhatsApp:', { telefono, hasMaiLink: !whatsappNeedsUpdate });
        }
        
        // Se nulla da aggiornare, skip
        if (!titleNeedsUpdate && !whatsappNeedsUpdate) {
            return;
        }
        
        // Prepara aggiornamenti
        const updates = {};
        
        if (titleNeedsUpdate) {
            updates.summary = newTitle;
            console.log('✏️ [v2.5.32] Titolo evento da correggere:', event.summary, '→', newTitle);
        }
        
        if (whatsappNeedsUpdate && telefono) {
            // Normalizza numero
            let phoneClean = telefono.replace(/\s+/g, '').replace(/^\+/, '');
            if (!phoneClean.startsWith('39') && phoneClean.length === 10) {
                phoneClean = '39' + phoneClean;
            }
            
            const whatsappLink = `https://wa.me/${phoneClean}`;
            const currentEvent = await window.gapi.client.calendar.events.get({
                calendarId: event.calendarId || 'primary',
                eventId: event.id
            });
            
            const currentDescription = currentEvent.result.description || '';
            // 🆕 v2.5.33: WhatsApp link in CIMA alla descrizione
            const newDescription = `📱 WhatsApp: ${whatsappLink}` +
                (currentDescription ? '\n\n' + currentDescription : '');
            
            updates.description = newDescription;
            console.log('📱 [v2.5.33] WhatsApp link da aggiungere in cima:', whatsappLink);
        }
        
        // Aggiorna evento
        if (Object.keys(updates).length > 0) {
            await window.gapi.client.calendar.events.patch({
                calendarId: event.calendarId || 'primary',
                eventId: event.id,
                resource: updates
            });
            
            console.log('✅ [v2.5.32] Evento aggiornato:', updates);
            
            // 🔄 Aggiorna evento nel localStorage cache
            const allEvents = JSON.parse(localStorage.getItem('calendarEvents') || '[]');
            const eventIndex = allEvents.findIndex(e => e.id === event.id);
            if (eventIndex !== -1) {
                if (updates.summary) {
                    allEvents[eventIndex].summary = updates.summary;
                }
                if (updates.description) {
                    allEvents[eventIndex].description = updates.description;
                }
                localStorage.setItem('calendarEvents', JSON.stringify(allEvents));
            }
        }
        
    } catch (error) {
        console.warn('⚠️ [v2.5.32] Non riesco a correggere evento:', error.message);
    }
}

// ===== VISUALIZZA CALENDARIO =====
async function displayCalendarView() {
    const calendarView = document.getElementById('calendarView');
    if (!calendarView) return;
    
    // USA EVENTI FILTRATI (escludi "X" + filtra per calendario)
    const events = getFilteredEventsByCalendar();
    
    // 🔥 CARICA LEAD CONTATTATI con fallback robusto
    let contactedLeads = [];
    try {
        if (window.DriveStorage && window.accessToken) {
            contactedLeads = await window.DriveStorage.getContactedLeads();
        } else {
            contactedLeads = JSON.parse(localStorage.getItem(STORAGE_KEYS_CALENDAR.CONTACTED_LEADS) || '[]');
        }
    } catch (error) {
        console.warn('⚠️ Errore caricamento lead contattati per calendario:', error);
        contactedLeads = JSON.parse(localStorage.getItem(STORAGE_KEYS_CALENDAR.CONTACTED_LEADS) || '[]');
    }
    
    const selectedCalendars = getSelectedCalendars();
    
    // Filtra eventi "X" e calendari selezionati
    const filteredEvents = events.filter(event => {
        const isNotX = !shouldSkipEvent(event);
        const isSelectedCalendar = selectedCalendars.length === 0 || selectedCalendars.includes(event.calendarId);
        return isNotX && isSelectedCalendar;
    });
    
    if (filteredEvents.length === 0) {
        calendarView.innerHTML = '<p class="placeholder-text">Nessun evento sincronizzato. Connetti Google e sincronizza.</p>';
        return;
    }
    
    // Raggruppa eventi per giorno
    const eventsByDay = {};
    
    filteredEvents.forEach(event => {
        const eventDate = new Date(event.start);
        const dateKey = eventDate.toLocaleDateString('it-IT', { 
            weekday: 'long', 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        });
        
        if (!eventsByDay[dateKey]) {
            eventsByDay[dateKey] = [];
        }
        
        // Controlla se il lead è stato contattato
        const isContacted = contactedLeads.some(contacted => 
            contacted.eventId === event.id
        );
        
        eventsByDay[dateKey].push({
            ...event,
            contacted: isContacted
        });
    });
    
    // Genera HTML
    let html = '<div class="calendar-days">';
    
    Object.keys(eventsByDay).sort((a, b) => {
        const dateA = eventsByDay[a][0].start;
        const dateB = eventsByDay[b][0].start;
        return new Date(dateA) - new Date(dateB);
    }).forEach(dateKey => {
        const dayEvents = eventsByDay[dateKey];
        const totalEvents = dayEvents.length;
        const contactedEvents = dayEvents.filter(e => e.contacted).length;
        const pendingEvents = totalEvents - contactedEvents;
        
        html += `
            <div class="calendar-day-card">
                <div class="calendar-day-header">
                    <h4>${dateKey}</h4>
                    <div class="calendar-day-stats">
                        <span class="stat-pending">${pendingEvents} da contattare</span>
                        <span class="stat-contacted">${contactedEvents} contattati</span>
                    </div>
                </div>
                <div class="calendar-events-list">
        `;
        
        dayEvents.sort((a, b) => new Date(a.start) - new Date(b.start)).forEach(event => {
            const eventTime = new Date(event.start).toLocaleTimeString('it-IT', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            const leadName = extractNameFromEvent(event);
            const statusClass = event.contacted ? 'contacted' : 'pending';
            const statusIcon = event.contacted ? 'fa-check-circle' : 'fa-clock';
            const statusText = event.contacted ? 'Contattato' : 'Da contattare';
            
            // v2.5.30: Bottone Meet SEMPRE visibile (passati, presenti, futuri)
            const existingMeet = event.hangoutLink || 
                (event.conferenceData && event.conferenceData.entryPoints && 
                 event.conferenceData.entryPoints.find(ep => ep.entryPointType === 'video') 
                 ? event.conferenceData.entryPoints.find(ep => ep.entryPointType === 'video').uri : null);
            
            let meetBtn = '';
            if (existingMeet) {
                // Meet esiste → link verde
                meetBtn = `<a href="${existingMeet}" target="_blank" class="event-meet-btn event-meet-btn--exists" title="Apri Google Meet">
                    <i class="fab fa-google"></i> Meet
                </a>`;
            } else {
                // Meet NON esiste → bottone blu "+ Meet" (SEMPRE, anche passati)
                meetBtn = `<button class="event-meet-btn event-meet-btn--add" 
                    onclick="addMeetToEvent('${event.id}', '${event.calendarId}', this)" 
                    title="Aggiungi Google Meet a questo evento">
                    <i class="fas fa-video"></i> + Meet
                </button>`;
            }
            
            html += `
                <div class="calendar-event-item ${statusClass}">
                    <div class="event-time">
                        <i class="fas fa-clock"></i> ${eventTime}
                    </div>
                    <div class="event-name">
                        <i class="fas fa-user"></i> ${leadName}
                    </div>
                    <div class="event-status">
                        <i class="fas ${statusIcon}"></i> ${statusText}
                    </div>
                    <div class="event-meet">${meetBtn}</div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    calendarView.innerHTML = html;
}

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', function() {
    // Init calendar sync
    initCalendarSync();
    
    // Bottone sincronizza manuale
    const syncBtn = document.getElementById('syncCalendarBtn');
    if (syncBtn) {
        syncBtn.addEventListener('click', () => syncCalendarEvents(false));
    }
    
    
    // Bottone refresh lead (ricarica lead senza sincronizzare calendario)
    const refreshLeadsBtn = document.getElementById('refreshLeadsBtn');
    if (refreshLeadsBtn) {
        refreshLeadsBtn.addEventListener('click', async () => {
            const selectDay = document.getElementById('selectDay');
            if (selectDay && selectDay.value) {
                await updateLeadSelectorByDate(selectDay.value);
                showNotification('Lista lead aggiornata!', 'success');
            } else {
                updateDaySelector();
                showNotification('Calendario aggiornato con data odierna!', 'success');
            }
        });
    }
    
    // Cambio giorno (date picker)
    const selectDay = document.getElementById('selectDay');
    if (selectDay) {
        selectDay.addEventListener('change', async function() {
            // v2.5.19: SKIP se aggiornamento programmatico (fillFormFromEvent in corso)
            if (isFormProgrammaticUpdate) {
                console.log('⏭️ SKIP updateLeadSelectorByDate – Aggiornamento programmatico del form in corso');
                return;
            }
            
            const selectedDate = this.value; // Format: YYYY-MM-DD
            if (selectedDate) {
                await updateLeadSelectorByDate(selectedDate);
            } else {
                const selectLead = document.getElementById('selectLead');
                selectLead.innerHTML = '<option value="">-- Seleziona una data --</option>';
                selectLead.disabled = true;
            }
        });
    }
    
    // Cambio calendario nella home
    const selectCalendarFilter = document.getElementById('selectCalendarFilter');
    if (selectCalendarFilter) {
        selectCalendarFilter.addEventListener('change', async function() {
            const calendarId = this.value;
            
            // Salva selezione in localStorage
            localStorage.setItem(STORAGE_KEYS_CALENDAR.HOME_CALENDAR_FILTER, calendarId);
            
            // Ricarica lead con nuovo filtro
            const selectDay = document.getElementById('selectDay');
            if (selectDay && selectDay.value) {
                await updateLeadSelectorByDate(selectDay.value);
                
                const calendarName = this.options[this.selectedIndex].textContent;
                showNotification(`📅 Filtro applicato: ${calendarName}`, 'success');
            }
            
            console.log('📅 Calendario home selezionato:', calendarId);
        });
    }
    
    // Cambio lead
    const selectLead = document.getElementById('selectLead');
    if (selectLead) {
        selectLead.addEventListener('change', async function() {
            const selectedOption = this.options[this.selectedIndex];
            if (selectedOption && selectedOption.dataset.eventData) {
                const event = JSON.parse(selectedOption.dataset.eventData);
                fillFormFromEvent(event);
                
                // 🆕 v2.5.31: Controlla e correggi titolo evento (rename SEMPRE)
                await ensureEventTitleCorrect(event);
            }
        });
    }
});

// ===== AGGIUNGI GOOGLE MEET A EVENTO (v2.5.23) =====
async function addMeetToEvent(eventId, calendarId, btnEl) {
    // Guard se gapi non pronto
    if (!window.accessToken || !gapi?.client?.calendar) {
        showNotification('❌ Connetti Google prima di aggiungere Meet', 'error');
        return;
    }
    
    // Feedback visivo immediato
    if (btnEl) {
        btnEl.disabled = true;
        btnEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ...';
    }
    
    try {
        // requestId univoco con timestamp per evitare errori 400 su retry
        const requestId = eventId.replace(/[^a-z0-9]/gi, '') + Date.now();
        
        const response = await gapi.client.calendar.events.patch({
            calendarId: calendarId,
            eventId: eventId,
            conferenceDataVersion: 1,
            resource: {
                conferenceData: {
                    createRequest: {
                        requestId: requestId,
                        conferenceSolutionKey: { type: 'hangoutsMeet' }
                    }
                }
            }
        });
        
        const updatedEvent = response.result;
        
        // Google genera il link in modo asincrono — può servire qualche secondo
        // Estraiamo subito hangoutLink se disponibile
        const meetLink = updatedEvent.hangoutLink || 
            (updatedEvent.conferenceData?.entryPoints?.find(ep => ep.entryPointType === 'video')?.uri);
        
        // Aggiorna localStorage immediatamente senza aspettare sync completa
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS_CALENDAR.CALENDAR_EVENTS) || '[]');
            const idx = saved.findIndex(e => e.id === eventId);
            if (idx >= 0) {
                saved[idx].conferenceData = updatedEvent.conferenceData || null;
                saved[idx].hangoutLink = updatedEvent.hangoutLink || null;
                localStorage.setItem(STORAGE_KEYS_CALENDAR.CALENDAR_EVENTS, JSON.stringify(saved));
            }
        } catch(lsErr) {
            console.warn('⚠️ Impossibile aggiornare localStorage:', lsErr);
        }
        
        if (meetLink) {
            showNotification(`✅ Google Meet aggiunto! Fireflies userà il titolo "${updatedEvent.summary || 'evento'}"`, 'success');
            // Rendi il bottone un link diretto
            if (btnEl) {
                const container = btnEl.parentElement;
                container.innerHTML = `<a href="${meetLink}" target="_blank" class="event-meet-btn event-meet-btn--exists" title="Apri Google Meet">
                    <i class="fab fa-google"></i> Meet
                </a>`;
            }
        } else {
            // Link non ancora pronto — aggiorna dopo 3 secondi
            showNotification('⏳ Meet creato, link in generazione...', 'info');
            if (btnEl) {
                btnEl.innerHTML = '<i class="fas fa-check"></i> Creato';
                btnEl.style.opacity = '0.6';
            }
            setTimeout(async () => {
                try {
                    const r2 = await gapi.client.calendar.events.get({ calendarId, eventId });
                    const link2 = r2.result.hangoutLink || 
                        r2.result.conferenceData?.entryPoints?.find(ep => ep.entryPointType === 'video')?.uri;
                    if (link2) {
                        // Aggiorna localStorage
                        const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS_CALENDAR.CALENDAR_EVENTS) || '[]');
                        const idx = saved.findIndex(e => e.id === eventId);
                        if (idx >= 0) {
                            saved[idx].hangoutLink = r2.result.hangoutLink || null;
                            saved[idx].conferenceData = r2.result.conferenceData || null;
                            localStorage.setItem(STORAGE_KEYS_CALENDAR.CALENDAR_EVENTS, JSON.stringify(saved));
                        }
                        displayCalendarView();
                        showNotification('✅ Link Meet pronto!', 'success');
                    }
                } catch(e) { console.warn('⚠️ Retry get event:', e); }
            }, 3000);
        }
        
        // Aggiorna la vista calendario per riflettere il cambio
        await displayCalendarView();
        
    } catch (err) {
        console.error('❌ Errore addMeetToEvent:', err);
        const msg = err?.result?.error?.message || err.message || 'Errore sconosciuto';
        showNotification('❌ Errore aggiunta Meet: ' + msg, 'error');
        // Ripristina bottone
        if (btnEl) {
            btnEl.disabled = false;
            btnEl.innerHTML = '<i class="fas fa-video"></i> + Meet';
        }
    }
}

// ===== v2.5.30: WRAPPER PER AGGIUNGERE MEET DAL FORM =====
async function addMeetToEventFromForm(eventId, calendarId) {
    const btn = document.getElementById('addMeetBtnForm');
    
    // Chiama la funzione esistente
    await addMeetToEvent(eventId, calendarId, btn);
    
    // Dopo 3.5 secondi, ricarica evento per aggiornare form con Meet appena creato
    setTimeout(async () => {
        try {
            if (window.accessToken && gapi?.client?.calendar) {
                const response = await gapi.client.calendar.events.get({
                    calendarId: calendarId,
                    eventId: eventId
                });
                
                // Aggiorna localStorage
                const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS_CALENDAR.CALENDAR_EVENTS) || '[]');
                const idx = saved.findIndex(e => e.id === eventId);
                if (idx >= 0) {
                    saved[idx] = response.result;
                    localStorage.setItem(STORAGE_KEYS_CALENDAR.CALENDAR_EVENTS, JSON.stringify(saved));
                }
                
                // Ri-popola il form con evento aggiornato
                fillFormFromEvent(response.result);
                console.log('✅ Form aggiornato con Meet appena creato');
            }
        } catch (e) {
            console.warn('⚠️ Non riesco ad aggiornare form:', e);
        }
    }, 3500);
}

// ===== ESPORTA FUNZIONI =====
window.syncCalendarEvents = syncCalendarEvents;
window.updateDaySelector = updateDaySelector;
window.updateLeadSelector = updateLeadSelector;
window.updateLeadSelectorByDate = updateLeadSelectorByDate;
window.displayCalendarView = displayCalendarView;
window.setTodayDate = setTodayDate;
window.updateLeadsList = updateLeadsList;
window.getFilteredEventsByCalendar = getFilteredEventsByCalendar;
window.renderCalendarCheckboxes = renderCalendarCheckboxes;
window.markLeadAsContacted = markLeadAsContacted;
window.loadSavedEvents = loadSavedEvents; // v2.5.7: Export per caricare da cache
window.addMeetToEvent = addMeetToEvent; // v2.5.23: Aggiungi Google Meet a evento
window.addMeetToEventFromForm = addMeetToEventFromForm; // v2.5.30: Wrapper per form

console.log('✅ Google Calendar module v2.5.41 caricato - FIX RELOAD DOPO MIGRAZIONE');
