# 📦 TESTmess v2.5.1 - DEPLOYMENT GUIDE

**Versione**: v2.5.1  
**Data**: 21 gennaio 2026  
**Nome Release**: Dolce Paranoia FIX - Regola Semplificata + UI Nascosta

---

## 🎯 COSA È CAMBIATO IN v2.5.1

### ✨ Novità Principali

1. **Card Dolce Paranoia Nascosta di Default**
   - ✅ NON appare se tipo messaggio ≠ "Dolce Paranoia"
   - ✅ APPARE solo quando selezioni "Dolce Paranoia" dal dropdown
   - ✅ UI più pulita e meno invasiva

2. **Regola Filtro Semplificata**
   ```
   REGOLA UNICA:
   Se (data_appuntamento - data_primo_messaggio) >= 2 giorni
   → Mostra il lead in Dolce Paranoia
   ```

3. **UI Compatta e Scrollabile**
   - Lista scrollabile: max-height 300px
   - Design minimalista con info essenziali
   - Hover effects fluidi

4. **Rimosso (Semplificazione)**
   - ❌ Logica mattina/pomeriggio
   - ❌ Calcolo "giorni da ultimo messaggio"
   - ❌ Badge "⏰ Ultimo messaggio: X giorni fa"

---

## 🚀 COME DEPLOYARE

### Opzione 1: GitHub Push Manuale (RACCOMANDATO)

```bash
# 1. Scarica il backup
wget https://8080-imm9bzus7g92hre3dkutv-d0b9e1e2.sandbox.novita.ai/TESTmess_v2.5.1_DOLCE_PARANOIA_FIX.tar.gz

# 2. Estrai
tar -xzf TESTmess_v2.5.1_DOLCE_PARANOIA_FIX.tar.gz

# 3. Entra nella cartella
cd webapp

# 4. Verifica git status
git status

# 5. Push a GitHub
git push origin main
```

### Opzione 2: Deploy Diretto su GitHub Pages

1. Vai su: https://github.com/DanteManonquello/sgfemassdante
2. Settings → Pages
3. Source: Deploy from a branch
4. Branch: `main` → `/` (root)
5. Save

---

## 📊 FILE MODIFICATI

| File | Tipo Modifica | Descrizione |
|------|--------------|-------------|
| `js/main.js` | ✏️ Modified | Regola filtro semplificata + listener show/hide card |
| `index.html` | ✏️ Modified | `id="dolceParanoiaCard"` + `style="display: none"` |
| `css/style.css` | ➕ Added | Stili per lista scrollabile Dolce Paranoia |
| `js/config.js` | ✏️ Modified | Versione → 2.5.1 |
| `CHANGELOG_v2.5.1.md` | ➕ Added | Documentazione cambiamenti |

---

## 🧪 COME TESTARE

### Test 1: Card Nascosta di Default
1. Apri: https://dantemanonquello.github.io/sgfemassdante/
2. ✅ Card Dolce Paranoia NON deve essere visibile
3. ✅ Solo "Appuntamenti del Giorno" e form visibili

### Test 2: Card Visibile con Dolce Paranoia
1. Seleziona tipo messaggio: "Dolce Paranoia"
2. ✅ Card appare sotto "Appuntamenti del Giorno"
3. ✅ Lista lead (se ci sono) o "Nessun promemoria necessario"

### Test 3: Card si Nasconde
1. Cambia tipo messaggio a "Primo Messaggio"
2. ✅ Card Dolce Paranoia scompare

### Test 4: Filtro Lead (Regola >= 2 giorni)
**Scenario**: Oggi = 21 gennaio
- Lead A: messaggio 21 gen → appuntamento 26 gen (5 giorni) → ✅ **MOSTRA**
- Lead B: messaggio 21 gen → appuntamento 23 gen (2 giorni) → ✅ **MOSTRA**
- Lead C: messaggio 21 gen → appuntamento 22 gen (1 giorno) → ❌ **NON MOSTRARE**

### Test 5: UI Scrollabile
1. Se ci sono 10+ lead, la lista deve avere scrollbar verticale
2. Max-height: 300px
3. ✅ Scroll fluido

---

## 🔗 LINK UTILI

### 📥 Download
- **Backup v2.5.1**: https://8080-imm9bzus7g92hre3dkutv-d0b9e1e2.sandbox.novita.ai/TESTmess_v2.5.1_DOLCE_PARANOIA_FIX.tar.gz

### 🌐 Sito
- **Produzione**: https://dantemanonquello.github.io/sgfemassdante/
- **Repository**: https://github.com/DanteManonquello/sgfemassdante

---

## 📝 CHANGELOG COMPLETO

Vedi: `CHANGELOG_v2.5.1.md`

---

## ⚠️ IMPORTANTE: TOKEN GITHUB

**Il token fornito è scaduto o non valido.**

Per fare il push automatico:
1. Vai su: https://github.com/settings/tokens
2. Genera un nuovo token con permessi `repo`
3. Usa il nuovo token per il push

Oppure:
- Scarica il backup
- Fai push manuale da locale

---

## 🆘 TROUBLESHOOTING

### Problema: Card non appare
**Soluzione**: Assicurati di aver selezionato "Dolce Paranoia" dal dropdown

### Problema: Lista vuota
**Soluzione**: 
1. Verifica di aver fatto login Google
2. Verifica di aver sincronizzato il calendario
3. Verifica che ci siano lead con >= 2 giorni di anticipo

### Problema: Lista troppo lunga
**Soluzione**: OK! È normale, la lista scrolla automaticamente

### Problema: Lead non appare
**Soluzione**: 
- Verifica che il lead abbia almeno 1 "primo_messaggio" inviato
- Verifica che la differenza tra data messaggio e data appuntamento sia >= 2 giorni

---

## 📞 SUPPORTO

Per problemi o domande:
- GitHub Issues: https://github.com/DanteManonquello/sgfemassdante/issues
- Changelog: `CHANGELOG_v2.5.1.md`

---

**Fine Deployment Guide v2.5.1** 🎉
