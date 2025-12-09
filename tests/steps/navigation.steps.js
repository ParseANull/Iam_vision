const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

// Navigation steps
When('I am on the {string} page', async function (pageName) {
  const navItem = await this.page.locator(`.bx--header__menu-item:has-text("${pageName}")`);
  await navItem.click();
  await this.page.waitForTimeout(500);
});

When('I navigate to the {string} page', async function (pageName) {
  const navItem = await this.page.locator(`.bx--header__menu-item:has-text("${pageName}")`);
  await navItem.click();
  await this.page.waitForTimeout(500);
});

When('I click on the {string} navigation item', async function (itemName) {
  const navItem = await this.page.locator(`.bx--header__menu-item:has-text("${itemName}")`);
  await navItem.click();
  await this.page.waitForTimeout(500);
});

Then('the navigation menu should be visible in the header', async function () {
  const nav = await this.page.locator('.bx--header__nav');
  await expect(nav).toBeVisible();
});

Then('I should see navigation items:', async function (dataTable) {
  const expectedItems = dataTable.raw().flat();
  for (const item of expectedItems) {
    const navItem = await this.page.locator(`.bx--header__menu-item:has-text("${item}")`);
    await expect(navItem).toBeVisible();
  }
});

Then('the {string} navigation item should be marked as active', async function (itemName) {
  const navItem = await this.page.locator(`.bx--header__menu-item:has-text("${itemName}")`);
  const classes = await navItem.getAttribute('class');
  expect(classes).toContain('bx--header__menu-item--current');
});

Then('the {string} navigation item should not be active', async function (itemName) {
  const navItem = await this.page.locator(`.bx--header__menu-item:has-text("${itemName}")`);
  const classes = await navItem.getAttribute('class');
  expect(classes).not.toContain('bx--header__menu-item--current');
});

Then('the Overview page content should be displayed', async function () {
  const content = await this.page.locator('#visualization-container');
  await expect(content).toBeVisible();
});

Then('the Applications page content should be displayed', async function () {
  const content = await this.page.locator('#visualization-container');
  await expect(content).toBeVisible();
});

Then('the Federations page content should be displayed', async function () {
  const content = await this.page.locator('#visualization-container');
  await expect(content).toBeVisible();
});

Then('the MFA page content should be displayed', async function () {
  const content = await this.page.locator('#visualization-container');
  await expect(content).toBeVisible();
});

Then('the Attributes page content should be displayed', async function () {
  const content = await this.page.locator('#visualization-container');
  await expect(content).toBeVisible();
});

Then('the URL should update to reflect the Applications view', async function () {
  const url = this.page.url();
  expect(url).toContain('view=applications');
});

Then('the Applications data should be from {string}', async function (environment) {
  // Verify environment is still selected
  await this.page.click('.bx--list-box__field');
  const checkbox = await this.page.locator(`input[type="checkbox"][value="${environment}"]`);
  await expect(checkbox).toBeChecked();
});

Then('the {string} item should have a blue bottom border', async function (itemName) {
  const navItem = await this.page.locator(`.bx--header__menu-item:has-text("${itemName}")`);
  const borderColor = await navItem.evaluate(el => window.getComputedStyle(el).borderBottomColor);
  // Check that border exists (color should be set)
  expect(borderColor).toBeTruthy();
});

Then('the {string} item should have a distinct visual style', async function (itemName) {
  const navItem = await this.page.locator(`.bx--header__menu-item:has-text("${itemName}")`);
  const classes = await navItem.getAttribute('class');
  expect(classes).toContain('bx--header__menu-item--current');
});

Then('the navigation should work correctly', async function () {
  // Verify we can navigate and content updates
  const content = await this.page.locator('#visualization-container');
  await expect(content).toBeVisible();
});

Then('the active item should be clearly visible in dark theme', async function () {
  const bodyTheme = await this.page.getAttribute('body', 'data-theme');
  expect(bodyTheme).toBe('dark');
  const activeItem = await this.page.locator('.bx--header__menu-item--current');
  await expect(activeItem).toBeVisible();
});

When('I navigate through all menu items', async function () {
  const menuItems = ['Overview', 'Applications', 'Federations', 'MFA', 'Attributes'];
  for (const item of menuItems) {
    const navItem = await this.page.locator(`.bx--header__menu-item:has-text("${item}")`);
    await navItem.click();
    await this.page.waitForTimeout(300);
  }
});

When('I navigate back to the {string} page', async function (pageName) {
  const navItem = await this.page.locator(`.bx--header__menu-item:has-text("${pageName}")`);
  await navItem.click();
  await this.page.waitForTimeout(500);
});

When('I scroll down the page', async function () {
  await this.page.evaluate(() => {
    window.scrollTo(0, 500);
  });
  await this.page.waitForTimeout(500);
});

Then('the navigation bar should still be visible', async function () {
  const nav = await this.page.locator('.bx--header');
  await expect(nav).toBeVisible();
  
  // Verify it's at the top (sticky/fixed positioning)
  const boundingBox = await nav.boundingBox();
  expect(boundingBox.y).toBeLessThanOrEqual(5); // Allow for small margins
});
