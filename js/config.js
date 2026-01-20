/* ================================================================================
   TESTmess - VERSION CONFIG
   ================================================================================ */

// Configurazione centralizzata della versione
const APP_CONFIG = {
    name: 'TESTmess',
    version: '2.2.27',
    fullName: 'v2.2.27 by Dante',
    description: 'Stock Gain Messenger',
    author: 'Dante',
    lastUpdate: '2026-01-20 - Rubrica contatti + Auto-push GitHub + SG Collega'
};

// ===== GITHUB AUTO-PUSH CONFIGURATION =====
// ⚠️ SECURITY WARNING: Token è obfuscato ma NON sicuro al 100%
// Chiunque con conoscenze tecniche può decodificarlo dal codice sorgente
// BEST PRACTICE: Usa token con permessi MINIMI (solo push su questo repo)
// Rigenera token ogni 90 giorni su: https://github.com/settings/tokens
const GITHUB_CONFIG = {
    enabled: true, // Set false per disabilitare auto-push
    token: 'Z2hwXzc2ZTRuaTB6cjNxVGs0dmwzcGZ4aHBndDQydm9FRTNiYlNFcg==', // Base64 encoded
    repo: 'DanteManonquello/sgfemassdante',
    branch: 'main',
    username: 'DanteManonquello'
};

// Funzione per decodificare token (usata da github-auto-push.js)
function getGitHubToken() {
    if (!GITHUB_CONFIG.enabled) return null;
    try {
        return atob(GITHUB_CONFIG.token);
    } catch (e) {
        console.error('❌ Errore decodifica token GitHub:', e);
        return null;
    }
}

// Esporta per uso globale
window.APP_CONFIG = APP_CONFIG;
window.GITHUB_CONFIG = GITHUB_CONFIG;
window.getGitHubToken = getGitHubToken;

console.log(`✅ ${APP_CONFIG.fullName} - Configuration loaded`);
console.log(`🔐 GitHub Auto-Push: ${GITHUB_CONFIG.enabled ? 'ENABLED' : 'DISABLED'}`);
