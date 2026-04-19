# SnapGuide 📸
**Automatically generate step-by-step tutorials from your web interactions.**

SnapGuide is a full-stack application consisting of three parts:

| Part | Technology | Purpose |
|------|-----------|---------|
| **Backend API** | Node.js + Express + SQLite | Stores tutorials, steps, screenshots |
| **Frontend Dashboard** | Next.js 14 + Tailwind CSS | View, edit, share & export tutorials |
| **Chrome Extension** | Manifest V3 + Vanilla JS | Records interactions & takes screenshots |

---

## Project Structure

```
SnapGuide/
├── backend/                  # Express REST API
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js   # SQLite initialization
│   │   ├── middleware/
│   │   │   └── auth.js       # JWT middleware
│   │   ├── routes/
│   │   │   ├── auth.js       # Register / Login
│   │   │   ├── tutorials.js  # Tutorial CRUD + share
│   │   │   ├── steps.js      # Step CRUD + reorder + bulk
│   │   │   ├── assets.js     # Screenshot upload (file / base64)
│   │   │   └── export.js     # Export HTML / PDF / DOCX
│   │   └── index.js          # Server entry point
│   ├── .env.example
│   └── package.json
│
├── frontend/                 # Next.js dashboard
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.js            # Landing / Auth
│   │   │   ├── dashboard/page.js  # Tutorial list
│   │   │   ├── tutorials/[id]/page.js  # Tutorial editor
│   │   │   └── share/[token]/page.js   # Public share view
│   │   ├── components/
│   │   │   ├── Auth/AuthForm.jsx
│   │   │   ├── Dashboard/TutorialCard.jsx
│   │   │   ├── Editor/StepList.jsx    # Drag & drop
│   │   │   ├── Editor/StepEditor.jsx  # Step modal
│   │   │   └── UI/Navbar.jsx
│   │   └── lib/api.js        # API client
│   ├── .env.local.example
│   └── package.json
│
└── extension/                # Chrome Extension (Manifest V3)
    ├── manifest.json
    ├── background.js         # Service worker – screenshots + API calls
    ├── content.js            # Injected script – captures clicks/input
    └── popup/
        ├── popup.html
        ├── popup.js
        └── popup.css
```

---

## Quick Start

### Prerequisites

- **Node.js 18+** — https://nodejs.org
- **Google Chrome** — for the extension

---

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env if needed (default port: 3001)

# Start the server
npm run dev        # development (auto-reload)
# OR
npm start          # production
```

The API will run at **http://localhost:5001**

---

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment config
cp .env.local.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:3001 (already set)

# Start development server
npm run dev
```

The dashboard will run at **http://localhost:3000**

---

### 3. Chrome Extension Setup

1. Open Chrome and navigate to **chrome://extensions**
2. Enable **Developer mode** (top-right toggle)
3. Click **"Load unpacked"**
4. Select the `extension/` folder from this project
5. The SnapGuide icon will appear in your toolbar

 **Note:** The extension points to `http://localhost:3001` by default. If your backend runs on a different URL, update `API_URL` in `extension/background.js` and `FRONTEND_URL` in `extension/popup/popup.js`.

---

## Usage

### Recording a Tutorial

1. Click the SnapGuide extension icon in Chrome
2. **Sign in** or create an account
3. Enter a tutorial title and click **"Start Recording"**
4. Interact with any website — SnapGuide captures every click, input, and navigation with screenshots automatically
5. Click **"Stop Recording"** in the popup
6. Click **"View & Edit Tutorial"** to open the dashboard

### Editing a Tutorial

- **Reorder steps** — drag and drop using the handle on the left
- **Edit step** — click "Edit" to update the instruction text or replace the screenshot
- **Delete step** — click "Delete" on any step

### Sharing a Tutorial

1. Open the tutorial in the editor
2. Click **"🌐 Share"** — this generates a public link
3. Click **"Copy"** to copy the share URL
4. Anyone with the link can view the tutorial at `/share/<token>` (no account required)

### Exporting

From the tutorial editor or dashboard, export as:

| Format | Description |
|--------|-------------|
| **HTML** | Self-contained webpage with all screenshots |
| **PDF** | Printable document with embedded screenshots |
| **DOCX** | Microsoft Word document with images |

---

## API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Sign in, returns JWT |
| `GET`  | `/api/auth/me` | Get current user |

### Tutorials

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`    | `/api/tutorials` | List all (auth) |
| `POST`   | `/api/tutorials` | Create tutorial |
| `GET`    | `/api/tutorials/:id` | Get with steps |
| `PUT`    | `/api/tutorials/:id` | Update |
| `DELETE` | `/api/tutorials/:id` | Delete |
| `POST`   | `/api/tutorials/:id/share` | Toggle public |
| `GET`    | `/api/tutorials/share/:token` | Public view |

### Steps

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`    | `/api/steps/:tutorialId` | List steps |
| `POST`   | `/api/steps` | Create step (+ screenshot upload) |
| `PUT`    | `/api/steps/:id` | Update step |
| `DELETE` | `/api/steps/:id` | Delete step |
| `POST`   | `/api/steps/reorder` | Reorder steps |
| `POST`   | `/api/steps/bulk` | Bulk create |

### Export

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/export/:id/html` | Download HTML |
| `GET` | `/api/export/:id/pdf` | Download PDF |
| `GET` | `/api/export/:id/docx` | Download DOCX |

---

## Database Schema

```sql
users       (id, email, password, name, created_at)
tutorials   (id, user_id, title, description, share_token, is_public, created_at, updated_at)
steps       (id, tutorial_id, order_index, action_type, element_selector,
             element_description, instruction, screenshot_url, page_url, metadata, created_at)
assets      (id, tutorial_id, step_id, filename, original_name, mime_type, size, created_at)
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5001` | API server port |
| `JWT_SECRET` | *(set this!)* | Secret for signing JWTs |
| `FRONTEND_URL` | `http://localhost:3000` | Allowed CORS origin |
| `DB_PATH` | `./snapguide.db` | SQLite database file path |
| `UPLOADS_DIR` | `./uploads` | Directory for screenshots |

### Frontend (`frontend/.env.local`)

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:5001` | Backend API URL |

---

## Features

- ✅ **Chrome Extension (MV3)** — captures clicks, inputs, and navigation
- ✅ **Auto-screenshots** — taken after each interaction via `chrome.tabs.captureVisibleTab`
- ✅ **Smart instructions** — human-readable step text generated automatically
- ✅ **Element highlighting** — visual ring shown around clicked elements
- ✅ **Recording indicator** — banner shown on captured pages
- ✅ **Password blur** — password values never stored in instructions
- ✅ **Tutorial CRUD** — full create/read/update/delete
- ✅ **Drag & drop reordering** — powered by @hello-pangea/dnd
- ✅ **Inline step editing** — edit text and replace screenshots
- ✅ **Public share links** — share tutorials with anyone (no account needed)
- ✅ **Export to HTML** — self-contained page with embedded screenshots
- ✅ **Export to PDF** — printable with pdfkit
- ✅ **Export to DOCX** — Word document with embedded images
- ✅ **JWT authentication** — secure user sessions
- ✅ **SQLite database** — zero-config, file-based persistence

---

## Security Notes

- Passwords are hashed with **bcrypt** (12 rounds)
- JWT tokens expire after **7 days**
- Password field values are **never captured** in screenshots or step instructions
- All file uploads are type-validated (images only, 10 MB max)
- CORS is restricted to known origins (frontend + Chrome extension)

---

## Production Deployment

1. Set a strong `JWT_SECRET` in your backend `.env`
2. Update `FRONTEND_URL` to your production domain
3. Update `API_URL` and `FRONTEND_URL` constants in the extension files
4. Use a process manager like **PM2** for the backend: `pm2 start src/index.js`
5. Deploy the Next.js frontend with `npm run build && npm start` or on Vercel
6. For persistent storage, replace SQLite with PostgreSQL (swap `better-sqlite3` for `pg`)
7. Replace local file uploads with S3-compatible storage (AWS S3, Cloudflare R2)


## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend framework | Express.js |
| Database | SQLite via better-sqlite3 |
| Authentication | JWT (jsonwebtoken) + bcryptjs |
| File uploads | Multer |
| PDF generation | PDFKit |
| DOCX generation | docx |
| Frontend framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Drag & drop | @hello-pangea/dnd |
| Extension API | Chrome Manifest V3 |

# SnapGuide 📸

 **Automatically generate step-by-step tutorials from your web interactions.**

SnapGuide is a full-stack application consisting of three parts:

| Part | Technology | Purpose |
|------|-----------|---------|
| **Backend API** | Node.js + Express + SQLite | Stores tutorials, steps, screenshots |
| **Frontend Dashboard** | Next.js 14 + Tailwind CSS | View, edit, share & export tutorials |
| **Chrome Extension** | Manifest V3 + Vanilla JS | Records interactions & takes screenshots |

---

## Project Structure

```
SnapGuide/
├── backend/                  # Express REST API
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js   # SQLite initialization
│   │   ├── middleware/
│   │   │   └── auth.js       # JWT middleware
│   │   ├── routes/
│   │   │   ├── auth.js       # Register / Login
│   │   │   ├── tutorials.js  # Tutorial CRUD + share
│   │   │   ├── steps.js      # Step CRUD + reorder + bulk
│   │   │   ├── assets.js     # Screenshot upload (file / base64)
│   │   │   └── export.js     # Export HTML / PDF / DOCX
│   │   └── index.js          # Server entry point
│   ├── .env.example
│   └── package.json
│
├── frontend/                 # Next.js dashboard
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.js            # Landing / Auth
│   │   │   ├── dashboard/page.js  # Tutorial list
│   │   │   ├── tutorials/[id]/page.js  # Tutorial editor
│   │   │   └── share/[token]/page.js   # Public share view
│   │   ├── components/
│   │   │   ├── Auth/AuthForm.jsx
│   │   │   ├── Dashboard/TutorialCard.jsx
│   │   │   ├── Editor/StepList.jsx    # Drag & drop
│   │   │   ├── Editor/StepEditor.jsx  # Step modal
│   │   │   └── UI/Navbar.jsx
│   │   └── lib/api.js        # API client
│   ├── .env.local.example
│   └── package.json
│
└── extension/                # Chrome Extension (Manifest V3)
    ├── manifest.json
    ├── background.js         # Service worker – screenshots + API calls
    ├── content.js            # Injected script – captures clicks/input
    └── popup/
        ├── popup.html
        ├── popup.js
        └── popup.css
```

---

## Quick Start

### Prerequisites

- **Node.js 18+** — https://nodejs.org
- **Google Chrome** — for the extension

---

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env if needed (default port: 3001)

# Start the server
npm run dev        # development (auto-reload)
# OR
npm start          # production
```

The API will run at **http://localhost:5001**

---

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment config
cp .env.local.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:3001 (already set)

# Start development server
npm run dev
```

The dashboard will run at **http://localhost:3000**

---

### 3. Chrome Extension Setup

1. Open Chrome and navigate to **chrome://extensions**
2. Enable **Developer mode** (top-right toggle)
3. Click **"Load unpacked"**
4. Select the `extension/` folder from this project
5. The SnapGuide icon will appear in your toolbar

**Note:** The extension points to `http://localhost:3001` by default. If your backend runs on a different URL, update `API_URL` in `extension/background.js` and `FRONTEND_URL` in `extension/popup/popup.js`.

---

## Usage

### Recording a Tutorial

1. Click the SnapGuide extension icon in Chrome
2. **Sign in** or create an account
3. Enter a tutorial title and click **"Start Recording"**
4. Interact with any website — SnapGuide captures every click, input, and navigation with screenshots automatically
5. Click **"Stop Recording"** in the popup
6. Click **"View & Edit Tutorial"** to open the dashboard

### Editing a Tutorial

- **Reorder steps** — drag and drop using the handle on the left
- **Edit step** — click "Edit" to update the instruction text or replace the screenshot
- **Delete step** — click "Delete" on any step

### Sharing a Tutorial

1. Open the tutorial in the editor
2. Click **"🌐 Share"** — this generates a public link
3. Click **"Copy"** to copy the share URL
4. Anyone with the link can view the tutorial at `/share/<token>` (no account required)

### Exporting

From the tutorial editor or dashboard, export as:

| Format | Description |
|--------|-------------|
| **HTML** | Self-contained webpage with all screenshots |
| **PDF** | Printable document with embedded screenshots |
| **DOCX** | Microsoft Word document with images |

---

## API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Sign in, returns JWT |
| `GET`  | `/api/auth/me` | Get current user |

### Tutorials

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`    | `/api/tutorials` | List all (auth) |
| `POST`   | `/api/tutorials` | Create tutorial |
| `GET`    | `/api/tutorials/:id` | Get with steps |
| `PUT`    | `/api/tutorials/:id` | Update |
| `DELETE` | `/api/tutorials/:id` | Delete |
| `POST`   | `/api/tutorials/:id/share` | Toggle public |
| `GET`    | `/api/tutorials/share/:token` | Public view |

### Steps

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`    | `/api/steps/:tutorialId` | List steps |
| `POST`   | `/api/steps` | Create step (+ screenshot upload) |
| `PUT`    | `/api/steps/:id` | Update step |
| `DELETE` | `/api/steps/:id` | Delete step |
| `POST`   | `/api/steps/reorder` | Reorder steps |
| `POST`   | `/api/steps/bulk` | Bulk create |

### Export

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/export/:id/html` | Download HTML |
| `GET` | `/api/export/:id/pdf` | Download PDF |
| `GET` | `/api/export/:id/docx` | Download DOCX |

---

## Database Schema

```sql
users       (id, email, password, name, created_at)
tutorials   (id, user_id, title, description, share_token, is_public, created_at, updated_at)
steps       (id, tutorial_id, order_index, action_type, element_selector,
             element_description, instruction, screenshot_url, page_url, metadata, created_at)
assets      (id, tutorial_id, step_id, filename, original_name, mime_type, size, created_at)
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5001` | API server port |
| `JWT_SECRET` | *(set this!)* | Secret for signing JWTs |
| `FRONTEND_URL` | `http://localhost:3000` | Allowed CORS origin |
| `DB_PATH` | `./snapguide.db` | SQLite database file path |
| `UPLOADS_DIR` | `./uploads` | Directory for screenshots |

### Frontend (`frontend/.env.local`)

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:5001` | Backend API URL |

---

## Features

- ✅ **Chrome Extension (MV3)** — captures clicks, inputs, and navigation
- ✅ **Auto-screenshots** — taken after each interaction via `chrome.tabs.captureVisibleTab`
- ✅ **Smart instructions** — human-readable step text generated automatically
- ✅ **Element highlighting** — visual ring shown around clicked elements
- ✅ **Recording indicator** — banner shown on captured pages
- ✅ **Password blur** — password values never stored in instructions
- ✅ **Tutorial CRUD** — full create/read/update/delete
- ✅ **Drag & drop reordering** — powered by @hello-pangea/dnd
- ✅ **Inline step editing** — edit text and replace screenshots
- ✅ **Public share links** — share tutorials with anyone (no account needed)
- ✅ **Export to HTML** — self-contained page with embedded screenshots
- ✅ **Export to PDF** — printable with pdfkit
- ✅ **Export to DOCX** — Word document with embedded images
- ✅ **JWT authentication** — secure user sessions
- ✅ **SQLite database** — zero-config, file-based persistence

---

## Security Notes

- Passwords are hashed with **bcrypt** (12 rounds)
- JWT tokens expire after **7 days**
- Password field values are **never captured** in screenshots or step instructions
- All file uploads are type-validated (images only, 10 MB max)
- CORS is restricted to known origins (frontend + Chrome extension)

---

## Production Deployment

1. Set a strong `JWT_SECRET` in your backend `.env`
2. Update `FRONTEND_URL` to your production domain
3. Update `API_URL` and `FRONTEND_URL` constants in the extension files
4. Use a process manager like **PM2** for the backend: `pm2 start src/index.js`
5. Deploy the Next.js frontend with `npm run build && npm start` or on Vercel
6. For persistent storage, replace SQLite with PostgreSQL (swap `better-sqlite3` for `pg`)
7. Replace local file uploads with S3-compatible storage (AWS S3, Cloudflare R2)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend framework | Express.js |
| Database | SQLite via better-sqlite3 |
| Authentication | JWT (jsonwebtoken) + bcryptjs |
| File uploads | Multer |
| PDF generation | PDFKit |
| DOCX generation | docx |
| Frontend framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Drag & drop | @hello-pangea/dnd |
| Extension API | Chrome Manifest V3 |
