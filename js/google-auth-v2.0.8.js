/* ================================================================================
   GOOGLE AUTH - VERSIONE 2.0.8 - FIX DEFINITIVO FOTO PROFILO
   ================================================================================ */

const GOOGLE_CLIENT_ID = '432043907250-bfb7zvqc0nqm8rccoknfe29p4j5lbubr.apps.googleusercontent.com';
const GOOGLE_API_KEY = 'AIzaSyDm2z0X0d6a73Uhe9wZpFLkZqnVY3EAJuQ';
const SCOPES = 'https://www.googleapis.com/auth/contacts https://www.googleapis.com/auth/calendar.readonly';

let tokenClient;
let accessToken = null;
let gapiInited = false;
let gisInited = false;
let userProfileData = null; // Salva dati profilo globalmente

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
        gapiInited = true; // Continua comunque
        maybeEnableButtons();
    }
}

// ===== INIT GIS =====
function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: handleAuthResponse,
    });
    gisInited = true;
    maybeEnableButtons();
    console.log('✅ Google Identity Services inizializzato');
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

// ===== AUTH =====
function handleAuthClick() {
    try {
        console.log('🔐 Richiesta autenticazione...');
        
        if (!tokenClient) {
            console.error('❌ Token client non inizializzato');
            return;
        }
        
        if (accessToken === null) {
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            tokenClient.requestAccessToken({ prompt: '' });
        }
        
    } catch (error) {
        console.error('❌ Errore handleAuthClick:', error);
    }
}

// ===== RESPONSE HANDLER =====
async function handleAuthResponse(resp) {
    if (resp.error !== undefined) {
        console.error('❌ Errore auth:', resp.error, resp);
        updateGoogleUIStatus(false);
        return;
    }
    
    accessToken = resp.access_token;
    console.log('✅ Access token ricevuto');
    
    try {
        const userInfo = await getUserInfo();
        userProfileData = userInfo; // Salva globalmente
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
    userProfileData = null;
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

// ===== SHOW USER INFO - FIX DEFINITIVO FOTO =====
function showUserInfo(userInfo) {
    console.log('📸 Mostrando foto profilo:', userInfo.photo);
    
    // Nascondi pulsante login
    const signInBtn = document.getElementById('googleSignInBtn');
    if (signInBtn) signInBtn.style.display = 'none';
    
    // Mostra container user info
    const userInfoDiv = document.getElementById('userInfo');
    if (userInfoDiv) userInfoDiv.style.display = 'flex';
    
    // FOTO PROFILO nel pulsante Google (tondo verde)
    const profilePic = document.getElementById('userProfilePic');
    if (profilePic && userInfo.photo) {
        profilePic.src = userInfo.photo;
        profilePic.alt = userInfo.name;
        profilePic.title = `Connesso come ${userInfo.name} - Clicca per disconnetterti`;
        profilePic.style.display = 'block';
        console.log('✅ Foto profilo impostata su userProfilePic');
    }
    
    // FOTO PROFILO nell'avatar header (in alto a sinistra)
    const headerAvatar = document.getElementById('headerAvatar');
    if (headerAvatar && userInfo.photo) {
        headerAvatar.innerHTML = `<img src="${userInfo.photo}" alt="${userInfo.name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" />`;
        console.log('✅ Foto profilo impostata su headerAvatar');
    }
    
    // Aggiungi evento click per disconnettersi
    if (userInfoDiv) {
        userInfoDiv.onclick = () => {
            if (confirm(`Disconnettere ${userInfo.name}?`)) {
                handleSignoutClick();
            }
        };
    }
    
    // Aggiorna nome operatore
    const operatoreName = document.getElementById('operatoreName');
    if (operatoreName) {
        operatoreName.textContent = `by ${userInfo.name}`;
    }
    
    // Salva in localStorage
    localStorage.setItem('sgmess_operator_name', userInfo.name);
    localStorage.setItem('sgmess_operator_photo', userInfo.photo || '');
    
    console.log('✅ User info completo visualizzato');
}

function hideUserInfo() {
    // Mostra pulsante login
    const signInBtn = document.getElementById('googleSignInBtn');
    if (signInBtn) signInBtn.style.display = 'flex';
    
    // Nascondi container user info
    const userInfoDiv = document.getElementById('userInfo');
    if (userInfoDiv) {
        userInfoDiv.style.display = 'none';
        userInfoDiv.onclick = null;
    }
    
    // Reset avatar header
    const headerAvatar = document.getElementById('headerAvatar');
    if (headerAvatar) {
        headerAvatar.innerHTML = '<i class="fas fa-user"></i>';
    }
    
    // Reset nome operatore
    const operatoreName = document.getElementById('operatoreName');
    if (operatoreName) {
        operatoreName.textContent = 'Stock Gain Messenger';
    }
    
    // Clear localStorage
    localStorage.removeItem('sgmess_operator_name');
    localStorage.removeItem('sgmess_operator_photo');
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

// ===== RESTORE SESSION =====
function restoreSession() {
    const savedName = localStorage.getItem('sgmess_operator_name');
    const savedPhoto = localStorage.getItem('sgmess_operator_photo');
    
    if (savedName && savedPhoto) {
        console.log('🔄 Ripristino sessione salvata');
        
        const userInfo = {
            name: savedName,
            email: '',
            photo: savedPhoto
        };
        
        // Non mostrare come autenticato, ma ripristina foto
        const headerAvatar = document.getElementById('headerAvatar');
        if (headerAvatar && savedPhoto) {
            headerAvatar.innerHTML = `<img src="${savedPhoto}" alt="${savedName}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" />`;
        }
        
        const operatoreName = document.getElementById('operatoreName');
        if (operatoreName) {
            operatoreName.textContent = `by ${savedName}`;
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
    
    // Ripristina sessione se disponibile
    restoreSession();
});

// ===== ESPORTA =====
window.gapiLoaded = gapiLoaded;
window.gisLoaded = gisLoaded;
window.saveContactToGoogle = saveContactToGoogle;
window.userProfileData = () => userProfileData;

console.log('✅ Google Auth v2.0.8 caricato - Fix foto profilo completo');
