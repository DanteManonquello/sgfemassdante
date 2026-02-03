# CHANGELOG v2.5.10 - FIX RUBRICA FORMATO CONTATTI

**Data**: 03/02/2026  
**By**: Dante

---

## 🔴 PROBLEMA RISOLTO

I contatti salvati in rubrica Google avevano formattazione sbagliata:

**PRIMA**:
```
Nome: CLAUDIO
Cognome: CREMA: Super High Ticket (46K in su)  ❌
Società: SG - Lead  ✅
Qualifica: Finanza Efficace  ❌ (non richiesto)
```

**DOPO**:
```
Nome: Claudio  ✅
Cognome: Crema  ✅
Società: SG - Lead  ✅
(nessuna qualifica)  ✅
```

---

## ✅ FIX IMPLEMENTATI

### 1. **CAPITALIZZAZIONE NOME** (rubrica.js)

Aggiunta funzione `capitalizeNome()` che converte:
- `CLAUDIO` → `Claudio`
- `mario rossi` → `Mario Rossi`
- `DE LUCA` → `De Luca`

```javascript
function capitalizeNome(text) {
    if (!text) return '';
    return text.toLowerCase().split(' ').map(word => {
        if (word.length === 0) return word;
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
}
```

---

### 2. **PULIZIA COGNOME** (rubrica.js)

Rimosso tutto il contenuto dopo `:` e `-` dal nome evento:

```javascript
// PRIMA
nameText = event.summary; // "CLAUDIO CREMA: Super High Ticket (46K in su)"

// DOPO
nameText = nameText.split(':')[0].trim(); // "CLAUDIO CREMA"
nameText = nameText.split('-')[0].trim(); // "CLAUDIO CREMA"
```

**Risultato**:
- Event summary: `"CLAUDIO CREMA: Super High Ticket (46K in su)"`
- Estratto: `"CLAUDIO CREMA"`
- Split: `nome = "Claudio"`, `cognome = "Crema"`

---

### 3. **RIMOSSA QUALIFICA** (rubrica.js)

Il campo "Qualifica" in Google Contacts non serve. Rimosso `title` da `organizations`:

**PRIMA**:
```javascript
contact.organizations = [{
    name: contactData.societa,        // "SG - Lead"
    title: contactData.servizio || '' // "Stock Gain" → Mostrato come Qualifica ❌
}];
```

**DOPO**:
```javascript
contact.organizations = [{
    name: contactData.societa // Solo società
    // NON aggiungere title - non serve
}];
```

---

## 📦 FILE MODIFICATI

1. **js/rubrica.js**
   - Aggiunta funzione `capitalizeNome()` (riga ~301)
   - Pulizia nome evento con split `:` e `-` (riga ~318-320)
   - Applicata capitalizzazione su nome/cognome (riga ~380-381)
   - Rimosso campo `title` da organizations (riga ~607)

2. **index.html**
   - Aggiornata versione a v2.5.10 (title, header, cache busting)

---

## 🎯 COME FUNZIONA ORA

### Estrazione da Eventi Calendario:

**Input evento**:
```
Summary: "15:30 - CLAUDIO CREMA: Super High Ticket (46K in su)"
Description: "Telefono: +39 393 5766475"
Calendar: "SG - Lead 2025"
```

**Estrazione**:
1. Rimuovi orario: `"CLAUDIO CREMA: Super High Ticket (46K in su)"`
2. Rimuovi note dopo `:`: `"CLAUDIO CREMA"`
3. Split nome/cognome: `"CLAUDIO"` + `"CREMA"`
4. Capitalizza: `"Claudio"` + `"Crema"`
5. Società dal calendario: `"SG - Lead"`

**Output in Google Contacts**:
```
Nome: Claudio Crema
Telefono: +393935766475
Organizzazione: SG - Lead
```

---

### Estrazione da Cronologia:

**Input cronologia** (salvato da main.js):
```json
{
  "nome": "Claudio",
  "cognome": "Crema",
  "telefono": "+393935766475",
  "servizio": "Stock Gain",
  "societa": "SG - Lead"
}
```

**Output in Google Contacts**:
```
Nome: Claudio Crema
Telefono: +393935766475
Organizzazione: SG - Lead
```

---

## 🔄 COMPATIBILITÀ

Tutti i fix delle versioni precedenti sono preservati:

- ✅ **v2.5.9**: Scope OAuth completi + error handling 403
- ✅ **v2.5.8**: Fix notifiche + auto-logout 401
- ✅ **v2.5.7**: Fix calendario data oggi + dropdown calendari
- ✅ **v2.5.6**: Fix rubrica sincronizzazione + normalizzazione telefoni

---

## 📝 NOTE

### Campo "Società" automatico:

Quando salvi un messaggio da main.js:
- Se `Servizio = "Stock Gain"` → `Società = "SG - Lead"`
- Se `Servizio = "Finanza Efficace"` → `Società = "FE - Lead"`
- Puoi anche selezionare manualmente: `SG - Collega`, `FE - Collega`, `Altro (scrivi sotto)`

### Contatti duplicati:

Il sistema controlla duplicati per numero di telefono normalizzato:
- `+39 393 5766475` = `393935766475` (stesso contatto)
- Se il numero esiste già, non viene salvato di nuovo

---

## 🚀 TEST CONSIGLIATO

1. Vai su "Rubrica"
2. Clicca "🔄 Sincronizza Ora"
3. Verifica che i nomi siano capitalizzati correttamente
4. Salva un contatto
5. Apri Google Contacts e verifica:
   - Nome: prima lettera maiuscola
   - Cognome: solo cognome (senza note)
   - Società: SG - Lead o FE - Lead
   - Qualifica: vuoto ✅

---

**Developed by Dante**  
**Versione**: v2.5.10  
**Data**: 03/02/2026
