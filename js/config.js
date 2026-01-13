/* ================================================================================
   TESTmess - VERSION CONFIG
   ================================================================================ */

// Configurazione centralizzata della versione
const APP_CONFIG = {
    name: 'TESTmess',
    version: '2.2.22',
    fullName: 'v2.2.22 by Dante',
    description: 'Stock Gain Messenger',
    author: 'Dante',
    lastUpdate: '2026-01-06 - UI: Nome operatore solo primo nome + Calendario visibile in dropdown lead'
};

// Esporta per uso globale
window.APP_CONFIG = APP_CONFIG;

console.log(`✅ ${APP_CONFIG.fullName} - Configuration loaded`);
