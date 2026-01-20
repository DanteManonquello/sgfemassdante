/* ================================================================================
   RUBRICA - TESTmess v2.2.27
   
   Gestisce l'elenco dei contatti NON ancora salvati in rubrica Google.
   Mostra una sezione laterale con i nominativi da salvare.
   ================================================================================ */

const STORAGE_KEYS_RUBRICA = {
    SAVED_CONTACTS: 'sgmess_saved_contacts', // Cache dei contatti già salvati
    LAST_RUBRICA_SYNC: 'sgmess_last_rubrica_sync'
};

// ===== INIZIALIZZAZIONE =====
function initRubrica() {
    console.log('📒 Rubrica module initialized');
    
    // Event listener per pulsante aggiorna rubrica
    const refreshBtn = document.getElementById('refreshRubricaBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            await syncSavedContactsFromGoogle();
        });
    }
}

// ===== OTTIENI CONTATTI NON SALVATI =====
function getUnsavedContacts() {
    // 1. Carica cronologia messaggi
    const cronologiaJSON = localStorage.getItem(STORAGE_KEYS.CRONOLOGIA);
    let cronologia = [];
    if (cronologiaJSON) {
        try {
            cronologia = JSON.parse(cronologiaJSON);
        } catch (e) {
            console.error('❌ Errore parsing cronologia:', e);
        }
    }
    
    // 2. Carica eventi calendario
    const calendarEventsJSON = localStorage.getItem('sgmess_calendar_events');
    let calendarEvents = [];
    if (calendarEventsJSON) {
        try {
            calendarEvents = JSON.parse(calendarEventsJSON);
        } catch (e) {
            console.error('❌ Errore parsing calendar events:', e);
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
    
    console.log(`📒 Trovati ${unsavedArray.length} contatti non salvati (${cronologia.length} da cronologia, ${calendarEvents.length} da calendario)`);
    return unsavedArray;
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
    // Rimuovi spazi, +, trattini
    return phone.replace(/[\s\+\-\(\)]/g, '');
}

// ===== MARCA CONTATTO COME SALVATO =====
function markContactAsSaved(phone) {
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
    
    // Aggiorna UI
    renderRubricaList();
}

// ===== RIMUOVI CONTATTO DA SALVATI (per annullare) =====
function unmarkContactAsSaved(phone) {
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
    
    renderRubricaList();
}

// ===== SINCRONIZZA CON GOOGLE CONTACTS =====
async function syncSavedContactsFromGoogle() {
    if (!window.accessToken) {
        mostraNotifica('Connetti Google per sincronizzare la rubrica', 'error');
        return;
    }
    
    try {
        mostraNotifica('🔄 Sincronizzazione rubrica Google in corso...', 'info');
        console.log('📇 Sincronizzazione rubrica Google...');
        
        // Carica tutti i contatti da Google People API
        const response = await gapi.client.people.people.connections.list({
            'resourceName': 'people/me',
            'pageSize': 1000,
            'personFields': 'names,phoneNumbers'
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
        
        console.log(`💾 ${Object.keys(savedContacts).length} contatti sincronizzati`);
        mostraNotifica(`✅ Rubrica sincronizzata: ${Object.keys(savedContacts).length} contatti`, 'success');
        
        // Aggiorna UI
        renderRubricaList();
        
    } catch (error) {
        console.error('❌ Errore sync rubrica:', error);
        mostraNotifica('Errore sincronizzazione rubrica Google', 'error');
    }
}

// ===== SALVA CONTATTO IN GOOGLE CONTACTS =====
async function saveContactToGoogle(contactData) {
    if (!window.accessToken) {
        mostraNotifica('Connetti Google per salvare in rubrica', 'error');
        return false;
    }
    
    try {
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
        
        // Salva in Google
        const response = await gapi.client.people.people.createContact({
            resource: contact
        });
        
        console.log('✅ Contatto salvato in Google:', response);
        
        // Marca come salvato nel cache locale
        markContactAsSaved(contactData.telefono);
        
        mostraNotifica(`✅ ${contactData.nome} salvato in rubrica Google`, 'success');
        return true;
        
    } catch (error) {
        console.error('❌ Errore salvataggio contatto:', error);
        mostraNotifica('Errore salvataggio in rubrica Google', 'error');
        return false;
    }
}

// ===== RENDER LISTA RUBRICA =====
function renderRubricaList() {
    const container = document.getElementById('rubricaList');
    if (!container) return;
    
    // STEP 1: Verifica se hai mai sincronizzato
    const lastSync = localStorage.getItem(STORAGE_KEYS_RUBRICA.LAST_RUBRICA_SYNC);
    const hasSynced = !!lastSync;
    
    // STEP 2: Verifica se hai cronologia o eventi
    const cronologiaJSON = localStorage.getItem(STORAGE_KEYS.CRONOLOGIA);
    const calendarEventsJSON = localStorage.getItem('sgmess_calendar_events');
    const hasCronologia = cronologiaJSON && JSON.parse(cronologiaJSON).length > 0;
    const hasCalendar = calendarEventsJSON && JSON.parse(calendarEventsJSON).length > 0;
    const hasAnyData = hasCronologia || hasCalendar;
    
    // STEP 3: Ottieni contatti non salvati
    const unsavedContacts = getUnsavedContacts();
    
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
    
    // Limita a 50 elementi per performance
    const displayContacts = unsavedContacts.slice(0, 50);
    const remaining = unsavedContacts.length - displayContacts.length;
    
    container.innerHTML = `
        <div class="rubrica-header" style="margin-bottom: 20px; padding: 12px; background: var(--gray-100); border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <strong style="color: var(--primary-color);">
                    <i class="fas fa-address-book"></i> 
                    ${unsavedContacts.length} contatti da salvare
                </strong>
                <button type="button" class="btn-icon" id="refreshRubricaBtn" title="Sincronizza con Google">
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
                Altri ${remaining} contatti non mostrati (mostra i primi 50)
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
        btn.addEventListener('click', function() {
            markContactAsSaved(this.dataset.phone);
            mostraNotifica('Contatto marcato come già salvato', 'success');
        });
    });
    
    // Re-attach event listener per refresh (potrebbe essere ricreato)
    const refreshBtn = document.getElementById('refreshRubricaBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            await syncSavedContactsFromGoogle();
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
