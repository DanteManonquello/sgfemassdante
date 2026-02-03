# CHANGELOG v2.4.0 - Memo del Giorno

**Data:** 21 gennaio 2025  
**Tipo:** Minor - Nuova feature  

---

## 🎯 **NUOVA FEATURE: Memo del Giorno**

### **Cosa è:**
Secondo tipo di messaggio disponibile nel dropdown "Tipo Messaggio", pensato per conferme rapide degli appuntamenti.

### **Template:**
```
{BB} {NN}, ti confermo che per le {HH} siam collegati, a dopo. Dammi riscontro, grazie
```

**Esempio output:**
```
Buon pomeriggio Mario, ti confermo che per le 15 siam collegati, a dopo. Dammi riscontro, grazie
```
```
Buonasera Laura, ti confermo che per le 17.30 siam collegati, a dopo. Dammi riscontro, grazie
```

---

## 🆕 **FORMATO ORARIO SPECIALE**

### **Logica:**
- **Ora intera** (15:00, 18:00) → **Solo numero** ("15", "18")
- **Ora con minuti** (15:30, 18:45) → **Formato punto** ("15.30", "18.45")

### **Implementazione:**
```javascript
// In updatePreview(), solo per memo_giorno:
if (tipoMessaggio === 'memo_giorno') {
    if (orario.includes(':')) {
        const [h, m] = orario.split(':');
        HH = m === '00' ? h : `${h}.${m}`;
    }
}
```

---

## 📦 **TEMPLATE SYSTEM**

### **Array default con 2 template:**
```javascript
const defaultTemplates = [
    {
        id: 'primo_messaggio',
        nome: 'Primo Messaggio',
        categoria: 'Primo Messaggio',
        testo: '...' // testo originale
    },
    {
        id: 'memo_giorno',
        nome: 'Memo del Giorno',
        categoria: 'Memo',
        testo: '{BB} {NN}, ti confermo che per le {HH} siam collegati, a dopo. Dammi riscontro, grazie'
    }
];
```

### **Migrazione automatica:**
- Se utente ha solo 1 template (vecchia versione), **aggiunge automaticamente** "Memo del Giorno"
- Se utente ha 0 template, **crea entrambi** di default
- **Preserva template custom** se esistenti

---

## 💾 **CRONOLOGIA MESSAGGI**

### **Campo aggiunto:**
```javascript
{
    id: 1234567890,
    timestamp: '2026-01-21T...',
    nome: 'Mario',
    cognome: 'Rossi',
    telefono: '+39 333...',
    messaggio: '...',
    servizio: 'Stock Gain',
    societa: 'SG - Lead',
    tipoMessaggio: 'memo_giorno'  // 🆕 NUOVO CAMPO
}
```

### **Visualizzazione:**
Ogni entry in cronologia mostra badge colorato:
- **💬 Primo Msg** (verde) per `primo_messaggio`
- **📝 Memo** (blu) per `memo_giorno`

---

## 🔄 **COMPATIBILITÀ**

### **Backward compatible:**
✅ Vecchie entry cronologia senza campo `tipoMessaggio` → trattate come "primo_messaggio"
✅ Template esistenti preservati
✅ Tutte le funzioni esistenti non modificate
✅ Nessuna breaking change

### **Funzioni NON toccate:**
- `fillFormFromEvent()` - Riempimento form da calendario
- `checkAndSaveContact()` - Salvataggio contatti
- `sendToWhatsApp()` - Apertura WhatsApp
- Moduli rubrica, calendario, auth - Invariati

---

## 📁 **FILE MODIFICATI**

### **JavaScript:**
- `js/main.js`:
  - Template array con 2 default
  - Migrazione automatica template
  - Formato orario condizionale in `updatePreview()`
  - Campo `tipoMessaggio` in `saveToCronologia()`
  - Badge tipo messaggio in `loadCronologia()`
- `js/config.js` - Version 2.4.0

### **HTML:**
- `index.html` - v2.4.0 + cache busting completo

### **Documentazione:**
- `CHANGELOG_v2.4.0.md` - Questo file

---

## ✅ **COME USARLO**

1. **Seleziona "Memo del Giorno"** dal dropdown "Tipo Messaggio"
2. **Compila nome** (es. "Mario")
3. **Imposta orario** (es. "15:00" o "15:30")
4. **Anteprima mostra:**
   - Ore intere: "Buon pomeriggio Mario, ti confermo che per le **15** siam collegati..."
   - Ore con minuti: "Buon pomeriggio Mario, ti confermo che per le **15.30** siam collegati..."
5. **Invia su WhatsApp** o **Genera** come sempre

---

## 🎨 **UX**

- Dropdown "Tipo Messaggio" ora ha 2 opzioni
- Anteprima live si aggiorna automaticamente al cambio template
- Stesso workflow di prima, nessuna modifica UI
- Badge colorati in cronologia per identificare tipo messaggio

---

## 🚀 **DEPLOY**

- Compatible con v2.3.1
- Nessuna migrazione database necessaria
- Safe per production ✅
- Template aggiunti automaticamente al primo caricamento

---

## 📊 **STATISTICHE**

- **Linee codice modificate:** ~80 righe
- **Funzioni aggiunte:** 0 (solo logica condizionale)
- **Funzioni modificate:** 3 (`updatePreview`, `saveToCronologia`, `loadCronologia`)
- **Breaking changes:** 0
- **Backward compatibility:** 100%
