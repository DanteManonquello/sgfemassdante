# TESTmess v2.2.17 - Stock Gain Messenger

## 📋 Panoramica Progetto
**Nome**: TESTmess  
**Versione**: 2.2.17  
**Autore**: Dante  
**Descrizione**: Sistema di messaggistica WhatsApp per Stock Gain con gestione appuntamenti e riconoscimento automatico genere assistenti.

---

## ✨ Novità Versione 2.2.17

### 🎯 Rilevazione Automatica Genere Setter (COMPLETATO)

**Problema risolto**:
- Prima versione: chiedeva sempre il genere dell'assistente anche per nomi italiani comuni
- Mancanza di rilevazione automatica da database nomi italiani

**Nuova implementazione**:
1. ✅ **Database nomi italiani**: 200+ nomi maschili e femminili
2. ✅ **Rilevazione automatica**: estrae primo nome e controlla nel database
3. ✅ **Popup intelligente**: appare SOLO per nomi sconosciuti
4. ✅ **Salvataggio automatico**: genere rilevato salvato su Google Sheets
5. ✅ **Gestione nomi composti**: "Gian Luca" → "Gianluca"
6. ✅ **Nomi ambigui**: "Andrea" (M/F) → mostra popup

**Sistema a 3 livelli**:
```
PRIORITÀ 1: Cache Google Sheets (nomi già salvati dall'utente)
    ↓ (se non trovato)
PRIORITÀ 2: Database nomi italiani (rilevazione automatica)
    ↓ (se non trovato)
PRIORITÀ 3: Popup utente (solo per nomi sconosciuti)
```

**Esempi**:
- "Marco" → Rilevato automaticamente M (database nomi italiani)
- "Sofia" → Rilevato automaticamente F (database nomi italiani)
- "John" → Mostra popup (nome straniero non in database)
- "Andrea" → Mostra popup (nome ambiguo M/F)

### 🔧 Modifiche Tecniche

**File modificati**:
1. `js/google-sheets-assistenti.js` (v2.2.17)
   - Aggiunta funzione `extractFirstName()` per separare primo nome
   - Aggiunta funzione `detectGenderFromItalianNames()` per rilevazione automatica
   - Modificata funzione `checkAssistenteGender()` con logica intelligente a 3 livelli

2. `js/google-auth.js` (v2.2.17)
   - Modificata `checkSetterGenderFromEvent()` per mostrare popup solo quando necessario
   - Rimosso default 'M' hardcoded

3. `index.html` (v2.2.17)
   - Aggiornato titolo e header versione
   - Aggiornati version query parameter per tutti gli script

4. `js/config.js` (v2.2.17)
   - Aggiornata versione e changelog

**File NON modificati** (come richiesto):
- ✅ `js/google-calendar.js` - Sistema calendario preservato
- ✅ `js/templates.js` - Template messaggi preservati
- ✅ `js/main.js` - Logica principale preservata
- ✅ `js/google-drive-storage.js` - Storage preservato
- ✅ `js/nomi-italiani.js` - Database nomi preservato

---

## 🌐 URLs Deployment

### Produzione Attiva
- **Netlify**: https://massaggiatore.netlify.app/
- **Sandbox Test**: https://3000-iudrlwhj7upa5jgxxwi9z-ad490db5.sandbox.novita.ai

### Download
- **Backup v2.2.17**: https://3000-iudrlwhj7upa5jgxxwi9z-ad490db5.sandbox.novita.ai/downloads/TESTmess_v2.2.17_backup.tar.gz

---

## 📊 Architettura Dati

### Google Sheets Integration
- **Spreadsheet ID**: `1qHgIBHo1a_TW7mfFDkX2cjKDOKTlCJqKpfXjfLhZNNo`
- **Sheet Name**: `AssistentiGenere`
- **Struttura**: 
  - Colonna A: Nome assistente
  - Colonna B: Genere (M/F)
- **Cache**: 24 ore localStorage

### Database Nomi Italiani
- **File**: `js/nomi-italiani.js`
- **Nomi maschili**: 200+
- **Nomi femminili**: 150+
- **Copertura**: Nomi comuni moderni + tradizionali + storici

### Google APIs
- **Auth**: Google Sign-In + OAuth2
- **Calendar API**: Lettura appuntamenti
- **Sheets API**: Storage genere assistenti
- **Drive API**: AppDataFolder storage

---

## 👤 Guida Utente

### Come Funziona il Riconoscimento Genere

1. **Primo utilizzo con nome italiano comune** (es. "Marco"):
   - Sistema rileva automaticamente genere da database
   - Salva su Google Sheets per velocizzare prossime volte
   - Imposta automaticamente toggle M/F

2. **Primo utilizzo con nome sconosciuto** (es. "John"):
   - Sistema mostra popup "È maschio o femmina?"
   - Utente seleziona genere
   - Sistema salva su Google Sheets
   - Prossime volte: automatico (cache)

3. **Utilizzi successivi**:
   - Sistema carica da Google Sheets cache
   - Imposta automaticamente toggle M/F
   - Nessun popup

### Risoluzione Problemi

**Popup appare sempre per stesso nome**:
- Problema: Google Sheets non accessibile
- Soluzione: Verifica login Google e permessi Sheets API

**Genere errato rilevato**:
- Problema: Nome ambiguo o non standard
- Soluzione: Prima volta seleziona manualmente, sistema ricorderà

**Database nomi non funziona**:
- Problema: Script `nomi-italiani.js` non caricato
- Soluzione: Verifica console browser (F12) per errori caricamento

---

## 🚀 Sviluppi Futuri Consigliati

1. ✅ **Completato**: Rilevazione automatica genere setter
2. 📋 **Prossimi step suggeriti**:
   - Aggiungere più nomi internazionali al database
   - Creare interfaccia admin per modificare Google Sheets
   - Statistiche utilizzo genere assistenti
   - Export cronologia messaggi in Excel

---

## 📝 Changelog Completo

### v2.2.17 (2026-01-06)
- ✅ Rilevazione automatica genere setter da database nomi italiani
- ✅ Popup intelligente solo per nomi sconosciuti
- ✅ Salvataggio automatico genere rilevato su Google Sheets
- ✅ Gestione nomi composti e ambigui
- ✅ Estrazione primo nome da stringhe multi-parte

### v2.2.16
- OAuth universale + Drive storage

### v2.2.12
- Client ID universale per evitare redirect_uri_mismatch

### v2.2.7
- Rimossi messaggi errore OAuth
- Storage Google Drive invece di localStorage

---

## 🔧 Stack Tecnologico

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Framework CSS**: Custom + Font Awesome icons
- **APIs**: Google Sign-In, Calendar, Sheets, Drive
- **Storage**: Google Sheets + localStorage cache
- **Deployment**: Netlify (produzione), Sandbox (test)

---

## 📞 Supporto

Per problemi o domande contattare Dante tramite sistema interno Stock Gain.

**Ultima modifica**: 2026-01-06  
**Status**: ✅ Attivo e funzionante
# Force rebuild Tue Jan 20 14:26:03 UTC 2026
