/* ================================================================================
   GOOGLE SHEETS ASSISTENTI GENERE - v2.2.13
   Sistema di apprendimento genere assistenti usando Google Sheets
   ================================================================================ */

// ===== CONFIGURAZIONE =====
const ASSISTENTI_CONFIG = {
    SPREADSHEET_ID: '1qHgIBHo1a_TW7mfFDkX2cjKDOKTlCJqKpfXjfLhZNNo', // ID del foglio condiviso
    SHEET_NAME: 'AssistentiGenere',
    CACHE_KEY: 'sgmess_assistenti_cache',
    CACHE_DURATION: 24 * 60 * 60 * 1000 // 24 ore in millisecondi
};

let sheetsAPIReady = false;
let genderCache = null;

// ===== INIZIALIZZAZIONE SHEETS API =====
async function initSheetsAPI() {
    if (sheetsAPIReady) return true;
    
    try {
        // Verifica che gapi sia caricato e autenticato
        if (!window.gapi || !window.gapi.client || !window.accessToken) {
            console.warn('⚠️ Google Sheets: gapi non pronto o utente non loggato');
            return false;
        }
        
        // Carica Sheets API
        await window.gapi.client.load('sheets', 'v4');
        sheetsAPIReady = true;
        console.log('✅ Google Sheets API inizializzata');
        return true;
    } catch (error) {
        console.error('❌ Errore init Sheets API:', error);
        return false;
    }
}

// ===== CARICA CACHE LOCALE =====
function loadLocalCache() {
    try {
        const cacheData = localStorage.getItem(ASSISTENTI_CONFIG.CACHE_KEY);
        if (!cacheData) return null;
        
        const cache = JSON.parse(cacheData);
        const now = Date.now();
        
        // Verifica se la cache è scaduta
        if (cache.timestamp && (now - cache.timestamp) < ASSISTENTI_CONFIG.CACHE_DURATION) {
            console.log(`✅ Cache assistenti caricata (${Object.keys(cache.data).length} nomi)`);
            return cache.data;
        } else {
            console.log('⚠️ Cache assistenti scaduta, verrà ricaricata');
            return null;
        }
    } catch (error) {
        console.error('❌ Errore caricamento cache:', error);
        return null;
    }
}

// ===== SALVA CACHE LOCALE =====
function saveLocalCache(data) {
    try {
        const cache = {
            timestamp: Date.now(),
            data: data
        };
        localStorage.setItem(ASSISTENTI_CONFIG.CACHE_KEY, JSON.stringify(cache));
        console.log(`✅ Cache assistenti salvata (${Object.keys(data).length} nomi)`);
    } catch (error) {
        console.error('❌ Errore salvataggio cache:', error);
    }
}

// ===== CARICA TUTTI GLI ASSISTENTI DA SHEETS =====
async function loadAllAssistenti() {
    // Prova prima con la cache
    const cachedData = loadLocalCache();
    if (cachedData) {
        genderCache = cachedData;
        return cachedData;
    }
    
    // Verifica autenticazione
    if (!window.accessToken) {
        console.warn('⚠️ Utente non loggato - uso cache vuota');
        genderCache = {};
        return {};
    }
    
    // Inizializza Sheets API
    const inited = await initSheetsAPI();
    if (!inited) {
        genderCache = {};
        return {};
    }
    
    try {
        console.log('🔄 Caricamento assistenti da Google Sheets...');
        
        const response = await window.gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: ASSISTENTI_CONFIG.SPREADSHEET_ID,
            range: `${ASSISTENTI_CONFIG.SHEET_NAME}!A2:B` // Salta header
        });
        
        const rows = response.result.values || [];
        const data = {};
        
        rows.forEach(row => {
            if (row[0] && row[1]) {
                const nome = row[0].trim().toLowerCase();
                const genere = row[1].trim().toUpperCase();
                if (genere === 'M' || genere === 'F') {
                    data[nome] = genere;
                }
            }
        });
        
        console.log(`✅ Caricati ${Object.keys(data).length} assistenti da Sheets`);
        
        // Salva in cache
        saveLocalCache(data);
        genderCache = data;
        
        return data;
    } catch (error) {
        console.error('❌ Errore caricamento assistenti:', error);
        genderCache = {};
        return {};
    }
}

// ===== SALVA NUOVO ASSISTENTE SU SHEETS =====
async function saveAssistenteGenere(nome, genere) {
    // Verifica autenticazione
    if (!window.accessToken) {
        console.warn('⚠️ Utente non loggato - salvataggio saltato');
        return false;
    }
    
    // Inizializza Sheets API
    const inited = await initSheetsAPI();
    if (!inited) return false;
    
    try {
        console.log(`🔄 Salvataggio assistente: ${nome} = ${genere}`);
        
        // Aggiungi riga al foglio
        const response = await window.gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: ASSISTENTI_CONFIG.SPREADSHEET_ID,
            range: `${ASSISTENTI_CONFIG.SHEET_NAME}!A:B`,
            valueInputOption: 'RAW',
            resource: {
                values: [[nome, genere]]
            }
        });
        
        console.log(`✅ Assistente ${nome} salvato su Sheets`);
        
        // Aggiorna cache locale
        if (!genderCache) genderCache = {};
        genderCache[nome.toLowerCase()] = genere;
        saveLocalCache(genderCache);
        
        return true;
    } catch (error) {
        console.error('❌ Errore salvataggio assistente:', error);
        return false;
    }
}

// ===== CERCA GENERE ASSISTENTE =====
async function checkAssistenteGender(nome) {
    if (!nome || nome.trim() === '') return null;
    
    const nomeLower = nome.trim().toLowerCase();
    
    // Se cache non caricata, caricala
    if (!genderCache) {
        await loadAllAssistenti();
    }
    
    // Cerca in cache
    if (genderCache && genderCache[nomeLower]) {
        console.log(`✅ Genere trovato in cache: ${nome} = ${genderCache[nomeLower]}`);
        return genderCache[nomeLower];
    }
    
    console.log(`⚠️ Genere non trovato per: ${nome}`);
    return null;
}

// ===== MOSTRA POPUP SELEZIONE GENERE =====
function showGenderSelectionPopup(nomeOperatore, callback) {
    // Crea overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    // Crea popup
    const popup = document.createElement('div');
    popup.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 30px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        text-align: center;
    `;
    
    popup.innerHTML = `
        <div style="margin-bottom: 20px;">
            <i class="fas fa-user-circle" style="font-size: 48px; color: #4285f4; margin-bottom: 15px;"></i>
            <h3 style="margin: 0 0 10px 0; color: #333; font-size: 20px;">Assistente: <strong>${nomeOperatore}</strong></h3>
            <p style="margin: 0; color: #666; font-size: 14px;">È maschio o femmina? (Verrà ricordato per la prossima volta)</p>
        </div>
        
        <div style="display: flex; gap: 15px; justify-content: center; margin-top: 25px;">
            <button id="genderBtnM" style="
                flex: 1;
                padding: 15px 25px;
                border: 2px solid #4285f4;
                background: white;
                color: #4285f4;
                border-radius: 8px;
                font-size: 16px;
                cursor: pointer;
                transition: all 0.2s;
                font-weight: 600;
            ">
                <i class="fas fa-mars"></i> Maschio
            </button>
            <button id="genderBtnF" style="
                flex: 1;
                padding: 15px 25px;
                border: 2px solid #ea4335;
                background: white;
                color: #ea4335;
                border-radius: 8px;
                font-size: 16px;
                cursor: pointer;
                transition: all 0.2s;
                font-weight: 600;
            ">
                <i class="fas fa-venus"></i> Femmina
            </button>
        </div>
    `;
    
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    
    // Stile hover per i pulsanti
    const btnM = popup.querySelector('#genderBtnM');
    const btnF = popup.querySelector('#genderBtnF');
    
    btnM.addEventListener('mouseenter', () => {
        btnM.style.background = '#4285f4';
        btnM.style.color = 'white';
    });
    btnM.addEventListener('mouseleave', () => {
        btnM.style.background = 'white';
        btnM.style.color = '#4285f4';
    });
    
    btnF.addEventListener('mouseenter', () => {
        btnF.style.background = '#ea4335';
        btnF.style.color = 'white';
    });
    btnF.addEventListener('mouseleave', () => {
        btnF.style.background = 'white';
        btnF.style.color = '#ea4335';
    });
    
    // Gestione click
    btnM.addEventListener('click', async () => {
        document.body.removeChild(overlay);
        await saveAssistenteGenere(nomeOperatore, 'M');
        callback('M');
    });
    
    btnF.addEventListener('click', async () => {
        document.body.removeChild(overlay);
        await saveAssistenteGenere(nomeOperatore, 'F');
        callback('F');
    });
}

// ===== ESPORTA FUNZIONI =====
window.AssistentiGender = {
    check: checkAssistenteGender,
    save: saveAssistenteGenere,
    showPopup: showGenderSelectionPopup,
    loadAll: loadAllAssistenti
};

console.log('✅ Google Sheets Assistenti module v2.2.16 caricato');
