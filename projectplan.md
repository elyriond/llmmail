🧩 Projektname

LLM-Mail – LLM-gesteuerter E-Mail-Editor für Mapp Engage

🎯 Ziel

Ein interaktives Web-Tool, das Mapp Engage-Nutzern ermöglicht, durch natürliche Sprache (Prompting) E-Mail-Kampagnen zu erstellen:

Nutzer beschreibt gewünschte Mail + lädt Bild oder URL hoch

System generiert Vorschau (HTML-E-Mail, responsiv, alle Clients-kompatibel)

Nutzer kann Look & Feel-Vorlagen speichern

Automatische Integration von Mapp-Platzhaltern

Text, Bild und HTML werden über OpenAI API generiert

UI im Stil von Lovable (Chat + Preview/Code-Toggle)

🏗 Architekturüberblick
1. Frontend (React + Tailwind)

Chatfenster (links)

Preview / Code-Toggle (rechts)

Look & Feel-Manager (Farben, Logo, Fonts)

Template-Picker (alte Vorlagen importieren)

Eingabe-Modul für URL / Beschreibung / Bild

2. Backend (Node.js + Express / FastAPI + Python möglich)

Session Management

API-Proxy zu OpenAI API

Kommunikation mit Mapp Engage API (Templates, Platzhalter)

HTML-Validator (z. B. MJML oder Postmark email tester)

Look & Feel Cache (z. B. MongoDB)

3. LLM-Pipeline

Prompt-Builder für:

Textgenerierung (Betreff, Body, CTA)

HTML-Mail-Code

Inline-CSS-Kompatibilität

Bild-Generierung (OpenAI Image API)

Einbettung von Mapp-Platzhaltern ({{user.firstname}}, {{product.name}}, etc.)

4. Data / Config

lookandfeel.json (pro Kunde)

Template-Repository (alte Vorlagen, in DB oder Datei)

Mapp-API-Dokumentation eingebunden ins Prompting

📅 Projektplan (4–6 Sprints)
Sprint 1 – Setup & Architektur

Ziel: Basis für App + LLM-Integration

✅ Projektstruktur via Gemini CLI generieren

✅ Setup: React + Tailwind + Vite / Next.js

✅ Backend-Skeleton (Node.js / FastAPI)

✅ Verbindung zur OpenAI API (Text + Image)

✅ Dummy-Frontend mit Chat links / Preview rechts

✅ GitHub CI/CD-Pipeline

Deliverable:
Läuft lokal: User kann Eingabe machen, Dummy-Antwort im Chat & Preview-Box.

Sprint 2 – Prompt Engine & Template Logik

Ziel: Dynamische LLM-Prompt-Erstellung

Prompt-Builder-Service (Text, HTML, Bilder)

Integration von Mapp-Dokumentation (Platzhalter, Variablen)

Dynamischer Prompt-Zusammenbau:
„Erstelle E-Mail für X mit diesen Look & Feel-Parametern …“

Template-Import-Funktion (alte Mapp-Templates)

Datenmodell für Templates in DB

Deliverable:
Erster echter HTML-E-Mail-Entwurf mit generiertem Text + Platzhaltern.

Sprint 3 – Look & Feel Manager

Ziel: Branding und Corporate Design automatisieren

URL-Parser: Farben / Logo aus Homepage extrahieren (z. B. color-thief, favicon-grabber)

Fallback: Nutzer lädt Bild / gibt Beschreibung ein

Speicherung im lookandfeel.json

UI-Formular zum Bearbeiten (Farben, Fonts, Logos)

Übergabe der Look-Parameter in Prompt

Deliverable:
Branding fließt automatisch in generierte E-Mails ein.

Sprint 4 – Preview & Code-View

Ziel: Live-Vorschau, Validierung & Export

Toggle-Ansicht: „Preview“ vs. „HTML Code“

MJML-Validator oder juice Lib für Inline-CSS

Responsiveness-Check (Desktop, Mobile)

Export-Option: Download HTML / Upload to Mapp Engage

Quick-edit: Nutzer kann Text im Chat ändern → Live-Update im Preview

Deliverable:
Komplette interaktive Preview-/Editor-Umgebung.

Sprint 5 – Integration mit Mapp Engage

Ziel: Template-Management & Datenbindung

Auth mit Mapp API (OAuth2)

Fetch / Save Templates

Liste aller Platzhalter aus Mapp-Docs importieren

Mapping UI für benutzerdefinierte Variablen

„Publish to Mapp“-Button im Editor

Deliverable:
E-Mail kann direkt in Mapp Engage publiziert werden.

Sprint 6 – Testing, QA & Cross-Client Validation

Ziel: Perfekte Darstellung in allen Clients

HTML-Testing mit Email on Acid / Litmus API oder Open-Source Validator

A/B-Test-Modul (optional)

Usability-Test der Prompting-Flows

Performance & Security Review

Deployment auf Staging + Production

Deliverable:
Produktionsreife App.

⚙️ Tech Stack Übersicht
Layer	Technologien
Frontend	React + Tailwind + Vite/Next.js, Zustand oder Redux, shadcn/ui
Backend	Node.js (Express) oder FastAPI, OpenAI SDK, MJML
Daten	MongoDB oder PostgreSQL
Auth	OAuth2 (Mapp Engage), JWT
LLM	OpenAI GPT-4o / GPT-4-Turbo, DALL-E 3
Hosting	Vercel / Render + Railway / AWS
Testing	Jest, Playwright, Email Preview Validator
🔄 Beispiel-Flow (User Journey)

Nutzer öffnet Editor

Chat: „Ich will eine Halloween-Promo-Mail mit Rabattcode“

LLM fragt ggf. nach Look & Feel (oder nutzt gespeicherte Werte)

User gibt URL → App zieht Farben/Logo

OpenAI generiert:

Text (Betreff, Body)

passendes Bild (DALL-E)

HTML-Template mit Inline-CSS

Preview rechts zeigt Mail (Desktop/Mobile)

User toggelt zu Code-Ansicht

Speichern → Template landet via API in Mapp Engage

📁 Verzeichnisstruktur (Empfehlung)
mappmail/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── utils/
│   └── public/
├── backend/
│   ├── routes/
│   ├── services/
│   ├── models/
│   └── utils/
├── prompts/
│   ├── text_generation.md
│   ├── html_generation.md
│   ├── image_generation.md
│   └── lookfeel_parser.md
└── docs/
    ├── Mapp_API_reference/
    ├── openai_usage.md
    └── architecture.md

🧠 Nächste Schritte

✅ Projektgrundgerüst via Gemini CLI init

🔧 Setze OpenAI API key + Mapp API credentials

🧩 Implementiere Chat-UI mit Dummy-LLM-Antwort

🚀 Danach: Prompt-Builder + Template-Generator entwickeln