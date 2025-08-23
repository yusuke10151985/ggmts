# E2E Testing for MOM Display Issues

## Overview
Playwright E2E tests have been set up to verify MOM functionality and diagnose display issues.

## Installation
```bash
# Install Playwright
npm install --save-dev @playwright/test

# Install browsers (required first time only)
npx playwright install
```

## Running Tests

### Run all tests
```bash
npm run test:e2e
```

### Run tests with UI (recommended for debugging)
```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Debug specific test
```bash
npm run test:e2e:debug
```

### View test report
```bash
npm run test:e2e:report
```

## Test Coverage

The E2E tests check:

1. **MOM List Display**
   - List container visibility
   - MOM items rendering
   - MOM ID and revision display
   - Status badges

2. **MOM Detail Fields**
   - Meeting Details section
   - Meeting Title field
   - Meeting Goal field  
   - Meeting Date field
   - Time Slots section
   - Companies and Attendees section
   - Agenda Structure section

3. **Data Persistence**
   - Values persist after page reload
   - No data loss on navigation

4. **Console Errors**
   - Monitors for JavaScript errors
   - Logs all console errors for debugging

5. **Debug Mode**
   - Logs all visible text content
   - Logs all input values
   - Logs all select values

## Troubleshooting Display Issues

To diagnose the Windows display issue:

1. **Run the debug test on Windows:**
```bash
npm run test:e2e:headed -- --grep "Debug: Log all visible text content"
```

2. **Check the console output** for:
   - Which fields have values
   - Which fields are empty
   - Any error messages

3. **Compare results** between:
   - Mac (working) environment
   - Windows (not working) environment

4. **Generate detailed report:**
```bash
npm run test:e2e -- --reporter=json
```

## Test Configuration

Tests are configured to:
- Use local development server (http://localhost:3000)
- Take screenshots on failure
- Record video on failure
- Generate HTML reports
- Support multiple browsers (Chrome, Firefox, Safari)

## Environment Variables

For production testing, set:
```bash
export TEST_URL=https://your-production-url.com
export TEST_EMAIL=admin@test.com
export TEST_PASSWORD=your-password
```

## Expected Test Results

✅ **All tests should pass if MOM is working correctly:**
- MOM list displays with items
- All detail fields have values when opening a MOM
- Data persists across page loads
- No console errors

❌ **Tests will fail if there are display issues:**
- Empty fields will be detected
- Missing sections will be reported
- Console errors will be logged
- Screenshots will be captured

## Next Steps

1. Run tests on both Mac and Windows
2. Compare test results and console logs
3. Identify which specific fields are not displaying
4. The test output will help pinpoint the exact issue