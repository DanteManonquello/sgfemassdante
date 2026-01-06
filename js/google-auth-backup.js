/* ================================================================================
   GOOGLE AUTHENTICATION & CONTACTS API
   ================================================================================ */

// ⚠️ IMPORTANTE: Credenziali Google Cloud configurate
const GOOGLE_CLIENT_ID = '432043907250-blb72vqc0nqm8rccoknfe29p4j5lbubr.apps.googleusercontent.com';
const GOOGLE_API_KEY = ''; // Non necessaria per OAuth 2.0

const SCOPES = 'https://www.googleapis.com/auth/contacts https://www.googleapis.com/auth/calendar.readonly';

let tokenClient;
let accessToken = null;
let gapiInited = false;
let gisInited = false;

// ===== INIT GAPI =====
function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
    try {
        await gapi.client.init({
            apiKey: GOOGLE_API_KEY || undefined,
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
        console.warn('⚠️ Configura le credenziali Google in google-auth.js');
        // Abilita il pulsante anche se c'è un errore per permettere il test
        gapiInited = true;
        maybeEnableButtons();
    }
}

// ===== INIT GIS =====
function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: '',
        ux_mode: 'popup', // Forza modalità popup (non richiede redirect_uri)
    });
    gisInited = true;
    maybeEnableButtons();
    console.log('✅ Google Identity Services inizializzato (popup mode)');
}

function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        document.getElementById('googleSignInBtn').disabled = false;
    }
}

// ===== AUTH =====
function handleAuthClick() {
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            console.error('❌ Errore auth:', resp);
            updateGoogleUIStatus(false);
            return;
        }
        
        accessToken = resp.access_token;
        
        try {
            const userInfo = await getUserInfo();
            showUserInfo(userInfo);
            updateGoogleUIStatus(true, userInfo);
            console.log('✅ Autenticato:', userInfo);
            
            // Sincronizza calendario automaticamente dopo l'autenticazione
            if (window.syncCalendarEvents) {
                setTimeout(() => {
                    window.syncCalendarEvents(false);
                }, 1000);
            }
        } catch (error) {
            console.error('❌ Errore user info:', error);
            updateGoogleUIStatus(false);
        }
    };

    // Usa requestAccessToken con prompt per forzare popup
    if (accessToken === null) {
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        tokenClient.requestAccessToken({ prompt: '' });
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
    
    // Mostra solo la foto profilo
    const profilePic = document.getElementById('userProfilePic');
    if (userInfo.photo) {
        profilePic.src = userInfo.photo;
        profilePic.alt = userInfo.name;
        profilePic.title = `Connesso come ${userInfo.name} - Clicca per disconnetterti`;
    }
    
    // Aggiungi evento click per disconnettersi
    userInfoDiv.onclick = () => {
        if (confirm(`Disconnettere ${userInfo.name}?`)) {
            handleSignoutClick();
        }
    };
    
    document.getElementById('operatoreName').textContent = `by ${userInfo.name}`;
    
    // Aggiorna avatar header
    const headerAvatar = document.getElementById('headerAvatar');
    if (headerAvatar && userInfo.photo) {
        headerAvatar.innerHTML = `<img src="${userInfo.photo}" alt="${userInfo.name}" />`;
    }
    
    // Salva nome operatore
    localStorage.setItem('sgmess_operator_name', userInfo.name);
    localStorage.setItem('sgmess_operator_photo', userInfo.photo || '');
}

function hideUserInfo() {
    document.getElementById('googleSignInBtn').style.display = 'flex';
    const userInfoDiv = document.getElementById('userInfo');
    userInfoDiv.style.display = 'none';
    userInfoDiv.onclick = null;
    document.getElementById('operatoreName').textContent = 'Stock Gain Messenger';
    
    // Reset avatar header
    const headerAvatar = document.getElementById('headerAvatar');
    if (headerAvatar) {
        headerAvatar.innerHTML = '<i class="fas fa-user"></i>';
    }
}

function updateGoogleUIStatus(isConnected, userInfo = null) {
    // Funzione mantenuta per compatibilità ma non mostra più indicatori
    console.log(`Google status: ${isConnected ? 'Online' : 'Offline'}`);
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
    
    // Carica nome operatore salvato
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

console.log('✅ Google Auth caricato');
