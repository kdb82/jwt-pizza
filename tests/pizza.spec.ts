import { test, expect } from './testSetup';
import type { Page } from '@playwright/test';

async function mockMenu(page: Page) {
  await page.route('*/**/api/order/menu', async (route) => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({
      json: [
        {
          id: 2,
          title: 'Pepperoni',
          image: 'pizza2.png',
          price: 0.0042,
          description: 'Spicy treat',
        },
      ],
    });
  });
}

async function mockFranchises(page: Page) {
  await page.route('*/**/api/franchise?page=0&limit=20&name=*', async (route) => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({
      json: {
        franchises: [
          {
            id: 1,
            name: 'JWT Pizza',
            stores: [{ id: 1, name: 'Provo' }],
          },
        ],
        more: false,
      },
    });
  });
}

async function mockLogin(page: Page) {
  await page.route('*/**/api/auth', async (route) => {
    expect(route.request().method()).toBe('PUT');
    expect(route.request().postDataJSON()).toEqual({
      email: 'kdb82@byu.edu',
      password: 'kdb82',
    });
    await route.fulfill({
      json: {
        user: {
          id: '3',
          name: 'Kai Chen',
          email: 'kdb82@byu.edu',
          roles: [{ role: 'diner' }],
        },
        token: 'abcdef',
      },
    });
  });
}

async function mockCurrentUser(page: Page) {
  await page.route('*/**/api/user/me', async (route) => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({
      json: {
        id: '3',
        name: 'Kai Chen',
        email: 'kdb82@byu.edu',
        roles: [{ role: 'diner' }],
      },
    });
  });
}

async function mockOrder(page: Page) {
  await page.route('*/**/api/order', async (route) => {
    expect(route.request().method()).toBe('POST');
    const order = route.request().postDataJSON();
    await route.fulfill({
      json: {
        order: { ...order, id: 23 },
        jwt: 'eyJpYXQ',
      },
    });
  });
}

test('home page', async ({ page }) => {
  await page.goto('/');

  expect(await page.title()).toBe('JWT Pizza');
});

test('purchase with login', async ({ page }) => {
  await mockMenu(page);
  await mockFranchises(page);
  await mockLogin(page);
  await mockCurrentUser(page);
  await mockOrder(page);
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