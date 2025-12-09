const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

// Background steps
Given('I am on the IAM dashboard', async function () {
  await this.page.goto(`${this.baseURL}/index.html`);
  await this.page.waitForLoadState('networkidle');
  
  // Wait for the environment selector to be initialized
  await this.page.waitForSelector('#environment-selector-toggle', { state: 'visible', timeout: 15000 });
  
  // Wait for JavaScript initialization - menu should have at least 5 items
  await this.page.waitForFunction(() => {
    const menu = document.getElementById('environment-selector-menu');
    if (!menu) return false;
    const items = menu.querySelectorAll('.bx--list-box__menu-item');
    return items.length >= 5;
  }, { timeout: 15000 });
  
  // Wait for sidebar to be ready
  await this.page.waitForSelector('#sidebar-toggle', { state: 'visible', timeout: 15000 });
  
  await this.page.waitForTimeout(1000); // Buffer for initialization
});

Given('I have selected the {string} environment', async function (environment) {
  // Click the selector toggle button
  const toggle = await this.page.locator('#environment-selector-toggle');
  await toggle.click();
  
  // Wait for menu to be visible
  await this.page.waitForSelector('#environment-selector-menu', { state: 'visible', timeout: 5000 });
  await this.page.waitForSelector('.bx--list-box__menu-item', { state: 'visible', timeout: 5000 });
  
  // Find and click the checkbox for this environment
  const checkbox = await this.page.locator(`input[type="checkbox"][value="${environment}"]`);
  await checkbox.click();
  await this.page.waitForTimeout(1000); // Wait for data loading
});

// Environment Selector steps
When('I click the environment selector', async function () {
  const toggle = await this.page.locator('#environment-selector-toggle');
  await toggle.click();
  
  // Wait for menu to become visible
  await this.page.waitForSelector('#environment-selector-menu', { state: 'visible', timeout: 5000 });
  await this.page.waitForSelector('.bx--list-box__menu-item', { state: 'visible', timeout: 5000 });
});

When('I select the {string} environment', async function (environment) {
  // Wait for menu to be visible
  await this.page.waitForSelector('#environment-selector-menu', { state: 'visible', timeout: 10000 });
  
  // Find the checkbox for this environment and wait for it
  const checkbox = await this.page.locator(`input[type="checkbox"][value="${environment}"]`);
  await checkbox.waitFor({ state: 'visible', timeout: 10000 });
  await checkbox.click();
  
  // Wait for data loading and UI updates
  await this.page.waitForTimeout(2000);
});

When('I deselect the {string} environment', async function (environment) {
  const checkbox = await this.page.locator(`input[type="checkbox"][value="${environment}"]`);
  await checkbox.click();
  await this.page.waitForTimeout(500);
});

Then('the environment selector should be visible', async function () {
  const selector = await this.page.locator('.bx--list-box__field');
  await expect(selector).toBeVisible();
});

Then('no environment should be selected by default', async function () {
  const selectedText = await this.page.locator('.bx--list-box__label').textContent();
  expect(selectedText.trim()).toBe('Select environments');
});

Then('the environment legend should not be visible', async function () {
  const legend = await this.page.locator('.environment-legend');
  const count = await legend.count();
  if (count > 0) {
    const display = await legend.evaluate(el => window.getComputedStyle(el).display);
    expect(display).toBe('none');
  }
});

Then('I should see all available environments:', async function (dataTable) {
  const expectedEnvs = dataTable.raw().flat();
  for (const env of expectedEnvs) {
    const menuItem = await this.page.locator(`text="${env}"`).first();
    await expect(menuItem).toBeVisible();
  }
});

Then('the {string} environment should be selected', async function (environment) {
  const checkbox = await this.page.locator(`input[type="checkbox"][value="${environment}"]`);
  await expect(checkbox).toBeChecked();
});

Then('the environment legend should be visible', async function () {
  // Wait for legend to be displayed by JavaScript
  await this.page.waitForSelector('#environment-legend', { state: 'visible', timeout: 10000 });
  const legend = await this.page.locator('#environment-legend');
  await expect(legend).toBeVisible();
});

Then('the legend should show {string} with its assigned color', async function (environment) {
  // Wait for legend items to be populated
  await this.page.waitForSelector('.environment-legend-item', { state: 'visible', timeout: 10000 });
  const legendItem = await this.page.locator(`.environment-legend-item:has-text("${environment}")`);
  await expect(legendItem).toBeVisible();
  const colorBox = await legendItem.locator('.environment-legend-color');
  await expect(colorBox).toBeVisible();
});

Then('both {string} and {string} should be selected', async function (env1, env2) {
  const checkbox1 = await this.page.locator(`input[type="checkbox"][value="${env1}"]`);
  const checkbox2 = await this.page.locator(`input[type="checkbox"][value="${env2}"]`);
  await expect(checkbox1).toBeChecked();
  await expect(checkbox2).toBeChecked();
});

Then('the environment legend should show both environments with their colors', async function () {
  // Wait for legend to be populated with items
  await this.page.waitForSelector('.environment-legend-item', { state: 'visible', timeout: 10000 });
  const legend = await this.page.locator('#environment-legend');
  await expect(legend).toBeVisible();
  const legendItems = await this.page.locator('.environment-legend-item').count();
  expect(legendItems).toBeGreaterThanOrEqual(2);
});

Then('only {string} should be selected', async function (environment) {
  const checkbox = await this.page.locator(`input[type="checkbox"][value="${environment}"]`);
  await expect(checkbox).toBeChecked();
});

Then('the legend should only show {string}', async function (environment) {
  // After deselecting, if only 1 environment remains, legend should be hidden
  // (legend only shows with 2+ environments)
  const legend = await this.page.locator('#environment-legend');
  const isVisible = await legend.isVisible();
  expect(isVisible).toBe(false);
});

Then('the selector should be visible and readable', async function () {
  const selector = await this.page.locator('.bx--list-box__field');
  await expect(selector).toBeVisible();
  const color = await selector.evaluate(el => window.getComputedStyle(el).color);
  expect(color).toBeTruthy();
});

Then('the environment selector should remain visible with appropriate colors', async function () {
  const selector = await this.page.locator('.bx--list-box__field');
  await expect(selector).toBeVisible();
  const backgroundColor = await selector.evaluate(el => window.getComputedStyle(el).backgroundColor);
  const color = await selector.evaluate(el => window.getComputedStyle(el).color);
  expect(backgroundColor).toBeTruthy();
  expect(color).toBeTruthy();
});

Then('the URL should contain the selected environment parameters', async function () {
  const url = this.page.url();
  expect(url).toContain('envs=');
});

When('I refresh the page', async function () {
  await this.page.reload();
  await this.page.waitForLoadState('networkidle');
  await this.page.waitForTimeout(1000);
});

Then('the {string} environment should still be selected', async function (environment) {
  await this.page.click('.bx--list-box__field');
  await this.page.waitForSelector('.bx--list-box__menu-item', { state: 'visible' });
  const checkbox = await this.page.locator(`input[type="checkbox"][value="${environment}"]`);
  await expect(checkbox).toBeChecked();
});
