# CHANGELOG v2.5.7 - FIX CALENDARIO COMPLETO

**Data:** 03/02/2026  
**Tipo:** Bug Fix Critico  
**Focus:** Calendario + Rubrica funzionanti

---

## 🐛 BUG CRITICI RISOLTI - CALENDARIO

### 1. **Data NON partiva da OGGI**
- **Problema**: Riga 1076 di main.js impostava data a OGGI + 2 GIORNI
- **Codice bugato**: `oggi.setDate(oggi.getDate() + 2);`
- **Fix**: Rimosso `+ 2` → ora imposta OGGI
- **Impatto**: Dropdown "Giorno" ora parte dalla data corrente

### 2. **Calendari NON visibili in dropdown**
- **Problema**: Dropdown "Filtra per Calendario" mostrava solo "Tutti i Calendari"
- **Causa**: `populateHomeCalendarDropdown()` chiamata SOLO durante sync manuale
- **Fix**:
  - Salvo lista calendari in `localStorage` (key: `sgmess_available_calendars`)
  - `loadSavedEvents()` ora carica anche calendari dal cache
  - Chiamata `loadSavedEvents()` all'init in main.js
- **Impatto**: Dropdown popolato automaticamente al caricamento pagina

### 3. **Eventi NON caricati automaticamente**
- **Problema**: Eventi NON caricati se già presenti in cache
- **Fix**: 
  - `loadSavedEvents()` esportata globalmente
  - Chiamata in main.js dopo init
  - Calendari caricati insieme agli eventi
- **Impatto**: Eventi e calendari disponibili subito

### 4. **Syntax Error google-calendar.js riga 650**
- **Problema**: `}` in più bloccava caricamento modulo calendario
- **Fix**: Rimossa `}` duplicata riga 650
- **Impatto**: Modulo calendario ora si carica correttamente

---

## ✅ RUBRICA FUNZIONANTE (da v2.5.6)

- ✅ Sincronizzazione Google Contacts con API corretta
- ✅ Salvataggio contatti reale in Google
- ✅ Normalizzazione telefoni unificata
- ✅ Spinner e error handling specifico

---

## 🔧 MODIFICHE TECNICHE

### File modificati:
1. **js/main.js**
   - Fix data OGGI (rimosso +2 giorni)
   - Aggiunta chiamata `setTodayDate()` in init
   - Aggiunta chiamata `loadSavedEvents()` in init
   - Versione aggiornata a v2.5.7

2. **js/google-calendar.js**
   - Aggiunta chiave `AVAILABLE_CALENDARS` in `STORAGE_KEYS_CALENDAR`
   - Salvataggio calendari in localStorage durante sync
   - `loadSavedEvents()` ora carica anche calendari da cache
   - Export `loadSavedEvents()` globalmente
   - Fix syntax error riga 650 (`}` duplicata rimossa)
   - Versione aggiornata a v2.5.7

3. **js/google-auth.js**
   - (Già corretto in v2.5.6 - nessuna modifica)

4. **js/rubrica.js**
   - (Già corretto in v2.5.6 - nessuna modifica)

5. **index.html**
   - Versione aggiornata a v2.5.7
   - Cache busting su tutti gli script (?v=2.5.7)

---

## 📋 TESTING

### Scenari testati:
- ✅ Data picker parte da OGGI
- ✅ Dropdown calendari popolato automaticamente
- ✅ Eventi caricati da cache
- ✅ Filtro calendario funzionante
- ✅ Lead filtrati per calendario selezionato
- ✅ Syntax error google-calendar.js risolto
- ✅ Rubrica funzionante (sincronizzazione + salvataggio)

---

## 🚀 DEPLOYMENT

```bash
# Versione: v2.5.7
# Tag: TESTmess_v2.5.7_FIX_CALENDARIO_RUBRICA_COMPLETO
# Branch: main
# Commit: Fix calendario (data oggi + dropdown calendari) + syntax error
```

---

## 📝 NOTE PER UTENTI

**IMPORTANTE: Dopo l'aggiornamento a v2.5.7:**

1. **Data corrente:**
   - Il dropdown "Giorno" ora parte AUTOMATICAMENTE da OGGI
   - Non più +2 giorni come prima

2. **Calendari dropdown:**
   - Tutti i calendari Google ora visibili in "Filtra per Calendario"
   - Puoi filtrare gli appuntamenti per calendario specifico
   - Selezione salvata in localStorage (persistente)

3. **Eventi automatici:**
   - Eventi e calendari caricati automaticamente al login
   - Cache aggiornato ogni volta che sincronizzi

4. **Rubrica (da v2.5.6):**
   - Sincronizzazione Google Contacts funzionante
   - Salvataggio contatti reale
   - Due pulsanti: Verde (salva in Google) / Grigio (già salvato)

---

## 🔗 RIEPILOGO FIX

### v2.5.7 (Calendario):
- ✅ Data parte da OGGI
- ✅ Dropdown calendari popolato
- ✅ Eventi caricati automaticamente
- ✅ Syntax error fixato

### v2.5.6 (Rubrica):
- ✅ Sincronizzazione Google Contacts
- ✅ Salvataggio contatti
- ✅ Error handling specifico
- ✅ Spinner su pulsanti

### v2.5.5 e precedenti:
- ✅ Tutti i fix precedenti mantenuti

---

**Developed by Dante** 🚀
