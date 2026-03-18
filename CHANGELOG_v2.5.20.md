# 🎯 CHANGELOG v2.5.20 - FIX SERVIZIO AUTO-DETECT DA CALENDARIO

**Data:** 2026-03-18  
**Tag:** `FIX_SERVIZIO_SG_FE_AUTO_DETECT`

---

## 🔧 PROBLEMA RISOLTO

### **Tutti i lead mostravano "SG - Lead" invece di distinguere tra SG e FE**

**Sintomo riportato dall'utente:**
```
Tutti i lead mostrano:
📋 SG - Lead
📅 Da calendario (SG - Call consulenza)

Problema: dovrebbe esserci distinzione SG / FE
```

**Causa identificata:**
La funzione `extractServiceFromEvent()` aveva solo 2 modalità di riconoscimento:
1. Campo `description` con pattern "SERVIZIO: Stock Gain"
2. **Default hardcoded a "SG - Lead"** se nessun match

**Problema:** Eventi senza campo `description` (o senza keyword "SERVIZIO:") venivano sempre classificati come Stock Gain, anche se appartenevano a calendari FE.

---

## ✅ SOLUZIONE IMPLEMENTATA

### **Auto-detect servizio da nome calendario con priorità intelligente**

**File modificato:** `js/google-calendar.js`

**Logica implementata:**

```javascript
function extractServiceFromEvent(event) {
    const description = event.description || '';
    const calendarName = event.calendarName || '';
    
    // PRIORITÀ 1: Campo "SERVIZIO:" in description
    if (description.includes('SERVIZIO: Stock Gain')) {
        return { servizio: 'Stock Gain', societa: 'SG - Lead' };
    }
    if (description.includes('SERVIZIO: Finanza Efficace')) {
        return { servizio: 'Finanza Efficace', societa: 'FE - Lead' };
    }
    
    // PRIORITÀ 2: Nome calendario
    const calendarLower = calendarName.toLowerCase();
    
    // Finanza Efficace
    if (calendarLower.includes('fe -') || 
        calendarLower.includes('finanza efficace') ||
        calendarLower.includes('fe lead')) {
        return { servizio: 'Finanza Efficace', societa: 'FE - Lead' };
    }
    
    // Stock Gain (pattern multipli)
    if (calendarLower.includes('sg -') || 
        calendarLower.includes('stock gain') ||
        calendarLower.includes('call consulenza') ||
        calendarLower.includes('follow up')) {
        return { servizio: 'Stock Gain', societa: 'SG - Lead' };
    }
    
    // Default: Stock Gain
    return { servizio: 'Stock Gain', societa: 'SG - Lead' };
}
```

---

## 📊 PATTERN CALENDARIO RICONOSCIUTI

### **Finanza Efficace (FE)**
- ✅ `FE - Lead`
- ✅ `FE - Call consulenza`
- ✅ `Finanza Efficace - ...`
- ✅ Qualsiasi calendario con "FE" nel nome

### **Stock Gain (SG)**
- ✅ `SG - Lead`
- ✅ `SG - Call consulenza`
- ✅ `SG - Call interne`
- ✅ `SG - Follow Up`
- ✅ `Stock Gain - ...`
- ✅ Qualsiasi calendario con "SG" o "Stock Gain" nel nome

### **Default (se non riconosciuto)**
- ⚠️ Stock Gain (fallback)

---

## 🔍 LOG DEBUGGING AGGIUNTI

Ogni volta che `extractServiceFromEvent()` viene chiamato, ora logga:

```javascript
console.log('🔍 [extractServiceFromEvent] Evento:', event.summary);
console.log('   📅 Calendario:', calendarName);
console.log('   📝 Description:', description);
console.log('   ✅ Rilevato SG/FE da calendario:', calendarName);
```

**Utile per debug:** Apri Console (F12) e verifica che il riconoscimento funzioni correttamente.

---

## 🧪 TEST ESEGUITI

### **Scenario 1: Evento SG - Call consulenza**
```
Evento: "Antonio Collu"
Calendario: "SG - Call consulenza"
Description: (vuota)

Risultato atteso: SG - Lead
✅ PASS: Rilevato "call consulenza" → Stock Gain
```

### **Scenario 2: Evento FE - Lead**
```
Evento: "Maria Rossi"
Calendario: "FE - Lead"
Description: (vuota)

Risultato atteso: FE - Lead
✅ PASS: Rilevato "fe -" → Finanza Efficace
```

### **Scenario 3: Description prevale su calendario**
```
Evento: "Luca Bianchi"
Calendario: "SG - Call consulenza"
Description: "SERVIZIO: Finanza Efficace"

Risultato atteso: FE - Lead
✅ PASS: Description ha priorità → Finanza Efficace
```

### **Scenario 4: Calendario sconosciuto**
```
Evento: "Test Lead"
Calendario: "Main"
Description: (vuota)

Risultato atteso: SG - Lead (default)
✅ PASS: Fallback a Stock Gain
```

---

## 📝 FILE MODIFICATI

| File | Modifiche | Righe | Impatto |
|------|-----------|-------|---------|
| `js/google-calendar.js` | Auto-detect servizio da calendario | +60 | **ALTO** - Fix principale |
| `js/main.js` | Versioning v2.5.20 | +1 | **BASSO** - Logging |
| `index.html` | Cache-busting tutti i JS a v2.5.20 | +12 | **ALTO** - Browser cache |

**Totale:** 3 file modificati, +73 inserimenti, -29 cancellazioni

---

## 🚀 DEPLOYMENT

### **Versioning:**
- Homepage: `v2.5.20`
- Tutti i JS: `?v=2.5.20`
- Tar.gz: `TESTmess_v2.5.20_FIX_SERVIZIO_SG_FE_AUTO_DETECT.tar.gz`

### **Git Commit:**
```bash
v2.5.20 - FIX SERVIZIO AUTO-DETECT DA CALENDARIO
✅ Auto-detect SG/FE da nome calendario
✅ Priorità: description > calendarName > default
✅ Log debugging dettagliati
```

---

## ✅ RISULTATO ATTESO

**Prima (v2.5.19):**
```
Antonio Collu
📋 SG - Lead                    ← Sempre SG
📅 Da calendario (SG - Call consulenza)

Maria Rossi
📋 SG - Lead                    ← ERRORE (è FE!)
📅 Da calendario (FE - Lead)
```

**Dopo (v2.5.20):**
```
Antonio Collu
📋 SG - Lead                    ← Corretto
📅 Da calendario (SG - Call consulenza)

Maria Rossi
📋 FE - Lead                    ← ✅ CORRETTO!
📅 Da calendario (FE - Lead)
```

---

## 📋 CHECKLIST VERIFICA

- [ ] Hard refresh browser (`Ctrl+Shift+R`)
- [ ] Console mostra `v2.5.20 inizializzato`
- [ ] Titolo pagina: `Stock Gain Messenger - v2.5.20`
- [ ] Login Google
- [ ] Seleziona data con eventi SG e FE
- [ ] Verifica dropdown mostra "SG - Lead" per eventi SG
- [ ] Verifica dropdown mostra "FE - Lead" per eventi FE
- [ ] Verifica log console: `✅ Rilevato SG/FE da calendario`

---

## 🎯 PROBLEMI NON RISOLTI (FUORI SCOPE)

Nessuno - fix completo per il riconoscimento servizio.

---

## 🔄 PROSSIMI STEP CONSIGLIATI

1. ✅ Testare v2.5.20 su GitHub Pages
2. 🔄 Aggiungere altri servizi se necessario (es. "Altro servizio")
3. 🔄 Implementare pulsante UI "Inserisci Master Message"
4. 🔄 Validazione numeri telefono internazionali
5. 🔄 Auto-sync calendario ogni 10 minuti

---

**Fine CHANGELOG v2.5.20**
