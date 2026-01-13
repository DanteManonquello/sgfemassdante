================================================================================
TESTmess v2.2.25 - Calendario Multi-Calendario + Eventi Passati
================================================================================

🔧 MODIFICHE PRINCIPALI (v2.2.25):
-----------------------------------

✅ EVENTI PASSATI (ULTIMI 90 GIORNI):
   - PRIMA: Solo eventi futuri (da oggi +30 giorni)
   - DOPO: Ultimi 90 giorni + prossimi 30 giorni
   - RANGE TOTALE: 120 giorni di eventi disponibili
   - Puoi vedere e ricontattare lead passati

✅ MULTI-CALENDARIO AUTOMATICO:
   - PRIMA: Solo 3 calendari hardcodati ("SG - Call consulenza", etc.)
   - DOPO: TUTTI i calendari automaticamente
   - FILTRO INTELLIGENTE: Prende calendari con pattern:
     * Iniziano con "SG -"
     * Contengono "Lead"
     * Contengono "Call"
     * Contengono "Follow"
   - Se aggiungi nuovi calendari, vengono inclusi automaticamente

✅ INDICATORE CALENDARIO NEL DROPDOWN:
   - Format: "HH:MM - Nome Cognome (Nome Calendario)"
   - Esempio: "15:00 - Mario Rossi (SG - Call consulenza)"
   - Sai sempre da quale calendario proviene il lead

✅ VERSIONING COMPLETO:
   - google-calendar.js: v2.2.25
   - google-auth.js: v2.2.25
   - config.js: v2.2.25
   - main.js: v2.2.25
   - index.html: v2.2.25

📋 PROBLEMI RISOLTI:
--------------------

1. ❌ PRIMA: Non vedevi lead dei giorni passati
   ✅ DOPO: Puoi selezionare qualsiasi giorno negli ultimi 90 giorni

2. ❌ PRIMA: Se rinominavi un calendario, smetteva di funzionare
   ✅ DOPO: Prende TUTTI i calendari con pattern corretto

3. ❌ PRIMA: Dovevi aggiornare manualmente il codice per nuovi calendari
   ✅ DOPO: Nuovi calendari vengono inclusi automaticamente

4. ❌ PRIMA: Non sapevi da quale calendario proveniva un lead
   ✅ DOPO: Vedi "(Nome Calendario)" accanto a ogni lead

🔍 CALENDARIO CARICATI AUTOMATICAMENTE:
----------------------------------------
Il sistema ora carica TUTTI i calendari che matchano questi pattern:

✓ Iniziano con "SG -"
  - SG - Call consulenza
  - SG - Call interne
  - SG - Follow Up
  - SG - [qualsiasi altro calendario]

✓ Contengono "Lead"
  - Lead Qualificati
  - Lead Caldi
  - [qualsiasi calendario con "Lead" nel nome]

✓ Contengono "Call" o "Follow"
  - Team Call
  - Follow Up Settimanale
  - [etc.]

⚠️ FUNZIONI NON TOCCATE:
------------------------
✅ Salvataggio contatti in Google Contacts
✅ Parsing intelligente Nome/Cognome
✅ Auto-detect Servizio e Società
✅ Estrazione setter da evento
✅ Rilevazione genere setter
✅ Tutte le funzioni di generazione messaggi

🧪 TEST:
--------
1. Loga con Google su: https://dantemanonquello.github.io/sgfemassdante/
2. Clicca "Sincronizza Calendario"
3. Apri Console (F12) e verifica:
   ✅ Trovati X calendari totali
   ✅ Trovati Y calendari SG: ["SG - Call consulenza", ...]
   ✅ Totale eventi ricevuti: Z (dovrebbe essere molto più alto ora!)
4. Nel dropdown "Seleziona giorno":
   - Seleziona un giorno passato (es. 3 giorni fa)
   - Verifica che compaiano lead di quel giorno
5. Nel dropdown "Seleziona lead":
   - Verifica formato: "HH:MM - Nome Cognome (Nome Calendario)"

📊 ESEMPIO OUTPUT CONSOLE:
--------------------------
```
📅 Caricamento eventi calendario...
🔍 Caricamento lista calendari...
✅ Trovati 8 calendari totali
✅ Trovati 5 calendari SG: ["SG - Call consulenza", "SG - Call interne", 
    "SG - Follow Up", "SG - Lead Caldi", "Team Call"]
🔎 Richiesta eventi da 2025-10-15 a 2026-02-12 (90 gg passati + 30 futuri)
📥 Scaricamento eventi da: SG - Call consulenza
  ✅ 23 eventi trovati in "SG - Call consulenza"
📥 Scaricamento eventi da: SG - Call interne
  ✅ 15 eventi trovati in "SG - Call interne"
...
✅ Totale eventi ricevuti: 87
```

🚀 DEPLOY:
----------
git push origin main

GitHub Pages si aggiornerà in 1-2 minuti.

================================================================================
