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
                'orderBy': 'startTime'
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
            calendarId: event.calendarId
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
            option.style.color = '#059669'; // Verde
            option.style.fontWeight = '500';
        } else {
            // ⏳ Lead DA contattare - Testo normale
            option.textContent = `⏳ ${eventTime} - ${leadName}${calendarLabel}`;
            option.style.color = '#374151'; // Grigio scuro normale
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
            option.style.color = '#059669'; // Verde
            option.style.fontWeight = '500';
        } else {
            // ⏳ Lead DA contattare - Testo normale
            option.textContent = `⏳ ${eventTime} - ${leadName}${calendarLabel}`;
            option.style.color = '#374151'; // Grigio scuro normale
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
    
    // Compila giorno e orario dall'evento
    const eventDate = new Date(event.start);
    const giorniSettimana = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
    const giornoSettimana = giorniSettimana[eventDate.getDay()];
    
    document.getElementById('giorno').value = giornoSettimana;
    
    const hours = eventDate.getHours();
    const minutes = eventDate.getMinutes();
    let orarioValue = hours.toString();
    if (minutes > 0) {
        orarioValue += `.${minutes.toString().padStart(2, '0')}`;
    }
    document.getElementById('orario').value = orarioValue;
    
    // ✨ NUOVO: Controllo genere SETTER (non lead) per {YY}
    if (window.checkSetterGenderFromEvent) {
        window.checkSetterGenderFromEvent(event);
    }
    
    // Aggiorna anteprima
    if (window.updatePreview) {
        updatePreview();
    }
    
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
    
    // Cerca pattern "SERVIZIO: Stock Gain" o "Servizio: Finanza Efficace"
    const serviceMatch = description.match(/SERVIZIO[:\s]+(.+?)(?:\n|$)/i);
    
    if (serviceMatch) {
        const servizioText = serviceMatch[1].trim().toLowerCase();
        
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
    
    // Default: Stock Gain
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
async function markLeadAsContacted(eventId, nome, cognome, telefono, eventDate) {
    const contactedEntry = {
        eventId: eventId,
        nome: nome,
        cognome: cognome || '',
        telefono: telefono || '',
        date: eventDate,
        timestamp: new Date().toISOString()
    };
    
    // 🔥 SALVA SU DRIVE con fallback localStorage
    try {
        if (window.DriveStorage && window.accessToken) {
            await window.DriveStorage.saveContactedLead(contactedEntry);
            console.log('✅ Lead marcato come contattato su Drive:', nome);
        } else {
            // Fallback localStorage
            const contactedLeads = JSON.parse(localStorage.getItem(STORAGE_KEYS_CALENDAR.CONTACTED_LEADS) || '[]');
            
            // Evita duplicati
            const exists = contactedLeads.some(lead => 
                lead.eventId === eventId || (lead.nome === nome && lead.date === eventDate)
            );
            
            if (!exists) {
                contactedLeads.push(contactedEntry);
                localStorage.setItem(STORAGE_KEYS_CALENDAR.CONTACTED_LEADS, JSON.stringify(contactedLeads));
                console.log('⚠️ Lead marcato in localStorage (fallback):', nome);
            }
        }
    } catch (error) {
        console.error('❌ Errore salvataggio lead contattato:', error);
        
        // Fallback localStorage in caso di errore Drive
        const contactedLeads = JSON.parse(localStorage.getItem(STORAGE_KEYS_CALENDAR.CONTACTED_LEADS) || '[]');
        const exists = contactedLeads.some(lead => 
            lead.eventId === eventId || (lead.nome === nome && lead.date === eventDate)
        );
        
        if (!exists) {
            contactedLeads.push(contactedEntry);
            localStorage.setItem(STORAGE_KEYS_CALENDAR.CONTACTED_LEADS, JSON.stringify(contactedLeads));
            console.log('⚠️ Lead salvato in localStorage dopo errore Drive:', nome);
        }
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
        selectLead.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            if (selectedOption && selectedOption.dataset.eventData) {
                const event = JSON.parse(selectedOption.dataset.eventData);
                fillFormFromEvent(event);
            }
        });
    }
});

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

console.log('✅ Google Calendar module v2.5.7 caricato - Fix dropdown calendari + data oggi');
