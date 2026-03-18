# 🔐 GUIDA: CONFIGURARE OAUTH PER SANDBOX/LOCALHOST

**Problema:** Errore `redirect_uri_mismatch` quando testi l'app dal sandbox o localhost.

---

## ❌ ERRORE CHE VEDI

```
Accesso bloccato: la richiesta dell'app non è valida
Errore 400: redirect_uri_mismatch

URL corrente: https://3000-ir4ka5vbm4sg3vvq2i666-8f57ffe2.sandbox.novita.ai/
Redirect URI configurato: https://dantemanonquello.github.io/sgfemassdante/
```

---

## 🔍 CAUSA

Google OAuth richiede che l'URL da cui fai login sia **autorizzato** nella Google Cloud Console.

**Client ID attuale configurato per:**
- ✅ `https://dantemanonquello.github.io` (PRODUZIONE - GitHub Pages)

**NON configurato per:**
- ❌ Sandbox URL (es. `https://3000-ir4ka5vbm4sg3vvq2i666-8f57ffe2.sandbox.novita.ai`)
- ❌ Localhost (es. `http://localhost:3000`)

---

## ✅ SOLUZIONI

### **SOLUZIONE #1: Testa su GitHub Pages (CONSIGLIATO)**

Invece di testare dal sandbox, pusha il codice su GitHub Pages:

```bash
cd /home/user/webapp
git add -A
git commit -m "Test v2.5.17"
git push origin main
```

Poi apri:
```
https://dantemanonquello.github.io/sgfemassdante/
```

✅ **OAuth funzionerà** perché questo URL è già autorizzato!

---

### **SOLUZIONE #2: Aggiungi Sandbox URL a Google Cloud Console**

Se vuoi testare dal sandbox, devi aggiungere il sandbox URL agli URI autorizzati.

#### **Passo 1: Vai su Google Cloud Console**

1. Apri: https://console.cloud.google.com/apis/credentials
2. Trova il progetto: **"Massaggiatore GitHub1 20260113"**
3. Clicca sul Client ID OAuth: `432043907250-1p21bdmnebrjfa541kik7eosork5etpe`

#### **Passo 2: Aggiungi Sandbox URL**

1. Sezione **"URI JavaScript autorizzati"**
2. Clicca **"+ AGGIUNGI URI"**
3. Incolla il sandbox URL completo:
   ```
   https://3000-ir4ka5vbm4sg3vvq2i666-8f57ffe2.sandbox.novita.ai
   ```
4. Clicca **"SALVA"**

⚠️ **NOTA:** Il sandbox URL cambia ad ogni sessione! Dovrai ripetere questo processo ogni volta.

---

### **SOLUZIONE #3: Crea Client ID separato per sviluppo**

**MIGLIORE PRATICA:**

Crea un **secondo Client ID OAuth** dedicato allo sviluppo:

1. Vai su: https://console.cloud.google.com/apis/credentials
2. Clicca **"+ CREA CREDENZIALI"** → **"ID client OAuth 2.0"**
3. Tipo applicazione: **"Applicazione web"**
4. Nome: `TESTmess - Development`
5. URI autorizzati:
   - `http://localhost:3000`
   - `http://localhost:8000`
   - `http://127.0.0.1:3000`
   - Sandbox URL (se serve)
6. Clicca **"CREA"**

Poi modifica `js/google-auth.js`:

```javascript
// Rileva ambiente e usa Client ID corretto
const isDevelopment = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.hostname.includes('sandbox');

const GOOGLE_CLIENT_ID = isDevelopment 
    ? 'YOUR-DEV-CLIENT-ID.apps.googleusercontent.com'  // Client ID sviluppo
    : '432043907250-1p21bdmnebrjfa541kik7eosork5etpe.apps.googleusercontent.com'; // Produzione
```

---

## 🚀 WORKFLOW CONSIGLIATO

### **Per sviluppo/test:**
1. Fai modifiche al codice
2. Commit su git
3. Push su GitHub
4. Testa su `https://dantemanonquello.github.io/sgfemassdante/`

### **Perché questo è meglio:**
- ✅ OAuth funziona subito (URL già autorizzato)
- ✅ Test in ambiente reale (GitHub Pages = produzione)
- ✅ Nessuna configurazione extra da fare
- ✅ Sandbox URL non cambia continuamente

### **Quando usare sandbox:**
- Solo per test frontend (HTML/CSS/JS)
- **NON per OAuth/API Google** (serve configurazione extra)

---

## 📝 FILE COINVOLTI

- `js/google-auth.js` - Gestione OAuth Google
  - Riga 52: `GOOGLE_CLIENT_ID` (Client ID hardcoded)
  - Riga 54: `REDIRECT_URI` (Redirect URI hardcoded)

---

## ❓ DOMANDE FREQUENTI

**Q: Perché non posso usare localhost senza configurare nulla?**  
A: Google OAuth richiede URI autorizzati per sicurezza. Serve configurare la Google Cloud Console.

**Q: Posso disabilitare OAuth per test?**  
A: No, l'app richiede OAuth per accedere a Google Calendar/Contacts. Senza OAuth non funziona.

**Q: Il sandbox URL cambia ogni volta?**  
A: Sì, gli URL sandbox sono temporanei e cambiano ad ogni sessione. Per questo è meglio testare su GitHub Pages.

**Q: Posso usare un Client ID "universale" che funziona ovunque?**  
A: No, Google OAuth richiede URI specifici per motivi di sicurezza.

---

## 🎯 CONCLUSIONE

**SOLUZIONE PIÙ SEMPLICE:**

✅ **Pusha su GitHub e testa da GitHub Pages**

Questo è il metodo più veloce e affidabile. Il sandbox è ottimo per sviluppo frontend, ma per OAuth è meglio usare l'ambiente di produzione.

---

**Hai ancora problemi? Controlla:**
- Hai accettato TUTTI i permessi Google al login?
- Stai usando Google Chrome/Edge (browser consigliati)?
- Il popup OAuth non è bloccato dal browser?
