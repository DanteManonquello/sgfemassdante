# CHANGELOG v2.5.11 - HOTFIX RUBRICA SALVATAGGIO

**Data**: 03/02/2026  
**By**: Dante

---

## 🔴 PROBLEMA RISOLTO

La v2.5.10 **NON SALVAVA PIÙ I CONTATTI** in rubrica.

**Causa**: Lo split su `-` (riga 327) rompeva l'estrazione del nome dagli eventi.

---

## ✅ FIX

Rimosso lo split su `-` che causava problemi:

**PRIMA (v2.5.10 - ROTTO)**:
```javascript
nameText = nameText.split(':')[0].trim(); 
nameText = nameText.split('-')[0].trim(); // ❌ Questo rompeva tutto!
```

**DOPO (v2.5.11 - FUNZIONANTE)**:
```javascript
nameText = nameText.split(':')[0].trim(); // ✅ Solo split su ":"
```

---

## 📦 FILE MODIFICATI

1. **js/rubrica.js** - Rimossa riga 327 con split su `-`
2. **index.html** - Versione v2.5.11

---

## ✅ TUTTI I FIX PRESERVATI

- ✅ Capitalizzazione nome (Claudio, non CLAUDIO)
- ✅ Pulizia cognome da note (Crema, non "CREMA: Super High...")
- ✅ Rimossa qualifica
- ✅ Scope OAuth corretti
- ✅ **ORA SALVA DI NUOVO!**

---

**Developed by Dante | v2.5.11 | 03/02/2026**
