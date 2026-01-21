# CHANGELOG v2.5.0 - Dolce Paranoia (Promemoria Intelligenti)

**Data:** 21 gennaio 2025  
**Tipo:** Minor - Nuova feature intelligente  

---

## 🔔 **DOLCE PARANOIA: COS'È?**

Sistema intelligente che analizza cronologia messaggi + calendario per identificare automaticamente i lead che potrebbero dimenticarsi dell'appuntamento e necessitano di un promemoria.

---

## 🎯 **PROBLEMA RISOLTO:**

### **Scenario tipico:**
1. **Giorno 1 (21 gen):** Invii conferma appuntamento per il 26 gen ore 10:00
2. **Giorno 2 (22 gen):** Lead risponde OK
3. **Giorno 3-4:** Silenzio (lead si dimentica)
4. **Giorno 5 (26 gen):** Lead salta l'appuntamento 💥

### **Soluzione Dolce Paranoia:**
Calcola automaticamente quali lead hanno bisogno di un promemoria in base a:
- Giorni passati dall'ultimo messaggio
- Giorni mancanti all'appuntamento
- Ora dell'appuntamento (mattina/pomeriggio)

---

## 🧠 **LOGICA INTELLIGENTE (PROVVISORIA):**

### **Appuntamento MATTINA (prima delle 14:00):**
```
Mostra lead SE:
- Sono passati 2+ giorni da ultimo messaggio
- E mancano 2-3 giorni all'appuntamento
```

### **Appuntamento POMERIGGIO (dopo le 14:00):**
```
Mostra lead SE:
- Sono passati 3+ giorni da ultimo messaggio
- E manca 1-2 giorni all'appuntamento
```

**⚠️ NOTA:** Queste regole sono facilmente modificabili nel codice (righe 698-705 di `js/main.js`)

---

## 📱 **INTERFACCIA:**

### **Nuova card nella HOME:**
```
🔔 Dolce Paranoia - Promemoria
Lead che potrebbero dimenticarsi dell'appuntamento

[🔄 Aggiorna]

📱 Mario Rossi
📅 26 gennaio ore 10:00 (tra 2 giorni)
⏰ Ultimo messaggio: 3 giorni fa
[Seleziona] ← Click qui
```

### **Click su "Seleziona":**
1. Pre-compila automaticamente il form con:
   - Nome: Mario
   - Cognome: Rossi
   - Telefono: dal calendario
   - Tipo Messaggio: **Dolce Paranoia**
   - Orario: 10:00
2. Scroll smooth al form
3. Anteprima mostra il messaggio pronto

---

## 💬 **TEMPLATE "DOLCE PARANOIA":**

### **Testo:**
```
{BB} {NN}, ti ricordo che {GG} alle {HH} abbiamo la videochiamata. Ci sei? Confermami per favore, grazie
```

### **Variabili speciali:**

#### **{GG} DINAMICO:**
Calcola automaticamente in base ai giorni mancanti:
- 0 giorni → "oggi"
- 1 giorno → "domani"
- 2 giorni → "dopodomani"
- 3+ giorni → "tra 3 giorni", "tra 4 giorni", ecc.

**Esempi:**
```
Buon pomeriggio Mario, ti ricordo che domani alle 10:00 abbiamo la videochiamata. Ci sei? Confermami per favore, grazie

Buonasera Laura, ti ricordo che dopodomani alle 15:00 abbiamo la videochiamata. Ci sei? Confermami per favore, grazie
```

---

## 🔍 **ALGORITMO MATCHING:**

### **Come trova i lead giusti:**
1. **Carica cronologia** da Google Drive (timestamp ultimo messaggio)
2. **Carica eventi** dal calendario (futuri)
3. **Match per:**
   - Telefono normalizzato (priorità)
   - Nome + Cognome (fallback)
4. **Calcola:**
   - Giorni passati da ultimo messaggio
   - Giorni mancanti all'appuntamento
5. **Applica regole** Dolce Paranoia
6. **Mostra lista** ordinata

---

## 🆕 **FUNZIONI AGGIUNTE:**

### **In `js/main.js`:**
```javascript
// 🔔 DOLCE PARANOIA
async function getDolceParanoiaLeads()
async function renderDolceParanoiaList()
window.fillFormFromDolceParanoia(index)
function extractLeadFromEvent(event)
function normalizePhone(phone)
```

### **Helper functions:**
- `extractLeadFromEvent()` - Estrae nome/cognome/telefono da evento
- `normalizePhone()` - Normalizza telefono per matching
- `getDolceParanoiaLeads()` - Calcola lista lead filtrati
- `renderDolceParanoiaList()` - Mostra UI
- `fillFormFromDolceParanoia()` - Pre-compila form

---

## 🎨 **UI COMPONENTS:**

### **Nuova card HTML:**
```html
<div class="card">
    <div class="card-title">
        <span><i class="fas fa-bell"></i> 🔔 Dolce Paranoia - Promemoria</span>
        <button id="refreshDolceParanoiaBtn">🔄</button>
    </div>
    <div id="dolceParanoiaList">...</div>
</div>
```

### **Posizione:**
Nella HOME, subito dopo "Appuntamenti del Giorno"

---

## ⚡ **PERFORMANCE:**

- **Scan eseguito solo:** 
  - All'avvio app (se loggato)
  - Click su refresh button
- **Cache:** Nessuna (calcolo real-time, ~1-2 secondi)
- **Dati usati:**
  - Cronologia Drive (già caricata)
  - Calendario localStorage (già caricato)
- **Impatto:** Minimo (solo filtro in memoria)

---

## 🔄 **COMPATIBILITÀ:**

### **Backward compatible:**
✅ Template esistenti preservati (Primo Messaggio, Memo del Giorno)
✅ Cronologia funziona come prima
✅ Nessuna breaking change
✅ Se no eventi/cronologia → mostra "Nessun promemoria necessario"

### **Funzioni NON toccate:**
- `fillFormFromEvent()` - Riempimento form da calendario
- `saveToCronologia()` - Salvataggio messaggi
- `sendToWhatsApp()` - Invio WhatsApp
- Moduli: rubrica, auth, calendario base

---

## 📁 **FILE MODIFICATI:**

### **JavaScript:**
- `js/main.js`:
  - Array template + 3° default (Dolce Paranoia)
  - Migrazione automatica template
  - Logica {GG} dinamico
  - Funzioni Dolce Paranoia (5 nuove)
  - Event listener refresh button
  - Init renderDolceParanoiaList()
- `js/config.js` - Version 2.5.0

### **HTML:**
- `index.html`:
  - Nuova card Dolce Paranoia nella HOME
  - v2.5.0 + cache busting completo

### **Documentazione:**
- `CHANGELOG_v2.5.0.md` - Questo file

---

## ✅ **COME USARLO:**

1. **Apri app** → Fai login Google
2. **HOME:** Vedi card "🔔 Dolce Paranoia"
3. **Se ci sono lead:** Mostra lista con dettagli
4. **Click "Seleziona"** su un lead
5. **Form pre-compilato** → Verifica anteprima
6. **Invia su WhatsApp** come sempre

---

## 🔧 **PERSONALIZZAZIONE REGOLE:**

Per modificare le regole, edita `js/main.js` righe 698-705:

```javascript
// REGOLA MATTINA
if (isMattina) {
    mostraLead = giorniDaUltimoMessaggio >= 2 && 
                 giorniMancanti >= 2 && 
                 giorniMancanti <= 3;
}

// REGOLA POMERIGGIO
else {
    mostraLead = giorniDaUltimoMessaggio >= 3 && 
                 giorniMancanti >= 1 && 
                 giorniMancanti <= 2;
}
```

**Cambia i numeri per adattare alle tue esigenze!**

---

## 🚀 **PROSSIMI MIGLIORAMENTI (OPZIONALI):**

1. Notifiche push quando ci sono promemoria
2. Cache risultati per 1 ora (ridurre calcoli)
3. Regole personalizzabili via UI
4. Statistiche: % lead che rispondono dopo promemoria
5. Invio automatico programmato

---

## 📊 **STATISTICHE IMPLEMENTAZIONE:**

- **Linee codice aggiunte:** ~230 righe
- **Funzioni nuove:** 5
- **Template aggiunti:** 1
- **Breaking changes:** 0
- **Backward compatibility:** 100%
- **Performance impact:** Minimo (<1s calcolo)
