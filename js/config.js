/* ================================================================================
   TESTmess - VERSION CONFIG
   ================================================================================ */

// Configurazione centralizzata della versione
const APP_CONFIG = {
    name: 'TESTmess',
    version: '2.2.25',
    fullName: 'v2.2.25 by Dante',
    description: 'Stock Gain Messenger',
    author: 'Dante',
    lastUpdate: '2026-01-13 - Calendario: Eventi passati (90gg) + Multi-calendario automatico'
};

// Esporta per uso globale
window.APP_CONFIG = APP_CONFIG;

console.log(`✅ ${APP_CONFIG.fullName} - Configuration loaded`);
