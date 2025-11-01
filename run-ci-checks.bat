@echo off
REM Local CI Checks - Windows version
REM Run this before pushing to verify CI will pass

echo 🚀 Running local CI checks...
echo ================================
echo.

set FAILED=0

REM ==========================================
REM FRONTEND CHECKS
REM ==========================================
echo 📦 FRONTEND CHECKS
echo ==================

cd frontend
if not exist "node_modules" (
    echo ℹ️  Installing frontend dependencies...
    call npm ci
) else (
    echo ℹ️  Frontend dependencies already installed
)

echo ℹ️  Running frontend unit tests...
call npm test -- --exclude **/*.integration.spec.js --run
if errorlevel 1 (
    echo ❌ Frontend tests failed
    set FAILED=1
) else (
    echo ✅ Frontend tests passed
)

echo ℹ️  Building frontend...
call npm run build
if errorlevel 1 (
    echo ❌ Frontend build failed
    set FAILED=1
) else (
    echo ✅ Frontend build succeeded
)

cd ..

echo.
echo 📦 BACKEND CHECKS
echo ==================

cd backend
if not exist "node_modules" (
    echo ℹ️  Installing backend dependencies...
    call npm ci
) else (
    echo ℹ️  Backend dependencies already installed
)

echo ℹ️  Running backend tests...
call npm test
if errorlevel 1 (
    echo ❌ Backend tests failed
    set FAILED=1
) else (
    echo ✅ Backend tests passed
)

cd ..

echo.
echo ================================
if %FAILED%==0 (
    echo 🎉 All CI checks passed! Safe to push.
    exit /b 0
) else (
    echo 💥 Some checks failed. Fix issues before pushing.
    exit /b 1
)

