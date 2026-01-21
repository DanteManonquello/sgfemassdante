================================================================================
TESTmess v2.2.13 - Sistema Apprendimento Genere Assistenti con Google Sheets
================================================================================

📅 Data Rilascio: 6 Gennaio 2026

🆕 NOVITÀ PRINCIPALI
====================

1️⃣ Sistema di Apprendimento Genere Assistenti
   ✨ NUOVO: Quando accedi con Google, l'app chiede automaticamente se 
      l'assistente (il tuo nome) è maschio o femmina
   ✨ La scelta viene salvata su Google Sheets condiviso
   ✨ La prossima volta che accedi, il genere viene riconosciuto automaticamente
   ✨ Il sistema imposta automaticamente il toggle "Maschio/Femmina" nel form
   ✨ Cache locale 24h per velocizzare le operazioni

2️⃣ Integrazione Google Sheets API
   📊 Nuovo modulo: js/google-sheets-assistenti.js
   📊 Foglio condiviso: "AssistentiGenere" con colonne Nome | Genere
   📊 Sincronizzazione automatica con cache locale

🔧 MODIFICHE TECNICHE
======================

File Modificati:
- index.html: Aggiunto script google-sheets-assistenti.js, versione 2.2.13
- js/google-sheets-assistenti.js: NUOVO modulo per gestione genere assistenti
- js/google-auth.js: Aggiunta funzione checkAndSaveOperatorGender()
- js/main.js: Caricamento cache assistenti all'avvio

Funzioni Aggiunte:
- window.AssistentiGender.check(nome) → Controlla genere da cache/Sheets
- window.AssistentiGender.save(nome, genere) → Salva su Sheets
- window.AssistentiGender.showPopup(nome, callback) → Mostra popup selezione
- window.AssistentiGender.loadAll() → Carica tutti gli assistenti in cache

📊 GOOGLE SHEETS SETUP
========================

ID Foglio: 1qHgIBHo1a_TW7mfFDkX2cjKDOKTlCJqKpfXjfLhZNNo
Nome Foglio: AssistentiGenere

Struttura:
+-----------------+--------+
| Nome            | Genere |
+-----------------+--------+
| Dante           | M      |
| Sofia           | F      |
| Marco           | M      |
+-----------------+--------+

🎯 FUNZIONAMENTO
=================

1. L'utente fa login con Google
2. google-auth.js chiama checkAndSaveOperatorGender(nomeOperatore)
3. Controlla se il genere è già salvato su Google Sheets
4. Se SÌ: imposta automaticamente il toggle M/F
5. Se NO: mostra popup per chiedere M/F
6. Salva la scelta su Google Sheets
7. Aggiorna cache locale (valida 24h)
8. Imposta automaticamente il toggle nel form

🚀 VANTAGGI
============

✅ Apprendimento automatico: una volta imparato, non chiede più
✅ Sincronizzazione cloud: funziona su tutti i dispositivi
✅ Cache locale: veloce anche offline (24h)
✅ UX migliorata: meno click, più velocità
✅ Scalabile: può memorizzare migliaia di nomi

📝 TEMPLATE MESSAGGIO
======================

✅ CONFERMATO: Il template è IDENTICO alla versione precedente
Template: '{BB} {NN}, sono {OPERATORE} di {SERVIZIO}. Hai avuto un colloquio 
con {YY} assistente e mi ha riferito che abbiamo un appuntamento {GG} alle 
{HH}. {VV} e, nel frattempo, ti invito a leggere il file che ti è stato 
inviato, è molto importante. Passa {TT}'

🔐 PERMESSI GOOGLE
===================

Scope richiesti:
- https://www.googleapis.com/auth/spreadsheets (Lettura/Scrittura Sheets)
- https://www.googleapis.com/auth/drive.appdata (Storage Drive)
- https://www.googleapis.com/auth/calendar.readonly (Lettura Calendario)
- https://www.googleapis.com/auth/contacts (Gestione Contatti)
- https://www.googleapis.com/auth/userinfo.profile (Profilo Utente)

📦 FILE INCLUSI
================

- index.html (v2.2.13)
- css/style.css
- js/config.js
- js/google-auth.js (v2.2.13 con gender check)
- js/google-drive-storage.js
- js/google-sheets-assistenti.js (NUOVO)
- js/google-calendar.js
- js/templates.js
- js/main.js (v2.2.13)
- js/nomi-italiani.js
- docs/ (documentazione completa)

🐛 BUG FIX
===========

Nessun bug fix in questa versione (focus solo su nuova feature)

⚠️ NOTE IMPORTANTI
===================

1. Il foglio Google Sheets è condiviso pubblicamente in lettura/scrittura
2. Cache locale scade dopo 24 ore, poi ricarica da Sheets
3. Se l'utente non è loggato, il sistema usa genere M (default)
4. Il popup appare solo la prima volta per ogni nuovo nome
5. La scelta genere imposta automaticamente il toggle nel form

🔄 COMPATIBILITÀ
=================

✅ Retrocompatibile con v2.2.12
✅ Non richiede migrazione dati
✅ Template messaggi invariati
✅ Storage Google Drive invariato

================================================================================
Per supporto o segnalazione bug, contatta lo sviluppatore.
================================================================================
