/* ================================================================================
   GOOGLE DRIVE STORAGE - v2.5.19
   Sostituisce localStorage con Google Drive API (AppDataFolder)
   
   CHANGELOG v2.5.19:
   - ✅ GESTIONE 403/404: File non trovati su Drive creati automaticamente
   - ✅ ERRORI SILENTI: Nessun errore console per file mancanti (prima volta)
   ================================================================================ */

// ===== CONFIGURAZIONE =====
const DRIVE_FILES = {
    CRONOLOGIA: 'testmess_cronologia.json',
    TEMPLATES: 'testmess_templates.json',
    LAST_MESSAGE: 'testmess_last_message.json',
    OPERATOR_NAME: 'testmess_operator_name.json',
    CONTACTED_LEADS: 'testmess_contacted_leads.json' // ✅ NUOVO: Lead contattati persistenti
};

let driveInited = false;
let driveFileCache = {}; // Cache file IDs per performance

// ===== INIZIALIZZAZIONE DRIVE API =====
async function initDriveAPI() {
    if (driveInited) return true;
    
    try {
        // Verifica che gapi sia caricato e autenticato
        if (!window.gapi || !window.gapi.client || !window.accessToken) {
            console.warn('⚠️ Google Drive: gapi non pronto o utente non loggato');
            return false;
        }
        
        // Carica Drive API
        await window.gapi.client.load('drive', 'v3');
        driveInited = true;
        console.log('✅ Google Drive API inizializzata');
        return true;
    } catch (error) {
        console.error('❌ Errore init Drive API:', error);
        return false;
    }
}

// ===== TROVA FILE SU DRIVE =====
async function findDriveFile(fileName) {
    try {
        const response = await window.gapi.client.drive.files.list({
            spaces: 'appDataFolder',
            fields: 'files(id, name)',
            q: `name='${fileName}'`
        });
        
        const files = response.result.files;
        if (files && files.length > 0) {
            driveFileCache[fileName] = files[0].id;
            return files[0].id;
        }
        return null;
    } catch (error) {
        console.error(`❌ Errore ricerca file ${fileName}:`, error);
        return null;
    }
}

// ===== LEGGI DA DRIVE =====
async function loadFromDrive(key) {
    const fileName = DRIVE_FILES[key];
    if (!fileName) {
        console.error(`❌ Key "${key}" non valida`);
        return null;
    }
    
    // Verifica autenticazione
    if (!window.accessToken) {
        console.warn('⚠️ Utente non loggato - impossibile caricare da Drive');
        return null;
    }
    
    // Inizializza Drive API
    const inited = await initDriveAPI();
    if (!inited) return null;
    
    try {
        // Trova file
        let fileId = driveFileCache[fileName];
        if (!fileId) {
            fileId = await findDriveFile(fileName);
        }
        
        if (!fileId) {
            console.log(`📂 File ${fileName} non esiste su Drive (prima volta)`);
            return null;
        }
        
        // Scarica contenuto
        const response = await window.gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        });
        
        return response.result;
    } catch (error) {
        // v2.5.19: Gestione 403/404 - File non trovato o permessi insufficienti
        if (error.status === 404 || error.status === 403) {
            console.warn(`⚠️ File ${fileName} non trovato o non accessibile (${error.status}) - Verrà creato al primo salvataggio`);
            return null; // Ritorna null invece di errore - verrà creato in saveToDrive
        }
        console.error(`❌ Errore lettura ${fileName}:`, error);
        return null;
    }
}

// ===== SALVA SU DRIVE =====
async function saveToDrive(key, data) {
    const fileName = DRIVE_FILES[key];
    if (!fileName) {
        console.error(`❌ Key "${key}" non valida`);
        return false;
    }
    
    // Verifica autenticazione
    if (!window.accessToken) {
        console.warn('⚠️ Utente non loggato - impossibile salvare su Drive');
        return false;
    }
    
    // Inizializza Drive API
    const inited = await initDriveAPI();
    if (!inited) return false;
    
    try {
        // Trova file esistente
        let fileId = driveFileCache[fileName];
        if (!fileId) {
            fileId = await findDriveFile(fileName);
        }
        
        const metadata = {
            name: fileName,
            mimeType: 'application/json'
        };
        
        // Se non esiste, specificare parent appDataFolder
        if (!fileId) {
            metadata.parents = ['appDataFolder'];
        }
        
        const jsonData = JSON.stringify(data);
        const boundary = '-------314159265358979323846';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";
        
        const multipartRequestBody =
            delimiter +
            'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            jsonData +
            close_delim;
        
        const method = fileId ? 'PATCH' : 'POST';
        const path = fileId 
            ? `/upload/drive/v3/files/${fileId}`
            : '/upload/drive/v3/files';
        
        const response = await window.gapi.client.request({
            path: path,
            method: method,
            params: {
                uploadType: 'multipart'
            },
            headers: {
                'Content-Type': 'multipart/related; boundary="' + boundary + '"'
            },
            body: multipartRequestBody
        });
        
        // Aggiorna cache con nuovo ID
        if (response.result && response.result.id) {
            driveFileCache[fileName] = response.result.id;
        }
        
        console.log(`✅ Salvato ${fileName} su Drive`);
        return true;
    } catch (error) {
        console.error(`❌ Errore salvataggio ${fileName}:`, error);
        return false;
    }
}

// ===== MIGRAZIONE DATI DA LOCALSTORAGE (UNA TANTUM) =====
async function migrateLocalStorageToDrive() {
    // Verifica se già migrato
    const migrated = localStorage.getItem('sgmess_migrated_to_drive');
    if (migrated === 'true') {
        console.log('✅ Dati già migrati su Drive in precedenza');
        return;
    }
    
    // Verifica autenticazione
    if (!window.accessToken) {
        console.warn('⚠️ Impossibile migrare: utente non loggato');
        return;
    }
    
    console.log('🔄 Inizio migrazione dati localStorage → Google Drive...');
    
    const migrations = [
        { localKey: 'sgmess_cronologia', driveKey: 'CRONOLOGIA' },
        { localKey: 'sgmess_templates', driveKey: 'TEMPLATES' },
        { localKey: 'sgmess_last_message', driveKey: 'LAST_MESSAGE' },
        { localKey: 'sgmess_operator_name', driveKey: 'OPERATOR_NAME' }
    ];
    
    let migratedCount = 0;
    
    for (const { localKey, driveKey } of migrations) {
        const localData = localStorage.getItem(localKey);
        if (localData) {
            try {
                const parsedData = JSON.parse(localData);
                const success = await saveToDrive(driveKey, parsedData);
                if (success) {
                    migratedCount++;
                    console.log(`✅ Migrato ${localKey} → Drive`);
                }
            } catch (error) {
                console.error(`❌ Errore migrazione ${localKey}:`, error);
            }
        }
    }
    
    if (migratedCount > 0) {
        localStorage.setItem('sgmess_migrated_to_drive', 'true');
        console.log(`✅ Migrazione completata: ${migratedCount} elementi su Drive`);
    }
}

// ===== FUNZIONI GESTIONE LEAD CONTATTATI =====
async function getContactedLeads() {
    if (!window.accessToken) return [];
    
    const data = await loadFromDrive('CONTACTED_LEADS');
    return data || [];
}

async function saveContactedLead(leadData) {
    if (!window.accessToken) return false;
    
    const leads = await getContactedLeads();
    
    // Evita duplicati (stesso eventId o stessa combinazione nome+data)
    const exists = leads.some(lead => 
        lead.eventId === leadData.eventId ||
        (lead.nome === leadData.nome && lead.date === leadData.date)
    );
    
    if (!exists) {
        leads.push({
            ...leadData,
            timestamp: new Date().toISOString()
        });
        
        await saveToDrive('CONTACTED_LEADS', leads);
        console.log('✅ Lead salvato su Drive:', leadData.nome);
    }
    
    return true;
}

async function clearContactedLeads() {
    if (!window.accessToken) return false;
    await saveToDrive('CONTACTED_LEADS', []);
    console.log('🗑️ Lead contattati azzerati su Drive');
    return true;
}

// ===== WRAPPER FUNZIONI PER COMPATIBILITÀ =====
window.DriveStorage = {
    load: loadFromDrive,
    save: saveToDrive,
    migrate: migrateLocalStorageToDrive,
    getContactedLeads: getContactedLeads,
    saveContactedLead: saveContactedLead,
    clearContactedLeads: clearContactedLeads
};
