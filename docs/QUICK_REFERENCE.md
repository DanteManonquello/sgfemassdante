# TESTmess - Quick Reference Guide

**DOCUMENTO DI RIFERIMENTO RAPIDO**  
**Versione:** 2.2.6  
**Data:** 2026-01-06

---

## 📌 COMANDI RAPIDI

### Leggere lo Stato del Progetto
```
"Leggi il file REQUIREMENTS_SPECIFICATIONS.md e dimmi lo stato del progetto"
```

### Riprendere il Lavoro
```
"Carica /home/user/webapp e leggi REQUIREMENTS_SPECIFICATIONS.md. 
Quali funzionalità sono complete e cosa dobbiamo implementare?"
```

### Implementare una Funzione
```
"Implementa la Funzione [numero] seguendo le specifiche in REQUIREMENTS_SPECIFICATIONS.md"
```

---

## 🎯 FUNZIONALITÀ DEL PROGETTO

### ✅ Funzione 1: Modifica Eventi Google Calendar
**Obiettivo:** Ricevere dati lead da Zapier/AirTable e aggiornare descrizione evento Calendar

**Endpoint:** `POST /api/calendar/update-event`

**Cosa Serve:**
- Google Cloud Project con Calendar API abilitata
- OAuth2 credentials (client ID, secret, refresh token)
- Zapier webhook configurato

**Test:**
```bash
curl -X POST https://webapp.pages.dev/api/calendar/update-event \
  -H "Authorization: Bearer TOKEN" \
  -d '{"eventId":"...", "leadData":{...}}'
```

---

### ✅ Funzione 2: Creazione Bozze Email Automatiche
**Obiettivo:** Creare bozze Gmail con template e placeholders

**Endpoint:** `POST /api/email/create-draft`

**Cosa Serve:**
- Gmail API abilitata (stesso progetto Google Cloud)
- Database D1 con tabella `email_templates`
- Template con placeholders tipo `{{nome}}`, `{{telefono}}`

**Test:**
```bash
curl -X POST https://webapp.pages.dev/api/email/create-draft \
  -d '{"destinatario":"test@email.com", "templateId":1, "datiLead":{...}}'
```

---

### ✅ Funzione 3: Gestione Allegati Email
**Obiettivo:** Upload, storage e allegati nelle email

**Endpoint:** 
- `POST /api/attachments/upload` - Carica file
- `GET /api/attachments/:id/download` - Scarica file
- `DELETE /api/attachments/:id` - Elimina file

**Cosa Serve:**
- Cloudflare R2 bucket configurato
- Database D1 con tabella `allegati`
- Gestione file > 10MB con signed URL

**Test:**
```bash
# Upload
curl -X POST https://webapp.pages.dev/api/attachments/upload \
  -F "file=@documento.pdf" -F "categoria=preventivo"

# Bozza con allegato
curl -X POST https://webapp.pages.dev/api/email/create-draft \
  -d '{"destinatario":"test@email.com", "oggetto":"Test", "corpo":"...", "allegatoIds":[1]}'
```

---

### ✅ Funzione 4: Template con Allegati Default
**Obiettivo:** Associare allegati automatici ai template email

**Endpoint:**
- `POST /api/templates/:id/attachments` - Associa allegati
- `GET /api/templates/:id/attachments` - Lista allegati template
- `PUT /api/templates/:id/attachments/reorder` - Riordina
- `DELETE /api/templates/:id/attachments/:attachmentId` - Rimuovi

**Cosa Serve:**
- Database D1 con tabella `template_allegati`
- UI drag & drop per riordinare
- Logica automatica: template → allegati default

**Test:**
```bash
# Associa allegati a template
curl -X POST https://webapp.pages.dev/api/templates/1/attachments \
  -d '{"allegatoIds":[1,3,5]}'

# Crea bozza da template (allegati automatici)
curl -X POST https://webapp.pages.dev/api/email/create-draft \
  -d '{"destinatario":"test@email.com", "templateId":1, "datiLead":{...}}'
```

---

## 🗄️ DATABASE SCHEMA (Cloudflare D1)

```sql
-- Template email
CREATE TABLE email_templates (
  id INTEGER PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  oggetto TEXT NOT NULL,
  corpo TEXT NOT NULL,
  allegato_default_id INTEGER
);

-- Allegati
CREATE TABLE allegati (
  id INTEGER PRIMARY KEY,
  nome_file TEXT NOT NULL,
  tipo_mime TEXT NOT NULL,
  dimensione INTEGER NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,
  categoria TEXT
);

-- Associazioni template-allegati (multipli)
CREATE TABLE template_allegati (
  id INTEGER PRIMARY KEY,
  template_id INTEGER NOT NULL,
  allegato_id INTEGER NOT NULL,
  ordine INTEGER DEFAULT 1,
  UNIQUE(template_id, allegato_id)
);

-- Tracking email create
CREATE TABLE email_allegati (
  id INTEGER PRIMARY KEY,
  draft_id TEXT NOT NULL,
  allegato_id INTEGER NOT NULL
);

-- Analytics
CREATE TABLE analytics (
  id INTEGER PRIMARY KEY,
  event_type TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔑 ENVIRONMENT VARIABLES

### Development (.dev.vars)
```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REFRESH_TOKEN=your-refresh-token
WEBHOOK_SECRET=generate-random-secure-string
GOOGLE_CALENDAR_ID=primary
```

### Production (Cloudflare Secrets)
```bash
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put GOOGLE_REFRESH_TOKEN
npx wrangler secret put WEBHOOK_SECRET
```

---

## 🚀 DEPLOYMENT WORKFLOW

### 1. Setup Iniziale
```bash
cd /home/user/webapp

# Inizializza git
git init
git add .
git commit -m "Initial commit"

# Installa dipendenze
npm install
```

### 2. Configurazione Database
```bash
# Crea database production
npx wrangler d1 create webapp-production

# Crea bucket R2
npx wrangler r2 bucket create testmess-attachments

# Applica migrations
npx wrangler d1 migrations apply webapp-production --local  # test locale
npx wrangler d1 migrations apply webapp-production          # production
```

### 3. Configurazione Secrets
```bash
# Locale
echo "GOOGLE_CLIENT_ID=xxx" >> .dev.vars
echo "GOOGLE_CLIENT_SECRET=xxx" >> .dev.vars
echo "GOOGLE_REFRESH_TOKEN=xxx" >> .dev.vars
echo "WEBHOOK_SECRET=xxx" >> .dev.vars

# Production
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put GOOGLE_REFRESH_TOKEN
npx wrangler secret put WEBHOOK_SECRET
```

### 4. Test Locale
```bash
# Build
npm run build

# Start con PM2
pm2 start ecosystem.config.cjs

# Test
curl http://localhost:3000/api/health
```

### 5. Deploy Production
```bash
# Build production
npm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy dist --project-name webapp

# Applica migrations production
npx wrangler d1 migrations apply webapp-production

# Test production
curl https://webapp.pages.dev/api/health
```

---

## 📊 TESTING CHECKLIST

### Funzione 1: Calendar
- [ ] OAuth2 configurato e funzionante
- [ ] Endpoint update-event risponde
- [ ] Test con evento reale su Google Calendar
- [ ] Descrizione evento aggiornata correttamente
- [ ] Gestione errori (token scaduto, evento non trovato)

### Funzione 2: Email
- [ ] Gmail API configurata
- [ ] Database template popolato
- [ ] Placeholders sostituiti correttamente
- [ ] Bozza creata su Gmail
- [ ] UI gestione template funzionante

### Funzione 3: Allegati
- [ ] R2 bucket configurato
- [ ] Upload file < 10MB
- [ ] Upload file > 10MB (signed URL)
- [ ] Download allegati
- [ ] Bozza email con allegati
- [ ] UI gestione allegati

### Funzione 4: Template + Allegati
- [ ] Associazione template-allegati
- [ ] Drag & drop riordinamento
- [ ] Bozza da template include allegati automaticamente
- [ ] Dashboard riepilogativa
- [ ] Test end-to-end completo

---

## 🔧 TROUBLESHOOTING COMUNI

### "Invalid credentials" Google API
```bash
# Verifica secrets
npx wrangler secret list

# Rigenera refresh token su OAuth Playground
# https://developers.google.com/oauthplayground
```

### "File too large" (> 10MB)
Usare signed URL per upload diretto a R2 (vedi sezione 3.8 del documento completo)

### Webhook Zapier non funziona
```bash
# Test endpoint
curl -X POST https://webapp.pages.dev/api/calendar/update-event \
  -H "Authorization: Bearer YOUR_SECRET" \
  -d '{"eventId":"test","leadData":{...}}'

# Verifica logs
npx wrangler tail
```

### Database vuoto
```bash
# Verifica dati
npx wrangler d1 execute webapp-production --local \
  --command="SELECT * FROM email_templates"

# Inserisci dati esempio
npx wrangler d1 execute webapp-production --local \
  --file=./seed_templates.sql
```

---

## 📁 STRUTTURA PROGETTO

```
/home/user/webapp/
├── docs/
│   ├── REQUIREMENTS_SPECIFICATIONS.md  ← Documento completo
│   ├── REQUIREMENTS_SPECIFICATIONS.pdf  ← Versione PDF
│   └── QUICK_REFERENCE.md              ← Questa guida
├── src/
│   ├── index.tsx
│   ├── routes/
│   │   ├── calendar.ts     (Funzione 1)
│   │   ├── email.ts        (Funzione 2)
│   │   ├── attachments.ts  (Funzione 3)
│   │   └── templates.ts    (Funzione 4)
│   ├── services/
│   │   ├── google-auth.ts
│   │   ├── google-calendar.ts
│   │   └── gmail.ts
│   └── utils/
│       ├── placeholders.ts
│       ├── mime.ts
│       └── validation.ts
├── migrations/
│   ├── 0001_initial_schema.sql
│   ├── 0002_email_templates.sql
│   ├── 0003_allegati.sql
│   └── 0004_template_allegati.sql
├── public/static/
│   ├── app.js
│   └── styles.css
├── wrangler.jsonc
├── package.json
└── README.md
```

---

## 🎓 WORKFLOW IMPLEMENTAZIONE

### Quando Inizi una Nuova Sessione
1. Carica cartella `/home/user/webapp`
2. Leggi `docs/REQUIREMENTS_SPECIFICATIONS.md`
3. Controlla sezione "STATO IMPLEMENTAZIONE"
4. Identifica funzione da implementare

### Durante l'Implementazione
1. Lavora su UNA funzione alla volta
2. Segui le specifiche del documento completo
3. Testa localmente prima di procedere
4. Fai commit git frequenti
5. Aggiorna STATO IMPLEMENTAZIONE

### Dopo il Completamento
1. Testa tutte le funzionalità
2. Aggiorna README.md
3. Aggiorna REQUIREMENTS_SPECIFICATIONS.md
4. Fai commit finale
5. Deploy su Cloudflare Pages

---

## 📞 CONFIGURAZIONE ZAPIER

### Zap 1: Lead → Google Calendar
```
Trigger: New record in AirTable (Leads)
Action: Webhooks by Zapier
  URL: https://webapp.pages.dev/api/calendar/update-event
  Method: POST
  Headers: Authorization: Bearer {WEBHOOK_SECRET}
  Body: {
    "eventId": "{{Calendar Event ID}}",
    "leadData": {
      "nome": "{{Name}}",
      "telefono": "{{Phone}}",
      "email": "{{Email}}",
      "note": "{{Notes}}",
      "fonte": "{{Source}}"
    }
  }
```

### Zap 2: Lead → Gmail Draft
```
Trigger: New record in AirTable (Leads)
Action: Webhooks by Zapier
  URL: https://webapp.pages.dev/api/email/create-draft
  Method: POST
  Headers: Authorization: Bearer {WEBHOOK_SECRET}
  Body: {
    "destinatario": "{{Email}}",
    "templateId": 1,
    "datiLead": {
      "nome": "{{Name}}",
      "telefono": "{{Phone}}",
      "data": "{{Data Appuntamento}}",
      "note": "{{Notes}}"
    }
  }
```

---

## 🔐 SICUREZZA

### Cosa NON Committare su Git (.gitignore)
```
node_modules/
.env
.dev.vars
.wrangler/
dist/
*.log
.DS_Store
```

### Secrets da Configurare
- `GOOGLE_CLIENT_ID` - Da Google Cloud Console
- `GOOGLE_CLIENT_SECRET` - Da Google Cloud Console
- `GOOGLE_REFRESH_TOKEN` - Da OAuth Playground
- `WEBHOOK_SECRET` - Generare stringa random sicura

### Best Practices
- Mai esporre secrets nel codice
- Usare `.dev.vars` per locale
- Usare `wrangler secret` per production
- Validare sempre input webhook
- Implementare rate limiting

---

## 📈 METRICHE DA MONITORARE

```sql
-- Eventi ultimi 7 giorni per tipo
SELECT event_type, COUNT(*) as total, 
       SUM(CASE WHEN success THEN 1 ELSE 0 END) as successes
FROM analytics 
WHERE created_at > datetime('now', '-7 days')
GROUP BY event_type;

-- Errori recenti
SELECT * FROM analytics 
WHERE success = 0 
ORDER BY created_at DESC 
LIMIT 10;

-- Template più usati
SELECT t.nome, COUNT(*) as utilizzi
FROM email_templates t
JOIN email_allegati ea ON ea.draft_id LIKE '%'
WHERE ea.created_at > datetime('now', '-30 days')
GROUP BY t.id
ORDER BY utilizzi DESC;
```

---

## ✅ COMPLETION CHECKLIST

### Prima di Considerare il Progetto Completo
- [ ] Tutte e 4 le funzioni implementate e testate
- [ ] Database migrations applicate (local + production)
- [ ] Tutti i secrets configurati (local + production)
- [ ] UI completa e responsive
- [ ] Test end-to-end completati
- [ ] Integrazione Zapier configurata e testata
- [ ] README.md aggiornato
- [ ] Documentazione API completa
- [ ] Deployment production completato
- [ ] Monitoring attivo

---

**FINE QUICK REFERENCE**

Per dettagli completi, consulta: `REQUIREMENTS_SPECIFICATIONS.md` (46KB)  
Per versione PDF, vedi: `REQUIREMENTS_SPECIFICATIONS.pdf` (216KB, 38 pagine)

*Ultimo aggiornamento: 2026-01-06*
