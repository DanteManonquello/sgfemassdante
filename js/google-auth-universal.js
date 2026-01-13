/* ================================================================================
   GOOGLE AUTHENTICATION - UNIVERSAL VERSION
   Versione robusta con fallback automatici e gestione errori completa
   ================================================================================ */

// ⚠️ Credenziali
const GOOGLE_CLIENT_ID = '432043907250-bfb7zvqc0nqm8rccoknfe29p4j5lbubr.apps.googleusercontent.com';
const GOOGLE_API_KEY = 'AIzaSyDm2z0X0d6a73Uhe9wZpFLkZqnVY3EAJuQ';
const SCOPES = 'https://www.googleapis.com/auth/contacts https://www.googleapis.com/auth/calendar.readonly';

let tokenClient;
let accessToken = null;
let gapiInited = false;
let gisInited = false;
let currentAuthMethod = 1; // Parte dal metodo 1, fa fallback se necessario

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
    } catch (error) {
        console.error('❌ Errore GAPI:', error);
        // Continua comunque, OAuth può funzionare senza GAPI
        gapiInited = true;
        maybeEnableButtons();
    }
}

// ===== INIT GIS con Fallback =====
function gisLoaded() {
    initTokenClientWithFallback();
}

function initTokenClientWithFallback() {
    try {
        console.log(`🔄 Tentativo metodo ${currentAuthMethod}`);
        
        // METODO 1: Popup (preferito)
        if (currentAuthMethod === 1) {
            tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: SCOPES,
                callback: handleAuthResponse,
            });
            console.log('✅ Metodo 1: Token Client (auto) inizializzato');
        }
        
        // METODO 2: Con UX mode esplicito
        else if (currentAuthMethod === 2) {
            tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: SCOPES,
                callback: handleAuthResponse,
                ux_mode: 'popup'
            });
            console.log('✅ Metodo 2: Popup esplicito inizializzato');
        }
        
        // METODO 3: Redirect mode
        else if (currentAuthMethod === 3) {
            tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: SCOPES,
                callback: handleAuthResponse,
                ux_mode: 'redirect',
                redirect_uri: window.location.origin
            });
            console.log('✅ Metodo 3: Redirect mode inizializzato');
        }
        
        gisInited = true;
        maybeEnableButtons();
        
    } catch (error) {
        console.error(`❌ Errore metodo ${currentAuthMethod}:`, error);
        currentAuthMethod++;
        
        if (currentAuthMethod <= 3) {
            console.log('🔄 Provo metodo successivo...');
            initTokenClientWithFallback();
        } else {
            console.error('❌ Tutti i metodi falliti');
            gisInited = false;
        }
    }
}

function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        const btn = document.getElementById('googleSignInBtn');
        if (btn) {
            btn.disabled = false;
            console.log('✅ Pulsante Google abilitato');
        }
    }
}

// ===== AUTH con Error Handling =====
function handleAuthClick() {
    try {
        console.log('🔐 Richiesta autenticazione...');
        
        if (!tokenClient) {
            console.error('❌ Token client non inizializzato');
            alert('Errore: Token client non inizializzato. Ricarica la pagina.');
            return;
        }
        
        if (accessToken === null) {
            tokenClient.requestAccessToken({ 
                prompt: 'consent',
                hint: '' 
            });
        } else {
            tokenClient.requestAccessToken({ prompt: '' });
        }
        
    } catch (error) {
        console.error('❌ Errore handleAuthClick:', error);
        
        // Fallback: prova metodo successivo
        currentAuthMethod++;
        if (currentAuthMethod <= 3) {
            console.log('🔄 Provo metodo di auth alternativo...');
            initTokenClientWithFallback();
            setTimeout(() => handleAuthClick(), 1000);
        } else {
            alert('Errore durante l\'autenticazione. Controlla la configurazione Google Cloud.');
        }
    }
}

// ===== RESPONSE HANDLER =====
async function handleAuthResponse(resp) {
    if (resp.error !== undefined) {
        console.error('❌ Errore auth:', resp.error, resp);
        
        // Analizza tipo di errore e suggerisci soluzione
        if (resp.error === 'popup_closed_by_user') {
            console.log('ℹ️ Popup chiuso dall\'utente');
        } else if (resp.error === 'access_denied') {
            console.log('ℹ️ Accesso negato dall\'utente');
        } else if (resp.error.includes('redirect_uri')) {
            console.error('❌ Errore redirect_uri - Controlla Google Cloud Console');
            alert('Errore di configurazione. URI non autorizzato in Google Cloud.');
        } else {
            console.error('❌ Errore sconosciuto:', resp.error);
        }
        
        updateGoogleUIStatus(false);
        return;
    }
    
    accessToken = resp.access_token;
    console.log('✅ Access token ricevuto');
    
    try {
        const userInfo = await getUserInfo();
        showUserInfo(userInfo);
        updateGoogleUIStatus(true, userInfo);
        console.log('✅ Autenticato:', userInfo);
        
        // Sincronizza calendario
        if (window.syncCalendarEvents) {
            setTimeout(() => window.syncCalendarEvents(false), 1000);
        }
    } catch (error) {
        console.error('❌ Errore getUserInfo:', error);
        updateGoogleUIStatus(false);
    }
}

function handleSignoutClick() {
    if (accessToken) {
        google.accounts.oauth2.revoke(accessToken);
        accessToken = null;
    }
    hideUserInfo();
    updateGoogleUIStatus(false);
}

// ===== USER INFO =====
async function getUserInfo() {
    try {
        const response = await gapi.client.people.people.get({
            resourceName: 'people/me',
            personFields: 'names,emailAddresses,photos'
        });
        
        return {
            name: response.result.names?.[0]?.givenName || 'Utente',
            email: response.result.emailAddresses?.[0]?.value || '',
            photo: response.result.photos?.[0]?.url || ''
        };
    } catch (error) {
        console.error('❌ Errore getUserInfo:', error);
        return { name: 'Utente', email: '', photo: '' };
    }
}

function showUserInfo(userInfo) {
    document.getElementById('googleSignInBtn').style.display = 'none';
    const userInfoDiv = document.getElementById('userInfo');
    userInfoDiv.style.display = 'flex';
    
    const profilePic = document.getElementById('userProfilePic');
    if (userInfo.photo) {
        profilePic.src = userInfo.photo;
        profilePic.alt = userInfo.name;
        profilePic.title = `Connesso come ${userInfo.name} - Clicca per disconnetterti`;
    }
    
    userInfoDiv.onclick = () => {
        if (confirm(`Disconnettere ${userInfo.name}?`)) {
            handleSignoutClick();
        }
    };
    
    document.getElementById('operatoreName').textContent = `by ${userInfo.name}`;
    
    const headerAvatar = document.getElementById('headerAvatar');
    if (headerAvatar && userInfo.photo) {
        headerAvatar.innerHTML = `<img src="${userInfo.photo}" alt="${userInfo.name}" />`;
    }
    
    localStorage.setItem('sgmess_operator_name', userInfo.name);
    localStorage.setItem('sgmess_operator_photo', userInfo.photo || '');
}

function hideUserInfo() {
    document.getElementById('googleSignInBtn').style.display = 'flex';
    const userInfoDiv = document.getElementById('userInfo');
    userInfoDiv.style.display = 'none';
    userInfoDiv.onclick = null;
    document.getElementById('operatoreName').textContent = 'Stock Gain Messenger';
    
    const headerAvatar = document.getElementById('headerAvatar');
    if (headerAvatar) {
        headerAvatar.innerHTML = '<i class="fas fa-user"></i>';
    }
}

function updateGoogleUIStatus(isConnected, userInfo = null) {
    console.log(`Google status: ${isConnected ? 'Online ✅' : 'Offline ❌'}`);
}

// ===== SALVA CONTATTO =====
async function saveContactToGoogle(contactData) {
    if (!accessToken) {
        console.warn('⚠️ Non autenticato');
        return false;
    }
    
    try {
        let phoneNumber = contactData.phone.replace(/\s+/g, '');
        
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
        return true;
        
    } catch (error) {
        console.error('❌ Errore salvataggio:', error);
        if (error.status === 409) {
            console.log('ℹ️ Contatto già esistente');
        }
        return false;
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
    
    const savedName = localStorage.getItem('sgmess_operator_name');
    const savedPhoto = localStorage.getItem('sgmess_operator_photo');
    
    if (savedName) {
        document.getElementById('operatoreName').textContent = `by ${savedName}`;
    }
    
    if (savedPhoto) {
        const headerAvatar = document.getElementById('headerAvatar');
        if (headerAvatar) {
            headerAvatar.innerHTML = `<img src="${savedPhoto}" alt="${savedName}" />`;
        }
    }
});

// ===== ESPORTA =====
window.gapiLoaded = gapiLoaded;
window.gisLoaded = gisLoaded;
window.saveContactToGoogle = saveContactToGoogle;

console.log('✅ Google Auth Universal caricato - Fallback automatico attivo');
