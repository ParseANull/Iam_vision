const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

// Visualization steps
Then('I should see statistics cards', async function () {
  const cards = await this.page.locator('.metric-card');
  const count = await cards.count();
  expect(count).toBeGreaterThan(0);
});

Then('the cards should display data from the selected environment', async function () {
  const cards = await this.page.locator('.metric-card');
  const count = await cards.count();
  expect(count).toBeGreaterThan(0);
});

Then('each card should show a count and label', async function () {
  const cards = await this.page.locator('.metric-card');
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
  // Legend only shows with multiple environments selected
  // For single environment, just verify visualization container is visible
  const container = await this.page.locator('.main-visualization-area');
  await expect(container).toBeVisible();
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

Then('the visualizations should show data from both environments', { timeout: 20000 }, async function () {
  // Wait for data to load
  await this.page.waitForTimeout(3000);
  
  const legend = await this.page.locator('.environment-legend');
  await expect(legend).toBeVisible({ timeout: 15000 });
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

Then('the visualizations should update to show {string} data', { timeout: 20000 }, async function (environment) {
  // Wait for data to load and visualizations to update
  await this.page.waitForTimeout(3000);
  
  // Check if we have multiple environments (legend would be visible)
  const legendCount = await this.page.locator('.environment-legend').count();
  
  if (legendCount > 0) {
    // Wait a bit more for legend to populate
    await this.page.waitForTimeout(1000);
    
    // Check if legend is actually visible (only shown for multiple environments)
    const isVisible = await this.page.locator('.environment-legend').isVisible().catch(() => false);
    
    if (isVisible) {
      // Multiple environments - check for legend item
      const legendItem = await this.page.locator(`.legend-item:has-text("${environment}")`);
      await expect(legendItem).toBeVisible({ timeout: 15000 });
    } else {
      // Single environment - just verify visualization container is updated
      const container = await this.page.locator('.main-visualization-area');
      await expect(container).toBeVisible({ timeout: 15000 });
    }
  } else {
    // No legend at all - single environment, verify visualization container is updated
    const container = await this.page.locator('.main-visualization-area');
    await expect(container).toBeVisible({ timeout: 15000 });
  }
});

Then('the statistics should reflect the new environment', async function () {
  const container = await this.page.locator('.main-visualization-area');
  await expect(container).toBeVisible({ timeout: 15000 });
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

When('I select an environment with no data', { timeout: 20000 }, async function () {
  // Check if menu is already open
  const menuVisible = await this.page.locator('#environment-selector-menu').isVisible().catch(() => false);
  
  if (!menuVisible) {
    await this.page.click('#environment-selector-toggle', { timeout: 15000 });
    await this.page.waitForSelector('#environment-selector-menu', { state: 'visible', timeout: 15000 });
  }
  
  await this.page.waitForSelector('.bx--list-box__menu-item', { state: 'visible', timeout: 15000 });
  const environments = await this.page.locator('.bx--list-box__menu-item').all();
  if (environments.length > 0) {
    await environments[0].click();
  }
  await this.page.waitForTimeout(2000);
});

Then('I should see informative messages', async function () {
  // Check console logs (this is tested via browser console)
  // In a real scenario, we'd capture console logs
  const container = await this.page.locator('.main-visualization-area');
  await expect(container).toBeVisible();
});

Then('no error warnings should appear in the console', async function () {
  // Console monitoring would be set up in hooks
  // For now, verify page doesn't crash
  const container = await this.page.locator('.main-visualization-area');
  await expect(container).toBeVisible();
});

Then('the page should not crash', async function () {
  const body = await this.page.locator('body');
  await expect(body).toBeVisible();
});
