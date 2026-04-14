# 📋 CHANGELOG v2.5.26 - GOOGLE MEET INTEGRATION

**Data rilascio**: 19 Marzo 2026  
**Versione**: v2.5.26  
**Tipo**: Feature Release + Bug Fixes

---

## 🎯 OBIETTIVI RELEASE

Integrazione completa Google Meet nella HOME e nel form, mantenendo tutte le funzionalità delle versioni precedenti (v2.5.22-v2.5.24).

---

## ✨ NUOVE FEATURE

### 1. 📹 **Google Meet Integration - HOME**

- **Link Meet visibili nella vista calendario**
  - Icona video verde accanto agli eventi con Meet
  - Link cliccabile diretto alla videochiamata
  - Design gradient verde Google Meet
  - Hover effect con shadow animato

**Codice**:
```javascript
// google-calendar.js - displayCalendarView()
const meetLink = event.hangoutLink || 
               (event.conferenceData && event.conferenceData.entryPoints && 
                event.conferenceData.entryPoints.find(ep => ep.entryPointType === 'video')?.uri);
```

### 2. 📹 **Google Meet Integration - FORM**

- **Bottone "Apri Google Meet" nel form**
  - Visibile solo se l'evento ha un link Meet
  - Posizionato sotto il campo "Orario"
  - Stile card verde con icona video
  - Apre Meet in nuova tab

**Codice**:
```javascript
// google-calendar.js - fillFormFromEvent()
const meetContainer = document.getElementById('googleMeetContainer');
if (meetLink) {
    meetContainer.innerHTML = `
        <div class="google-meet-link">
            <a href="${meetLink}" target="_blank" class="btn-meet">
                <i class="fas fa-video"></i> Apri Google Meet
            </a>
        </div>
    `;
}
```

### 3. 🎨 **CSS Styling per Google Meet**

- **Stili custom per link Meet**
  - Gradient verde Google (#0f9d58 → #0b8043)
  - Animazioni hover smooth
  - Responsive design
  - Icone FontAwesome integrate

---

## 🔧 FEATURE MANTENUTE (v2.5.22-v2.5.24)

### ✅ v2.5.24 - OGGI/DOMANI + Link WhatsApp

- **Label intelligenti "oggi"/"domani"**
  - Eventi di oggi/domani mostrano "oggi"/"domani" invece del giorno della settimana
  - Solo nei messaggi WhatsApp (non nel calendario)
  
- **Link WhatsApp nella descrizione evento**
  - Formato: `📱 WhatsApp: https://wa.me/393331234567`
  - Aggiunto automaticamente dopo invio messaggio
  - Evita duplicati su invii multipli

### ✅ v2.5.22 - Duplicati +39 Agnostic + Date Range Picker

- **Normalizzazione telefoni +39 agnostic**
  - `normalizeForComparison()` rimuove prefisso +39
  - `+393331234567` = `3331234567` = `+39 333 123 4567`
  - Performance: Set O(1) lookup (~250× più veloce)

- **Date Range Picker ottimizzato**
  - Default: oggi -7 giorni → oggi +10 giorni (17 giorni)
  - Max range: ±90 giorni (180 giorni totali)
  - Validation con alert >180 giorni
  - Persistenza in localStorage

- **Cache localStorage con TTL**
  - Durata: 1 ora
  - Riduce chiamate API Google Calendar
  - Loading time: ~12s → ~2s (6× più veloce)

### ✅ v2.5.23 - Controllo Incongruenze Società (WIP)

- **Backend completato (80%)**
  - `needsSocietaUpdate()` confronta società salvate vs eventi
  - Priorità: ALTA (SG↔FE), MEDIA (refusi), BASSA (generiche)
  - Array `contactsToUpdate` separato da `unsaved`
  
- **UI da completare (20%)**
  - Sezione "Contatti Incongruenti" da renderizzare
  - Bottoni "Aggiorna" / "Ignora"
  - TODO: finire `renderRubricaList` case 3

---

## 📊 STATISTICHE PERFORMANCE

| Metrica | Prima | Dopo | Miglioramento |
|---------|-------|------|---------------|
| Loading eventi (17 giorni) | ~12s | ~2s | **6× più veloce** |
| Controllo duplicati (1500 contatti) | 335,940 confronti | 1,348 lookup | **250× più veloce** |
| Dimensione tar.gz | 53 MB | 370 KB | **99.3% riduzione** |
| Version bump | v2.5.18 | v2.5.26 | **+8 versioni** |

---

## 🐛 BUG FIXES

### 1. Fix versioning disallineato

**Problema**: GitHub Pages serviva v2.5.18 mentre local era v2.5.24  
**Causa**: Force push aveva creato disallineamento tra branches  
**Fix**: Version bump sincronizzato su tutti i file:
- `index.html`: title + script src + css src
- `main.js`: console.log versione
- `google-calendar.js`: console.log versione  
- `rubrica.js`: console.log versione

### 2. Fix cache-busting

**Problema**: Browser caricava vecchie versioni JS/CSS  
**Fix**: Query parameter `?v=2.5.26` su tutti gli script e stylesheet

### 3. Fix tar.gz oversize (53 MB)

**Problema**: Tar includeva `.git/` folder (Git history)  
**Causa**: Comando `tar -czf` senza exclude  
**Fix**: 
```bash
tar -czf TESTmess_v2.5.26.tar.gz \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='*.tar.gz' \
  --exclude='.wrangler' \
  webapp/
```

---

## 📦 FILES MODIFICATI

### Modified (6 files)

1. **js/google-calendar.js** (+40 lines)
   - `displayCalendarView()`: aggiunto rendering link Meet in HOME
   - `fillFormFromEvent()`: aggiunto popolamento container Meet in form
   - Version bump: v2.5.20 → v2.5.26

2. **js/main.js** (+2 lines)
   - Version bump header e console.log
   - v2.5.24 → v2.5.26

3. **index.html** (+8 lines)
   - Aggiunto `<div id="googleMeetContainer">` dopo campo orario
   - Version bump: title, script src, css src
   - v2.5.24 → v2.5.26

4. **css/style.css** (+62 lines)
   - `.google-meet-link`: stile card gradient verde
   - `.btn-meet`: bottone bianco con icona video
   - `.event-meet`: link compatto per HOME
   - Hover effects + transitions

5. **js/rubrica.js** (+1 line)
   - Version bump console.log
   - v2.5.23 → v2.5.26

6. **CHANGELOG_v2.5.26.md** (NEW)
   - Documentazione completa release

---

## 🚀 DEPLOYMENT

### Local Testing

```bash
# 1. Verifica versione
grep "v2.5.26" index.html

# 2. Hard refresh
Ctrl+Shift+R (Win/Linux)
Cmd+Shift+R (Mac)

# 3. Console log atteso
🚀 TESTmess v2.5.26 inizializzato - GOOGLE MEET INTEGRATION
✅ Google Calendar module v2.5.26 caricato - GOOGLE MEET INTEGRATION
📒 Rubrica module v2.5.26 initialized
```

### Git Workflow

```bash
git add .
git commit -m "v2.5.26 - Google Meet Integration + version alignment"
git push origin main
```

### GitHub Pages

- **URL**: https://dantemanonquello.github.io/sgfemassdante/
- **Deployment**: Automatico dopo push (2-3 minuti)
- **Verifica**: Hard refresh + check version in title

---

## 🧪 TEST SCENARIOS

### Test 1: Google Meet in HOME

1. Crea evento su Google Calendar con link Meet
2. Sincronizza calendario su TESTmess
3. Verifica icona 📹 Meet accanto all'evento
4. Click sul link → apre Google Meet in nuova tab

### Test 2: Google Meet in FORM

1. Seleziona lead con evento Meet
2. Verifica bottone "Apri Google Meet" sotto campo Orario
3. Click bottone → apre Meet in nuova tab
4. Seleziona lead SENZA Meet → bottone nascosto

### Test 3: Oggi/Domani Labels

1. Crea evento per oggi
2. Seleziona lead → campo "Giorno" = "oggi"
3. Anteprima messaggio → "oggi alle 15.00"
4. Crea evento per domani → "domani alle 10.00"

### Test 4: Link WhatsApp in Calendar

1. Invia messaggio WhatsApp da TESTmess
2. Apri evento su Google Calendar
3. Verifica descrizione: `📱 WhatsApp: https://wa.me/393331234567`
4. Click link → apre chat WhatsApp

---

## 📝 NOTES

### Compatibilità Google Calendar API

- **hangoutLink**: Campo legacy (ancora supportato)
- **conferenceData**: Nuovo formato Google Meet
- **Fallback**: Codice supporta entrambi i formati

### Limitazioni

- Google Meet link read-only (l'app non crea eventi)
- Link visibili solo se presenti nell'evento originale
- Nessuna integrazione con Meet API (solo link esterni)

### Future Improvements (v2.5.27+)

- [ ] Finire UI "Contatti Incongruenti" (v2.5.23 completamento)
- [ ] Progress bar loading eventi
- [ ] Filtro dropdown SG/FE
- [ ] Export contatti CSV
- [ ] Statistiche sommario
- [ ] Google Meet auto-create per nuovi eventi

---

## 👥 CREDITS

- **Developer**: Dante (AI-assisted coding)
- **Testing**: Stock Gain / Finanza Efficace team
- **Framework**: Vanilla JS + Google APIs
- **Hosting**: GitHub Pages

---

## 📞 SUPPORT

Per bug reports o feature requests:
1. GitHub Issues: https://github.com/dantemanonquello/sgfemassdante/issues
2. Console logs: F12 → Console tab
3. Screenshot + version number

---

**🎉 Enjoy TESTmess v2.5.26!**
