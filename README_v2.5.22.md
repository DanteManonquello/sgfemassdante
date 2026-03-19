# 📒 TESTmess v2.5.22 - README

## 📱 Stock Gain Messenger
**Versione**: v2.5.22 (2026-03-18)  
**Autore**: Dante  
**Piattaforma**: Google Calendar + Google Contacts + Google Drive

---

## 🎯 OVERVIEW PROGETTO

TESTmess è un'applicazione web per la gestione automatizzata di messaggi WhatsApp verso lead provenienti da Google Calendar, con integrazione completa dell'ecosistema Google (Contacts, Drive, Sheets).

**Funzionalità principali**:
- 📅 Sincronizzazione eventi Google Calendar con auto-detect servizio (SG/FE)
- 📒 Gestione rubrica smart con rilevamento duplicati +39 agnostic
- 📝 Template messaggi personalizzabili con placeholder dinamici
- 📊 Cronologia persistente su Google Drive
- 🎭 Auto-detect genere da nome (Google Sheets fallback locale)
- 🔄 OAuth 2.0 sicuro con token refresh automatico

---

## ✨ NOVITÀ v2.5.22

### 🔢 DUPLICATI +39 AGNOSTIC
**Problema risolto**: Numeri identici con prefissi diversi venivano considerati duplicati distinti.

**Come funziona**:
```javascript
// Tutti questi numeri sono ora riconosciuti come IDENTICI:
+393331234567
3331234567
+39 333 123 4567
00393331234567
```

**Implementazione**:
- Funzione `normalizeForComparison()` rimuove prefisso +39 prima del confronto
- Set lookup O(1) per prestazioni ottimali
- Salvataggio mantiene formato originale Google People API

---

### 📅 DATE RANGE PICKER OTTIMIZZATO

**Problema risolto**: Caricamento 12 mesi di eventi (1018+) troppo lento (~8-12s).

**Soluzione**:
- **Default range**: oggi -7 giorni → oggi +10 giorni (17 giorni, ~50-100 eventi)
- **Range massimo**: oggi ±90 giorni (180 giorni totali)
- **Tempo caricamento**: ridotto da 12s a ~2s (6x più veloce)

**Come usare**:
1. Vai su "Rubrica - Contatti da Salvare"
2. Imposta date inizio/fine (default: -7/+10 giorni)
3. Clicca "Applica Filtro"
4. Il sistema carica solo eventi nel range selezionato

---

## 🚀 PERFORMANCE

### Prima (v2.5.21):
- Caricamento: 1018 eventi in ~12s
- Confronto duplicati: loop O(n²) su 330×1018 = 335.940 confronti

### Dopo (v2.5.22):
- Caricamento: 68 eventi in ~2s (17 giorni) → **6x più veloce**
- Confronto duplicati: Set O(1) su 1.348 confronti → **250x più veloce**

---

## 📁 STRUTTURA PROGETTO

```
webapp/
├── index.html              # Homepage (v2.5.22)
├── css/
│   └── style.css           # Stili globali
├── js/
│   ├── main.js             # Entry point (v2.5.22)
│   ├── config.js           # Configurazione OAuth
│   ├── google-auth.js      # Gestione token OAuth 2.0
│   ├── google-calendar.js  # Sincronizzazione calendario (v2.5.20 - SG/FE auto-detect)
│   ├── rubrica.js          # Gestione contatti (v2.5.22 - +39 agnostic + date picker)
│   ├── templates.js        # Template messaggi (v2.5.19 - Master Message)
│   ├── google-drive-storage.js # Persistenza Drive
│   └── nomi-italiani.js    # Database nomi (260 M + 392 F)
├── CHANGELOG_v2.5.22.md    # Changelog completo
└── README_v2.5.22.md       # Questo file
```

---

## 🔧 CONFIGURAZIONE

### 1. Google OAuth 2.0
Modifica `js/config.js`:
```javascript
const CLIENT_ID = 'TUO_CLIENT_ID.apps.googleusercontent.com';
const SCOPES = [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/contacts',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/spreadsheets'
];
```

### 2. Authorized Origins (Google Console)
Aggiungi questi URL in Google Cloud Console → Credentials:
```
https://dantemanonquello.github.io
https://127.0.0.1:5500
http://localhost:3000
```

### 3. localStorage Keys
```javascript
// Rubrica (v2.5.22)
sgmess_saved_contacts        // Cache contatti salvati
sgmess_rubrica_date_start    // Data inizio filtro
sgmess_rubrica_date_end      // Data fine filtro
sgmess_rubrica_scan_cache    // Cache risultati scan

// Calendario
sgmess_calendar_events       // Eventi caricati
sgmess_calendar_last_sync    // Timestamp ultimo sync
sgmess_contacted_leads       // Lead già contattati

// Altri
CRONOLOGIA                   // Messaggi inviati (Drive)
TEMPLATES                    // Template salvati (localStorage)
OPERATOR_NAME                // Nome operatore
```

---

## 🧪 COME TESTARE

### Test 1: Duplicati +39
1. Vai su "Rubrica - Contatti da Salvare"
2. Clicca "Sincronizza Ora"
3. Verifica che numeri con formati diversi non appaiono duplicati:
   - Se hai salvato `+393331234567` in Google Contacts
   - E un evento ha `3331234567`
   - **Risultato atteso**: NON appare nella lista (rilevato come duplicato)

### Test 2: Date Range Picker
1. Vai su "Rubrica"
2. Imposta date: oggi -3 giorni → oggi +5 giorni
3. Clicca "Applica Filtro"
4. Verifica che il contatore mostri "Range: 8 giorni"
5. Clicca "Sincronizza Ora"
6. Verifica console log: `📅 Caricamento eventi calendario con filtro: 2026-03-15 → 2026-03-23`
7. **Risultato atteso**: caricamento veloce (~1-2s) con solo eventi nel range

### Test 3: Performance
1. Console → Network tab
2. Rubrica → Sincronizza con range default (17 giorni)
3. Verifica tempo totale < 3s
4. Ripeti con range 180 giorni (max)
5. Verifica tempo totale < 15s (con warning)

---

## 📊 STATISTICHE PROGETTO

### Codice:
- **Totale linee**: ~4.500
- **File JS**: 10
- **Moduli principali**: 6 (auth, calendar, rubrica, templates, drive, sheets)
- **Funzioni pubbliche**: 45+
- **Eventi gestiti**: 25+

### Database locale:
- **Nomi italiani**: 652 (260 maschili + 392 femminili)
- **Template default**: 3 (Primo Messaggio, Memo del Giorno, Dolce Paranoia)

### Performance:
- **Caricamento iniziale**: < 1s
- **Sync calendario (17 giorni)**: ~2s
- **Sync contatti**: ~1-2s
- **Invio messaggio**: < 500ms

---

## 🔄 WORKFLOW UTENTE

### 1. Login Google
1. Clicca "Login Google" → OAuth popup
2. Autorizza permessi (Calendar, Contacts, Drive)
3. Token salvato in memoria (scade dopo 1h)

### 2. Visualizza Lead del Giorno
1. Home → Seleziona data dal picker
2. Dropdown mostra lead totali (es. "6 lead totali")
3. Seleziona lead → form pre-compilato con nome, cognome, telefono, servizio

### 3. Componi Messaggio
1. Seleziona template (dropdown)
2. Compila placeholders: `{OPERATORE}`, `{NOME}`, `{COGNOME}`, `{GIORNO}`, `{ORARIO}`
3. Preview live aggiornato
4. Clicca "Invia Messaggio" → WhatsApp API

### 4. Gestione Rubrica
1. Rubrica → Imposta date range (default -7/+10)
2. Sincronizza Ora → carica eventi nel range
3. Lista mostra contatti NON ancora salvati in Google Contacts
4. Clicca "Salva" → aggiunge a Google Contacts
5. Clicca "Già Salvato" → marca come salvato (solo cache locale)

---

## 🐛 TROUBLESHOOTING

### Problema: "Token scaduto"
**Soluzione**: Fai logout e rilogin Google (token expires dopo 1h)

### Problema: Numeri duplicati non rilevati
**Soluzione**: Verifica che v2.5.22 sia caricata (console log: `Rubrica module v2.5.22`)

### Problema: Caricamento rubrica lento
**Soluzione**: Riduci range date (usa default -7/+10 invece di -90/+90)

### Problema: Eventi non visibili
**Soluzione**: 
1. Verifica calendario selezionato in "Home → Filtra Calendario"
2. Verifica range date in "Rubrica → Date Picker"
3. Forza refresh: Ctrl+Shift+R

---

## 🔐 SICUREZZA

### Token OAuth 2.0:
- ✅ Token NON salvato in localStorage (solo in memoria)
- ✅ Auto-refresh ogni 45 minuti
- ✅ Scoped permissions (minimo necessario)
- ✅ Token validation prima di ogni API call

### Dati sensibili:
- ✅ Cronologia salvata su Google Drive (encrypted at rest)
- ✅ Template solo localStorage (no cloud)
- ✅ Contatti sincronizzati con Google Contacts (proprietà utente)

---

## 📈 ROADMAP FUTURA (v2.5.23+)

### In sviluppo:
1. **Progress bar caricamento**: mostrare "150/330 contatti processati"
2. **Paginazione rubrica**: 50 contatti per pagina
3. **Filtro SG/FE**: dropdown per filtrare solo Stock Gain o Finanza Efficace
4. **Export CSV contatti**: esportare lista contatti non salvati
5. **Statistiche dettagliate**: "68 eventi, 23 contatti nuovi, 45 già salvati"

### Richieste utente:
- Auto-send messaggi programmati
- Multi-select lead per invio batch
- Analytics avanzate (tasso risposta, conversion, etc.)
- Integrazione Telegram/Email
- Desktop notifications per nuovi lead

---

## 📞 SUPPORTO

**Problemi o domande?**
1. Controlla `CHANGELOG_v2.5.22.md` per dettagli implementazione
2. Verifica console log (F12) per errori specifici
3. Testa con range date ridotto (17 giorni default)
4. Forza cache clear: Ctrl+Shift+R

---

## 📝 CREDITS

**Sviluppatore**: Dante  
**Framework**: Vanilla JS (no dipendenze esterne)  
**API**: Google Calendar, Google Contacts, Google Drive, Google Sheets  
**Stile**: Custom CSS + Font Awesome 6.4.0  
**Versione**: v2.5.22 (2026-03-18)

---

## 📄 LICENSE

Proprietario - Uso interno Stock Gain / Finanza Efficace

---

**🚀 Buon lavoro con TESTmess v2.5.22!**
