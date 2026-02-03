# CHANGELOG v2.5.8 - FIX RUBRICA NOTIFICHE

**Data:** 03/02/2026  
**Tipo:** Hotfix Critico  
**Focus:** Rubrica - Fix notifiche e auto-logout

---

## 🐛 BUG CRITICI RISOLTI

### 1. **mostraNotifica is not defined**
- **Problema**: `ReferenceError: mostraNotifica is not defined` quando si salvava un contatto
- **Causa**: Usato nome funzione SBAGLIATO - la funzione corretta è `showNotification`
- **Fix**: 
  - Sostituiti TUTTI i 22 `mostraNotifica` → `showNotification` in rubrica.js
  - Aggiunto export `window.showNotification` in main.js
- **Impatto**: Ora le notifiche funzionano quando salvi/sincronizzi rubrica

### 2. **Token 401 non gestito (auth loop infinito)**
- **Problema**: Con token scaduto, l'app continuava a provare chiamate API fallite (401)
- **Causa**: Errore 401 non forzava logout/pulizia token
- **Fix**: 
  - Aggiunto auto-logout su errore 401 (attende 1.5s poi chiama `handleSignoutClick`)
  - Notifica chiara: "Token scaduto - Rifare login"
- **Impatto**: Con token scaduto, ora viene forzato logout automatico

### 3. **Foto profilo non visibile**
- **Problema**: Foto profilo non si vedeva
- **Causa**: Token scaduto (errore 401 su getUserInfo)
- **Fix**: Si risolve automaticamente dopo nuovo login (effetto del fix #2)

---

## 🔧 MODIFICHE TECNICHE

### File modificati:
1. **js/rubrica.js**
   - Sostituiti 22 occorrenze `mostraNotifica` → `showNotification`
   - Aggiunto auto-logout su errore 401 in 2 funzioni:
     - `syncSavedContactsFromGoogle()` (riga ~541)
     - `saveContactToGoogle()` (riga ~644)
   - Versione aggiornata a v2.5.8

2. **js/main.js**
   - Aggiunto export `window.showNotification = showNotification`
   - Versione aggiornata a v2.5.8

3. **index.html**
   - Versione aggiornata a v2.5.8
   - Cache busting su tutti gli script (?v=2.5.8)

---

## 📋 TESTING

### Scenari testati:
- ✅ Sintassi JS corretta (node -c)
- ✅ showNotification esportata globalmente
- ✅ Auto-logout su 401 (timeout 1.5s)

### Scenari da testare DOPO deploy:
- ⏳ Notifica visibile quando salvi contatto
- ⏳ Logout automatico con token scaduto
- ⏳ Foto profilo visibile dopo nuovo login

---

## 🚀 DEPLOYMENT

```bash
# Versione: v2.5.8
# Tag: TESTmess_v2.5.8_FIX_RUBRICA_NOTIFICHE
# Branch: main
# Commit: Fix notifiche rubrica + auto-logout su 401
```

---

## 📝 ISTRUZIONI URGENTI

**⚠️ IMPORTANTE: DOPO L'AGGIORNAMENTO DEVI RIFARE LOGIN**

1. **Vai su** https://dantemanonquello.github.io/sgfemassdante/
2. **Click su "Disconnetti"** (icona logout in alto a destra)
3. **Click su "Connetti Google"**
4. **Accetta tutti i permessi**
5. **Verifica foto profilo** visibile
6. **Vai su Rubrica** → Click "🔄 Sincronizza Ora"
7. **Prova a salvare un contatto** → Ora vedi notifica verde "✅ Salvato"

---

## 🔗 RIEPILOGO VERSIONI

### v2.5.8 (Rubrica notifiche):
- ✅ Fix mostraNotifica → showNotification
- ✅ Auto-logout su token 401

### v2.5.7 (Calendario):
- ✅ Data parte da OGGI
- ✅ Dropdown calendari popolato

### v2.5.6 (Rubrica base):
- ✅ Sincronizzazione Google Contacts
- ✅ Salvataggio contatti

---

**Developed by Dante** 🚀  
**NOTA:** Questo è un hotfix urgente per bug console critico
