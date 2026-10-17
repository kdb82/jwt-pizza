import { test, expect } from './testSetup';
import type { Page } from '@playwright/test';

const admin = { id: 'admin-1', name: 'Admin User', email: 'a@jwt.com', roles: [{ role: 'admin' }] };

function makeUsers(prefix: string, count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i}`,
    name: `${prefix} ${i}`,
    email: `${prefix.toLowerCase()}${i}@jwt.com`,
    roles: [{ role: i === 0 ? 'admin' : 'diner' }],
  }));
}

async function mockAdminApi(page: Page) {
  const userRequests: URLSearchParams[] = [];

  await page.route('*/**/api/auth', async (route) => {
    await route.fulfill({ json: { user: admin, token: 'admin-token' } });
  });

  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({ json: admin });
  });

  await page.route(
    (url) => url.pathname === '/api/franchise',
    async (route) => {
      await route.fulfill({ json: { franchises: [], more: false } });
    }
  );

  await page.route(
    (url) => url.pathname === '/api/user',
    async (route) => {
      expect(route.request().method()).toBe('GET');
      const params = new URL(route.request().url()).searchParams;
      userRequests.push(params);
      const page = params.get('page');
      const name = params.get('name');
      if (name === '*Juan*') {
        await route.fulfill({ json: { users: [{ id: 'juan', name: 'Juan', email: 'j@gmal.com', roles: [{ role: 'diner' }, { role: 'franchisee' }] }], more: false } });
      } else if (page === '2') {
        await route.fulfill({ json: { users: makeUsers('Second', 3), more: false } });
      } else {
        await route.fulfill({ json: { users: makeUsers('First', 10), more: true } });
      }
    }
  );

  return { userRequests };
}

function lastRequest(requests: URLSearchParams[]) {
  return requests[requests.length - 1];
}

async function openAdminDashboard(page: Page) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email address' }).fill('a@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('admin');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('link', { name: 'Admin' }).click();
}

test('admin dashboard lists users with name, email, and role', async ({ page }) => {
  const api = await mockAdminApi(page);
  await openAdminDashboard(page);

  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
  await expect(page.getByRole('row', { name: /First 0\s+first0@jwt\.com\s+admin/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /First 9\s+first9@jwt\.com\s+diner/ })).toBeVisible();

  const first = api.userRequests[0];
  expect(first.get('page')).toBe('1');
  expect(first.get('limit')).toBe('10');
  expect(first.get('name')).toBe('*');
});

test('admin users list pages forward and back', async ({ page }) => {
  const api = await mockAdminApi(page);
  await openAdminDashboard(page);

  await expect(page.getByRole('button', { name: 'Prev' })).toBeDisabled();
  await page.getByRole('button', { name: 'Next' }).click();

  await expect(page.getByRole('row', { name: /Second 2/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /First 0/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
  expect(lastRequest(api.userRequests).get('page')).toBe('2');

  await page.getByRole('button', { name: 'Prev' }).click();
  await expect(page.getByRole('row', { name: /First 0/ })).toBeVisible();
  expect(lastRequest(api.userRequests).get('page')).toBe('1');
});

test('admin users list searches by name', async ({ page }) => {
  const api = await mockAdminApi(page);
  await openAdminDashboard(page);

  await page.getByPlaceholder('Name', { exact: true }).fill('Juan');
  await page.getByRole('button', { name: 'Search' }).click();

  await expect(page.getByRole('row', { name: /Juan\s+j@gmal\.com\s+diner, franchisee/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /First 0/ })).toHaveCount(0);
  const last = lastRequest(api.userRequests);
  expect(last.get('name')).toBe('*Juan*');
  expect(last.get('page')).toBe('1');
  expect(last.get('limit')).toBe('10');
});

test('admin users list shows a disabled delete placeholder per user', async ({ page }) => {
  await mockAdminApi(page);
  await openAdminDashboard(page);

  await expect(page.getByRole('button', { name: /^Delete First \d$/ })).toHaveCount(10);
  await expect(page.getByRole('button', { name: 'Delete First 0' })).toBeDisabled();
});
