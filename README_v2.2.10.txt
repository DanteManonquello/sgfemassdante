================================================================================
  TESTmess v2.2.12 - CHANGELOG
================================================================================

DATA RILASCIO: 2025-01-06

🔧 MODIFICHE:
=============

1. ✅ TEMPLATE MESSAGGI - FIX CARICAMENTO
   - Template default ora carica SEMPRE (anche senza login Google)
   - Fallback localStorage per templates
   - Fix: template "Primo Messaggio" visibile da subito

2. ✅ APPUNTAMENTI GIORNO DEFAULT - AUTO-LOAD
   - Dopo login Google: carica automaticamente appuntamenti di oggi
   - Sync calendari configurati
   - Popola dropdown "Seleziona Lead" automaticamente
   - Data picker impostata su oggi

COMPORTAMENTO:
==============

PRIMA DEL LOGIN:
- ✅ Template messaggi: funzionante (localStorage)
- ❌ Cronologia: non disponibile
- ❌ Calendario: non disponibile

DOPO IL LOGIN GOOGLE:
- ✅ Template messaggi: sincronizzati su Drive
- ✅ Cronologia: salvata su Drive
- ✅ Calendario: sync automatico
- ✅ Appuntamenti oggi: caricati automaticamente nel dropdown

FUNZIONALITÀ AUTO-LOAD:
========================

Dopo login, automaticamente:
1. Sync calendari configurati
2. Carica eventi di oggi
3. Popola dropdown "Seleziona Lead"
4. Imposta data picker su oggi
5. Template pronti per l'uso

FILE MODIFICATI:
================

1. js/main.js
   - Storage wrapper: fallback localStorage per TEMPLATES
   - getStorageItem: supporta templates senza login
   - setStorageItem: salva templates anche locale

MIGRAZIONE DA v2.2.9:
======================

✅ AUTOMATICA - ZERO AZIONI RICHIESTE

- Template esistenti: mantenuti
- Cronologia: mantenuta su Drive
- Calendari: configurazione mantenuta

TESTING:
========

Test 1: Template senza login
- Apri app SENZA login
- Verifica dropdown "Tipo Messaggio" = "Primo Messaggio"
- Compila form
- ✅ Anteprima funziona

Test 2: Calendario dopo login
- Login con Google
- Verifica dropdown "Seleziona Lead" popolato
- Data = oggi
- ✅ Lead di oggi visibili

Test 3: Template sync Drive
- Login con Google
- Crea nuovo template custom
- Logout + login
- ✅ Template custom presente

DEPLOY NETLIFY:
===============

✅ PRONTO PER DEPLOY

1. Estrai webapp/ da archivio
2. Drag & drop su Netlify
3. Configura URL su Google Console
4. Test completo

================================================================================
