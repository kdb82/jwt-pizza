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
    if (route.request().method() === 'DELETE') {
      await route.fulfill({ json: {} });
      return;
    }

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

async function mockRegister(page: Page) {
  await page.route('*/**/api/auth', async (route) => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toEqual({
      name: 'Jordan Lee',
      email: 'jordan@example.com',
      password: 'password123',
    });
    await route.fulfill({
      json: {
        user: {
          id: '4',
          name: 'Jordan Lee',
          email: 'jordan@example.com',
          roles: [{ role: 'diner' }],
        },
        token: 'register-token',
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

async function mockOrderHistory(page: Page) {
  await page.route('*/**/api/order', async (route) => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({
      json: {
        orders: [
          {
            id: '23',
            date: '2026-10-05T12:00:00.000Z',
            items: [{ menuId: '2', description: 'Pepperoni', price: 0.0042 }],
          },
        ],
      },
    });
  });
}

async function mockDocs(page: Page) {
  await page.route('*/**/api/docs', async (route) => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({
      json: {
        endpoints: [
          {
            requiresAuth: false,
            method: 'GET',
            path: '/api/order/menu',
            description: 'Get the pizza menu',
            example: '{}',
            response: [],
          },
        ],
      },
    });
  });
}

test('home page', async ({ page }) => {
  await page.goto('/');

  expect(await page.title()).toBe('JWT Pizza');
});

test('login', async ({ page }) => {
  await mockLogin(page);
  await page.goto('http://localhost:5173/');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('kdb82@byu.edu');
  await page.getByRole('textbox', { name: 'Email address' }).press('Tab');
  await page.getByRole('textbox', { name: 'Password' }).fill('kdb82');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByRole('link', { name: 'KC' })).toBeVisible();
});

test('register', async ({ page }) => {
  await mockRegister(page);
  await page.goto('/');
  await page.getByRole('link', { name: 'Register' }).click();
  await page.getByPlaceholder('Full name').fill('Jordan Lee');
  await page.getByPlaceholder('Email address').fill('jordan@example.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Register' }).click();

  await expect(page.getByRole('link', { name: 'JL' })).toBeVisible();
});

test('logout', async ({ page }) => {
  await mockLogin(page);
  await page.goto('/');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('kdb82@byu.edu');
  await page.getByRole('textbox', { name: 'Password' }).fill('kdb82');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('link', { name: 'Logout' }).click();

  await expect(page.getByRole('link', { name: 'Login' })).toBeVisible();
});

test('diner dashboard', async ({ page }) => {
  await mockLogin(page);
  await mockOrderHistory(page);
  await page.goto('/');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('kdb82@byu.edu');
  await page.getByRole('textbox', { name: 'Password' }).fill('kdb82');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('link', { name: 'KC' }).click();

  await expect(page.getByRole('heading', { name: 'Your pizza kitchen' })).toBeVisible();
  await expect(page.getByRole('main')).toContainText('Kai Chen');
  await expect(page.locator('tbody')).toContainText('23');
  await expect(page.locator('tbody')).toContainText('0.004 ₿');
});

test('public page navigation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'About' }).click();
  await expect(page.getByRole('heading', { name: 'The secret sauce' })).toBeVisible();

  await page.getByRole('link', { name: 'History' }).click();
  await expect(page.getByRole('heading', { name: 'Mama Rucci, my my' })).toBeVisible();
});

test('unknown page', async ({ page }) => {
  await page.goto('/does-not-exist');

  await expect(page.getByRole('heading', { name: 'Oops' })).toBeVisible();
  await expect(page.getByRole('main')).toContainText('Please try another page.');
});

test('API documentation', async ({ page }) => {
  await mockDocs(page);
  await page.goto('/docs');

  await expect(page.getByRole('heading', { name: 'JWT Pizza API' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '[GET] /api/order/menu' })).toBeVisible();
  await expect(page.getByText('Get the pizza menu')).toBeVisible();
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