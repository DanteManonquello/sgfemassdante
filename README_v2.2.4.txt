================================================================================
  TESTmess v2.2.4 - CHANGELOG
================================================================================

DATA RILASCIO: 2026-01-06

--------------------------------------------------
MODIFICHE IMPLEMENTATE
--------------------------------------------------

1. FORMATTAZIONE NOME E COGNOME
   ✅ I campi nome e cognome ora vengono automaticamente formattati con 
      la prima lettera maiuscola (es: "mario rossi" → "Mario Rossi")
   ✅ La formattazione avviene in tempo reale mentre l'utente digita
   ✅ Funziona anche con nomi composti (es: "de luca" → "De Luca")
   
2. SOSTITUZIONE "by Utente" → "Dante"
   ✅ Quando l'utente non è autenticato con Google, il nome visualizzato 
      è ora "Dante" invece di "Utente"
   ✅ Il messaggio nell'header mostra "by Dante" di default
   
3. AGGIORNAMENTO VERSIONE
   ✅ Versione aggiornata a 2.2.4 in:
      - index.html (titolo pagina)
      - index.html (header visibile)
      - js/main.js (commento header)
      - js/main.js (console log)

--------------------------------------------------
FILE MODIFICATI
--------------------------------------------------

• index.html
  - Riga 6: Titolo aggiornato a v2.2.4
  - Riga 66: Header visibile aggiornato a v2.2.4

• js/google-auth.js
  - Riga 342: Fallback nome utente da "Utente" a "Dante"
  - Riga 348: Fallback nome utente da "Utente" a "Dante"

• js/main.js
  - Riga 3: Versione aggiornata a v2.2.4
  - Riga 15: Console log aggiornato a v2.2.4
  - Righe 102-109: Capitalizzazione nome/cognome (GIÀ PRESENTE)
  - Righe 167-174: Funzione capitalizeWords (GIÀ PRESENTE)

--------------------------------------------------
FUNZIONI NON MODIFICATE
--------------------------------------------------

❌ NULLA rimosso
✅ Tutte le funzionalità esistenti preservate
✅ Capitalizzazione nome/cognome era già implementata correttamente

--------------------------------------------------
NOTE TECNICHE
--------------------------------------------------

La funzione capitalizeWords() era già presente nel codice dalla versione 
precedente e funzionava correttamente. Le modifiche si sono concentrate 
solo sulla sostituzione del testo "Utente" con "Dante" e l'aggiornamento 
della versione.

La formattazione capitalizzata viene applicata:
- In tempo reale durante la digitazione nei campi nome/cognome
- Automaticamente al caricamento dei dati salvati
- Su ogni parola separata da spazio (supporto nomi composti)

--------------------------------------------------
COMPATIBILITÀ
--------------------------------------------------

✅ Compatibile con tutte le versioni precedenti
✅ Nessuna migrazione dati necessaria
✅ LocalStorage completamente compatibile
✅ Funziona su tutti i browser moderni

================================================================================
