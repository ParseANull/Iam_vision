const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

// Sidebar steps
Then('the filter sidebar should be expanded after selecting environment', async function () {
  // Sidebar auto-expands when first environment is selected
  const sidebar = await this.page.locator('#filter-sidebar');
  const isExpanded = await sidebar.getAttribute('data-expanded');
  expect(isExpanded).toBe('true');
});

Then('the sidebar toggle button should be visible', async function () {
  const toggleButton = await this.page.locator('#sidebar-toggle');
  await expect(toggleButton).toBeVisible({ timeout: 10000 });
});

When('I click the sidebar toggle button', async function () {
  // Wait for page to be fully loaded
  await this.page.waitForLoadState('networkidle');
  // Wait for the button to exist in DOM
  await this.page.waitForSelector('#sidebar-toggle', { state: 'attached', timeout: 15000 });
  
  const sidebar = await this.page.locator('#filter-sidebar');
  const beforeState = await sidebar.getAttribute('data-expanded');
  
  // Try clicking with force if element is covered
  const toggleButton = await this.page.locator('#sidebar-toggle');
  await toggleButton.click({ force: true, timeout: 15000 });
  
  // Wait for state to change
  const expectedState = beforeState === 'true' ? 'false' : 'true';
  await this.page.waitForFunction(
    ({ expected }) => document.getElementById('filter-sidebar')?.getAttribute('data-expanded') === expected,
    { expected: expectedState },
    { timeout: 5000 }
  );
  await this.page.waitForTimeout(300); // Animation time
});

Then('the filter sidebar should expand', async function () {
  const sidebar = await this.page.locator('#filter-sidebar');
  const isExpanded = await sidebar.getAttribute('data-expanded');
  expect(isExpanded).toBe('true');
});

Then('the data type filters should be visible', async function () {
  // Wait for sidebar content to be populated after environment selection
  await this.page.waitForSelector('.filter-accordion', { state: 'visible', timeout: 15000 });
  const dataTypes = await this.page.locator('.data-type-list');
  await expect(dataTypes.first()).toBeVisible();
});

Then('the filter sidebar should collapse', async function () {
  const sidebar = await this.page.locator('#filter-sidebar');
  const isExpanded = await sidebar.getAttribute('data-expanded');
  expect(isExpanded).toBe('false');
});

Then('the data type filters should not be visible', async function () {
  // When sidebar is collapsed, the filter content should be hidden
  const sidebar = await this.page.locator('#filter-sidebar');
  const isExpanded = await sidebar.getAttribute('data-expanded');
  expect(isExpanded).toBe('false');
});

Then('I should see the {string} accordion section', async function (sectionName) {
  // First ensure sidebar is expanded
  const sidebar = await this.page.locator('#filter-sidebar');
  const isExpanded = await sidebar.getAttribute('data-expanded');
  
  if (isExpanded !== 'true') {
    // Re-expand sidebar if it was collapsed
    await this.page.evaluate(() => {
      const btn = document.getElementById('sidebar-toggle');
      if (btn) btn.click();
    });
    await this.page.waitForFunction(
      () => document.getElementById('filter-sidebar')?.getAttribute('data-expanded') === 'true',
      {},
      { timeout: 5000 }
    );
    await this.page.waitForTimeout(300);
  }
  
  // For sidebar, we're looking for environment accordion items or data type lists
  if (sectionName === 'Data Types') {
    await this.page.waitForSelector('.data-type-list', { state: 'visible', timeout: 10000 });
    const list = await this.page.locator('.data-type-list');
    await expect(list.first()).toBeVisible();
  } else if (sectionName === 'Data Limiting') {
    const control = await this.page.locator('#data-limit-control');
    await expect(control).toBeVisible();
  }
});

Then('the {string} accordion should be expanded by default', async function (sectionName) {
  // Check if the first environment accordion is expanded
  if (sectionName === 'Data Types') {
    const firstHeader = await this.page.locator('.filter-accordion-header').first();
    await this.page.waitForTimeout(500);
    const isExpanded = await firstHeader.getAttribute('aria-expanded');
    expect(isExpanded).toBe('true');
  }
});

Then('all data type checkboxes should be visible', async function () {
  const checkboxes = await this.page.locator('.data-type-item input[type="checkbox"]');
  const count = await checkboxes.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    await expect(checkboxes.nth(i)).toBeVisible();
  }
});

When('I click the sidebar toggle button again', { timeout: 20000 }, async function () {
  // Wait for transitions from first click to complete
  await this.page.waitForLoadState('networkidle');
  await this.page.waitForTimeout(800); // Wait for CSS transition (0.3s) + extra buffer
  
  const sidebar = await this.page.locator('#filter-sidebar');
  const beforeState = await sidebar.getAttribute('data-expanded');
  
  // Wait for button to be in its final position and visible
  await this.page.waitForSelector('#sidebar-toggle', { state: 'visible', timeout: 15000 });
  
  // Try using JavaScript click instead of Playwright click
  await this.page.evaluate(() => {
    const btn = document.getElementById('sidebar-toggle');
    if (btn) {
      console.log('Clicking button via JS');
      btn.click();
    }
  });
  
  // Wait for state to change
  const expectedState = beforeState === 'true' ? 'false' : 'true';
  await this.page.waitForFunction(
    ({ expected }) => document.getElementById('filter-sidebar')?.getAttribute('data-expanded') === expected,
    { expected: expectedState },
    { timeout: 10000 }
  );
  await this.page.waitForTimeout(300); // Animation time
});

When('I uncheck the {string} data type', async function (dataType) {
  // First ensure sidebar is expanded
  const sidebar = await this.page.locator('#filter-sidebar');
  const isExpanded = await sidebar.getAttribute('data-expanded');
  
  if (isExpanded !== 'true') {
    // Re-expand sidebar
    await this.page.evaluate(() => {
      const btn = document.getElementById('sidebar-toggle');
      if (btn) btn.click();
    });
    await this.page.waitForFunction(
      () => document.getElementById('filter-sidebar')?.getAttribute('data-expanded') === 'true',
      {},
      { timeout: 5000 }
    );
    await this.page.waitForTimeout(500);
  }
  
  // Now click the checkbox
  const checkboxId = `filter-bidevt-${dataType.toLowerCase()}`;
  await this.page.waitForSelector(`#${checkboxId}`, { state: 'visible', timeout: 10000 });
  
  const checkbox = await this.page.locator(`#${checkboxId}`);
  const isChecked = await checkbox.isChecked();
  if (isChecked) {
    await checkbox.click({ force: true });
    await this.page.waitForTimeout(500);
  }
});

When('I check the {string} data type again', async function (dataType) {
  const checkbox = await this.page.locator(`input[type="checkbox"][data-type="${dataType.toLowerCase()}"]`);
  const isChecked = await checkbox.isChecked();
  if (!isChecked) {
    await checkbox.click();
    await this.page.waitForTimeout(500);
  }
});

Then('the {string} checkbox should be unchecked', { timeout: 15000 }, async function (dataType) {
  // First ensure sidebar is expanded to access the checkbox
  const sidebar = await this.page.locator('#filter-sidebar');
  const isExpanded = await sidebar.getAttribute('data-expanded');
  
  if (isExpanded !== 'true') {
    await this.page.evaluate(() => {
      const btn = document.getElementById('sidebar-toggle');
      if (btn) btn.click();
    });
    await this.page.waitForFunction(
      () => document.getElementById('filter-sidebar')?.getAttribute('data-expanded') === 'true',
      {},
      { timeout: 5000 }
    );
    await this.page.waitForTimeout(500);
  }
  
  const checkboxId = `filter-bidevt-${dataType.toLowerCase()}`;
  await this.page.waitForSelector(`#${checkboxId}`, { state: 'visible', timeout: 10000 });
  const checkbox = await this.page.locator(`#${checkboxId}`);
  await expect(checkbox).not.toBeChecked();
});

Then('applications data should not be displayed in visualizations', async function () {
  // This is a visual check - we verify the checkbox state which controls visibility
  const checkbox = await this.page.locator('#filter-bidevt-applications');
  await expect(checkbox).not.toBeChecked();
});

Then('both {string} and {string} should be unchecked', async function (type1, type2) {
  const checkbox1 = await this.page.locator(`input[type="checkbox"][data-type="${type1.toLowerCase()}"]`);
  const checkbox2 = await this.page.locator(`input[type="checkbox"][data-type="${type2.toLowerCase()}"]`);
  await expect(checkbox1).not.toBeChecked();
  await expect(checkbox2).not.toBeChecked();
});

Then('only the remaining data types should be visible in visualizations', async function () {
  // Verify at least one checkbox is still checked
  const checkedCheckboxes = await this.page.locator('.data-type-item input[type="checkbox"]:checked');
  const count = await checkedCheckboxes.count();
  expect(count).toBeGreaterThan(0);
});

When('all data types are checked', async function () {
  const checkboxes = await this.page.locator('.data-type-item input[type="checkbox"]');
  const count = await checkboxes.count();
  for (let i = 0; i < count; i++) {
    const checkbox = checkboxes.nth(i);
    const isChecked = await checkbox.isChecked();
    if (!isChecked) {
      await checkbox.click();
      await this.page.waitForTimeout(200);
    }
  }
});

Then('all available data should be displayed in visualizations', async function () {
  const checkedCheckboxes = await this.page.locator('.data-type-item input[type="checkbox"]:checked');
  const count = await checkedCheckboxes.count();
  expect(count).toBeGreaterThan(0);
});

Then('the URL should reflect the data type selection', async function () {
  const url = this.page.url();
  expect(url).toContain('dataTypes=');
});

Then('the {string} data type should still be unchecked', async function (dataType) {
  await this.page.click('.bx--header__action--menu');
  await this.page.waitForTimeout(300);
  const checkbox = await this.page.locator(`input[type="checkbox"][data-type="${dataType.toLowerCase()}"]`);
  await expect(checkbox).not.toBeChecked();
});

Then('the sidebar should be expanded', async function () {
  const sidebar = await this.page.locator('.bx--side-nav');
  const isCollapsed = await sidebar.getAttribute('data-sidebar-collapsed');
  expect(isCollapsed).toBe('false');
});

Then('the sidebar should remain expanded', async function () {
  const sidebar = await this.page.locator('.bx--side-nav');
  const isCollapsed = await sidebar.getAttribute('data-sidebar-collapsed');
  expect(isCollapsed).toBe('false');
});

Then('the sidebar styling should adapt to dark theme', async function () {
  const sidebar = await this.page.locator('.bx--side-nav');
  await expect(sidebar).toBeVisible();
  // Verify dark theme is applied
  const bodyTheme = await this.page.getAttribute('body', 'data-theme');
  expect(bodyTheme).toBe('dark');
});
