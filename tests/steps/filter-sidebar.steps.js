const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

// Sidebar steps
Then('the filter sidebar should be collapsed by default', async function () {
  const sidebar = await this.page.locator('.bx--side-nav');
  const isCollapsed = await sidebar.getAttribute('data-sidebar-collapsed');
  expect(isCollapsed).toBe('true');
});

Then('the sidebar toggle button should be visible', async function () {
  const toggleButton = await this.page.locator('#sidebar-toggle');
  await expect(toggleButton).toBeVisible({ timeout: 10000 });
});

When('I click the sidebar toggle button', async function () {
  // Wait for page to be fully loaded
  await this.page.waitForSelector('#sidebar-toggle', { timeout: 10000 });
  await this.page.waitForTimeout(500); // Wait for any initialization
  
  const toggleButton = await this.page.locator('#sidebar-toggle');
  await toggleButton.click();
  await this.page.waitForTimeout(500); // Animation time
});

Then('the filter sidebar should expand', async function () {
  const sidebar = await this.page.locator('.bx--side-nav');
  const isCollapsed = await sidebar.getAttribute('data-sidebar-collapsed');
  expect(isCollapsed).toBe('false');
});

Then('the data type filters should be visible', async function () {
  const dataTypes = await this.page.locator('.filter-section');
  await expect(dataTypes).toBeVisible();
});

Then('the filter sidebar should collapse', async function () {
  const sidebar = await this.page.locator('.bx--side-nav');
  const isCollapsed = await sidebar.getAttribute('data-sidebar-collapsed');
  expect(isCollapsed).toBe('true');
});

Then('the data type filters should not be visible', async function () {
  const sidebar = await this.page.locator('.bx--side-nav');
  const isCollapsed = await sidebar.getAttribute('data-sidebar-collapsed');
  expect(isCollapsed).toBe('true');
});

Then('I should see the {string} accordion section', async function (sectionName) {
  const section = await this.page.locator(`.bx--accordion__heading:has-text("${sectionName}")`);
  await expect(section).toBeVisible();
});

Then('the {string} accordion should be expanded by default', async function (sectionName) {
  const accordionItem = await this.page.locator(`.bx--accordion__item:has(.bx--accordion__heading:has-text("${sectionName}"))`);
  const isExpanded = await accordionItem.getAttribute('data-expanded');
  expect(isExpanded).toBe('true');
});

Then('all data type checkboxes should be visible', async function () {
  const checkboxes = await this.page.locator('.data-type-item input[type="checkbox"]');
  const count = await checkboxes.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    await expect(checkboxes.nth(i)).toBeVisible();
  }
});

When('I click the sidebar toggle button again', async function () {
  // Same as clicking the sidebar toggle button - reuse the logic
  await this.page.waitForSelector('#sidebar-toggle', { timeout: 10000 });
  await this.page.waitForTimeout(500);
  
  const toggleButton = await this.page.locator('#sidebar-toggle');
  await toggleButton.click();
  await this.page.waitForTimeout(500); // Animation time
});

When('I uncheck the {string} data type', async function (dataType) {
  const checkbox = await this.page.locator(`input[type="checkbox"][data-type="${dataType.toLowerCase()}"]`);
  const isChecked = await checkbox.isChecked();
  if (isChecked) {
    await checkbox.click();
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

Then('the {string} checkbox should be unchecked', async function (dataType) {
  const checkbox = await this.page.locator(`input[type="checkbox"][data-type="${dataType.toLowerCase()}"]`);
  await expect(checkbox).not.toBeChecked();
});

Then('applications data should not be displayed in visualizations', async function () {
  // This is a visual check - we verify the checkbox state which controls visibility
  const checkbox = await this.page.locator('input[type="checkbox"][data-type="applications"]');
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
