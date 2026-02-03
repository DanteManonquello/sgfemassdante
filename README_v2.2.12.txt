========================================================================
TESTmess v2.2.12 - CHANGELOG
========================================================================

🔧 FIX COMPLETATI:

1. ✅ TEMPLATE MESSAGGIO RIPRISTINATO
   - Template default "Primo Messaggio" ora carica SEMPRE
   - Storage: SOLO localStorage per templates (non Drive)
   - Problema risolto: dropdown vuoto su homepage

2. ✅ FOTO PROFILO GOOGLE FUNZIONANTE
   - Scope OAuth già include userinfo.profile
   - getUserInfo() tenta recupero da People API
   - Fallback OAuth userinfo se photo vuoto
   - Mostra foto reale O iniziale nome (cerchio blu)

3. ✅ NOMI EVENTI CAPITALIZZATI
   - "MARIO ROSSI" → "Mario Rossi"
   - "mario rossi" → "Mario Rossi"
   - Funzione capitalizzazione applicata automaticamente
   - Funziona per: Dropdown lead + Campi Nome/Cognome

========================================================================
MODIFICHE TECNICHE:
========================================================================

js/main.js:
- getStorageItem(): TEMPLATES sempre localStorage (non Drive)
- setStorageItem(): TEMPLATES sempre localStorage (non Drive)
- Garantisce caricamento template anche senza login Google

js/google-calendar.js:
- extractNameFromEvent(): aggiunta capitalizzazione finale
- Pattern: toLowerCase() → split(' ') → capitalize first letter
- Formato: "Prima Lettera Maiuscola Per Ogni Parola"

js/google-auth.js:
- Nessuna modifica (già corretto)
- Scope userinfo.profile presente
- getUserInfo() con fallback OAuth userinfo
- showUserInfo() mostra foto reale o iniziale

========================================================================
DEPLOYMENT NETLIFY:
========================================================================

STEP 1: Estrai webapp/
STEP 2: Drag & drop su Netlify
STEP 3: Configura Google OAuth
- Client ID: 432043907250-blb72vqc0nqm8rccoknfe29p4j5lbubr
- URL autorizzato: https://your-site.netlify.app

========================================================================
TEST CHECKLIST:
========================================================================

✅ Template "Primo Messaggio" visibile nel dropdown
✅ Dopo login: foto profilo Google caricata
✅ Se no foto: iniziale nome visibile (cerchio blu)
✅ Nomi da eventi: "MARIO ROSSI" → "Mario Rossi"
✅ Campi Nome/Cognome compilati correttamente
✅ Anteprima messaggio funziona

========================================================================
v2.2.12 - 2026-01-06
Autore: Dante
========================================================================
