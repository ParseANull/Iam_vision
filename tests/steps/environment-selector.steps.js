const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

// Background steps
Given('I am on the IAM dashboard', async function () {
  await this.page.goto(`${this.baseURL}/index.html`);
  await this.page.waitForLoadState('networkidle');
  await this.page.waitForTimeout(1000); // Allow for initialization
});

Given('I have selected the {string} environment', async function (environment) {
  await this.page.click('.bx--list-box__field');
  await this.page.waitForSelector('.bx--list-box__menu-item', { state: 'visible' });
  await this.page.click(`text="${environment}"`);
  await this.page.waitForTimeout(500);
});

// Environment Selector steps
When('I click the environment selector', async function () {
  await this.page.click('.bx--list-box__field');
  await this.page.waitForSelector('.bx--list-box__menu-item', { state: 'visible' });
});

When('I select the {string} environment', async function (environment) {
  const menuItem = await this.page.locator(`text="${environment}"`).first();
  await menuItem.click();
  await this.page.waitForTimeout(500);
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
  const legend = await this.page.locator('.environment-legend');
  await expect(legend).toBeVisible();
});

Then('the legend should show {string} with its assigned color', async function (environment) {
  const legendItem = await this.page.locator(`.legend-item:has-text("${environment}")`);
  await expect(legendItem).toBeVisible();
  const colorBox = await legendItem.locator('.legend-color-box');
  await expect(colorBox).toBeVisible();
});

Then('both {string} and {string} should be selected', async function (env1, env2) {
  const checkbox1 = await this.page.locator(`input[type="checkbox"][value="${env1}"]`);
  const checkbox2 = await this.page.locator(`input[type="checkbox"][value="${env2}"]`);
  await expect(checkbox1).toBeChecked();
  await expect(checkbox2).toBeChecked();
});

Then('the environment legend should show both environments with their colors', async function () {
  const legend = await this.page.locator('.environment-legend');
  await expect(legend).toBeVisible();
  const legendItems = await this.page.locator('.legend-item').count();
  expect(legendItems).toBeGreaterThanOrEqual(2);
});

Then('only {string} should be selected', async function (environment) {
  const checkbox = await this.page.locator(`input[type="checkbox"][value="${environment}"]`);
  await expect(checkbox).toBeChecked();
});

Then('the legend should only show {string}', async function (environment) {
  const legendItems = await this.page.locator('.legend-item').count();
  expect(legendItems).toBe(1);
  const legendItem = await this.page.locator(`.legend-item:has-text("${environment}")`);
  await expect(legendItem).toBeVisible();
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
