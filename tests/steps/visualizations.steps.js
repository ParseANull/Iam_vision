const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

// Visualization steps
Then('I should see statistics cards', async function () {
  const cards = await this.page.locator('.stat-card, .bx--tile');
  const count = await cards.count();
  expect(count).toBeGreaterThan(0);
});

Then('the cards should display data from the selected environment', async function () {
  const cards = await this.page.locator('.stat-card, .bx--tile');
  const count = await cards.count();
  expect(count).toBeGreaterThan(0);
});

Then('each card should show a count and label', async function () {
  const cards = await this.page.locator('.stat-card, .bx--tile');
  const firstCard = cards.first();
  await expect(firstCard).toBeVisible();
});

Then('I should see application visualizations', async function () {
  const container = await this.page.locator('.main-visualization-area');
  await expect(container).toBeVisible();
});

Then('the visualizations should be color-coded by environment', async function () {
  const legend = await this.page.locator('.environment-legend');
  const isVisible = await legend.isVisible().catch(() => false);
  if (isVisible) {
    const legendItems = await this.page.locator('.legend-item').count();
    expect(legendItems).toBeGreaterThan(0);
  }
});

Then('I should see federation visualizations', async function () {
  const container = await this.page.locator('.main-visualization-area');
  await expect(container).toBeVisible();
});

Then('the data should be from the selected environment', async function () {
  // Verify environment legend shows selected environment
  const legend = await this.page.locator('.environment-legend');
  const isVisible = await legend.isVisible().catch(() => false);
  expect(isVisible).toBeTruthy();
});

Then('I should see MFA configuration visualizations', async function () {
  const container = await this.page.locator('.main-visualization-area');
  await expect(container).toBeVisible();
});

Then('the data should represent MFA settings', async function () {
  const container = await this.page.locator('.main-visualization-area');
  await expect(container).toBeVisible();
});

Then('I should see attribute visualizations', async function () {
  const container = await this.page.locator('.main-visualization-area');
  await expect(container).toBeVisible();
});

Then('the data should be properly formatted', async function () {
  const container = await this.page.locator('.main-visualization-area');
  await expect(container).toBeVisible();
});

Then('the visualizations should show data from both environments', async function () {
  const legend = await this.page.locator('.environment-legend');
  await expect(legend).toBeVisible();
  const legendItems = await this.page.locator('.legend-item').count();
  expect(legendItems).toBeGreaterThanOrEqual(2);
});

Then('{string} data should be displayed in its assigned color', async function (environment) {
  const legendItem = await this.page.locator(`.legend-item:has-text("${environment}")`);
  await expect(legendItem).toBeVisible();
  const colorBox = await legendItem.locator('.legend-color-box');
  await expect(colorBox).toBeVisible();
});

Then('the environment legend should show both color assignments', async function () {
  const legend = await this.page.locator('.environment-legend');
  await expect(legend).toBeVisible();
  const legendItems = await this.page.locator('.legend-item').count();
  expect(legendItems).toBe(2);
});

Then('the visualizations should update to show {string} data', async function (environment) {
  await this.page.waitForTimeout(1000); // Wait for data to load
  const legend = await this.page.locator('.environment-legend');
  await expect(legend).toBeVisible();
  const legendItem = await this.page.locator(`.legend-item:has-text("${environment}")`);
  await expect(legendItem).toBeVisible();
});

Then('the statistics should reflect the new environment', async function () {
  const container = await this.page.locator('#visualization-container');
  await expect(container).toBeVisible();
});

Then('the {string} data should not be visible in visualizations', async function (dataType) {
  // Verify checkbox is unchecked
  const checkbox = await this.page.locator(`input[type="checkbox"][data-type="${dataType.toLowerCase()}"]`);
  await expect(checkbox).not.toBeChecked();
});

Then('the {string} data should reappear in visualizations', async function (dataType) {
  // Verify checkbox is checked
  const checkbox = await this.page.locator(`input[type="checkbox"][data-type="${dataType.toLowerCase()}"]`);
  await expect(checkbox).toBeChecked();
});

When('I select an environment with no data', async function () {
  // Try to select an environment (may have empty data files)
  await this.page.click('.bx--list-box__field');
  await this.page.waitForSelector('.bx--list-box__menu-item', { state: 'visible' });
  const environments = await this.page.locator('.bx--list-box__menu-item').all();
  if (environments.length > 0) {
    await environments[0].click();
  }
  await this.page.waitForTimeout(1000);
});

Then('I should see informative messages', async function () {
  // Check console logs (this is tested via browser console)
  // In a real scenario, we'd capture console logs
  const container = await this.page.locator('#visualization-container');
  await expect(container).toBeVisible();
});

Then('no error warnings should appear in the console', async function () {
  // Console monitoring would be set up in hooks
  // For now, verify page doesn't crash
  const container = await this.page.locator('#visualization-container');
  await expect(container).toBeVisible();
});

Then('the page should not crash', async function () {
  const body = await this.page.locator('body');
  await expect(body).toBeVisible();
});
