# 🔧 GUIDA DEFINITIVA - Configurazione Google OAuth

## ⚠️ IMPORTANTE: Segui ESATTAMENTE questi step

---

## 📋 STEP 1: Verifica Progetto Google Cloud

### 1. Vai su:
https://console.cloud.google.com/apis/credentials

### 2. Seleziona progetto: **Massaggiatore** (o il tuo progetto)

---

## 📋 STEP 2: Configura OAuth Client ID

### 1. Clicca sul tuo client: **"Massaggiatore Web Client"**

### 2. Nella sezione **"Origini JavaScript autorizzate"**:

Devono esserci QUESTI 3 URI:

```
https://3000-iwkp0a49m4pd1x27dmbdh-5185f4aa.sandbox.novita.ai
http://localhost:3000
http://127.0.0.1:3000
```

### 3. Nella sezione **"URI di reindirizzamento autorizzati"**:

⚠️ **IMPORTANTE**: Per OAuth 2.0 Token Client NON servono URI di reindirizzamento!

**LASCIA VUOTO** oppure metti:
```
https://3000-iwkp0a49m4pd1x27dmbdh-5185f4aa.sandbox.novita.ai/
```

(Con lo slash finale `/`)

---

## 📋 STEP 3: Configura Schermata Consenso

### 1. Vai su:
https://console.cloud.google.com/apis/credentials/consent

### 2. Verifica che ci sia:
- ✅ **Tipo**: Esterno
- ✅ **Nome app**: Massaggiatore (o TESTmess)
- ✅ **Email assistenza**: La tua email
- ✅ **Ambiti** (Scopes):
  - `../auth/calendar.readonly`
  - `../auth/contacts`

### 3. **Stato app**: 
- Se dice "Test" con avviso arancione: **È NORMALE**
- L'app funziona in modalità test con max 100 utenti
- Puoi pubblicarla dopo se serve

---

## 📋 STEP 4: Verifica API Abilitate

### 1. Vai su:
https://console.cloud.google.com/apis/dashboard

### 2. Verifica che siano ABILITATE:
- ✅ **Google Calendar API**
- ✅ **Google People API**

Se non ci sono, abilitale da:
https://console.cloud.google.com/apis/library

---

## 📋 STEP 5: Test nel Browser

### 1. Apri sito in **Modalità Incognito**:
- Chrome: `Cmd + Shift + N` (Mac) o `Ctrl + Shift + N` (Windows)

### 2. Apri Console Browser:
- Chrome: `Cmd + Option + J` (Mac) o `Ctrl + Shift + J` (Windows)

### 3. Clicca "Connetti Google"

### 4. Controlla i log nella console:
```
✅ Google API Client inizializzato
✅ Metodo 1: Token Client (auto) inizializzato
✅ Pulsante Google abilitato
🔐 Richiesta autenticazione...
```

---

## ❌ SE VEDI ERRORI:

### Errore: "redirect_uri_mismatch"
➜ **Soluzione**: Copia ESATTAMENTE l'URL del sito e mettilo in "Origini JavaScript autorizzate"

### Errore: "invalid_client"
➜ **Soluzione**: Il Client ID nel codice è sbagliato. Verifica che sia:
```
432043907250-blb72vqc0nqm8rccoknfe29p4j5lbubr.apps.googleusercontent.com
```

### Errore: "popup_closed_by_user"
➜ **Soluzione**: Hai chiuso il popup. Riprova e autorizza.

### Errore: "access_denied"
➜ **Soluzione**: Hai negato i permessi. Clicca di nuovo e autorizza.

### Errore: 403 API Key
➜ **Soluzione**: IGNORA. L'API Key è opzionale per OAuth 2.0.

---

## ✅ RISULTATO ATTESO:

Dopo aver cliccato "Connetti Google":
1. Si apre un **popup** (o redirect)
2. Selezioni il tuo account Google
3. Autorizzi permessi (Calendario + Contatti)
4. Il popup si chiude
5. Vedi la tua **foto profilo** nel sito
6. In console vedi: **"✅ Autenticato: {name: 'TuoNome', ...}"**

---

## 🔧 FALLBACK AUTOMATICO:

Il codice prova automaticamente 3 metodi:
1. **Metodo 1**: Token Client automatico
2. **Metodo 2**: Token Client con popup esplicito
3. **Metodo 3**: Token Client con redirect

Se il primo fallisce, prova il secondo, poi il terzo.

---

## 📞 DEBUG:

Apri console e controlla:
```javascript
// Vedi quale metodo sta usando
console.log('Metodo corrente:', currentAuthMethod);

// Verifica Client ID
console.log('Client ID:', GOOGLE_CLIENT_ID);

// Controlla stato
console.log('GAPI init:', gapiInited);
console.log('GIS init:', gisInited);
```

---

**Versione**: 2.0.7  
**Data**: 26 Dicembre 2025
