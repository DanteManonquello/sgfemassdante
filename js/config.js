/* ================================================================================
   TESTmess - VERSION CONFIG
   ================================================================================ */

// Configurazione centralizzata della versione
const APP_CONFIG = {
    name: 'TESTmess',
    version: '2.2.24',
    fullName: 'v2.2.24 by Dante',
    description: 'Stock Gain Messenger',
    author: 'Dante',
    lastUpdate: '2026-01-13 - FIX DEFINITIVO: Nuovo Client ID OAuth dedicato al progetto'
};

// Esporta per uso globale
window.APP_CONFIG = APP_CONFIG;

console.log(`✅ ${APP_CONFIG.fullName} - Configuration loaded`);
