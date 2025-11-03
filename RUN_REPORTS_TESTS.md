# How to Run Report Generation Tests

## Prerequisites

1. **Firebase Emulators must be running** (the integration tests require the emulator)
   ```bash
   # In a separate terminal, start the emulators
   firebase emulators:start
   ```

2. **Navigate to the backend directory**
   ```bash
   cd backend
   ```

## Option 1: Run All Report Integration Tests

The integration tests are excluded from the default Jest config, so run them directly:

```bash
# Run only the reports integration tests
npx jest tests/reports.integration.test.js --config=jest.config.js

# Or using npm
npm test -- tests/reports.integration.test.js
```

**Note:** You may need to temporarily allow integration tests. If the above doesn't work, use:

```bash
# Temporarily override the ignore pattern
npx jest tests/reports.integration.test.js --testPathIgnorePatterns="[]"
```

## Option 2: Run Specific Test Suites

You can run specific test suites within the file:

```bash
# Run only "Project Report Integration" tests
npx jest tests/reports.integration.test.js -t "Project Report Integration"

# Run only a specific test
npx jest tests/reports.integration.test.js -t "should show status breakdown"
```

## Option 3: Temporarily Enable Integration Tests

If you want to run all tests including integration tests, you can temporarily modify `jest.config.js`:

1. Comment out line 11 in `backend/jest.config.js`:
   ```javascript
   testPathIgnorePatterns: [
     '/node_modules/',
     // '/integration\.test\.js$',  // Temporarily comment this
     '/email\.test\.js$'
   ],
   ```

2. Run tests normally:
   ```bash
   npm test
   ```

3. **Remember to uncomment it afterwards!**

## What the Tests Cover

The new tests verify:
- ✅ Status breakdown (To Do, Ongoing, Pending Review, Completed)
- ✅ Team member workload distribution
- ✅ Overdue tasks for deadline planning
- ✅ At-risk tasks (due in 3 days)
- ✅ Tasks sorted by due date
- ✅ Complete report structure with all required fields
- ✅ Access control (team members can only view their projects)

## Troubleshooting

If tests fail with Firebase connection errors:
1. Ensure Firebase emulators are running (`firebase emulators:start`)
2. Check that the emulator ports match your configuration
3. Verify your `.env` file is configured correctly

If tests timeout:
- Increase the timeout in `jest.config.js` (currently 10000ms)
- Or add `--testTimeout=30000` to the jest command

