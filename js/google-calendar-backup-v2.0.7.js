/* ================================================================================
   GOOGLE CALENDAR SYNC - TESTmess v2.0.5
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
            showNotification('Sincronizzazione calendario in corso...', 'info');
        }
        
        // Carica eventi dai prossimi 30 giorni
        const now = new Date();
        const timeMin = now.toISOString();
        
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        const timeMax = futureDate.toISOString();
        
        const response = await gapi.client.calendar.events.list({
            'calendarId': 'primary',
            'timeMin': timeMin,
            'timeMax': timeMax,
            'showDeleted': false,
            'singleEvents': true,
            'orderBy': 'startTime'
        });
        
        const events = response.result.items || [];
        
        // Salva eventi in localStorage
        const eventsData = events.map(event => ({
            id: event.id,
            summary: event.summary || 'Senza titolo',
            description: event.description || '',
            start: event.start.dateTime || event.start.date,
            end: event.end.dateTime || event.end.date,
            attendees: event.attendees || [],
            location: event.location || ''
        }));
        
        localStorage.setItem(STORAGE_KEYS_CALENDAR.CALENDAR_EVENTS, JSON.stringify(eventsData));
        localStorage.setItem(STORAGE_KEYS_CALENDAR.LAST_SYNC, new Date().toISOString());
        
        // Aggiorna UI
        updateDaySelector();
        
        if (!silent) {
            showNotification(`✅ ${events.length} appuntamenti sincronizzati`, 'success');
        }
        
        console.log(`✅ Sincronizzati ${events.length} eventi dal calendario`);
        
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

// ===== AGGIORNA DROPDOWN GIORNI =====
function updateDaySelector() {
    const selectDay = document.getElementById('selectDay');
    if (!selectDay) return;
    
    const events = JSON.parse(localStorage.getItem(STORAGE_KEYS_CALENDAR.CALENDAR_EVENTS) || '[]');
    
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
        
        eventsByDay[dateKey].push(event);
    });
    
    // Popola select
    selectDay.innerHTML = '<option value="">-- Seleziona un giorno --</option>';
    
    Object.keys(eventsByDay).sort((a, b) => {
        const dateA = eventsByDay[a][0].start;
        const dateB = eventsByDay[b][0].start;
        return new Date(dateA) - new Date(dateB);
    }).forEach(dateKey => {
        const option = document.createElement('option');
        option.value = dateKey;
        option.textContent = `${dateKey} (${eventsByDay[dateKey].length} appuntamenti)`;
        selectDay.appendChild(option);
    });
}

// ===== AGGIORNA DROPDOWN LEAD =====
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

// ===== ESTRAI NOME DA EVENTO =====
function extractNameFromEvent(event) {
    // Cerca il nome nel summary o description
    let name = event.summary || 'Senza nome';
    
    // Rimuovi parole comuni come "Appuntamento con", "Call con", etc.
    name = name.replace(/(appuntamento con|call con|meeting con|videocall con)/gi, '').trim();
    
    // Se c'è un attendee, usa quello
    if (event.attendees && event.attendees.length > 0) {
        const attendee = event.attendees[0];
        if (attendee.displayName) {
            name = attendee.displayName;
        } else if (attendee.email) {
            name = attendee.email.split('@')[0];
        }
    }
    
    return name;
}

// ===== ESTRAI TELEFONO DA EVENTO =====
function extractPhoneFromEvent(event) {
    // Cerca numero di telefono in description o location
    const text = `${event.description} ${event.location}`;
    
    // Pattern per numeri italiani
    const phonePattern = /(\+39|0039)?[\s]?([3][0-9]{2})[\s]?([0-9]{6,7})|(\+39|0039)?[\s]?([0-9]{2,4})[\s]?([0-9]{6,8})/g;
    const match = text.match(phonePattern);
    
    if (match && match[0]) {
        return match[0].replace(/\s+/g, '');
    }
    
    return '';
}

// ===== COMPILA FORM DA EVENTO =====
function fillFormFromEvent(event) {
    const leadName = extractNameFromEvent(event);
    const phone = extractPhoneFromEvent(event);
    
    // Compila campi
    const names = leadName.split(' ');
    const firstName = names[0] || '';
    const lastName = names.slice(1).join(' ') || '';
    
    document.getElementById('nome').value = firstName;
    document.getElementById('cognome').value = lastName;
    document.getElementById('telefono').value = phone;
    
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
    
    // Aggiorna anteprima
    updatePreview();
    
    console.log('✅ Form compilato da evento:', leadName);
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
                updateLeadSelector(selectDay.value);
                showNotification('Lista lead aggiornata!', 'success');
            } else {
                updateDaySelector();
                showNotification('Lista giorni aggiornata!', 'success');
            }
        });
    }
    
    // Cambio giorno
    const selectDay = document.getElementById('selectDay');
    if (selectDay) {
        selectDay.addEventListener('change', function() {
            const selectedDay = this.value;
            if (selectedDay) {
                updateLeadSelector(selectedDay);
            } else {
                const selectLead = document.getElementById('selectLead');
                selectLead.innerHTML = '<option value="">-- Prima scegli un giorno --</option>';
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
window.displayCalendarView = displayCalendarView;

console.log('✅ Google Calendar module v2.0.5 caricato');
