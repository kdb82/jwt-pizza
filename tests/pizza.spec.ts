import { test, expect } from './testSetup';

test('home page', async ({ page }) => {
  await page.goto('/');

  expect(await page.title()).toBe('JWT Pizza');
});

test('purchase with login', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.getByRole('button', { name: 'Order now' }).click();
    await expect(page.locator('h2')).toContainText('Awesome is a click away');
    await page.getByRole('combobox').selectOption('1');
    await page.getByRole('link', { name: 'Image Description Pepperoni' }).first().click();
    await expect(page.locator('form')).toContainText('Selected pizzas: 1');
    await page.getByRole('button', { name: 'Checkout' }).click();
    await page.getByRole('textbox', { name: 'Email address' }).fill('kdb82@byu.edu');
    await page.getByRole('textbox', { name: 'Email address' }).press('Tab');
    await page.getByRole('textbox', { name: 'Password' }).fill('kdb82');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.getByText('So worth it')).toBeVisible();
    await expect(page.getByRole('main')).toContainText('Pay now');
    await expect(page.locator('tbody')).toContainText('Pepperoni');
    await expect(page.locator('tbody')).toContainText('0.004 ₿');
    await page.getByRole('button', { name: 'Pay now' }).click();
    await expect(page.getByText('Here is your JWT Pizza!')).toBeVisible();
    await expect(page.getByRole('main').getByRole('img')).toBeVisible();
    await page.getByRole('button', { name: 'Verify' }).click();
    await page.getByRole('button', { name: 'Close' }).click()
});