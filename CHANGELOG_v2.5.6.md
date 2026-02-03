# CHANGELOG v2.5.6 - FIX RUBRICA COMPLETO

**Data:** 03/02/2026  
**Tipo:** Bug Fix Critico  
**Focus:** Funzionalità Rubrica

---

## 🐛 BUG CRITICI RISOLTI

### 1. **Sincronizzazione Rubrica Google NON funzionava**
- **Problema**: `syncSavedContactsFromGoogle()` usava API `gapi.client.people.people.connections.list()` che NON ESISTE
- **Soluzione**: Corretta chiamata API usando `gapi.client.request()` con path diretto
- **Path corretto**: `https://people.googleapis.com/v1/people/me/connections`
- **Impatto**: Ora la sincronizzazione funziona DAVVERO e carica tutti i contatti da Google

### 2. **Pulsante "Già salvato" NON salvava in Google**
- **Problema**: `markContactAsSaved()` salvava SOLO nel cache localStorage, NON in Google Contacts
- **Soluzione**: 
  - Rinominata funzione in `markContactAsAlreadySaved()` per chiarezza
  - Questa funzione ora marca SOLO il cache locale (comportamento corretto per "già salvato")
  - Il salvataggio effettivo in Google usa SEMPRE `saveContactToGoogle()`
- **Impatto**: Comportamento coerente e chiaro per entrambi i pulsanti

### 3. **Conflitto nome funzione `saveContactToGoogle()`**
- **Problema**: Due funzioni con STESSO nome ma signature diverse in `rubrica.js` e `google-auth.js`
- **Soluzione**: 
  - Rinominata quella in `google-auth.js` → `saveContactToGoogleLegacy()`
  - Unificata implementazione in `rubrica.js` con API corretta
  - Usata `gapi.client.request()` con path diretto per createContact
- **Path corretto**: `https://people.googleapis.com/v1/people:createContact`
- **Impatto**: Salvataggio contatti ora funziona correttamente

### 4. **Normalizzazione telefono inconsistente**
- **Problema**: Funzioni `normalizePhone()` diverse in rubrica.js e google-auth.js
- **Soluzione**: 
  - Unificata logica normalizzazione in rubrica.js
  - Aggiunta funzione `formatPhoneForGoogle()` per formato con prefisso +
  - Gestione corretta di: prefisso 00, numeri a 10 cifre, prefisso +39
- **Impatto**: Matching contatti duplicati ora funziona correttamente

---

## ✨ MIGLIORAMENTI UX

### 1. **Spinner e Disable durante salvataggio**
- Pulsanti disabilitati durante chiamate API
- Spinner visibile per feedback immediato
- Previene doppi click accidentali

### 2. **Error handling specifico**
- Messaggi diversi per ogni tipo di errore:
  - **401**: Autenticazione scaduta
  - **403**: Permessi insufficienti
  - **409**: Contatto già esistente (gestito come successo)
  - **429**: Rate limit raggiunto
  - **TOKEN_EXPIRED**: Sessione scaduta
- Console.error con dettagli completi per debug

### 3. **Cache ridotta a 10 minuti**
- Vecchio: 1 ora
- Nuovo: 10 minuti
- Motivo: UI più reattiva ai cambiamenti

### 4. **Auto-refresh UI**
- Dopo ogni salvataggio/sync, la lista si aggiorna automaticamente
- Invalida cache automaticamente dopo modifiche

---

## 🔧 MODIFICHE TECNICHE

### File modificati:
1. **js/rubrica.js**
   - Corretto `syncSavedContactsFromGoogle()` con API path corretta
   - Corretto `saveContactToGoogle()` con API path corretta
   - Rinominato `markContactAsSaved()` → `markContactAsAlreadySaved()`
   - Unificata `normalizePhone()`
   - Aggiunta `formatPhoneForGoogle()`
   - Aggiunti spinner su pulsanti
   - Migliorato error handling
   - Cache ridotta a 10 minuti

2. **js/google-auth.js**
   - Rinominato `saveContactToGoogle()` → `saveContactToGoogleLegacy()`
   - Aggiunto commento DEPRECATO

3. **index.html**
   - Versione aggiornata a v2.5.6
   - Cache busting su tutti gli script (?v=2.5.6)

---

## 📋 TESTING

### Scenari testati:
- ✅ Sincronizzazione iniziale rubrica Google
- ✅ Salvataggio nuovo contatto in Google Contacts
- ✅ Marcatura contatto come "già salvato" (solo cache)
- ✅ Gestione contatti duplicati (409)
- ✅ Gestione token scaduto
- ✅ Gestione permessi insufficienti
- ✅ Gestione rate limit (429)
- ✅ Auto-refresh lista dopo salvataggio
- ✅ Spinner e disable pulsanti durante operazioni

---

## 🚀 DEPLOYMENT

```bash
# Versione: v2.5.6
# Tag: TESTmess_v2.5.6_FIX_RUBRICA_COMPLETO
# Branch: main
# Commit: Fix rubrica - sincronizzazione e salvataggio funzionanti
```

---

## 📝 NOTE PER UTENTI

**IMPORTANTE: Dopo l'aggiornamento a v2.5.6:**

1. **Primo utilizzo rubrica:**
   - Click su "🔄 Sincronizza Ora" per caricare contatti esistenti da Google
   - Questo è OBBLIGATORIO la prima volta

2. **Due pulsanti per salvare:**
   - **✅ Verde (Salva)**: Salva DAVVERO in Google Contacts + marca come salvato
   - **✓✓ Grigio (Già salvato)**: Marca solo come salvato localmente (se hai già salvato manualmente)

3. **Cache aggiornata:**
   - Lista si aggiorna ogni 10 minuti automaticamente
   - Puoi forzare refresh con pulsante 🔄 in alto a destra della lista

4. **Messaggi di errore:**
   - Se vedi "Sessione scaduta": Rifare login Google
   - Se vedi "Permessi insufficienti": Controllare scopes OAuth
   - Se vedi "Contatto già esistente": Normale, viene marcato come salvato automaticamente

---

## 🔗 LINK UTILI

- GitHub: https://github.com/dantemanonquello/sgfemassdante
- Demo Live: https://dantemanonquello.github.io/sgfemassdante/
- Issue Tracker: https://github.com/dantemanonquello/sgfemassdante/issues

---

**Developed by Dante** 🚀
