# LLM-Mail

An AI-powered email campaign generator. Describe your campaign, and the app scans your company website to learn your brand voice, then generates professional, on-brand HTML emails ready for platforms like Mapp Engage.

![LLM-Mail Interface](style.png)

## Features

- **🤖 AI-Powered Generation** - Describe your email campaign in natural language and get professional results.
- **🌐 Brand Profile Automation** - Scans your website to automatically learn your brand colors, fonts, logo, tone of voice, and more, ensuring all generated content is perfectly on-brand.
- **📧 Mapp Engage Ready** - Generates HTML with automatic support for Mapp placeholders (`<%\${user['FirstName']}%>`).
- **💾 Template Management** - Save, load, and reuse email campaigns.
- **👁 Live Preview** - See your email rendered in real-time as it's generated.
- **📱 Responsive Design** - All generated emails are mobile-first and tested across major email clients.
- **✏️ Editable Prompts** - Customize AI behavior by editing simple markdown files in the `/prompts` directory.

## Tech Stack

### Frontend
- **React 19** - UI library
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **Gemini API** - For website analysis and brand profile extraction.
- **OpenAI API** - For creative direction, content, and image generation (DALL-E 3).
- **SQLite** (better-sqlite3) - Database for storing brand profiles and templates.
- **Cheerio** - Server-side HTML parsing for technical analysis.

## Architecture

```
┌─────────────────┐         ┌──────────────────┐
│  React Frontend │────────▶│  Express Backend │
│  (Port 5173+)   │◀────────│   (Port 3000)    │
└─────────────────┘         └──────────────────┘
                                     │
                            ┌────────┴──────────┐
                            ▼                   ▼
                    ┌──────────────┐    ┌─────────────┐
                    │  Gemini API  │    │ OpenAI API  │
                    │ (Website Scan) │    │  (Content)  │
                    └──────────────┘    └─────────────┘
                                     │
                                     ▼
                             ┌─────────────┐
                             │   SQLite    │
                             │  Database   │
                             └─────────────┘
```

## Setup and Running

### Prerequisites

- Node.js 18+
- `npm` (or a compatible package manager)
- API keys for Google Gemini and OpenAI.

### 1. Installation

First, install the dependencies for all packages (root, backend, and frontend).

```bash
# Clone the repository
git clone <repository-url>
cd llmmail

# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Environment Variables

Create a `.env` file in the project's root directory. This file will store your secret API keys.

```env
# .env

# Required for website scanning and brand analysis
GEMINI_API_KEY="your_google_gemini_api_key_here"

# Required for email content, creative direction, and image generation
OPENAI_API_KEY="your_openai_api_key_here"
```

### 3. Start the Application

Run the `start` command from the root directory. This will launch both the backend and frontend servers concurrently.

```bash
npm start
```

-   **Backend API** will be running at `http://localhost:3000`
-   **Frontend App** will be running at `http://localhost:5173`

## How It Works

### 1. Brand Profile Setup

-   Navigate to the **Settings** page (⚙️ icon).
-   Enter your company's website URL (e.g., `example.com`).
-   Click **"Scan"**. The backend uses the Gemini API to browse the site, analyzing its content and code to extract key brand information.
-   The extracted data (logo, colors, fonts, tone of voice, etc.) is saved as a single Markdown document in the database. You can edit this Markdown manually at any time.

### 2. Email Generation

-   On the main page, describe the email campaign you want to create.
-   The backend's "Creative Director" agent uses the saved brand profile Markdown and your prompt to write an expert brief.
-   This brief is then used by other AI agents to generate the email subject, preheader, body content, and DALL-E 3 image prompts.
-   Finally, the complete content is compiled into a mobile-first HTML template.

## Database Schema

The application uses a single table to store the brand profile.

### brand_profile
```sql
CREATE TABLE IF NOT EXISTS brand_profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  website_url TEXT,
  full_scan_markdown TEXT,
  last_scanned_at DATETIME,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## AI Configuration

-   **Website Analysis**: Gemini 2.5 Flash (outputs Markdown)
-   **Creative Direction & Content Generation**: GPT-4o
-   **Image Generation**: DALL-E 3

The prompts that steer the AI models are located in the `/prompts` directory and can be edited to customize the AI's behavior and output format.
