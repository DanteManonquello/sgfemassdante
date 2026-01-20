/* ================================================================================
   TESTmess - VERSION CONFIG
   ================================================================================ */

// Configurazione centralizzata della versione
const APP_CONFIG = {
    name: 'TESTmess',
    version: '2.2.26',
    fullName: 'v2.2.26 by Dante',
    description: 'Stock Gain Messenger',
    author: 'Dante',
    lastUpdate: '2026-01-20 - Lead colorati + Cronologia persistente + Date navigation (±90gg)'
};

// Esporta per uso globale
window.APP_CONFIG = APP_CONFIG;

console.log(`✅ ${APP_CONFIG.fullName} - Configuration loaded`);
