# CHANGELOG v2.5.13 - FIX DROPDOWN LEAD INCLICCABILE + VISUALIZZAZIONE CONTATTATI

**Data**: 03/02/2026  
**By**: Dante

---

## 🔴 PROBLEMA RISOLTO

Dopo aver inviato/generato un messaggio, **il dropdown "Seleziona Lead" diventava incliccabile**.

**Causa**: Il listener `click` aggiunto in v2.5.12 causava race conditions e troppi reload.

---

## ✅ FIX IMPLEMENTATI

### 1. **RIMOSSO LISTENER CLICK PROBLEMATICO** (google-calendar.js)

**PRIMA (v2.5.12 - PROBLEMATICO)**:
```javascript
// Listener click triggera TROPPO spesso
selectDay.addEventListener('click', async function() {
    await updateLeadSelectorByDate(selectedDate); // ❌ Troppi reload!
});
```

**DOPO (v2.5.13 - RIMOSSO)**:
```javascript
// Rimosso! Era già presente un pulsante "Ricarica" ✅
```

---

### 2. **MIGLIORATA VISUALIZZAZIONE LEAD CONTATTATI** (google-calendar.js)

**PRIMA (v2.5.12)**:
- ✅ Lead contattati → Verde normale
- ⏳ Lead non contattati → Grigio

**DOPO (v2.5.13)**:
- **✅ Lead contattati → Verde scuro + grassetto**
- **❌ Lead NON contattati → Rosso**

```javascript
if (isContacted) {
    option.textContent = `✅ ${eventTime} - ${leadName}`;
    option.style.color = '#059669'; // Verde scuro
    option.style.fontWeight = '600'; // Grassetto
} else {
    option.textContent = `❌ ${eventTime} - ${leadName}`;
    option.style.color = '#DC2626'; // Rosso
    option.style.fontWeight = '400';
}
```

---

### 3. **PULSANTE RICARICA GIÀ PRESENTE** (index.html)

Il pulsante "🔄 Ricarica" accanto a "Seleziona Lead" era **già presente** nel codice.

**Come usarlo**:
1. Seleziona una data
2. Seleziona un lead
3. Invia/genera messaggio
4. Clicca **🔄** per ricaricare i lead

---

## 📦 FILE MODIFICATI

1. **js/google-calendar.js**
   - Rimosso listener `click` problematico (righe 1161-1167 eliminate)
   - Cambiata visualizzazione lead: ❌ rosso per non contattati (righe 626-635)

2. **index.html**
   - Aggiornata versione a v2.5.13
   - Migliorata struttura dropdown lead con pulsante ricarica

---

## 🎯 COME FUNZIONA ORA

### Workflow normale:
1. **Seleziona data** → Dropdown si popola con lead
2. **Lead contattati** → Mostrati con **✅ verde scuro**
3. **Lead NON contattati** → Mostrati con **❌ rosso**
4. **Seleziona lead** → Form si compila
5. **Invia/genera messaggio** → Lead marcato come contattato
6. **Dropdown resta cliccabile** ✅

### Se serve ricaricare:
- Clicca pulsante **🔄 Ricarica** accanto a "Seleziona Lead"

---

## 🔄 COMPATIBILITÀ

Tutti i fix delle versioni precedenti sono preservati:

- ✅ **v2.5.12**: Login persistente
- ✅ **v2.5.11**: Salvataggio rubrica
- ✅ **v2.5.10**: Formato contatti
- ✅ **v2.5.9**: Scope OAuth
- ✅ **v2.5.8**: Notifiche

---

## 🐛 BUG FIXATO

**Problema**: Listener `click` su date picker triggerava `updateLeadSelectorByDate()` troppo spesso:
- Ogni click sul calendario
- Ogni click sulle frecce
- Ogni apertura del date picker
- Causava race conditions e dropdown bloccato

**Soluzione**: Rimosso listener `click`, utilizzato pulsante "🔄 Ricarica" già presente.

---

**Developed by Dante**  
**Versione**: v2.5.13  
**Data**: 03/02/2026
