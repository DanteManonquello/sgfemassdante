/* ================================================================================
   TESTmess - VERSION CONFIG
   ================================================================================ */

// Configurazione centralizzata della versione
const APP_CONFIG = {
    name: 'TESTmess',
    version: '2.2.12',
    fullName: 'TESTmess v2.2.12',
    description: 'Stock Gain Messenger',
    author: 'Dante',
    lastUpdate: '2026-01-06 - FIX: OAuth universale + Drive storage + sintassi JS'
};

// Esporta per uso globale
window.APP_CONFIG = APP_CONFIG;

console.log(`✅ ${APP_CONFIG.fullName} - Configuration loaded`);
