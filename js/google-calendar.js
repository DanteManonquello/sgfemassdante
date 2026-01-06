/* ================================================================================
   GOOGLE CALENDAR SYNC - TESTmess v2.2.2
   
   CHANGELOG v2.2.2:
   - ✅ PULIZIA DROPDOWN: Rimossi metadati inutili (solo "HH:MM - Nome Cognome")
   - ✅ PARSING INTELLIGENTE: Separazione automatica Nome/Cognome con database nomi
   - ✅ AUTO-DETECT SERVIZIO: Estrae "SERVIZIO:" da description
   - ✅ AUTO-COMPILA SOCIETÀ: Stock Gain → SG - Lead, Finanza Efficace → FE - Lead
   - ✅ DATABASE NOMI: 500+ nomi italiani maschili e femminili
   - ✅ Andrea = Maschio confermato
   ================================================================================ */

const STORAGE_KEYS_CALENDAR = {
    CALENDAR_EVENTS: 'sgmess_calendar_events',
    LAST_SYNC: 'sgmess_last_sync',
    CONTACTED_LEADS: 'sgmess_contacted_leads' // Lead a cui abbiamo già mandato messaggi
};

let calendarSyncInterval = null;

// ===== INIT CALENDAR SYNC =====
function initCalendarSync() {
    // Carica eventi salvati all'avvio
    loadSavedEvents();
    
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

// ===== SINCRONIZZA EVENTI =====
async function syncCalendarEvents(silent = false) {
    if (!window.accessToken) {
        if (!silent) {
            showNotification('Connetti Google per sincronizzare il calendario', 'error');
        }
        return;
    }
    
    try {
        if (!silent) {
            showNotification('🔄 Sincronizzazione calendario in corso...', 'info');
        }
        
        console.log('📅 Caricamento eventi calendario...');
        
        // VERIFICA che gapi.client.calendar sia inizializzato
        if (!gapi || !gapi.client || !gapi.client.calendar) {
            console.error('❌ GAPI Calendar non inizializzato');
            if (!silent) showNotification('Errore: Google Calendar API non disponibile', 'error');
            return;
        }
        
        // STEP 1: Carica tutti i calendari disponibili
        console.log('🔍 Caricamento lista calendari...');
        const calendarListResponse = await gapi.client.calendar.calendarList.list();
        const allCalendars = calendarListResponse.result.items || [];
        console.log(`✅ Trovati ${allCalendars.length} calendari totali`);
        
        // STEP 2: Filtra SOLO i calendari desiderati
        const targetCalendarNames = [
            'SG - Call consulenza',
            'SG - Follow Up'
        ];
        
        const targetCalendars = allCalendars.filter(cal => 
            targetCalendarNames.includes(cal.summary)
        );
        
        if (targetCalendars.length === 0) {
            console.warn('⚠️ Nessun calendario SG trovato');
            if (!silent) {
                showNotification('⚠️ Calendari "SG - Call consulenza" e "SG - Follow Up" non trovati', 'warning');
            }
            return;
        }
        
        console.log(`✅ Trovati ${targetCalendars.length} calendari SG:`, targetCalendars.map(c => c.summary));
        
        // STEP 3: Carica eventi dai prossimi 30 giorni per ciascun calendario
        const now = new Date();
        const timeMin = now.toISOString();
        
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        const timeMax = futureDate.toISOString();
        
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
        
        // Salva eventi in localStorage
        const eventsData = allEvents.map(event => ({
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
        
        if (!silent) {
            showNotification(`✅ ${allEvents.length} appuntamenti sincronizzati dai calendari SG`, 'success');
        }
        
        console.log(`✅ Sincronizzati ${allEvents.length} eventi dai calendari SG`);
        
    } catch (error) {
        console.error('❌ Errore sync calendario:', error);
        if (!silent) {
            showNotification('Errore sincronizzazione calendario', 'error');
        }
    }
}

// ===== CARICA EVENTI SALVATI =====
function loadSavedEvents() {
    const eventsJSON = localStorage.getItem(STORAGE_KEYS_CALENDAR.CALENDAR_EVENTS);
    if (eventsJSON) {
        const events = JSON.parse(eventsJSON);
        console.log(`📅 Caricati ${events.length} eventi dal cache`);
        updateDaySelector();
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
function updateLeadsList() {
    const selectDay = document.getElementById('selectDay');
    if (selectDay && selectDay.value) {
        updateLeadSelectorByDate(selectDay.value);
    }
}

// ===== AGGIORNA LEAD SELECTOR DA DATA PICKER =====
function updateLeadSelectorByDate(dateString) {
    if (!dateString) return;
    
    const selectedDate = new Date(dateString + 'T00:00:00');
    
    const selectLead = document.getElementById('selectLead');
    if (!selectLead) return;
    
    const events = JSON.parse(localStorage.getItem(STORAGE_KEYS_CALENDAR.CALENDAR_EVENTS) || '[]');
    const contactedLeads = JSON.parse(localStorage.getItem(STORAGE_KEYS_CALENDAR.CONTACTED_LEADS) || '[]');
    
    // Filtra eventi per la data selezionata
    const dayEvents = events.filter(event => {
        const eventDate = new Date(event.start);
        return eventDate.toDateString() === selectedDate.toDateString();
    });
    
    // Filtra lead già contattati
    const availableLeads = dayEvents.filter(event => {
        return !contactedLeads.some(contacted => 
            contacted.eventId === event.id || 
            (contacted.nome === extractNameFromEvent(event) && 
             new Date(contacted.timestamp).toDateString() === selectedDate.toDateString())
        );
    });
    
    // Popola select
    selectLead.innerHTML = '<option value="">-- Seleziona lead --</option>';
    
    if (availableLeads.length === 0) {
        selectLead.innerHTML = '<option value="">-- Nessun lead disponibile per questo giorno --</option>';
        selectLead.disabled = true;
        return;
    }
    
    selectLead.disabled = false;
    
    availableLeads.forEach((event, index) => {
        const eventTime = new Date(event.start).toLocaleTimeString('it-IT', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const leadName = extractNameFromEvent(event);
        const option = document.createElement('option');
        option.value = index;
        option.dataset.eventId = event.id;
        option.dataset.eventData = JSON.stringify(event);
        option.textContent = `${eventTime} - ${leadName}`;
        selectLead.appendChild(option);
    });
    
    console.log(`✅ Trovati ${availableLeads.length} lead per ${dateString}`);
}

// ===== MANTIENI FUNZIONE ORIGINALE PER COMPATIBILITÀ =====
function updateLeadSelector(selectedDay) {
    const selectLead = document.getElementById('selectLead');
    if (!selectLead) return;
    
    const events = JSON.parse(localStorage.getItem(STORAGE_KEYS_CALENDAR.CALENDAR_EVENTS) || '[]');
    const contactedLeads = JSON.parse(localStorage.getItem(STORAGE_KEYS_CALENDAR.CONTACTED_LEADS) || '[]');
    
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
    
    // Filtra lead già contattati
    const availableLeads = dayEvents.filter(event => {
        // Controlla se il lead è già stato contattato
        return !contactedLeads.some(contacted => 
            contacted.eventId === event.id || 
            (contacted.nome === extractNameFromEvent(event) && 
             contacted.date === event.start)
        );
    });
    
    // Popola select
    selectLead.innerHTML = '<option value="">-- Seleziona lead --</option>';
    
    if (availableLeads.length === 0) {
        selectLead.innerHTML = '<option value="">-- Tutti i lead sono stati contattati --</option>';
        selectLead.disabled = true;
        return;
    }
    
    selectLead.disabled = false;
    
    availableLeads.forEach((event, index) => {
        const eventTime = new Date(event.start).toLocaleTimeString('it-IT', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const leadName = extractNameFromEvent(event);
        const option = document.createElement('option');
        option.value = index;
        option.dataset.eventId = event.id;
        option.dataset.eventData = JSON.stringify(event);
        option.textContent = `${eventTime} - ${leadName}`;
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
    
    // RILEVAMENTO AUTOMATICO GENERE ASSISTENTE DAL NOME LEAD
    detectGenderFromName(firstName);
    
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

// ===== RILEVA GENERE DA NOME (con database completo) =====
function detectGenderFromName(name) {
    if (!name) return;
    
    const nameLower = name.toLowerCase().trim();
    
    // Usa database nomi caricato da nomi-italiani.js
    const nomiMaschili = window.NOMI_MASCHILI || [];
    const nomiFemminili = window.NOMI_FEMMINILI || [];
    
    let gender = 'M'; // Default maschio
    
    // PRIORITÀ 1: Check database nomi
    if (nomiFemminili.includes(nameLower)) {
        gender = 'F';
    } else if (nomiMaschili.includes(nameLower)) {
        gender = 'M';
    } else {
        // PRIORITÀ 2: Euristiche per nomi non in lista
        // Molti nomi femminili italiani finiscono con 'a'
        if (nameLower.endsWith('a') && !nameLower.endsWith('ca')) {
            gender = 'F';
        }
        // Alcuni pattern maschili
        if (nameLower.endsWith('o') || nameLower.endsWith('e')) {
            gender = 'M';
        }
    }
    
    // Imposta il toggle button
    const toggleButtons = document.querySelectorAll('.toggle-btn[data-value]');
    toggleButtons.forEach(btn => {
        if (btn.dataset.value === gender) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    console.log(`🔍 Genere rilevato per "${name}": ${gender === 'M' ? 'Maschio' : 'Femmina'}`);
}

// ===== MARCA LEAD COME CONTATTATO =====
function markLeadAsContacted(eventId, nome, cognome, telefono) {
    const contactedLeads = JSON.parse(localStorage.getItem(STORAGE_KEYS_CALENDAR.CONTACTED_LEADS) || '[]');
    
    const contactedEntry = {
        eventId: eventId,
        nome: nome,
        cognome: cognome,
        telefono: telefono,
        timestamp: new Date().toISOString()
    };
    
    contactedLeads.push(contactedEntry);
    localStorage.setItem(STORAGE_KEYS_CALENDAR.CONTACTED_LEADS, JSON.stringify(contactedLeads));
    
    console.log('✅ Lead marcato come contattato:', nome);
}

// ===== VISUALIZZA CALENDARIO =====
function displayCalendarView() {
    const calendarView = document.getElementById('calendarView');
    if (!calendarView) return;
    
    const events = JSON.parse(localStorage.getItem(STORAGE_KEYS_CALENDAR.CALENDAR_EVENTS) || '[]');
    const contactedLeads = JSON.parse(localStorage.getItem(STORAGE_KEYS_CALENDAR.CONTACTED_LEADS) || '[]');
    
    if (events.length === 0) {
        calendarView.innerHTML = '<p class="placeholder-text">Nessun evento sincronizzato. Connetti Google e sincronizza.</p>';
        return;
    }
    
    // Raggruppa eventi per giorno
    const eventsByDay = {};
    
    events.forEach(event => {
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
        refreshLeadsBtn.addEventListener('click', () => {
            const selectDay = document.getElementById('selectDay');
            if (selectDay && selectDay.value) {
                updateLeadSelectorByDate(selectDay.value);
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
        selectDay.addEventListener('change', function() {
            const selectedDate = this.value; // Format: YYYY-MM-DD
            if (selectedDate) {
                updateLeadSelectorByDate(selectedDate);
            } else {
                const selectLead = document.getElementById('selectLead');
                selectLead.innerHTML = '<option value="">-- Seleziona una data --</option>';
                selectLead.disabled = true;
            }
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

console.log('✅ Google Calendar module v2.2.12 caricato');
