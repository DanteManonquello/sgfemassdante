# CHANGELOG v2.5.18 - DEBUG DROPDOWN LEAD + LOGGING ESTESO

**Data:** 18 Marzo 2026  
**Versione:** 2.5.18  
**Tipo:** Debug + Logging

---

## 🔍 PROBLEMA IN ANALISI

### **Dropdown "Seleziona Lead" scompare dopo selezione**

**SINTOMO:**
- Selezioni un lead dal dropdown
- Il dropdown si svuota e mostra "-- Nessun appuntamento per questo giorno --"
- Non puoi selezionare altri lead senza ricaricare la pagina

**CAUSA IPOTIZZATA:**
1. **Mancanza eventi**: localStorage vuoto o eventi non sincronizzati
2. **Filtro calendario**: Calendario filter esclude tutti gli eventi
3. **Eventi "X"**: Tutti gli eventi hanno titolo "X" (esclusi automaticamente)
4. **Problema date**: Mismatch tra data selezionata e data eventi

---

## 🚀 MODIFICHE IMPLEMENTATE

### **1. Logging Esteso in `updateLeadSelectorByDate()`**

**PRIMA (v2.5.17):**
```javascript
const allEvents = JSON.parse(allEventsJSON || '[]');
// Nessun logging
```

**DOPO (v2.5.18):**
```javascript
const allEvents = JSON.parse(allEventsJSON || '[]');

console.log(`📊 Eventi totali in localStorage: ${allEvents.length}`);
if (allEvents.length === 0) {
    console.warn('⚠️ NESSUN EVENTO nel localStorage! Sincronizzazione necessaria.');
}
```

### **2. Logging Dettagliato Dopo Filtro**

**NUOVO (v2.5.18):**
```javascript
console.log(`📅 Filtro applicato per ${dateString}:`);
console.log(`   - Eventi dopo filtro data: ${...}`);
console.log(`   - Eventi dopo esclusione "X": ${...}`);
console.log(`   - Calendario selezionato: ${homeCalendarFilter}`);
console.log(`   - Eventi finali per questo giorno: ${dayEvents.length}`);

if (dayEvents.length === 0) {
    console.warn(`⚠️ NESSUN EVENTO trovato per ${dateString}!`);
    console.warn(`   Possibili cause:`);
    console.warn(`   1. Nessun evento in questa data`);
    console.warn(`   2. Tutti gli eventi hanno titolo "X" (esclusi)`);
    console.warn(`   3. Filtro calendario esclude gli eventi`);
    console.warn(`   4. Eventi non sincronizzati dal Google Calendar`);
}
```

---

## 📝 FILE MODIFICATI

### **1. `/home/user/webapp/js/google-calendar.js`**

**Modifiche:**
- Aggiunto logging totale eventi in localStorage (riga ~561)
- Aggiunto warning se localStorage vuoto
- Aggiunto logging dettagliato dopo filtro (riga ~597)
- Aggiunto diagnostica 4 cause possibili quando dayEvents.length === 0
- Console.log versione aggiornato a v2.5.18

### **2. `/home/user/webapp/index.html`**

**Modifiche:**
- Versioning aggiornato a v2.5.18 (title + subtitle)
- Cache-busting aggiornato: `google-calendar.js?v=2.5.18`

---

## ✅ COME USARE QUESTO DEBUG

### **Per capire perché il dropdown si svuota:**

1. **Apri Console Browser** (F12 → Console)

2. **Seleziona un giorno** dal date picker

3. **Guarda i log console:**
```
🔄 updateLeadSelectorByDate chiamato per: 2026-03-18
📊 Eventi totali in localStorage: 127
📅 Filtro applicato per 2026-03-18:
   - Eventi dopo filtro data: 5
   - Eventi dopo esclusione "X": 120
   - Calendario selezionato: all
   - Eventi finali per questo giorno: 3
✅ Trovati 3 lead totali (1 già contattati) per 2026-03-18
```

4. **Se vedi `NESSUN EVENTO` nei log:**

**Scenario A: localStorage vuoto**
```
📊 Eventi totali in localStorage: 0
⚠️ NESSUN EVENTO nel localStorage! Sincronizzazione necessaria.
```
**SOLUZIONE:** Clicca "Connetti Google" e aspetta sincronizzazione calendario

**Scenario B: Filtro data esclude tutti**
```
📊 Eventi totali in localStorage: 127
📅 Filtro applicato per 2026-03-18:
   - Eventi dopo filtro data: 0  ← PROBLEMA!
```
**SOLUZIONE:** Nessun evento in questa data, seleziona altra data

**Scenario C: Tutti eventi "X"**
```
📊 Eventi totali in localStorage: 127
📅 Filtro applicato per 2026-03-18:
   - Eventi dopo filtro data: 5
   - Eventi dopo esclusione "X": 0  ← PROBLEMA!
```
**SOLUZIONE:** Tutti gli eventi hanno titolo "X", rinominali nel calendario Google

**Scenario D: Filtro calendario esclude**
```
📊 Eventi totali in localStorage: 127
📅 Filtro applicato per 2026-03-18:
   - Eventi dopo filtro data: 5
   - Eventi dopo esclusione "X": 5
   - Calendario selezionato: abc123def  ← Non corrisponde!
   - Eventi finali per questo giorno: 0
```
**SOLUZIONE:** Cambia filtro calendario su "Tutti i Calendari"

---

## 🎯 PROSSIMI STEP

### **Se il logging rivela la causa:**

1. **Implementare fix specifico** in base alla causa identificata
2. **Versione v2.5.19** con soluzione definitiva
3. **Rimuovere logging debug** (troppo verboso per produzione)

### **Se il problema persiste:**

- Condividi screenshot console con i log
- Verifica manualmente localStorage: `localStorage.getItem('sgmess_calendar_events')`
- Controlla se OAuth è attivo e funzionante

---

## 📦 VERSIONING

- **v2.5.15** - Versione base iniziale
- **v2.5.16** - Fix dropdown lead + Login Google ottimizzato
- **v2.5.17** - Fix export funzione saveContactToGoogle
- **v2.5.18** - Debug logging esteso dropdown ✅ **CORRENTE**

---

**Conclusione:** Versione di debug per diagnosticare il problema del dropdown che scompare. Usa la console browser per capire la causa esatta.
