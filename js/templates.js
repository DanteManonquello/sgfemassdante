/* ================================================================================
   TEMPLATE EDITOR
   ================================================================================ */

// ===== COSTANTI TEMPLATE =====
const NOME_OPERATORE = "Dante";

// ===== MASTER MESSAGE v2.5.19 =====
const MASTER_MESSAGE = `Buonasera {NN}, sono Dante di Stock Gain. Hai avuto un colloquio con {YY} assistente e mi ha riferito che abbiamo un appuntamento {GG} alle {HH}. Ti manderò il link per la videochiamata 10 minuti prima e, nel frattempo, ti invito a leggere il file che ti è stato inviato, è molto importante. Passa una buona serata`;

// Funzione per inserire Master Message nell'output
window.insertMasterMessage = function() {
    const outputField = document.getElementById('outputMessaggio');
    if (outputField) {
        outputField.value = MASTER_MESSAGE;
        console.log('✅ Master Message inserito nell\'output');
    } else {
        console.error('❌ Campo outputMessaggio non trovato');
    }
};

// Export Master Message per accesso esterno
window.MASTER_MESSAGE = MASTER_MESSAGE;

// Placeholder per editor template
console.log('✅ Templates module v2.5.19 caricato - Master Message disponibile');

// TODO: Implementare editor template messaggi
