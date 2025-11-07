# IS212 Task Management System

Repository: https://github.com/KahfathNisha/IS212-Task-Management

## IMPORTANT! Local secrets & env files (paths & instructions)

Some files required for Firebase and local development are kept out of source control and must be created locally. For this project there are 3 files - two .env files and one serviceAccountKey.json file: 

- Frontend environment file (place locally):

	`IS212-Task-Management\frontend\.env`

- Backend environment file (place locally):

	`IS212-Task-Management\backend\.env`

- Service account JSON for Firebase Admin SDK (place locally):

	`IS212-Task-Management\backend\src\config\serviceAccountKey.json`


## Project Structure (detailed)
is212-task-management/

Top-level folders and important files:

├── frontend/                # Vue 3 frontend (Vite)
│   ├── package.json         # frontend npm scripts & deps
│   ├── vite.config.js       # Vite configuration
│   ├── public/              # static assets (favicon, index.html template)
│   └── src/                 # Vue app source code
│       ├── main.js          # app bootstrap
│       ├── App.vue          # root Vue component
│       ├── assets/          # images, fonts, icons
│       ├── components/      # reusable Vue components
│       ├── views/           # page-level views / routes
│       ├── router/          # Vue Router routes
│       ├── stores/          # Pinia stores (state management)
│       ├── services/        # HTTP clients / API wrappers (calls to backend)
│       └── tests/           # frontend unit / e2e tests (Vitest/Playwright - works locally but not in CI Pipeline)

├── backend/                 # Express backend + Firebase emulator config
│   ├── package.json         # backend npm scripts & deps
│   ├── firebase.json        # firebase emulator + functions configuration
│   ├── firestore.rules      # Firestore security rules
│   ├── firestore.indexes.json # Firestore indexes for emulator / prod
│   ├── functions/           # Firebase Cloud Functions (deployed code)
│   │   └── index.js         # Cloud Functions entrypoint
│   └── src/                 # Express server source
│       ├── server.js        # Express app bootstrap (used in dev)
│       ├── config/          # backend configuration helpers (firebase init etc.)
│       │   └── firebase.js  # emulator connection + service account (local only)
│       ├── controllers/     # request handlers (controllers)
│       ├── routes/          # express routers (map endpoints to controllers)
│       ├── models/          # database models / Firestore access wrappers
│       ├── services/        # business logic and external integrations (email, notifications)
│       ├── middleware/      # auth, validation, error handlers
│       └── tests/           # backend unit & integration tests (jest)

├── config/                  # shared configuration used by both frontend & backend
│   └── firebase.js          # SDK config for emulator/production toggles

├── scripts/                 # helper scripts (seed data, emulator helpers)
│   ├── setup-test-data.js
│   └── debug-login.js

├── tests/                   # top-level test suites and CI helpers
│   ├── setup.js
│   ├── globalTeardown.js
│   └── integration.test.js

├── public/                  # (root-level) files served by hosting in simple setups

├── run-ci-checks.sh         # local CI runner for Unix
├── run-ci-checks.bat        # local CI runner for Windows
└── README.md                # this file


Notes:
- The `frontend/src/services` folder contains the code that calls the backend API endpoints (e.g., axios wrappers). Keep API URL configuration centralized so dev/prod endpoints are easy to switch.
- The `backend/src/models` are thin wrappers around Firestore operations so unit tests can mock them easily.
- Use `scripts/setup-test-data.js` to seed the emulator with demo data for local testing.
- Sensitive local config (service account JSON, test credentials) are excluded from version control and kept out of the repo (see Accounts/Secrets all the way at the top).
- The `.github\workflows\ci.yml` allows the CI pipeline to run automatically in Github whenever a commit is merged to main






## Tech Stack
- Frontend: Vue 3, Vuetify, Pinia, Vue Router
- Backend: Express.js, Node.js
- Database: Firebase Firestore (emulated in local development)
- Authentication: Firebase Auth
- Hosting & Functions: Firebase Hosting & Cloud Functions

## Setup Instructions

### Prerequisites
- Node.js v20+ (LTS recommended)
- npm (bundled with Node.js)
- Git
- Firebase CLI (`npm install -g firebase-tools`)

### Installation (local dev)
1. Clone the repository and enter it:

```powershell
git clone https://github.com/KahfathNisha/IS212-Task-Management.git
cd IS212-Task-Management
```

2. Install frontend dependencies:

```powershell
cd frontend
npm install
cd ..
```

3. Install backend dependencies:

```powershell
cd backend
npm install
cd ..
```

4. (Optional) If you use the Firebase emulators in development, authenticate once and start the emulators from `backend`:

```powershell
cd backend
firebase login --no-localhost
firebase emulators:start
```

### Running the application (dev)
- Start backend (Express server that connects to emulators):

```powershell
cd backend
npm run dev
```

- Start frontend (Vite dev server):

```powershell
cd frontend
npm run dev
```

Default local ports (project conventions):
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Firebase Emulator UI: http://localhost:4000

---

## 🚀 Test Your Setup Quickly (recommended)

Open two terminals.

Terminal A — backend (PowerShell):

```powershell
cd IS212-Task-Management\backend
npm run dev
# Expect: "Server running on port 3000" 
```

Terminal B — frontend (PowerShell):

```powershell
cd IS212-Task-Management\frontend
npm run dev
# Expect: Vite dev server output, Local: http://localhost:5173
```

---

## Local CI pipeline testing
For macOS / Linux:

```bash
chmod +x run-ci-checks.sh
./run-ci-checks.sh
```

For Windows:

```powershell
.\run-ci-checks.bat
```

---


## Local CI pipeline testing
# For macOS / Linux
chmod +x run-ci-checks.sh

# Run all CI checks
./run-ci-checks.sh

# For Windows
run-ci-checks.bat
