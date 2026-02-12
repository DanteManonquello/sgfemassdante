# CHANGELOG v2.5.12 - FIX PERSISTENZA LOGIN + RISELEZIONA DATA

**Data**: 03/02/2026  
**By**: Dante

---

## 🔴 PROBLEMI RISOLTI

### 1. **LOGOUT AUTOMATICO OGNI REFRESH**
L'app faceva logout automatico ogni volta che chiudevi e riaprivi il browser.

**Causa**: Il version check in `main.js` forzava logout ad ogni cambio versione.

**Fix**: Rimosso version check. Ora il token Google resta salvato in localStorage e **NON fai più logout automatico**.

---

### 2. **NON RISELEZIONAVA STESSA DATA**
Dopo aver selezionato un lead, cliccando di nuovo sullo stesso giorno non ricaricava i lead.

**Causa**: Il date picker HTML5 non triggera evento `change` se selezioni la stessa data.

**Fix**: Aggiunto listener `click` che forza il reload dei lead anche con la stessa data.

---

## ✅ FIX IMPLEMENTATI

### 1. **RIMOSSO VERSION CHECK** (main.js)

**PRIMA (v2.5.11 - LOGOUT AUTOMATICO)**:
```javascript
// 🔄 VERSION CHECK: Force logout se versione < 2.5.9
const currentVersion = '2.5.9';
const savedVersion = localStorage.getItem('sgmess_app_version');

if (!savedVersion || savedVersion < currentVersion) {
    // Clear token vecchio ❌
    localStorage.removeItem('sgmess_access_token');
    localStorage.removeItem('sgmess_token_expiry');
    // ...
}
```

**DOPO (v2.5.12 - PERSISTENZA LOGIN)**:
```javascript
// Rimosso version check - Il login persiste! ✅
```

---

### 2. **AGGIUNTO LISTENER CLICK** (google-calendar.js)

**PRIMA (v2.5.11 - SOLO CHANGE)**:
```javascript
selectDay.addEventListener('change', async function() {
    await updateLeadSelectorByDate(selectedDate);
});
```

**DOPO (v2.5.12 - ANCHE CLICK)**:
```javascript
selectDay.addEventListener('change', async function() {
    await updateLeadSelectorByDate(selectedDate);
});

// 🔴 FIX v2.5.12: Ricarica lead anche cliccando stessa data
selectDay.addEventListener('click', async function() {
    if (this.value) {
        console.log('📅 Click su date picker - Ricarico lead');
        await updateLeadSelectorByDate(this.value);
    }
});
```

---

## 📦 FILE MODIFICATI

1. **js/main.js**
   - Rimosso version check (righe 54-75)
   - Aggiornato log versione a v2.5.12

2. **js/google-calendar.js**
   - Aggiunto listener `click` su selectDay (righe 1161-1168)

3. **index.html**
   - Aggiornata versione a v2.5.12
   - Cache busting su main.js e google-calendar.js

---

## 🎯 COME FUNZIONA ORA

### Persistenza Login:

1. **Fai login Google** → Token salvato in localStorage
2. **Chiudi browser** → Token resta salvato
3. **Riapri browser** → Sei ancora loggato ✅
4. **Token valido per ~1 ora** → Dopo scade automaticamente

---

### Riseleziona Data:

1. **Selezioni una data** (es: 04/02/2026) → Carica lead
2. **Selezioni un lead** → Form compilato
3. **Clicchi di nuovo sulla data** (04/02/2026) → **Lead ricaricati!** ✅

**Comportamento**:
- Evento `change`: si triggera solo se cambi data
- Evento `click`: si triggera ogni volta che clicchi sul date picker

---

## 🔄 COMPATIBILITÀ

Tutti i fix delle versioni precedenti sono preservati:

- ✅ **v2.5.11**: Salvataggio rubrica funzionante
- ✅ **v2.5.10**: Formato contatti corretto
- ✅ **v2.5.9**: Scope OAuth completi + error handling 403
- ✅ **v2.5.8**: Fix notifiche + auto-logout 401
- ✅ **v2.5.7**: Fix calendario data oggi + dropdown calendari

---

## ⚠️ NOTA IMPORTANTE

**Il token Google scade dopo ~1 ora di inattività.**

Quando scade, vedrai:
- Foto profilo scompare
- Pulsante "Connetti Google" riappare
- Devi rifare login manualmente

Questo è **NORMALE** e previsto da Google OAuth per sicurezza.

---

**Developed by Dante**  
**Versione**: v2.5.12  
**Data**: 03/02/2026
