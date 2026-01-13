================================================================================
TESTmess v2.2.22 - CHANGELOG
Data: 2026-01-06
================================================================================

✅ MODIFICHE UI - NOME OPERATORE E CALENDARIO:

1. Nome Operatore Pulito:
   - Header subtitle: Mostra solo primo nome (es. "Dante" invece di "Dante Davide")
   - Modifica: google-auth.js riga 435-440
   - Comportamento: Estrae automaticamente primo nome da Google profile

2. Calendario Visibile in Dropdown Lead:
   - Dropdown lead ora mostra: "HH:MM - Nome Cognome (Nome Calendario)"
   - Esempi: 
     * "10:00 - Mario Pizzatti (SG - Call consulenza)"
     * "15:00 - Stefano Benedetti (SG - Follow Up)"
     * "16:30 - Antonello Breggia (SG - Call interne)"
   - Modifica: google-calendar.js righe 238-251, 297-310
   
3. Supporto Calendario Aggiuntivo:
   - Aggiunto "SG - Call interne" ai calendari sincronizzati
   - Lista completa: 
     * SG - Call consulenza
     * SG - Call interne
     * SG - Follow Up
   - Modifica: google-calendar.js righe 67-71

================================================================================
COMPATIBILITÀ E SICUREZZA:

✅ Parsing Nome NON Influenzato:
   - Il calendario tra parentesi non viene parsato
   - fillFormFromEvent() usa extractNameFromEvent() direttamente
   - Salvataggio contatti funziona correttamente (solo nome pulito)
   
✅ Funzionalità Preservate:
   - Auto-compilazione form da lead calendario
   - Generazione messaggi WhatsApp
   - Salvataggio cronologia
   - Marcatura lead contattati
   - Integrazione Google Calendar/Auth

✅ Event Listener Sicuri:
   - selectLead.addEventListener usa dataset.eventData
   - Nessun parsing di textContent della dropdown

================================================================================
FILE MODIFICATI:
1. google-auth.js - Estrazione primo nome da userInfo.name
2. google-calendar.js - Display calendario in dropdown + supporto "SG - Call interne"
3. config.js - Versione 2.2.22
4. index.html - Title + header + query params versione

FILE NON MODIFICATI (preservati):
- main.js
- google-drive-storage.js
- google-sheets-assistenti.js
- templates.js
- nomi-italiani.js
- style.css

================================================================================
DEPLOYMENT:
- Deploy su: https://massaggiatore.netlify.app/
- File backup: TESTmess_v2.2.22_backup.tar.gz

================================================================================
