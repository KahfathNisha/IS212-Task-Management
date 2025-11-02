#!/usr/bin/env node
// start-with-emulators.cjs (CommonJS)
const { spawn } = require('child_process');
const net = require('net');
const http = require('http');
const path = require('path');

const FRONTEND_PORT = process.env.PORT || 5173;
const EMU_AUTH_PORT = 9099;
const EMU_FIRESTORE_PORT = 8080;
const EMU_HOST = 'localhost';

function waitForPort(host, port, timeout = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const sock = new net.Socket();
      sock.setTimeout(2000);
      sock.on('connect', () => {
        sock.destroy();
        resolve();
      });
      sock.on('error', () => {
        sock.destroy();
        if (Date.now() - start > timeout) reject(new Error(`Timeout waiting for ${host}:${port}`));
        else setTimeout(tryConnect, 500);
      });
      sock.on('timeout', () => {
        sock.destroy();
        if (Date.now() - start > timeout) reject(new Error(`Timeout waiting for ${host}:${port}`));
        else setTimeout(tryConnect, 500);
      });
      sock.connect(port, host);
    };
    tryConnect();
  });
}

function waitForHttp(url, timeout = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryReq = () => {
      const req = http.get(url, (res) => {
        if (res.statusCode && res.statusCode < 500) {
          res.resume();
          resolve();
        } else {
          if (Date.now() - start > timeout) reject(new Error(`Timeout waiting for ${url} (status ${res.statusCode})`));
          else setTimeout(tryReq, 500);
        }
      });
      req.on('error', () => {
        if (Date.now() - start > timeout) reject(new Error(`Timeout waiting for ${url}`));
        else setTimeout(tryReq, 500);
      });
    };
    tryReq();
  });
}

function spawnStd(cmd, args, opts = {}) {
  const p = spawn(cmd, args, { stdio: 'inherit', shell: true, ...opts });
  p.on('error', (err) => {
    console.error(`Process ${cmd} failed:`, err);
    process.exit(1);
  });
  return p;
}

(async () => {
  const cwd = process.cwd();
  console.log('Starting Firebase emulators and frontend dev server from', cwd);

  // Start Firebase emulators
  console.log('Checking for running Firebase emulators (auth, firestore) on localhost');
  let emuProc = null;
  const backendDir = path.resolve(cwd, '..', 'backend');
  // If emulator ports are already open, assume emulators are running and skip starting them
  const authUp = await (async () => { try { await waitForPort(EMU_HOST, EMU_AUTH_PORT, 2000); return true; } catch { return false; } })();
  const fsUp = await (async () => { try { await waitForPort(EMU_HOST, EMU_FIRESTORE_PORT, 2000); return true; } catch { return false; } })();
  if (authUp && fsUp) {
    console.log('Detected running emulators; skipping startup.');
  } else {
    console.log('Starting Firebase emulators (auth, firestore) via npx firebase emulators:start in', backendDir);
    const emuArgs = ['firebase', 'emulators:start', '--only', 'auth,firestore'];
    emuProc = spawnStd('npx', emuArgs, { cwd: backendDir });

    // Ensure emulator ports are ready
    try {
      await waitForPort(EMU_HOST, EMU_AUTH_PORT, 30000);
      await waitForPort(EMU_HOST, EMU_FIRESTORE_PORT, 30000);
      console.log('Firebase emulators are up');
    } catch (err) {
      console.error('Emulators did not start in time:', err.message);
      if (emuProc) emuProc.kill();
      process.exit(1);
    }
  }

  // Now start frontend dev server
  // Start backend server first so API endpoints are available to the frontend
  const BACKEND_PORT = 3000;
  let backendProc = null;
  const backendRunning = await (async () => { try { await waitForPort('localhost', BACKEND_PORT, 2000); return true; } catch { return false; } })();
  if (backendRunning) {
    console.log(`Detected backend already running on port ${BACKEND_PORT}; skipping start.`);
  } else {
    console.log('Starting backend dev server: npm run dev (in backend folder)');
    backendProc = spawnStd('npm', ['run', 'dev'], { cwd: backendDir });
    try {
      await waitForPort('localhost', BACKEND_PORT, 30000);
      console.log('Backend server is up on port', BACKEND_PORT);
    } catch (err) {
      console.error('Backend did not start in time:', err.message);
      if (backendProc) backendProc.kill();
      if (emuProc) emuProc.kill();
      process.exit(1);
    }
  }

  console.log('Starting frontend dev server: npm run dev');
  const devProc = spawnStd('npm', ['run', 'dev'], { cwd });

  // Wait for frontend URL
  const url = `http://localhost:${FRONTEND_PORT}`;
  try {
    await waitForHttp(url, 60000);
    console.log(`Frontend dev server ready at ${url}`);
  } catch (err) {
    console.error('Frontend did not become ready:', err.message);
    devProc.kill();
    emuProc.kill();
    process.exit(1);
  }

  console.log('All services are ready. Keeping processes running for Playwright.');

  // Forward termination signals
  const shutdown = () => {
    console.log('Shutting down child processes...');
    try { devProc.kill(); } catch (e) {}
    try { emuProc.kill(); } catch (e) {}
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Prevent the script from exiting
  process.stdin.resume();
})();
