# 🔧 Setup Credenziali Google per SGMess

## ⚠️ IMPORTANTE: Il sito non funzionerà senza configurare le credenziali Google

Le credenziali nel codice NON sono valide (errore 403). Devi creare le TUE credenziali.

---

## 📋 Step by Step

### 1. Vai su Google Cloud Console
👉 https://console.cloud.google.com/

### 2. Crea un Progetto (se non ne hai uno)
- Clicca su "Seleziona progetto" in alto
- Clicca "NUOVO PROGETTO"
- Nome: `SGMess` (o quello che preferisci)
- Clicca "CREA"

### 3. Abilita le API necessarie
👉 https://console.cloud.google.com/apis/library

Cerca e abilita queste due API:
- ✅ **Google Calendar API**
- ✅ **Google People API** (per i contatti)

### 4. Crea le Credenziali OAuth 2.0
👉 https://console.cloud.google.com/apis/credentials

1. Clicca "CREA CREDENZIALI"
2. Seleziona "ID client OAuth"
3. Se richiesto, configura la "Schermata consenso OAuth":
   - Tipo: Esterno
   - Nome app: `SGMess`
   - Email supporto: la tua email
   - Ambiti: `calendar.readonly`, `contacts`
   - Salva

4. Torna a "Credenziali" → "CREA CREDENZIALI" → "ID client OAuth"
   - Tipo applicazione: **Applicazione web**
   - Nome: `SGMess Client`
   - URI di reindirizzamento autorizzati: 
     - `http://localhost:3000`
     - `https://127.0.0.1:3000`
     - Il tuo URL di produzione (se ne hai uno)
   - Clicca "CREA"

5. **COPIA il Client ID** (formato: `xxxxx.apps.googleusercontent.com`)

### 5. Incolla le Credenziali nel Codice

Apri il file: `webapp/js/google-auth.js`

Trova questa riga:
```javascript
const GOOGLE_CLIENT_ID = 'YOUR_CLIENT_ID_HERE.apps.googleusercontent.com';
```

Sostituisci con il TUO Client ID:
```javascript
const GOOGLE_CLIENT_ID = '123456789-abcdefgh.apps.googleusercontent.com';
```

**NOTA**: L'API Key NON è necessaria per OAuth 2.0, quindi puoi lasciarla vuota.

### 6. Riavvia il Server

```bash
pm2 restart sgmess
```

### 7. Testa il Login

1. Apri il sito
2. Clicca "Connetti Google"
3. Seleziona il tuo account Google
4. Autorizza i permessi richiesti
5. Dovresti vedere la tua foto profilo! 🎉

---

## ❓ Problemi Comuni

### Errore 403 "Access Not Configured"
➜ Le API non sono abilitate. Torna allo step 3.

### Errore "redirect_uri_mismatch"
➜ Aggiungi l'URL esatto del tuo sito agli URI autorizzati (step 4).

### Pulsante disabilitato
➜ Controlla la console del browser per errori JavaScript.

### "This app isn't verified"
➜ Normale per app in sviluppo. Clicca "Avanzate" → "Vai a SGMess (non sicuro)"

---

## 🔒 Sicurezza

- ✅ Il Client ID può essere pubblico (è sicuro nel frontend)
- ❌ NON serve una API Key per OAuth 2.0
- ❌ NON committare Secret (se ne usi uno per backend)

---

## 📚 Documentazione Ufficiale

- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Calendar API](https://developers.google.com/calendar/api/guides/overview)
- [People API](https://developers.google.com/people)

---

**Versione**: 2.0.2  
**Ultima modifica**: 26 Dicembre 2025
