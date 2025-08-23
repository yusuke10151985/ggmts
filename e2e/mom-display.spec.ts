import { test, expect } from '@playwright/test';

// Test configuration
const TEST_URL = process.env.TEST_URL || 'http://localhost:3000';
const TEST_EMAIL = process.env.TEST_EMAIL || 'admin@test.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'testpassword';

test.describe('MOM Display Tests', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto(TEST_URL);
    
    // Perform login if needed (adjust selectors based on your login form)
    const loginButton = await page.locator('text=Sign in').first();
    if (await loginButton.isVisible()) {
      await loginButton.click();
      // Wait for OAuth or handle your specific login flow
      // This will vary based on your authentication setup
    }
    
    // Navigate to MOM page
    await page.goto(`${TEST_URL}/mom`);
    await page.waitForLoadState('networkidle');
  });

  test('MOM List should display properly', async ({ page }) => {
    // Wait for MOM list to load
    await page.waitForSelector('text=MOM List', { timeout: 10000 });
    
    // Check if the list container exists
    const listContainer = page.locator('.grid.gap-4');
    await expect(listContainer).toBeVisible();
    
    // Check if at least one MOM item is displayed
    const momItems = page.locator('[class*="bg-white"][class*="rounded-lg"][class*="shadow"]');
    const itemCount = await momItems.count();
    
    console.log(`Found ${itemCount} MOM items in the list`);
    expect(itemCount).toBeGreaterThan(0);
    
    // Verify MOM item structure
    if (itemCount > 0) {
      const firstItem = momItems.first();
      
      // Check for MOM ID
      const momId = firstItem.locator('text=/MOM-/');
      await expect(momId).toBeVisible();
      
      // Check for revision number
      const revision = firstItem.locator('text=/Rev\\./');
      await expect(revision).toBeVisible();
      
      // Check for status badge
      const status = firstItem.locator('[class*="rounded"][class*="px-2"]').first();
      await expect(status).toBeVisible();
    }
  });

  test('MOM Detail fields should display when opening a MOM', async ({ page }) => {
    // Wait for list to load
    await page.waitForSelector('.grid.gap-4', { timeout: 10000 });
    
    // Click on the first MOM item's Edit button
    const editButton = page.locator('button:has-text("Edit")').first();
    await editButton.click();
    
    // Wait for MOM editor to load
    await page.waitForSelector('text=Meeting Details', { timeout: 10000 });
    
    // Test 1: Check Meeting Details section
    console.log('Checking Meeting Details section...');
    const meetingDetailsSection = page.locator('section:has(h2:text("Meeting Details"))');
    await expect(meetingDetailsSection).toBeVisible();
    
    // Test 2: Check Meeting Title field
    console.log('Checking Meeting Title field...');
    const titleSection = page.locator('text=Meeting Title').first();
    await expect(titleSection).toBeVisible();
    
    // Check if title has content (either in input or display)
    const titleInputs = page.locator('[role="tabpanel"] >> visible=true').first();
    const titleContent = await titleInputs.textContent();
    console.log('Title content:', titleContent);
    
    // Test 3: Check Meeting Goal field
    console.log('Checking Meeting Goal field...');
    const goalSection = page.locator('text=Meeting Goal').first();
    await expect(goalSection).toBeVisible();
    
    // Test 4: Check Meeting Date field
    console.log('Checking Meeting Date field...');
    const dateInput = page.locator('input[type="date"]').first();
    await expect(dateInput).toBeVisible();
    const dateValue = await dateInput.inputValue();
    console.log('Date value:', dateValue);
    expect(dateValue).not.toBe('');
    
    // Test 5: Check Time Slots section
    console.log('Checking Time Slots section...');
    const timeSlotsSection = page.locator('section:has(h2:text("Time"))');
    await expect(timeSlotsSection).toBeVisible();
    
    // Check main time slot
    const mainTimeSlot = page.locator('text=Main Time Slot').first();
    await expect(mainTimeSlot).toBeVisible();
    
    // Check time inputs
    const startTimeInput = page.locator('input[type="time"]').first();
    await expect(startTimeInput).toBeVisible();
    const startTimeValue = await startTimeInput.inputValue();
    console.log('Start time:', startTimeValue);
    
    // Test 6: Check Companies and Attendees section
    console.log('Checking Companies and Attendees section...');
    const companiesSection = page.locator('section:has(h2:text("Companies and Attendees"))');
    await expect(companiesSection).toBeVisible();
    
    // Check if company cards exist
    const companyCards = page.locator('.bg-white.rounded-lg.shadow-sm.border');
    const cardCount = await companyCards.count();
    console.log(`Found ${cardCount} company cards`);
    
    if (cardCount > 0) {
      // Check first company card
      const firstCard = companyCards.first();
      
      // Check company dropdown
      const companySelect = firstCard.locator('select').first();
      await expect(companySelect).toBeVisible();
      const selectedCompany = await companySelect.inputValue();
      console.log('Selected company:', selectedCompany);
      
      // Check attendees section
      const attendeesSection = firstCard.locator('text=Attendees');
      await expect(attendeesSection).toBeVisible();
    }
    
    // Test 7: Check Agenda Structure section
    console.log('Checking Agenda Structure section...');
    const agendaSection = page.locator('section:has(h2:text("Agenda Structure"))');
    await expect(agendaSection).toBeVisible();
    
    // Check for action items if they exist
    const actionItems = page.locator('[class*="border-l-4"]');
    const actionCount = await actionItems.count();
    console.log(`Found ${actionCount} action items`);
  });

  test('MOM data should persist after page reload', async ({ page }) => {
    // Open first MOM
    const editButton = page.locator('button:has-text("Edit")').first();
    await editButton.click();
    
    await page.waitForSelector('text=Meeting Details', { timeout: 10000 });
    
    // Get initial values
    const dateInput = page.locator('input[type="date"]').first();
    const initialDate = await dateInput.inputValue();
    
    // Get MOM ID from the header
    const momIdElement = page.locator('.font-mono').first();
    const momId = await momIdElement.textContent();
    
    console.log('Initial MOM ID:', momId);
    console.log('Initial date:', initialDate);
    
    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Wait for content to load
    await page.waitForSelector('text=Meeting Details', { timeout: 10000 });
    
    // Check if values persist
    const dateInputAfter = page.locator('input[type="date"]').first();
    const dateAfter = await dateInputAfter.inputValue();
    
    console.log('Date after reload:', dateAfter);
    
    // Values should be the same
    expect(dateAfter).toBe(initialDate);
  });

  test('Check console for errors', async ({ page }) => {
    const errors: string[] = [];
    
    // Listen for console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Navigate to MOM list
    await page.goto(`${TEST_URL}/mom`);
    await page.waitForLoadState('networkidle');
    
    // Open a MOM
    const editButton = page.locator('button:has-text("Edit")').first();
    if (await editButton.isVisible()) {
      await editButton.click();
      await page.waitForSelector('text=Meeting Details', { timeout: 10000 });
    }
    
    // Check for errors
    if (errors.length > 0) {
      console.log('Console errors found:');
      errors.forEach(error => console.log('  -', error));
    }
    
    // Test should pass even with some console errors, but log them for debugging
    expect(errors.filter(e => e.includes('Failed to load MOM')).length).toBe(0);
  });

  test('Debug: Log all visible text content', async ({ page }) => {
    // Open first MOM
    const editButton = page.locator('button:has-text("Edit")').first();
    await editButton.click();
    
    await page.waitForSelector('text=Meeting Details', { timeout: 10000 });
    
    // Get all visible text in Meeting Details section
    const meetingDetails = page.locator('section:has(h2:text("Meeting Details"))');
    const meetingText = await meetingDetails.textContent();
    console.log('Meeting Details content:', meetingText);
    
    // Get all input values
    const inputs = await page.locator('input:visible').all();
    for (let i = 0; i < inputs.length; i++) {
      const value = await inputs[i].inputValue();
      const type = await inputs[i].getAttribute('type');
      if (value) {
        console.log(`Input[${i}] (${type}):`, value);
      }
    }
    
    // Get all select values
    const selects = await page.locator('select:visible').all();
    for (let i = 0; i < selects.length; i++) {
      const value = await selects[i].inputValue();
      if (value) {
        console.log(`Select[${i}]:`, value);
      }
    }
  });
});