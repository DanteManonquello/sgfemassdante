/* ================================================================================
   GOOGLE AUTH - TEST SUITE
   Questo file contiene 5 diverse implementazioni OAuth da testare
   ================================================================================ */

// ⚠️ CONFIGURAZIONE COMUNE
const GOOGLE_CLIENT_ID = '432043907250-blb72vqc0nqm8rccoknfe29p4j5lbubr.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/contacts https://www.googleapis.com/auth/calendar.readonly';

// ================================================================================
// METODO 1: Token Client con Popup (Google Identity Services - Consigliato)
// Pro: Non richiede redirect_uri, più sicuro
// Contro: Richiede popup abilitati
// ================================================================================
const CONFIG_METHOD_1 = {
    name: 'Token Client Popup',
    init: () => {
        return google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: SCOPES,
            callback: '',
            ux_mode: 'popup'
        });
    }
};

// ================================================================================
// METODO 2: Token Client con Redirect (Standard)
// Pro: Funziona anche senza popup
// Contro: Richiede redirect_uri configurato
// ================================================================================
const CONFIG_METHOD_2 = {
    name: 'Token Client Redirect',
    init: () => {
        return google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: SCOPES,
            callback: '',
            ux_mode: 'redirect',
            redirect_uri: window.location.origin
        });
    }
};

// ================================================================================
// METODO 3: Code Client (OAuth 2.0 Authorization Code Flow)
// Pro: Più sicuro, consigliato per produzione
// Contro: Più complesso, richiede backend
// ================================================================================
const CONFIG_METHOD_3 = {
    name: 'Code Client',
    init: () => {
        return google.accounts.oauth2.initCodeClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: SCOPES,
            callback: '',
            ux_mode: 'popup'
        });
    }
};

// ================================================================================
// METODO 4: Implicit Flow (Legacy - Non consigliato ma funziona sempre)
// Pro: Compatibilità massima
// Contro: Meno sicuro
// ================================================================================
const CONFIG_METHOD_4 = {
    name: 'Implicit Flow Legacy',
    init: () => {
        return google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: SCOPES,
            callback: '',
            prompt: 'select_account'
        });
    }
};

// ================================================================================
// METODO 5: One Tap + Auto Select (Moderno)
// Pro: UX migliore, login veloce
// Contro: Richiede configurazione speciale
// ================================================================================
const CONFIG_METHOD_5 = {
    name: 'One Tap',
    init: () => {
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: '', // Verrà impostato dopo
            auto_select: false,
            cancel_on_tap_outside: false
        });
        return null; // One Tap non usa tokenClient
    }
};

// Esporta
window.GOOGLE_AUTH_CONFIGS = {
    METHOD_1: CONFIG_METHOD_1,
    METHOD_2: CONFIG_METHOD_2,
    METHOD_3: CONFIG_METHOD_3,
    METHOD_4: CONFIG_METHOD_4,
    METHOD_5: CONFIG_METHOD_5
};

console.log('📋 Test Suite caricata - 5 metodi disponibili');
