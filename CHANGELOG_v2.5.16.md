# TESTmess v2.5.16 - FIX DROPDOWN LEAD INCLICCABILE (FILTRO CALENDARIO)

**Data:** 12/02/2026  
**Versione:** v2.5.16 by Dante

---

## 🔴 PROBLEMA RISOLTO

**Sintomo:**  
Dopo aver cliccato "Invia" o "Genera Messaggio", il dropdown "Seleziona Lead" diventava **INCLICCABILE** (grigio) con il messaggio "-- Nessun appuntamento per questo giorno --".

**Causa:**  
`updateLeadSelectorByDate()` applicava il **filtro calendario** (es. "SG - Call interne") anche al dropdown lead.  
Se il lead apparteneva a un calendario diverso (es. "SG - Follow Up"), il filtro lo escludeva → `dayEvents.length === 0` → dropdown disabilitato.

**Esempio:**
1. Filtro calendario impostato su "SG - Call interne"
2. Clicchi lead "Pasquale Bassolino" da calendario "SG - Follow Up"
3. `updateLeadSelectorByDate()` viene chiamato dopo il salvataggio
4. Filtra solo eventi "SG - Call interne" → nessun lead trovato
5. Dropdown disabilitato → "-- Nessun appuntamento per questo giorno --"

---

## ✅ FIX APPLICATO

### **Rimosso filtro calendario dal dropdown lead**
**File:** `js/google-calendar.js` (linee ~577-590)

**PRIMA (v2.5.15):**
```javascript
// Ottieni calendario selezionato nella home
const homeCalendarFilter = getHomeSelectedCalendar();

// Filtra eventi per la data selezionata + escludi "X" + filtra per calendario home
const dayEvents = allEvents.filter(event => {
    const eventDate = new Date(event.start);
    const isCorrectDate = eventDate.toDateString() === selectedDate.toDateString();
    const isNotX = !shouldSkipEvent(event);
    
    // Filtra per calendario home (se non è "all")
    const isSelectedCalendar = homeCalendarFilter === 'all' || event.calendarId === homeCalendarFilter;
    
    return isCorrectDate && isNotX && isSelectedCalendar;
});
```

**DOPO (v2.5.16):**
```javascript
// 🔥 FIX v2.5.16: NON filtrare per calendario - mostra SEMPRE tutti i lead del giorno
// Il filtro calendario si applica solo alla vista calendario, NON al dropdown lead

// Filtra eventi per la data selezionata + escludi "X"
const dayEvents = allEvents.filter(event => {
    const eventDate = new Date(event.start);
    const isCorrectDate = eventDate.toDateString() === selectedDate.toDateString();
    const isNotX = !shouldSkipEvent(event);
    
    return isCorrectDate && isNotX;
});
```

---

## 🎯 COME FUNZIONA ORA

### **Workflow completo:**

| Passo | Cosa succede |
|---|---|
| 1. Filtro calendario | Imposti "SG - Call interne" (filtra solo la vista calendario) |
| 2. Selezioni data | 12/02/2026 |
| 3. Dropdown "Seleziona Lead" | Mostra **TUTTI** i lead del giorno (anche da altri calendari) |
| 4. Clicchi lead | "Pasquale Bassolino" da "SG - Follow Up" |
| 5. Invia messaggio | `markLeadAsContacted()` salva su localStorage |
| 6. Refresh UI | `updateLeadSelectorByDate()` ricarica dropdown |
| 7. Dropdown aggiornato | **TUTTI** i lead ancora visibili (NON filtrati per calendario) |
| 8. Lead diventa verde | `✅ 17:00 - Pasquale Bassolino (SG - Follow Up)` |

---

## 📊 DIFFERENZA FILTRO CALENDARIO

| Componente | Filtro calendario applicato? |
|---|---|
| **Vista Calendario** (home) | ✅ SI (mostra solo calendari selezionati) |
| **Dropdown "Seleziona Lead"** | ❌ NO (mostra TUTTI i lead del giorno) |
| **Dropdown "Seleziona Giorno"** | ❌ NO (mostra TUTTI i giorni con eventi) |

**Motivo:** Il filtro calendario serve solo per **visualizzare** eventi nella vista calendario, NON per **limitare** i lead disponibili nel dropdown.

---

## 🐛 COSA È STATO FIXATO

| Problema | Status PRIMA | Status DOPO |
|---|---|---|
| Dropdown incliccabile dopo invio | ❌ ROTTO | ✅ FIXATO |
| Filtro calendario nasconde lead | ❌ ROTTO | ✅ FIXATO |
| Lead diversi dal filtro spariscono | ❌ ROTTO | ✅ FIXATO |
| Dropdown mostra "Nessun appuntamento" | ❌ ROTTO | ✅ FIXATO |

---

## 🧪 TEST RAPIDO

1. **Hard refresh:** `Ctrl + Shift + R`
2. **Seleziona filtro calendario:** "SG - Call interne"
3. **Seleziona data:** 12/02/2026
4. **Apri dropdown "Seleziona Lead"** → vedi TUTTI i lead (anche "SG - Follow Up")
5. **Clicca un lead da altro calendario:** "Pasquale Bassolino (SG - Follow Up)"
6. **Clicca "Invia"**
7. ✅ **Verifica:** dropdown rimane cliccabile con tutti i lead visibili

---

## ⚠️ NOTA IMPORTANTE

**Questo fix NON cambia:**
- ✅ Vista calendario home (ancora filtrata per calendario selezionato)
- ✅ Dropdown "Filtra per Calendario" (funziona normalmente)
- ✅ Salvataggio lead contattati (v2.5.15)
- ✅ Refresh automatico UI (v2.5.15)

**Cambia SOLO:**
- ❌ Dropdown "Seleziona Lead" → NON più filtrato per calendario

---

## 🔧 FILE MODIFICATI

- ✅ `js/google-calendar.js` (updateLeadSelectorByDate)
- ✅ `index.html` (versione v2.5.16, cache busting)
- ✅ `CHANGELOG_v2.5.16.md` (questo file)

---

## ✨ COMPATIBILITÀ

Tutti i fix delle versioni precedenti (v2.5.15 - v2.5.9) sono **preservati**:
- ✅ Lead contattati persistono con V/X (v2.5.15)
- ✅ Cronologia messaggi con fallback localStorage (v2.5.14)
- ✅ Persistenza login Google (v2.5.12)
- ✅ Dropdown cliccabile con pulsante ricarica (v2.5.13)
- ✅ Calendario funzionante (v2.5.7)
- ✅ OAuth scope corretti (v2.5.9)
- ✅ Formato contatti corretto (v2.5.11)

---

**Developed by Dante**  
*TESTmess v2.5.16 - Stock Gain Messenger*  
*12/02/2026*
