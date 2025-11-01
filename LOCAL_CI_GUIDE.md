# Local CI Checks Guide

Run CI checks locally **before pushing** to avoid wasting CI minutes and catch issues early.

## 🚀 Quick Start

### macOS/Linux:

```bash
# Make script executable (first time only)
chmod +x run-ci-checks.sh

# Run all CI checks
./run-ci-checks.sh
```

### Windows:

```bash
# Run all CI checks
run-ci-checks.bat
```

## 📋 What Gets Checked

This replicates your GitHub Actions CI pipeline:

### Frontend:
1. ✅ Install dependencies (`npm ci`)
2. ✅ Run unit tests (excludes integration tests)
3. ✅ Build project (`npm run build`)

### Backend:
1. ✅ Install dependencies (`npm ci`)
2. ✅ Run all tests (`npm test`)

## 🎯 Usage Workflow

**Before every push:**

```bash
# 1. Make sure you're in the project root
cd /path/to/IS212-Task-Management

# 2. Run the CI checks
./run-ci-checks.sh    # macOS/Linux
# OR
run-ci-checks.bat     # Windows

# 3. If all checks pass (✅), push your code
git push

# 4. If checks fail (❌), fix issues and run again
```

## 🔧 Manual Step-by-Step (Alternative)

If you prefer running steps manually:

### Frontend:
```bash
cd frontend

# Install dependencies
npm ci

# Run tests (excluding integration)
npm test -- --exclude **/*.integration.spec.js --run

# Build
npm run build
```

### Backend:
```bash
cd backend

# Install dependencies
npm ci

# Run tests
npm test
```

## ⚠️ Important Notes

1. **Environment Variables:** 
   - Frontend: Make sure `frontend/.env` exists (tests may need it)
   - Backend: Tests use emulator by default, so no real Firebase needed

2. **Firestore Emulator:**
   - Some tests might need the emulator running
   - Start with: `cd backend && firebase emulators:start --only firestore`

3. **Node Version:**
   - CI uses Node 20 - make sure you're using Node 20 locally
   - Check: `node --version`
   - Switch with: `nvm use 20` (if using nvm)

4. **Test Failures:**
   - Read error messages carefully
   - Common issues:
     - Missing dependencies → Run `npm ci` in both folders
     - Missing `.env` files → Create them (see project setup)
     - Port conflicts → Kill processes using ports 3000, 5173, 8080

## 🐛 Troubleshooting

### "npm ci failed"
**Solution:** Delete `node_modules` and `package-lock.json`, then run `npm install`

### "Tests fail with Firebase errors"
**Solution:** Start Firestore emulator: `cd backend && firebase emulators:start --only firestore`

### "Build fails"
**Solution:** Check for syntax errors, missing imports, or TypeScript errors in console output

### "Script permission denied" (macOS/Linux)
**Solution:** Run `chmod +x run-ci-checks.sh`

## 📊 Understanding Output

- ✅ **Green checkmark** = Step passed
- ❌ **Red X** = Step failed (fix before pushing)
- ℹ️ **Blue info** = Informational message

The script exits with:
- **Exit code 0** = All checks passed ✅
- **Exit code 1** = One or more checks failed ❌

## 💡 Pro Tips

1. **Run checks frequently** during development, not just before push
2. **Fix issues immediately** - don't let them accumulate
3. **Use `npm ci`** (not `npm install`) - matches CI exactly
4. **Check Node version** - must match CI (Node 20)
5. **Git hooks** - Consider adding a pre-push hook to run these automatically

## 🎁 Bonus: Git Pre-Push Hook (Optional)

To automatically run checks before push:

```bash
# Create pre-push hook
cat > .git/hooks/pre-push << 'EOF'
#!/bin/bash
./run-ci-checks.sh
EOF

# Make executable
chmod +x .git/hooks/pre-push
```

Now checks run automatically on every `git push`! (You can still skip with `--no-verify` if needed)

