# 📦 TESTmess v2.5.20 - Stock Gain Messenger

**Release Date:** 2026-03-18  
**Build:** `FIX_SERVIZIO_SG_FE_AUTO_DETECT`  
**Author:** Dante  

---

## 🎯 OBIETTIVO RILASCIO

**Fix riconoscimento servizio SG/FE automatico da calendario**

Problema riportato: tutti i lead mostravano "SG - Lead" anche per eventi appartenenti a calendari "FE - Lead". La funzione `extractServiceFromEvent()` aveva solo un fallback hardcoded a Stock Gain, ignorando il nome del calendario.

**Soluzione:** Auto-detect intelligente con priorità description → calendarName → default.

---

## ✨ NOVITÀ v2.5.20

### **1. AUTO-DETECT SERVIZIO DA CALENDARIO**
- ✅ Riconoscimento automatico SG/FE dal nome calendario
- ✅ Priorità intelligente: campo description > nome calendario > default
- ✅ Pattern multipli: "SG -", "FE -", "Call consulenza", "Follow Up", ecc.

### **2. LOG DEBUGGING DETTAGLIATI**
- ✅ Console log per ogni riconoscimento servizio
- ✅ Mostra: evento, calendario, description, risultato
- ✅ Facile identificare errori di classificazione

### **3. COMPATIBILITÀ TOTALE CON v2.5.19**
- ✅ Dropdown lead persistente funziona ancora (v2.5.19)
- ✅ Master Message disponibile (v2.5.19)
- ✅ Gestione 403/404 Drive (v2.5.19)

---

## 📂 STRUTTURA FILE

```
TESTmess_v2.5.20/
├── index.html                           # Homepage (v2.5.20)
├── css/
│   └── style.css                        # (v2.5.20)
├── js/
│   ├── main.js                          # Core app (v2.5.20)
│   ├── google-calendar.js               # ⭐ FIX servizio (v2.5.20)
│   ├── google-auth.js                   # Login Google (v2.5.20)
│   ├── google-drive-storage.js          # Gestione Drive (v2.5.20)
│   ├── templates.js                     # Master Message (v2.5.20)
│   ├── rubrica.js                       # Gestione contatti (v2.5.20)
│   ├── nomi-italiani.js                 # Database nomi (v2.5.20)
│   ├── config.js                        # Configurazione (v2.5.20)
│   ├── github-auto-push.js              # Auto-push GitHub (v2.5.20)
│   └── google-sheets-assistenti.js      # Assistenti Sheets (v2.5.20)
├── CHANGELOG_v2.5.20.md                 # Changelog dettagliato
└── README_v2.5.20.md                    # Questo file

⭐ = File modificato in v2.5.20
```

---

## 🚀 INSTALLAZIONE

### **Metodo 1: GitHub Pages (Automatico via push)**

```bash
# ✅ Già deployato automaticamente!
# Vai su: https://dantemanonquello.github.io/sgfemassdante/
# Hard refresh: Ctrl+Shift+R (Windows/Linux) o Cmd+Shift+R (Mac)
```

### **Metodo 2: Estrazione Manuale Tar.gz**

```bash
# 1. Scarica tar.gz
wget https://3000-....sandbox.novita.ai/TESTmess_v2.5.20_FIX_SERVIZIO_SG_FE_AUTO_DETECT.tar.gz

# 2. Estrai
tar -xzf TESTmess_v2.5.20_FIX_SERVIZIO_SG_FE_AUTO_DETECT.tar.gz -C /percorso/desiderato

# 3. Apri index.html
```

---

## 🧪 TEST POST-INSTALLAZIONE

### **Test 1: Verifica Versione**
1. Apri browser: https://dantemanonquello.github.io/sgfemassdante/
2. Apri DevTools (F12) → Console
3. Verifica log: `🚀 TESTmess v2.5.20 inizializzato - FIX SERVIZIO DA CALENDARIO`
4. Titolo pagina: `Stock Gain Messenger - v2.5.20 by Dante`

### **Test 2: Riconoscimento SG/FE**
1. Login Google
2. Seleziona data con eventi (es. 2026-03-18)
3. Dropdown mostra lead con servizio corretto:
   ```
   Antonio Collu
   📋 SG - Lead                    ← Da "SG - Call consulenza"
   
   Maria Rossi
   📋 FE - Lead                    ← Da "FE - Lead"
   ```
4. ✅ **Verifica:** Eventi SG mostrano "SG - Lead", eventi FE mostrano "FE - Lead"

### **Test 3: Console Log Debugging**
1. Apri Console (F12)
2. Seleziona un lead dal dropdown
3. Verifica log:
   ```
   🔍 [extractServiceFromEvent] Evento: Antonio Collu
      📅 Calendario: SG - Call consulenza
      📝 Description: (vuota)
      ✅ Rilevato SG da calendario: SG - Call consulenza
   ```

### **Test 4: Dropdown Lead Persistente (v2.5.19 ancora funziona)**
1. Seleziona data → Dropdown popolato
2. Seleziona lead → Form compilato
3. ✅ **Verifica:** Dropdown rimane popolato (non sparisce)

---

## 🔧 RISOLUZIONE PROBLEMI

### **Servizio ancora errato dopo aggiornamento**
**Causa:** Cache browser non aggiornata

**Soluzione:**
```
1. Hard refresh: Ctrl+Shift+R (Windows/Linux) o Cmd+Shift+R (Mac)
2. Verifica console mostra "v2.5.20"
3. Se persiste: Svuota cache completa (Settings → Clear browsing data)
```

### **Dropdown mostra sempre "SG - Lead"**
**Causa:** Eventi calendario senza `calendarName`

**Soluzione:**
```
1. Apri Console (F12)
2. Cerca log: "📅 Calendario: (vuoto)"
3. Se vuoto: Risincronizza calendario (pulsante "Sincronizza Calendario")
4. Ricarica lead dropdown
```

### **Eventi FE classificati come SG**
**Causa:** Nome calendario non contiene pattern riconosciuto

**Soluzione:**
```
Rinomina calendario su Google Calendar:
❌ "Calendario Lead" → Non riconosciuto
✅ "FE - Lead" → Riconosciuto
✅ "Finanza Efficace - Call" → Riconosciuto
```

---

## 📊 PATTERN CALENDARIO SUPPORTATI

### **Finanza Efficace:**
- `FE - Lead`
- `FE - Call consulenza`
- `Finanza Efficace - ...`
- Qualsiasi nome contenente "FE" o "Finanza Efficace"

### **Stock Gain:**
- `SG - Lead`
- `SG - Call consulenza`
- `SG - Call interne`
- `SG - Follow Up`
- `Stock Gain - ...`
- Qualsiasi nome contenente "SG" o "Stock Gain" o "Call consulenza"

### **Aggiungere Nuovo Servizio:**
```javascript
// In js/google-calendar.js, funzione extractServiceFromEvent():

if (calendarLower.includes('nuovo servizio') || 
    calendarLower.includes('ns -')) {
    return {
        servizio: 'Nuovo Servizio',
        societa: 'NS - Lead'
    };
}
```

---

## 📜 CRONOLOGIA VERSIONI

### **v2.5.20 (2026-03-18)** ← CORRENTE
- ✅ Auto-detect servizio SG/FE da calendario
- ✅ Log debugging dettagliati

### **v2.5.19 (2026-03-18)**
- ✅ Fix dropdown lead persistente
- ✅ Master Message template
- ✅ Gestione 403/404 Drive

### **v2.5.18 (2026-03-18)**
- 🐛 Debug logging dropdown

### **v2.5.17 (2026-03-18)**
- ✅ Fix cache versioning
- ✅ Rimosso export duplicato

### **v2.5.16 (2026-03-18)**
- ✅ Fix resetForm dropdown
- ✅ Login Google ottimizzato

---

## 🌐 LINK UTILI

- **GitHub Pages:** https://dantemanonquello.github.io/sgfemassdante/
- **Repository:** https://github.com/DanteMaNonQuello/sgfemassdante
- **Google Console OAuth:** https://console.cloud.google.com/apis/credentials

---

## 🎉 RINGRAZIAMENTI

Grazie per la segnalazione del bug! Fix implementato e testato in <10 minuti.

**Buon lavoro con SG e FE! 🚀**

---

**Fine README v2.5.20**
