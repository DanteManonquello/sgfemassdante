# CHANGELOG v2.3.1 - Auth Guard + UI Compatta

**Data:** 21 gennaio 2025  
**Tipo:** Patch - Sicurezza + UX  

---

## 🔒 **SICUREZZA: Auth Guard completo**

### **Problema risolto:**
- Prima del login, l'app mostrava dati sensibili (eventi calendario, lead)
- localStorage rimaneva pieno di dati anche dopo logout

### **Fix implementati:**

#### **1. Blocco Calendario senza login**
- `updateLeadSelectorByDate()`: mostra "🔒 Effettua il login Google"
- `updateLeadSelector()`: stesso blocco
- `syncCalendarEvents()`: già aveva guard (confermato OK)

#### **2. Blocco Cronologia senza login**
- `loadCronologia()`: mostra "⚠️ Fai login Google per vedere la cronologia"
- Già implementato dalla v2.3.0 ✅

#### **3. Blocco Rubrica senza login**
- `getUnsavedContacts()`: return [] se no accessToken
- `renderRubricaList()`: mostra "🔒 Login richiesto"

#### **4. Logout completo**
- `handleSignoutClick()`: pulisce TUTTO localStorage
- Rimuove: calendar_events, contacted_leads, saved_contacts, templates_local
- Auto-reload pagina dopo logout (reset completo UI)

---

## 🎨 **UX: Pulsanti compatti**

### **Problema:**
- Pulsanti +/- troppo grandi
- Non stavano bene affiancati

### **Fix CSS:**
- `.date-nav-btn-compact`: 36px × 36px (era 40px)
- `border-radius: 50%` (cerchi perfetti)
- `gap: 6px` (più compatto)
- `.time-btn`: padding ridotto a 6px 10px
- Font-size ridotto a 12px

**Risultato:** Layout più pulito e professionale

---

## 📁 **File modificati:**

### **CSS:**
- `css/style.css`: Pulsanti compatti e circolari

### **JavaScript:**
- `js/google-calendar.js`: Auth guard in updateLeadSelector*
- `js/google-auth.js`: Logout con pulizia completa localStorage
- `js/rubrica.js`: Auth guard in getUnsavedContacts + render
- `js/main.js`: Header versione v2.3.1
- `js/config.js`: Version bump + lastUpdate

### **HTML:**
- `index.html`: v2.3.1 + cache busting CSS

---

## ✅ **Comportamento dopo il fix:**

### **Senza login:**
- ❌ NO calendario visibile
- ❌ NO cronologia visibile
- ❌ NO rubrica visibile
- ✅ Solo form messaggio base (nome, telefono, servizio)

### **Con login:**
- ✅ Calendario sincronizzato
- ✅ Cronologia da Google Drive
- ✅ Rubrica scan 12 mesi
- ✅ Tutti i dati online

### **Dopo logout:**
- ✅ localStorage pulito
- ✅ Pagina ricaricata
- ✅ Torna a stato "senza login"

---

## 🔄 **Backward Compatibility:**
- ✅ Nessuna breaking change
- ✅ Tutte le funzioni esistenti preservate
- ✅ Solo aggiunti controlli auth all'inizio

---

## 📦 **Deploy:**
- Compatibile con v2.3.0
- Nessuna migrazione dati necessaria
- Safe per production ✅
