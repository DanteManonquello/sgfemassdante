/* ================================================================================
   GOOGLE AUTH - VERSIONE 2.2.24
   
   CHANGELOG 2.2.24:
   - ✅ FIX DEFINITIVO: Nuovo Client ID OAuth dedicato al progetto
   - ✅ Client ID: 432043907250-1p21bdmnebrjfa541kik7eosork5etpe
   - ✅ Origin autorizzato: https://dantemanonquello.github.io
   - ✅ Redirect URI: https://dantemanonquello.github.io/sgfemassdante/
   
   CHANGELOG 2.2.23:
   - ✅ FIX CRITICO: REDIRECT_URI hardcodato per sgfemassdante
   - ✅ Timeout esteso a 10 secondi per OAuth flow completo
   - ✅ Error handling migliorato con retry automatico
   - ✅ Logging dettagliato per troubleshooting OAuth
   - ✅ Fallback mechanism su popup_failed_to_open
   
   CHANGELOG 2.2.20:
   - ✅ FIX CRITICO: Priorità corretta estrazione setter
   - ✅ "Nome setter:" in description PRIMA di "()" nel title
   - ✅ Regex robusta case-insensitive con \r\n handling
   
   CHANGELOG 2.2.18:
   - ✅ DEBUG logging completo per troubleshooting genere setter
   
   CHANGELOG 2.2.17:
   - ✅ Rilevazione automatica genere setter da database nomi italiani
   - ✅ Popup genere solo per nomi sconosciuti (intelligente)
   
   CHANGELOG 2.2.12:
   - ✅ CRITICO: Client ID universale per evitare redirect_uri_mismatch
   - ✅ Scope Drive aggiunto per AppDataFolder storage
   - ✅ Rimosso localStorage Client ID (hardcoded universale)
   - ✅ URI autorizzati: localhost, sandbox, Netlify, Vercel
   ================================================================================ */

// ===== CONFIGURAZIONE =====
// IMPORTANTE: Client ID OAuth DEDICATO al progetto "Massaggiatore GitHub1 20260113"
// Progetto: Massaggiatore
// Creato: 13 gennaio 2026
// URI JavaScript autorizzati:
//   - https://dantemanonquello.github.io
// URI di reindirizzamento autorizzati:
//   - (verranno aggiunti automaticamente dalla schermata di consenso)
const GOOGLE_CLIENT_ID = '432043907250-1p21bdmnebrjfa541kik7eosork5etpe.apps.googleusercontent.com';
// FIX 2.2.23: REDIRECT_URI hardcodato per sgfemassdante (non più dinamico)
const REDIRECT_URI = 'https://dantemanonquello.github.io/sgfemassdante/';
const GOOGLE_API_KEY = 'AIzaSyDm2z0X0d6a73Uhe9wZpFLkZqnVY3EAJuQ';
const SCOPES = [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/contacts',
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/drive.appdata'
].join(' ');

let tokenClient;
let accessToken = null;
let gapiInited = false;
let gisInited = false;
let userProfileData = null;
let authDebugMode = localStorage.getItem('sgmess_debug_mode') === 'true';

// ===== RIMOSSE FUNZIONI SETUP WIZARD (v2.2.7) =====
// per eliminare messaggi di errore OAuth visibili all'utente

function toggleDebugMode() {
    authDebugMode = !authDebugMode;
    localStorage.setItem('sgmess_debug_mode', authDebugMode.toString());
    
    const debugPanel = document.getElementById('authDebugPanel');
    if (debugPanel) {
        debugPanel.style.display = authDebugMode ? 'block' : 'none';
    }
    
    if (window.mostraNotifica) {
        mostraNotifica(`Debug mode: ${authDebugMode ? 'ON' : 'OFF'}`, 'info');
    }
}

function logDebug(message, data = null) {
    if (!authDebugMode) return;
    
    const debugOutput = document.getElementById('debugOutput');
    if (!debugOutput) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.style.marginBottom = '8px';
    logEntry.style.fontSize = '12px';
    logEntry.innerHTML = `<strong>[${timestamp}]</strong> ${message}`;
    
    if (data) {
        logEntry.innerHTML += `<br><code style="color: #666;">${JSON.stringify(data, null, 2)}</code>`;
    }
    
    debugOutput.appendChild(logEntry);
    debugOutput.scrollTop = debugOutput.scrollHeight;
}

// ===== INIT GAPI =====
function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
    try {
        await gapi.client.init({
            apiKey: GOOGLE_API_KEY,
            discoveryDocs: [
                'https://people.googleapis.com/$discovery/rest?version=v1',
                'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'
            ],
        });
        gapiInited = true;
        maybeEnableButtons();
        console.log('✅ Google API Client inizializzato');
        logDebug('✅ GAPI inizializzato correttamente');
    } catch (error) {
        console.error('❌ Errore GAPI:', error);
        logDebug('❌ Errore GAPI', error);
        gapiInited = true; // Continua comunque
        maybeEnableButtons();
    }
}

// ===== INIT GIS =====
function gisLoaded() {
    try {
        // Client ID universale già configurato (hardcoded)
        console.log('🔑 Client ID:', GOOGLE_CLIENT_ID);
        console.log('🌐 Redirect URI:', REDIRECT_URI);
        console.log('🔐 Scopes:', SCOPES);
        
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: SCOPES,
            callback: handleAuthResponse,
            error_callback: handleAuthError,
        });
        
        gisInited = true;
        maybeEnableButtons();
        console.log('✅ Google Identity Services inizializzato (popup mode)');
        logDebug('✅ GIS inizializzato', { 
            clientId: GOOGLE_CLIENT_ID.substring(0, 20) + '...', 
            origin: window.location.origin 
        });
    } catch (error) {
        console.error('❌ Errore GIS init:', error);
        logDebug('❌ Errore inizializzazione GIS', error);
        // Silent fail - no wizard
    }
}

function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        const btn = document.getElementById('googleSignInBtn');
        if (btn) {
            btn.disabled = false;
            console.log('✅ Pulsante Google abilitato');
            logDebug('✅ Pulsante login abilitato');
        }
    }
}

// ===== AUTH =====
function handleAuthClick() {
    try {
        console.log('🔐 Richiesta autenticazione...');
        console.log('📍 Current Origin:', window.location.origin);
        console.log('🔑 Client ID:', GOOGLE_CLIENT_ID.substring(0, 30) + '...');
        
        logDebug('🔐 Tentativo autenticazione', {
            origin: window.location.origin,
            clientIdPrefix: GOOGLE_CLIENT_ID.substring(0, 30) + '...'
        });
        
        if (!tokenClient) {
            console.error('❌ Token client non inizializzato');
            logDebug('❌ Token client null');
            mostraNotifica('Errore: servizio Google non inizializzato', 'error');
            // Silent fail (v2.2.7)
            return;
        }
        
        // Flag per tracciare se l'auth è andata a buon fine
        let authSuccessful = false;
        let authAttempted = false;
        
        // FIX 2.2.23: Timeout esteso a 10 secondi per OAuth flow completo
        const authTimeout = setTimeout(() => {
            if (!authSuccessful && authAttempted) {
                console.error('⏱️ Timeout autenticazione dopo 10s - possibile errore OAuth');
                console.error('📍 URL corrente:', window.location.href);
                console.error('🔗 Redirect URI configurato:', REDIRECT_URI);
                const errorMsg = `<strong>Timeout autenticazione rilevato</strong><br><br>` +
                    `URL corrente: <code>${window.location.href}</code><br>` +
                    `Redirect URI: <code>${REDIRECT_URI}</code><br><br>` +
                    `Se gli URI non corrispondono, aggiornali nella Google Console.`;
                logDebug('⏱️ Timeout OAuth', { currentUrl: window.location.href, redirectUri: REDIRECT_URI });
            }
        }, 10000);
        
        // Override temporaneo del callback di successo
        const originalCallback = tokenClient.callback;
        tokenClient.callback = (resp) => {
            authSuccessful = true;
            clearTimeout(authTimeout);
            handleAuthResponse(resp);
        };
        
        // POPUP MODE con select_account
        try {
            authAttempted = true;
            tokenClient.requestAccessToken({ 
                prompt: 'select_account'
            });
        } catch (popupError) {
            clearTimeout(authTimeout);
            console.error('❌ Errore apertura popup:', popupError);
            
            // Se l'errore contiene "redirect" o "400", mostra setup wizard
            if (popupError.message && 
                (popupError.message.includes('redirect') || 
                 popupError.message.includes('400') ||
                 popupError.message.includes('uri'))) {
                const errorMsg = `<strong>Errore apertura autenticazione</strong><br><br>` +
                    `Dettaglio: ${popupError.message}<br><br>` +
                    `L'URL <code>${window.location.origin}</code> potrebbe non essere autorizzato.<br><br>` +
                    `Segui le istruzioni qui sotto.`;
            } else {
                throw popupError;
            }
        }
        
        logDebug('📤 Richiesta access token inviata');
        
    } catch (error) {
        console.error('❌ Errore handleAuthClick:', error);
        logDebug('❌ Errore handleAuthClick', error);
        mostraNotifica('Errore durante autenticazione', 'error');
        
        // Mostra sempre il setup wizard in caso di errore
        const errorMsg = `<strong>Errore autenticazione</strong><br><br>` +
            `Dettaglio: ${error.message || error.toString()}<br><br>` +
            `Verifica che l'URL sia autorizzato su Google Console.`;
    }
}

// ===== ERROR HANDLER =====
function handleAuthError(error) {
    console.error('❌ Errore autenticazione Google:', error);
    logDebug('❌ Errore autenticazione', error);
    
    let errorMessage = 'Errore durante autenticazione';
    let detailedError = '';
    let showWizard = false;
    
    // Gestione errori specifici
    if (error.type === 'popup_closed') {
        errorMessage = '🚫 Popup chiuso - autenticazione annullata';
        detailedError = 'L\'utente ha chiuso il popup di autenticazione.';
        // Non mostrare wizard se l'utente ha chiuso intenzionalmente
    } else if (error.type === 'popup_failed_to_open') {
        errorMessage = '❌ Impossibile aprire popup - controlla i popup blocker';
        detailedError = 'Il browser ha bloccato il popup. Abilita i popup per questo sito.';
        showWizard = true;
    } else if (error.type === 'idpiframe_initialization_failed') {
        errorMessage = '❌ Errore inizializzazione Google Identity';
        detailedError = 'Possibile problema: Client ID non autorizzato per questo origin.';
        showWizard = true;
    } else if (error.message && error.message.includes('redirect_uri_mismatch')) {
        // ERRORE REDIRECT URI MISMATCH - MOSTRA SETUP WIZARD
        errorMessage = '❌ ERRORE: URL non autorizzato';
        detailedError = `Errore 400: redirect_uri_mismatch<br><br>` +
            `L'URL corrente <strong>${window.location.origin}</strong> non è autorizzato nella Google Console.<br><br>` +
            `SOLUZIONE: Segui le istruzioni qui sotto per aggiungere questo URL.`;
        showWizard = true;
    } else if (error.message) {
        errorMessage = `❌ ${error.message}`;
        detailedError = error.message;
        
        // Se contiene "400" o "redirect", mostra setup wizard
        if (detailedError.includes('400') || detailedError.toLowerCase().includes('redirect')) {
            showWizard = true;
        }
    } else if (error.toString().includes('Vc') || error.toString() === '[object Object]') {
        // ERRORE OFFUSCATO DI GOOGLE (_.Vc o simili)
        // Questo è quasi sempre un redirect_uri_mismatch
        errorMessage = '❌ ERRORE: Configurazione OAuth non valida';
        detailedError = `<strong>Errore OAuth rilevato (${error.toString()})</strong><br><br>` +
            `Questo errore si verifica quando l'URL <code>${window.location.origin}</code> NON è autorizzato.<br><br>` +
            `<strong>SOLUZIONE:</strong> Aggiungi questo URL su Google Cloud Console.`;
        showWizard = true;
        console.warn('⚠️ Errore offuscato Google rilevato - probabilmente redirect_uri_mismatch');
    }
    
    // Se errore generico "Error", mostra setup wizard
    if (error.message === 'Error' || error.toString() === 'Error') {
        errorMessage = '❌ Errore generico - verifica configurazione Client ID';
        detailedError = 'Errore generico di autenticazione. Possibili cause:\n' +
            '1. Client ID non configurato correttamente\n' +
            '2. Origin non autorizzato nella Google Console\n' +
            '3. Redirect URI mancante\n' +
            '4. App non verificata o limitata';
        showWizard = true;
    }
    
    // Mostra setup wizard se necessario
    if (showWizard) {
    }
    
    if (window.mostraNotifica) {
        mostraNotifica(errorMessage, 'error');
    }
    
    updateGoogleUIStatus(false);
}

// ===== RESPONSE HANDLER =====
async function handleAuthResponse(resp) {
    if (resp.error !== undefined) {
        console.error('❌ Errore auth:', resp.error, resp);
        logDebug('❌ Errore auth response', resp);
        updateGoogleUIStatus(false);
        
        // Silent fail - no wizard
        return;
    }
    
    accessToken = resp.access_token;
    window.accessToken = accessToken;
    console.log('✅ Access token ricevuto');
    logDebug('✅ Access token ricevuto', { tokenLength: accessToken.length });
    
    try {
        const userInfo = await getUserInfo();
        userProfileData = userInfo;
        showUserInfo(userInfo);
        updateGoogleUIStatus(true, userInfo);
        console.log('✅ Autenticato:', userInfo);
        logDebug('✅ Autenticazione completata', userInfo);
        
        // Sincronizza calendario
        if (window.syncCalendarEvents) {
            console.log('🔄 Sincronizzazione calendario automatica...');
            window.syncCalendarEvents(false);
        }
        
        // Imposta data corrente
        if (window.setTodayDate) {
            window.setTodayDate();
        }
    } catch (error) {
        console.error('❌ Errore getUserInfo:', error);
        logDebug('❌ Errore getUserInfo', error);
        updateGoogleUIStatus(false);
    }
}

function handleSignoutClick() {
    if (accessToken) {
        google.accounts.oauth2.revoke(accessToken);
        accessToken = null;
        window.accessToken = null;
    }
    userProfileData = null;
    hideUserInfo();
    updateGoogleUIStatus(false);
    logDebug('🔓 Logout effettuato');
}

// ===== USER INFO =====
async function getUserInfo() {
    try {
        console.log('🔍 Richiesta user info...');
        const response = await gapi.client.people.people.get({
            resourceName: 'people/me',
            personFields: 'names,emailAddresses,photos'
        });
        
        console.log('📦 Response Google People API:', response.result);
        
        const userInfo = {
            name: response.result.names?.[0]?.givenName || 'Dante',
            email: response.result.emailAddresses?.[0]?.value || '',
            photo: response.result.photos?.[0]?.url || ''
        };
        
        console.log('👤 User info estratto:', userInfo);
        
        // Se photo vuoto, prova a usare OAuth userinfo endpoint
        if (!userInfo.photo && accessToken) {
            console.log('⚠️ Foto vuota, provo OAuth userinfo...');
            try {
                const oauthResponse = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                const oauthData = await oauthResponse.json();
                console.log('📸 OAuth userinfo:', oauthData);
                if (oauthData.picture) {
                    userInfo.photo = oauthData.picture;
                    console.log('✅ Foto recuperata da OAuth:', userInfo.photo);
                }
            } catch (err) {
                console.warn('❌ Fallito recupero foto OAuth:', err);
            }
        }
        
        return userInfo;
    } catch (error) {
        console.error('❌ Errore getUserInfo:', error);
        return { name: 'Dante', email: '', photo: '' };
    }
}

// ===== SHOW USER INFO =====
function showUserInfo(userInfo) {
    console.log('📸 Mostrando user info:', userInfo);
    
    const signInBtn = document.getElementById('googleSignInBtn');
    if (signInBtn) signInBtn.style.display = 'none';
    
    const userInfoDiv = document.getElementById('userInfo');
    if (userInfoDiv) userInfoDiv.style.display = 'flex';
    
    const profilePic = document.getElementById('userProfilePic');
    if (profilePic) {
        if (userInfo.photo) {
            profilePic.src = userInfo.photo;
            profilePic.alt = userInfo.name;
            profilePic.title = `Connesso come ${userInfo.name} - Clicca per disconnetterti`;
            profilePic.style.display = 'block';
            console.log('✅ Foto profilo impostata:', userInfo.photo);
        } else {
            // Fallback: mostra iniziale nome
            profilePic.style.display = 'none';
            console.warn('⚠️ Foto profilo vuota, uso fallback');
        }
    }
    
    // headerAvatar rimosso dall'HTML in v2.2.14 (solo foto centrale)
    
    if (userInfoDiv) {
        userInfoDiv.onclick = () => {
            if (confirm(`Disconnettere ${userInfo.name}?`)) {
                handleSignoutClick();
            }
        };
    }
    
    const operatoreName = document.getElementById('operatoreName');
    if (operatoreName) {
        // Estrai solo il primo nome (es. "Dante Davide" → "Dante")
        const firstName = userInfo.name.split(' ')[0];
        operatoreName.textContent = firstName;
    }
    
    localStorage.setItem('sgmess_operator_name', userInfo.name);
    localStorage.setItem('sgmess_operator_photo', userInfo.photo || '');
    
    console.log('✅ User info completo visualizzato');
}

function hideUserInfo() {
    const signInBtn = document.getElementById('googleSignInBtn');
    if (signInBtn) signInBtn.style.display = 'flex';
    
    const userInfoDiv = document.getElementById('userInfo');
    if (userInfoDiv) {
        userInfoDiv.style.display = 'none';
        userInfoDiv.onclick = null;
    }
    
    // headerAvatar rimosso dall'HTML in v2.2.14 (solo foto centrale)
    
    const operatoreName = document.getElementById('operatoreName');
    if (operatoreName) {
        operatoreName.textContent = 'Stock Gain Messenger';
    }
    
    localStorage.removeItem('sgmess_operator_name');
    localStorage.removeItem('sgmess_operator_photo');
}

function updateGoogleUIStatus(isConnected, userInfo = null) {
    console.log(`Google status: ${isConnected ? 'Online ✅' : 'Offline ❌'}`);
    logDebug(`Status: ${isConnected ? 'ONLINE' : 'OFFLINE'}`);
}

// ===== CHECK CONTATTO ESISTENTE =====
async function checkContactExists(phoneNumber) {
    if (!accessToken) {
        console.warn('⚠️ Non autenticato');
        return false;
    }
    
    try {
        let searchNumber = phoneNumber.replace(/\s+/g, '').replace(/^\+/, '');
        
        const response = await gapi.client.people.people.connections.list({
            'resourceName': 'people/me',
            'personFields': 'names,phoneNumbers',
            'pageSize': 1000
        });
        
        const connections = response.result.connections || [];
        
        for (const person of connections) {
            if (person.phoneNumbers) {
                for (const phone of person.phoneNumbers) {
                    const existingNumber = phone.value.replace(/\s+/g, '').replace(/^\+/, '').replace(/^00/, '');
                    const compareNumber = searchNumber.replace(/^39/, '');
                    
                    if (existingNumber.includes(compareNumber) || compareNumber.includes(existingNumber)) {
                        console.log('ℹ️ Contatto già esistente:', person.names?.[0]?.displayName);
                        return true;
                    }
                }
            }
        }
        
        return false;
        
    } catch (error) {
        console.error('❌ Errore check duplicati:', error);
        return false;
    }
}

// ===== SALVA CONTATTO =====
async function saveContactToGoogle(contactData) {
    if (!accessToken) {
        console.warn('⚠️ Non autenticato');
        return false;
    }
    
    try {
        let phoneNumber = contactData.phone.replace(/\s+/g, '');
        
        const exists = await checkContactExists(phoneNumber);
        if (exists) {
            console.log('ℹ️ Contatto già presente, salvataggio saltato');
            return { skipped: true, reason: 'duplicate' };
        }
        
        if (phoneNumber.startsWith('00')) {
            phoneNumber = '+' + phoneNumber.substring(2);
        } else if (!phoneNumber.startsWith('+')) {
            if (phoneNumber.startsWith('3')) {
                phoneNumber = '+39' + phoneNumber;
            }
        }
        
        const person = {
            names: [{
                givenName: contactData.firstName,
                familyName: contactData.lastName || '',
            }],
            phoneNumbers: [{
                value: phoneNumber,
                type: 'mobile'
            }]
        };
        
        if (contactData.company) {
            person.organizations = [{
                name: contactData.company,
                type: 'work'
            }];
        }
        
        const response = await gapi.client.people.people.createContact({
            resource: person
        });
        
        console.log('✅ Contatto salvato:', response.result);
        return { success: true };
        
    } catch (error) {
        console.error('❌ Errore salvataggio:', error);
        if (error.status === 409) {
            console.log('ℹ️ Contatto già esistente');
            return { skipped: true, reason: 'conflict' };
        }
        return { success: false, error: error };
    }
}

// ===== RESTORE SESSION =====
function restoreSession() {
    const savedName = localStorage.getItem('sgmess_operator_name');
    const savedPhoto = localStorage.getItem('sgmess_operator_photo');
    
    if (savedName && savedPhoto) {
        console.log('🔄 Ripristino sessione salvata');
        
        const headerAvatar = document.getElementById('headerAvatar');
        if (headerAvatar && savedPhoto) {
            headerAvatar.innerHTML = `<img src="${savedPhoto}" alt="${savedName}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" />`;
        }
        
        const operatoreName = document.getElementById('operatoreName');
        if (operatoreName) {
            operatoreName.textContent = savedName;
        }
    }
}

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', function() {
    const signInBtn = document.getElementById('googleSignInBtn');
    if (signInBtn) {
        signInBtn.addEventListener('click', handleAuthClick);
        signInBtn.disabled = true;
    }
    
    updateGoogleUIStatus(false);
    restoreSession();
    
    // Toggle debug button
    const toggleDebugBtn = document.getElementById('toggleDebugBtn');
    if (toggleDebugBtn) {
        toggleDebugBtn.addEventListener('click', toggleDebugMode);
    }
    
    // Mostra debug panel se attivo
    if (authDebugMode) {
        const debugPanel = document.getElementById('authDebugPanel');
        if (debugPanel) {
            debugPanel.style.display = 'block';
        }
    }
});

// ===== ESPORTA =====
window.gapiLoaded = gapiLoaded;
window.gisLoaded = gisLoaded;
window.saveContactToGoogle = saveContactToGoogle;
window.userProfileData = () => userProfileData;
window.toggleDebugMode = toggleDebugMode;

// ===== LISTENER GLOBALE PER ERRORI OAUTH =====
// Intercetta errori OAuth che potrebbero non essere catturati dall'error_callback
window.addEventListener('message', function(event) {
    // Verifica che il messaggio venga da Google
    if (event.origin !== 'https://accounts.google.com') return;
    
    try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
        // Controlla se c'è un errore OAuth
        if (data.error) {
            console.error('❌ Errore OAuth rilevato da messaggio:', data);
            
            if (data.error === 'redirect_uri_mismatch' || 
                data.error_description?.includes('redirect_uri_mismatch') ||
                data.error_description?.includes('400')) {
                
                const errorMsg = `<strong>Errore 400: redirect_uri_mismatch</strong><br><br>` +
                    `L'URL corrente <code>${window.location.origin}</code> NON è autorizzato nella Google Cloud Console.<br><br>` +
                    `Segui le istruzioni qui sotto per risolvere.`;
                
            }
        }
    } catch (e) {
        // Ignora errori di parsing
    }
});

// Intercetta anche errori dalla console (fallback)
const originalConsoleError = console.error;
console.error = function(...args) {
    originalConsoleError.apply(console, args);
    
    const errorText = args.join(' ').toLowerCase();
    if (errorText.includes('redirect_uri_mismatch') || 
        (errorText.includes('400') && errorText.includes('redirect'))) {
        
        setTimeout(() => {
            const errorMsg = `<strong>Errore OAuth rilevato</strong><br><br>` +
                `Possibile problema: l'URL <code>${window.location.origin}</code> non è autorizzato.<br><br>` +
                `Controlla le istruzioni qui sotto.`;
        }, 500);
    }
};

// ===== ESTRAI NOME SETTER DA EVENTO =====
// PRIORITÀ CORRETTA (dal più specifico al generico):
// 1. "Nome setter:" nella descrizione (ACUITY FORMAT) ← PRIORITÀ MASSIMA
// 2. "SETTER:" nella descrizione (fallback)
// 3. "Assistente:" nella descrizione (fallback)
// 4. Ultima parentesi nel titolo (OPERATORE, non setter - solo fallback estremo)
function extractSetterFromEvent(event) {
    const summary = event.summary || '';
    const description = event.description || '';
    
    console.log(`🔍 [DEBUG] extractSetterFromEvent`);
    console.log(`  Summary: "${summary}"`);
    console.log(`  Description (primi 500 char): "${description.substring(0, 500)}"`);
    
    // PRIORITÀ 1: "Nome setter:" nella descrizione (FORMATO ACUITY)
    // Regex case-insensitive con spazi flessibili
    const nomeSetterMatch = description.match(/Nome\s+setter:\s*([^\n\r]+)/i);
    if (nomeSetterMatch) {
        const setterName = nomeSetterMatch[1].trim();
        console.log(`✅ [DEBUG] Nome setter trovato in descrizione (Nome setter:): "${setterName}"`);
        return setterName;
    }
    
    // PRIORITÀ 2: "SETTER:" nella descrizione (formato generico)
    const setterMatch = description.match(/SETTER:\s*([^\n\r]+)/i);
    if (setterMatch) {
        const setterName = setterMatch[1].trim();
        console.log(`✅ [DEBUG] Nome setter trovato in descrizione (SETTER:): "${setterName}"`);
        return setterName;
    }
    
    // PRIORITÀ 3: "Assistente:" nella descrizione
    const assistenteMatch = description.match(/Assistente:\s*([^\n\r]+)/i);
    if (assistenteMatch) {
        const setterName = assistenteMatch[1].trim();
        console.log(`✅ [DEBUG] Nome setter trovato in descrizione (Assistente:): "${setterName}"`);
        return setterName;
    }
    
    // PRIORITÀ 4: Ultima parentesi nel titolo (FALLBACK - probabilmente è l'operatore)
    const matches = summary.match(/\(([^)]+)\)/g);
    if (matches && matches.length > 0) {
        const lastMatch = matches[matches.length - 1];
        const setterName = lastMatch.replace(/[()]/g, '').trim();
        
        // Verifica che sia un nome (non numeri o altri metadati)
        if (/^[a-zA-Z\sàèéìòù]+$/.test(setterName)) {
            console.log(`⚠️ [DEBUG] FALLBACK: Nome estratto da parentesi titolo (potrebbe essere operatore): "${setterName}"`);
            return setterName;
        }
    }
    
    console.log(`❌ [DEBUG] Nessun nome setter trovato`);
    return null;
}

// ===== CONTROLLO GENERE SETTER DA EVENTO =====
async function checkSetterGenderFromEvent(event) {
    if (!event || !window.AssistentiGender) return;
    
    const setterName = extractSetterFromEvent(event);
    
    if (!setterName) {
        console.log('⚠️ Nome setter non trovato nell\'evento - uso genere Maschio come default');
        setAssistenteToggle('M');
        return;
    }
    
    console.log(`🔍 Controllo genere per setter: ${setterName}`);
    
    // Controlla genere con rilevazione intelligente:
    // 1. Cache Google Sheets
    // 2. Database nomi italiani
    // 3. null (mostra popup)
    const gender = await window.AssistentiGender.check(setterName);
    
    if (gender) {
        console.log(`✅ Genere rilevato: ${setterName} = ${gender}`);
        // Imposta automaticamente il toggle button
        setAssistenteToggle(gender);
    } else {
        // Nome sconosciuto: mostra popup per chiedere all'utente
        console.log(`❓ Genere sconosciuto per: ${setterName} - mostro popup`);
        window.AssistentiGender.showPopup(setterName, (selectedGender) => {
            console.log(`✅ Utente ha selezionato: ${setterName} = ${selectedGender}`);
            setAssistenteToggle(selectedGender);
        });
    }
}

function setAssistenteToggle(gender) {
    const toggleBtns = document.querySelectorAll('.toggle-group .toggle-btn[data-value]');
    toggleBtns.forEach(btn => {
        if (btn.dataset.value === gender) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Aggiorna anteprima se funzione disponibile
    if (window.updatePreview) {
        window.updatePreview();
    }
}

// Esporta funzioni per uso esterno
window.checkSetterGenderFromEvent = checkSetterGenderFromEvent;
window.extractSetterFromEvent = extractSetterFromEvent;

console.log('✅ Google Auth v2.2.25 - OAuth funzionante');
