# IS212 Task Management System

## Team Members
- [Name 1] - Namyra (User Authorization & Authentication)
- [Name 2] - Sandra (Task Management)
- [Name 3] - Breann (Task Grouping & Organization)
- [Name 4] - Adrian (Deadline & Schedule Tracking)
- [Name 5] - Tasha (Notification System)
- [Name 6] - Nisha (Report Generation & Exporting)

## Project Structure
is212-task-management/
├── frontend/          # Vue.js frontend application
├── backend/           # Express.js backend server
│   ├── functions/     # Firebase Cloud Functions
│   └── src/          # Express server code
└── shared/           # Shared utilities and types

## Tech Stack
- **Frontend:** Vue 3, Vuetify, Pinia, Vue Router
- **Backend:** Express.js, Node.js
- **Database:** Firebase Firestore
- **Authentication:** Firebase Auth
- **Hosting:** Firebase Hosting
- **Cloud Functions:** Firebase Functions

## Setup Instructions

### Prerequisites
- Node.js v20+ installed
- Git installed
- Firebase CLI installed (`npm install -g firebase-tools`)

### Installation
1. Clone the repository:
```bash
   git clone https://github.com/KahfathNisha/is212-task-management.git
   cd is212-task-management

2. Install frontend dependencies:
    bash   cd frontend
    npm install

3. Install backend dependencies:
    bash   cd ../backend
    npm install


### Running the Application
Start Backend Server:
    cd backend
    npm run dev
Start Frontend Development Server:
    cd frontend
    npm run dev
Run Firebase Emulators:
    cd backend
    firebase emulators:start

Access the application at:
    Frontend: http://localhost:5173
    Backend API: http://localhost:3000
    Firebase Emulator UI: http://localhost:4000



## 🚀 **Test Your Setup Now**

Use Command Prompt (not PowerShell):

**Terminal 1:**
```cmd
cd C:\Users\nisha\is212-task-management\backend
npm run dev
Should show: Server running on port 3000
**Terminal 2:**
```cmd 
cd C:\Users\nisha\is212-task-management\frontend
npm run dev
Should show: Local: http://localhost:5173/