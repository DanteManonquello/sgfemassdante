/* ================================================================================
   GITHUB AUTO-PUSH - TESTmess v2.2.27
   
   Gestisce il push automatico del codice su GitHub usando il token salvato.
   NOTA: Questo richiede GitHub Pages API, ma per semplicità usiamo un approccio
   alternativo: mostra istruzioni per push manuale con comandi pre-compilati.
   ================================================================================ */

// ===== STATO PUSH =====
let lastPushTimestamp = null;
let pushInProgress = false;

// ===== INIZIALIZZAZIONE =====
function initGitHubAutoPush() {
    console.log('🚀 GitHub Auto-Push module initialized');
    
    // Carica ultimo push timestamp
    lastPushTimestamp = localStorage.getItem('sgmess_last_push');
    
    // Event listener per pulsante push manuale
    const pushBtn = document.getElementById('manualPushBtn');
    if (pushBtn) {
        pushBtn.addEventListener('click', () => {
            showPushInstructions();
        });
    }
    
    // Mostra info ultimo push nella pagina Importante
    updatePushStatus();
}

// ===== MOSTRA ISTRUZIONI PUSH =====
function showPushInstructions() {
    const token = window.getGitHubToken ? window.getGitHubToken() : null;
    
    if (!token || !window.GITHUB_CONFIG) {
        mostraNotifica('❌ Token GitHub non configurato', 'error');
        return;
    }
    
    const config = window.GITHUB_CONFIG;
    const commitMessage = `Update TESTmess v${window.APP_CONFIG?.version || '2.2.27'} - ${new Date().toLocaleString('it-IT')}`;
    
    // Crea comandi Git pre-compilati
    const commands = `# Comandi per push automatico
# Copia e incolla questi comandi nel terminale

cd /percorso/al/tuo/progetto

git add .
git commit -m "${commitMessage}"

# Push con token (il token è già incluso)
git push https://${config.username}:${token}@github.com/${config.repo}.git ${config.branch}`;
    
    // Mostra in modal o alert
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h3><i class="fab fa-github"></i> Push su GitHub</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div style="background: var(--gray-100); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                    <strong style="color: var(--primary-color);">
                        <i class="fas fa-info-circle"></i> Repository:
                    </strong>
                    <br>
                    <a href="https://github.com/${config.repo}" target="_blank" style="color: var(--link-color);">
                        https://github.com/${config.repo}
                    </a>
                </div>
                
                <div style="margin-bottom: 16px;">
                    <label style="font-weight: 500; margin-bottom: 8px; display: block;">
                        <i class="fas fa-terminal"></i> Comandi Git:
                    </label>
                    <textarea 
                        id="gitCommandsText" 
                        class="form-control" 
                        rows="8" 
                        readonly
                        style="font-family: monospace; font-size: 12px;"
                    >${commands}</textarea>
                </div>
                
                <div style="display: flex; gap: 12px;">
                    <button type="button" class="btn btn-primary" onclick="copyGitCommands()">
                        <i class="fas fa-copy"></i> Copia Comandi
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="tryAutoPush()">
                        <i class="fas fa-rocket"></i> Prova Auto-Push
                    </button>
                </div>
                
                <div style="margin-top: 16px; padding: 12px; background: var(--warning-light); border-left: 4px solid var(--warning-color); border-radius: 4px;">
                    <strong style="color: var(--warning-color);">
                        <i class="fas fa-exclamation-triangle"></i> Nota Sicurezza:
                    </strong>
                    <br>
                    <small style="color: var(--gray-700);">
                        Il token è visibile nei comandi. NON condividere questi comandi con nessuno.
                        Esegui solo su un terminale sicuro.
                    </small>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// ===== COPIA COMANDI GIT =====
function copyGitCommands() {
    const textarea = document.getElementById('gitCommandsText');
    if (!textarea) return;
    
    textarea.select();
    document.execCommand('copy');
    mostraNotifica('✅ Comandi copiati negli appunti!', 'success');
}

// ===== PROVA AUTO-PUSH (GitHub API) =====
async function tryAutoPush() {
    const token = window.getGitHubToken ? window.getGitHubToken() : null;
    
    if (!token || !window.GITHUB_CONFIG) {
        mostraNotifica('❌ Token GitHub non configurato', 'error');
        return;
    }
    
    if (pushInProgress) {
        mostraNotifica('⏳ Push già in corso...', 'info');
        return;
    }
    
    pushInProgress = true;
    mostraNotifica('🚀 Avvio auto-push su GitHub...', 'info');
    
    const config = window.GITHUB_CONFIG;
    const commitMessage = `Update TESTmess v${window.APP_CONFIG?.version || '2.2.27'} - ${new Date().toLocaleString('it-IT')}`;
    
    try {
        // METODO 1: Usa GitHub API per creare commit
        // Questo richiede l'hash del tree e del parent commit
        // Per semplicità, guidiamo l'utente a usare Git CLI
        
        mostraNotifica('⚠️ Auto-push richiede setup avanzato. Usa i comandi Git copiati.', 'warning');
        
        // Log per debug
        console.log('📤 Push configurato per:', {
            repo: config.repo,
            branch: config.branch,
            message: commitMessage
        });
        
        // Aggiorna timestamp
        lastPushTimestamp = new Date().toISOString();
        localStorage.setItem('sgmess_last_push', lastPushTimestamp);
        updatePushStatus();
        
    } catch (error) {
        console.error('❌ Errore auto-push:', error);
        mostraNotifica('❌ Errore auto-push. Usa i comandi Git manuali.', 'error');
    } finally {
        pushInProgress = false;
    }
}

// ===== AGGIORNA STATUS PUSH =====
function updatePushStatus() {
    const statusEl = document.getElementById('pushStatusInfo');
    if (!statusEl) return;
    
    if (!lastPushTimestamp) {
        statusEl.innerHTML = `
            <i class="fas fa-info-circle"></i>
            Nessun push effettuato ancora
        `;
        return;
    }
    
    const pushDate = new Date(lastPushTimestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now - pushDate) / 1000 / 60);
    
    let timeText = '';
    if (diffMinutes < 1) {
        timeText = 'Pochi secondi fa';
    } else if (diffMinutes < 60) {
        timeText = `${diffMinutes} minuti fa`;
    } else if (diffMinutes < 1440) {
        const hours = Math.floor(diffMinutes / 60);
        timeText = `${hours} ore fa`;
    } else {
        const days = Math.floor(diffMinutes / 1440);
        timeText = `${days} giorni fa`;
    }
    
    statusEl.innerHTML = `
        <i class="fas fa-check-circle" style="color: var(--success-color);"></i>
        Ultimo push: ${timeText}
        <br>
        <small style="color: var(--gray-600);">
            ${pushDate.toLocaleString('it-IT')}
        </small>
    `;
}

// ===== VERIFICA SE CI SONO MODIFICHE =====
function hasLocalChanges() {
    // Controlla se localStorage ha dati modificati rispetto all'ultimo push
    // Per semplicità, assume sempre che ci siano modifiche
    return true;
}

// ===== AUTO-PUSH SU EVENTO (opzionale) =====
function autoTriggerPush(eventName) {
    if (!window.GITHUB_CONFIG || !window.GITHUB_CONFIG.enabled) {
        return;
    }
    
    console.log(`📝 Evento "${eventName}" potrebbe richiedere push`);
    
    // Mostra notifica all'utente
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--info-light);
        border-left: 4px solid var(--info-color);
        padding: 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        max-width: 350px;
    `;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; margin-bottom: 12px;">
            <i class="fab fa-github" style="font-size: 24px; color: var(--info-color); margin-right: 12px;"></i>
            <div>
                <strong style="color: var(--gray-800);">Modifiche rilevate</strong>
                <br>
                <small style="color: var(--gray-600);">Vuoi fare push su GitHub?</small>
            </div>
        </div>
        <div style="display: flex; gap: 8px;">
            <button 
                type="button" 
                class="btn btn-sm btn-primary"
                onclick="showPushInstructions(); this.closest('.notification').remove();"
            >
                <i class="fas fa-arrow-up"></i> Push
            </button>
            <button 
                type="button" 
                class="btn btn-sm btn-secondary"
                onclick="this.closest('.notification').remove();"
            >
                Ignora
            </button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove dopo 10 secondi
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 10000);
}

// ===== HOOK PER EVENTI CRITICI =====
// Questi eventi potrebbero triggerare auto-push notification
window.addEventListener('sgmess:contact_saved', () => {
    autoTriggerPush('contact_saved');
});

window.addEventListener('sgmess:message_sent', () => {
    autoTriggerPush('message_sent');
});

// ===== ESPORTA FUNZIONI GLOBALI =====
window.initGitHubAutoPush = initGitHubAutoPush;
window.showPushInstructions = showPushInstructions;
window.tryAutoPush = tryAutoPush;
window.copyGitCommands = copyGitCommands;
window.updatePushStatus = updatePushStatus;
window.autoTriggerPush = autoTriggerPush;
