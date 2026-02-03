# CHANGELOG v2.5.9 - FIX OAUTH SCOPE COMPLETO

**Data**: 03/02/2026  
**By**: Dante

---

## 🔴 PROBLEMA RISOLTO

Gli errori **403 Forbidden** impedivano di salvare contatti in Google Contacts.

**Causa**: Gli scope OAuth configurati erano INSUFFICIENTI:
- ❌ `calendar.readonly` → Non permetteva scrittura calendario
- ❌ `drive.appdata` → Non permetteva accesso file Drive
- ❌ Mancava `spreadsheets` → Non permetteva accesso Google Sheets

---

## ✅ FIX IMPLEMENTATI

### 1. **SCOPE OAUTH AGGIORNATI** (google-auth.js)

**PRIMA**:
```javascript
const SCOPES = [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/contacts',
    'https://www.googleapis.com/auth/calendar.readonly',  // ❌ Readonly
    'https://www.googleapis.com/auth/drive.appdata'       // ❌ Solo appdata
].join(' ');
```

**DOPO**:
```javascript
const SCOPES = [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/contacts',           // ✅ Lettura/scrittura contatti
    'https://www.googleapis.com/auth/calendar',           // ✅ Lettura/scrittura calendario
    'https://www.googleapis.com/auth/drive.file',         // ✅ Accesso file Drive
    'https://www.googleapis.com/auth/spreadsheets'        // ✅ Lettura/scrittura Sheets
].join(' ');
```

---

### 2. **ERROR HANDLING 403 MIGLIORATO** (rubrica.js)

Messaggi chiari con link diretti alle API da abilitare:

```javascript
if (error.status === 403) {
    showNotification('❌ ERRORE 403: Devi abilitare le API su Google Cloud Console', 'error');
    console.error('🔴 ISTRUZIONI PER RISOLVERE 403:');
    console.error('1️⃣ Vai su: https://console.cloud.google.com/apis/library/people.googleapis.com');
    console.error('2️⃣ Clicca "ABILITA" sulla People API');
    console.error('3️⃣ Vai su: https://console.cloud.google.com/apis/library/sheets.googleapis.com');
    console.error('4️⃣ Clicca "ABILITA" sulla Sheets API');
    console.error('5️⃣ Vai su: https://console.cloud.google.com/apis/library/drive.googleapis.com');
    console.error('6️⃣ Clicca "ABILITA" sulla Drive API');
    console.error('7️⃣ Disconnetti e riconnetti Google su TESTmess');
}
```

---

### 3. **AUTO-LOGOUT SU CAMBIO VERSIONE** (main.js)

Forza logout e re-consent quando la versione cambia (scope OAuth aggiornati):

```javascript
// VERSION CHECK: Force logout se versione < 2.5.9
const currentVersion = '2.5.9';
const savedVersion = localStorage.getItem('sgmess_app_version');

if (!savedVersion || savedVersion < currentVersion) {
    console.warn('⚠️ Versione cambiata - Scope OAuth aggiornati');
    
    // Clear token vecchio
    localStorage.removeItem('sgmess_access_token');
    localStorage.removeItem('sgmess_token_expiry');
    localStorage.removeItem('sgmess_operator_name');
    localStorage.removeItem('sgmess_operator_photo');
    
    // Salva nuova versione
    localStorage.setItem('sgmess_app_version', currentVersion);
    
    showNotification('⚠️ App aggiornata! Riconnetti Google per nuovi permessi', 'info');
}
```

---

## 📦 FILE MODIFICATI

1. **js/google-auth.js**
   - Aggiornati scope OAuth (righe 56-62)
   - Aggiunti: `calendar`, `drive.file`, `spreadsheets`
   - Rimossi: `calendar.readonly`, `drive.appdata`

2. **js/rubrica.js**
   - Migliorato error handling 403 (righe 557-558, 668-678)
   - Aggiunte istruzioni console con link diretti Google Cloud

3. **js/main.js**
   - Aggiunto version check con auto-logout (righe 54-73)
   - Aggiornata versione log (riga 52)

4. **index.html**
   - Aggiornata versione a v2.5.9 (title, header, script cache busting)

---

## 🎯 COSA DEVI FARE ORA

### ✅ STEP 1: Disconnetti da Google
1. Vai su https://dantemanonquello.github.io/sgfemassdante/
2. Clicca su "Disconnetti"

### ✅ STEP 2: Abilita le API (OBBLIGATORIO)

**People API** (per salvare contatti):
- https://console.cloud.google.com/apis/library/people.googleapis.com
- Clicca **ABILITA**

**Google Sheets API** (per salvare assistenti):
- https://console.cloud.google.com/apis/library/sheets.googleapis.com
- Clicca **ABILITA**

**Google Drive API** (per salvare cronologia):
- https://console.cloud.google.com/apis/library/drive.googleapis.com
- Clicca **ABILITA**

**Google Calendar API** (già abilitata, verifica):
- https://console.cloud.google.com/apis/library/calendar-json.googleapis.com
- Deve essere **ABILITATA**

### ✅ STEP 3: Riconnetti Google
1. Torna su https://dantemanonquello.github.io/sgfemassdante/
2. Clicca "Connetti Google"
3. **IMPORTANTE**: Google ti chiederà di accettare i **NUOVI PERMESSI**
4. Accetta tutto

### ✅ STEP 4: Test Rubrica
1. Vai su "Rubrica"
2. Clicca "🔄 Sincronizza Ora"
3. Prova a salvare un contatto
4. Verifica notifica verde "✅ Salvato"

---

## 🔴 SE ANCORA ERRORE 403

Se continui a vedere 403 dopo aver abilitato le API:

1. **Verifica scope nel consenso OAuth**:
   - https://console.cloud.google.com/apis/credentials/consent
   - Clicca "MODIFICA APP"
   - Vai su "Ambiti" (Scopes)
   - Verifica che ci siano:
     - `https://www.googleapis.com/auth/contacts`
     - `https://www.googleapis.com/auth/calendar`
     - `https://www.googleapis.com/auth/drive.file`
     - `https://www.googleapis.com/auth/spreadsheets`

2. **Se mancano, aggiungili**:
   - Clicca "AGGIUNGI O RIMUOVI AMBITI"
   - Cerca e aggiungi gli scope mancanti
   - Clicca "AGGIORNA"

3. **Salva e riprova**:
   - Disconnetti da TESTmess
   - Riconnetti Google
   - Accetta i nuovi permessi

---

## 🚀 FIX PRECEDENTI MANTENUTI

Tutti i fix delle versioni precedenti sono preservati:

- ✅ **v2.5.8**: Fix notifiche + auto-logout 401
- ✅ **v2.5.7**: Fix calendario data oggi + dropdown calendari
- ✅ **v2.5.6**: Fix rubrica sincronizzazione + normalizzazione telefoni

---

## 📊 COMPATIBILITÀ

- ✅ Google Chrome/Edge (raccomandato)
- ✅ Firefox
- ✅ Safari

---

**Developed by Dante**  
**Versione**: v2.5.9  
**Data**: 03/02/2026
