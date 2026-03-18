# 📦 TESTmess v2.5.19 - Stock Gain Messenger

**Release Date:** 2026-03-18  
**Build:** `FIX_DROPDOWN_LEAD_DEFINITIVO_MASTER_MESSAGE_DRIVE`  
**Author:** Dante  

---

## 🎯 OBIETTIVO RILASCIO

**Fix definitivo del problema "Dropdown Lead scompare dopo selezione"**

Quando l'utente selezionava un lead dal dropdown, il form si compilava ma il dropdown si resettava immediatamente mostrando "Nessun appuntamento per questo giorno", causando confusione e impossibilità di selezionare altri lead senza ricaricare la data.

**Problema risolto al 100%** in questa versione.

---

## ✨ NOVITÀ v2.5.19

### **1. FIX DROPDOWN LEAD PERSISTENTE**
- ✅ Dropdown rimane popolato dopo selezione lead
- ✅ Possibile selezionare più lead senza ricaricare la data
- ✅ Implementato flag `isFormProgrammaticUpdate` per evitare re-trigger del listener

### **2. MASTER MESSAGE TEMPLATE**
- ✅ Template fisso "Master Message" di Dante disponibile globalmente
- ✅ Accessibile via `window.insertMasterMessage()`
- ✅ Testo: *"Buonasera {NN}, sono Dante di Stock Gain..."*

### **3. GESTIONE ERRORI 403/404 DRIVE**
- ✅ Console pulita: nessun errore rosso per file mancanti su Drive
- ✅ File creati automaticamente al primo salvataggio
- ✅ Log intelligenti: `⚠️ File non trovato` invece di `❌ Errore`

### **4. VERSIONING COMPLETO**
- ✅ Tutti i file JS aggiornati a `?v=2.5.19`
- ✅ Cache-busting definitivo
- ✅ Homepage sincronizzata: `v2.5.19`

---

## 📂 STRUTTURA FILE

```
TESTmess_v2.5.19/
├── index.html                           # Homepage (v2.5.19)
├── css/
│   └── style.css                        # (v2.5.19)
├── js/
│   ├── main.js                          # Core app (v2.5.19)
│   ├── google-calendar.js               # ⭐ FIX dropdown (v2.5.19)
│   ├── google-auth.js                   # Login Google (v2.5.19)
│   ├── google-drive-storage.js          # ⭐ FIX 403/404 (v2.5.19)
│   ├── templates.js                     # ⭐ Master Message (v2.5.19)
│   ├── rubrica.js                       # Gestione contatti (v2.5.19)
│   ├── nomi-italiani.js                 # Database nomi italiani (v2.5.19)
│   ├── config.js                        # Configurazione (v2.5.19)
│   ├── github-auto-push.js              # Auto-push GitHub (v2.5.19)
│   └── google-sheets-assistenti.js      # Assistenti Google Sheets (v2.5.19)
├── CHANGELOG_v2.5.19.md                 # Changelog dettagliato
├── README_v2.5.19.md                    # Questo file
└── OAUTH_SETUP_GUIDE.md                 # Guida configurazione OAuth

⭐ = File modificati in v2.5.19
```

---

## 🚀 INSTALLAZIONE

### **Metodo 1: Sovrascrittura Completa (Consigliato)**

```bash
# 1. Backup versione corrente (opzionale)
cp -r /home/user/webapp /home/user/webapp_backup_$(date +%Y%m%d)

# 2. Estrai tar.gz
tar -xzf TESTmess_v2.5.19_FIX_DROPDOWN_LEAD_DEFINITIVO.tar.gz -C /home/user/

# 3. Hard refresh browser
# Chrome/Edge: Ctrl+Shift+R (Windows/Linux) o Cmd+Shift+R (Mac)
```

### **Metodo 2: Upload su GitHub Pages**

```bash
# 1. Clona repository
git clone https://github.com/DanteMaNonQuello/sgfemassdante.git
cd sgfemassdante

# 2. Estrai tar.gz
tar -xzf TESTmess_v2.5.19_FIX_DROPDOWN_LEAD_DEFINITIVO.tar.gz --strip-components=1

# 3. Commit e push
git add .
git commit -m "Update to v2.5.19 - Fix dropdown lead + Master Message"
git push origin main

# 4. Attendi deploy automatico GitHub Pages (~2 min)
```

---

## 🧪 TEST POST-INSTALLAZIONE

### **Test 1: Verifica Versione**
1. Apri browser e vai su homepage
2. Apri DevTools (F12) → Console
3. Verifica log: `🚀 TESTmess v2.5.19 inizializzato`
4. Controlla titolo pagina: `Stock Gain Messenger - v2.5.19 by Dante`

### **Test 2: Dropdown Lead Persistente**
1. Login Google
2. Seleziona data con eventi (es. 2026-03-18)
3. Dropdown "Seleziona Lead" mostra lead (es. 6 lead)
4. **Seleziona un lead** → Form si compila
5. ✅ **Verifica:** Dropdown rimane popolato con 6 lead (non si svuota)
6. Seleziona un altro lead → Form si aggiorna
7. ✅ **Verifica:** Dropdown ancora popolato

### **Test 3: Master Message**
1. Apri DevTools → Console
2. Esegui: `window.insertMasterMessage()`
3. ✅ **Verifica:** Campo "Messaggio finale" popolato con Master Message

### **Test 4: Console Pulita**
1. Login Google
2. Naviga tra le pagine (Home, Calendario, Rubrica)
3. ✅ **Verifica:** Nessun errore 403/404 rosso per file Drive
4. Eventuali warning `⚠️ File non trovato` sono normali (prima volta)

---

## 🔧 RISOLUZIONE PROBLEMI

### **Dropdown ancora sparisce dopo selezione**
**Causa:** Cache browser non aggiornata

**Soluzione:**
```
1. Hard refresh: Ctrl+Shift+R (Windows/Linux) o Cmd+Shift+R (Mac)
2. Verifica console: deve mostrare "v2.5.19"
3. Se persiste: Svuota cache completa browser (Settings → Clear browsing data)
```

### **OAuth 400 redirect_uri_mismatch**
**Causa:** Sandbox URL non autorizzato in Google Console

**Soluzione:**
```
1. Testare su GitHub Pages (OAuth funziona): https://dantemanonquello.github.io/sgfemassdante/
2. Oppure aggiungere sandbox URL negli "Authorized JavaScript origins":
   - Google Cloud Console → Credentials → OAuth 2.0 Client ID
   - Aggiungi URL sandbox: https://3000-...sandbox.novita.ai
```

### **Google Sheets Assistenti 404**
**Causa:** Foglio "AssistentiGenere" mancante nello spreadsheet

**Impatto:** Gender detection {YY} non funziona, ma non blocca l'app

**Soluzione:**
```
1. Creare foglio "AssistentiGenere" con colonne: Nome | Genere | Settore
2. Popolare con dati assistenti (es. "MARIA | F | Lead")
3. Oppure usare solo database locale nomi-italiani.js
```

---

## 📊 STATISTICHE PROGETTO

- **File totali:** 65+
- **Righe codice:** ~15.000
- **Database nomi:** 652 (260 maschili, 392 femminili)
- **Template default:** 3 (Primo Messaggio, Memo, Dolce Paranoia)
- **Calendari supportati:** Illimitati (auto-detect "SG -" e "Lead")

---

## 🌐 LINK UTILI

- **GitHub Pages:** https://dantemanonquello.github.io/sgfemassdante/
- **Repository:** https://github.com/DanteMaNonQuello/sgfemassdante
- **Google Console OAuth:** https://console.cloud.google.com/apis/credentials
- **Supporto:** Contatta Dante via GitHub Issues

---

## 📜 LICENZA

Proprietario: Dante  
Uso privato: Stock Gain internal tool  

---

## 🎉 RINGRAZIAMENTI

Grazie per aver usato TESTmess! Questo rilascio risolve definitivamente il problema del dropdown lead e introduce funzionalità richieste dagli utenti.

**Buon lavoro! 🚀**

---

**Fine README v2.5.19**
