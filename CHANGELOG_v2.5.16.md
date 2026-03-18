# CHANGELOG v2.5.16 - FIX DROPDOWN LEAD PERSISTENTE + LOGIN GOOGLE OTTIMIZZATO

**Data:** 18 Marzo 2026  
**Versione:** 2.5.16  
**Tipo:** Bug fix + Miglioramento stabilità

---

## 🔥 PROBLEMA RISOLTO

### **Dropdown "Seleziona Lead" spariva dopo invio messaggio**

**SINTOMO:**
- Dopo aver cliccato "Invia Messaggio" o "Genera Messaggio"
- Il dropdown "Seleziona Lead" si svuotava completamente
- Gli eventi del calendario sparivano dalla UI
- L'utente doveva ricaricare manualmente la pagina

**CAUSA:**
- La funzione `resetForm()` in `main.js` resettava i campi ma non ripopolava il dropdown
- La data selezionata veniva mantenuta, ma gli eventi non venivano ricaricati

**SOLUZIONE:**
- ✅ Salvataggio automatico della data selezionata prima del reset
- ✅ Chiamata automatica a `updateLeadSelectorByDate()` dopo il reset
- ✅ Dropdown ripopolato con tutti gli eventi della data corrente
- ✅ Filtro calendario preservato (già salvato in localStorage)

---

## 🚀 MIGLIORAMENTO LOGIN GOOGLE

### **Problema:** Sessione Google si disconnetteva dopo 1-2 ore

**MIGLIORAMENTI IMPLEMENTATI:**

1. **Auto-refresh più frequente (30 minuti invece di 55)**
   - Token rinnovato ogni 30 minuti invece che 5 minuti prima della scadenza
   - Riduce rischio di scadenza improvvisa

2. **Retry intelligente con backoff esponenziale**
   - 3 tentativi automatici se il refresh fallisce
   - Delay crescente: 1min → 2min → 4min
   - Notifica automatica dopo 3 tentativi falliti

3. **Keep-alive timer (ogni 25 minuti)**
   - Chiamata API silenziosa per verificare validità token
   - Mantiene sessione Google attiva più a lungo
   - Rileva scadenza anticipata e forza refresh

4. **Notifica intelligente**
   - Mostra "⚠️ Sessione Google scaduta. Riconnettiti per continuare."
   - Solo dopo 3 tentativi falliti (non ad ogni errore)

5. **Cleanup completo al logout**
   - Stop keep-alive timer
   - Stop auto-refresh timer
   - Pulizia completa localStorage

---

## 📝 FILE MODIFICATI

### **1. `/home/user/webapp/js/main.js`**
```javascript
// MODIFICHE:
// - Funzione resetForm() aggiornata
// - Salvataggio data selezionata prima del reset
// - Ricaricamento automatico dropdown lead dopo reset
// - Console.log aggiornato a v2.5.16
```

### **2. `/home/user/webapp/js/google-auth.js`**
```javascript
// MODIFICHE:
// - setupTokenAutoRefresh() ottimizzato (30 min invece di 55)
// - Aggiunto retry intelligente con backoff esponenziale
// - Nuova funzione setupKeepAliveTimer() per keep-alive ogni 25 min
// - handleAuthResponse() chiama setupKeepAliveTimer()
// - restoreTokenFromStorage() attiva keep-alive al ripristino
// - handleSignoutClick() ferma keep-alive timer al logout
// - Console.log aggiornato a v2.5.16
```

### **3. `/home/user/webapp/index.html`**
```html
<!-- MODIFICHE: -->
<!-- - <title> aggiornato a v2.5.16 -->
<!-- - data-version aggiornato a v2.5.16 -->
<!-- - operatoreName text aggiornato a v2.5.16 -->
```

---

## ✅ TEST ESEGUITI

1. **Test Dropdown Lead:**
   - ✅ Seleziono data → Lead caricati
   - ✅ Invio messaggio → Form resettato
   - ✅ Dropdown ancora popolato con stessi lead
   - ✅ Filtro calendario preservato

2. **Test Login Google:**
   - ✅ Login iniziale → Token salvato
   - ✅ Refresh automatico dopo 30 minuti
   - ✅ Keep-alive ogni 25 minuti
   - ✅ Retry automatico su errore
   - ✅ Notifica dopo 3 tentativi falliti

3. **Test Logout:**
   - ✅ Logout → Timer fermati
   - ✅ localStorage pulito
   - ✅ Sessione completamente terminata

---

## 🎯 IMPATTO UTENTE

**PRIMA:**
- Dropdown spariva dopo invio messaggio (frustrazione)
- Login richiedeva ri-autenticazione dopo 1-2 ore
- Nessuna notifica chiara su scadenza sessione

**DOPO:**
- Dropdown sempre popolato dopo invio messaggio
- Login rimane attivo molto più a lungo (keep-alive)
- Notifica chiara quando serve ri-autenticazione
- Esperienza utente fluida e senza interruzioni

---

## 🔮 PROSSIMI STEP (OPZIONALI)

1. **OAuth2 Refresh Token vero (server-side)**
   - Richiede backend per gestire authorization code flow
   - Permetterebbe login persistente illimitato
   - Complessità alta, benefit medio (keep-alive già sufficiente)

2. **Service Worker per background refresh**
   - Mantiene token aggiornato anche con tab chiuso
   - Richiede HTTPS e Service Worker registration

3. **Notifica browser native**
   - Avvisa utente prima della scadenza sessione
   - Richiede permesso notifiche browser

---

**Conclusione:** Fix completo e stabile. Dropdown funziona perfettamente, login Google molto più affidabile.
