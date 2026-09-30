const { test, expect } = require('@playwright/test');

test.describe('NMIT Smart Campus - Full Architecture Flow', () => {
  
  test('Public User Flow - Events & Assistant', async ({ page }) => {
    // 1. Load Homepage
    await page.goto('/');
    await expect(page.locator('text=NMIT Smart Campus')).toBeVisible();

    // 2. Check Events Feed without login
    await page.goto('/events');
    await expect(page.locator('text=Upcoming Events')).toBeVisible();

    // 3. Query AI Assistant without login
    await page.goto('/assistant');
    await expect(page.locator('text=AI Assistant')).toBeVisible();
    
    // Simulate query
    await page.fill('input[type="text"]', 'What events are happening today?');
    await page.click('button[type="submit"]');
    
    // Wait for the mock/actual response
    await expect(page.locator('.animate-pulse')).toBeVisible();
    await expect(page.locator('.animate-pulse')).toBeHidden({ timeout: 15000 });
  });

  test('Admin Architecture Flow - Login, Upload & Manage', async ({ page }) => {
    // 1. Login Flow
    await page.goto('/login');
    // Using the seeded admin credentials
    await page.fill('input[type="email"]', 'admin@nmit.ac.in');
    await page.fill('input[type="password"]', 'admin123'); // Assuming standard mock pass
    await page.click('button[type="submit"]');

    // Should redirect to /admin and show Sidebar
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.locator('text=NMIT Admin')).toBeVisible();

    // 2. Upload Flow
    await page.goto('/admin/upload');
    await expect(page.locator('text=Advanced OCR Pipeline')).toBeVisible();

    // Note: Since we are not actually uploading a file in this simple test,
    // we just verify the UI exists. A full test would use page.setInputFiles()

    // 3. Manage Events Flow
    await page.goto('/admin/events');
    await expect(page.locator('text=Manage Events')).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });
});
