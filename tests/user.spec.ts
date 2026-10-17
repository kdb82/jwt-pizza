import { test, expect } from 'playwright-test-coverage';
import type { Page } from '@playwright/test';

type TestRole = 'diner' | 'franchisee' | 'admin';

async function mockUserApi(page: Page, role: TestRole) {
  let user = {
    id: `${role}-1`,
    name: `${role} user`,
    email: `${role}@example.com`,
    roles: [{ role }],
  };
  let password = 'old-password';
  let updateRequest: Record<string, unknown> | undefined;

  await page.route('*/**/api/auth', async (route) => {
    const request = route.request();
    if (request.method() === 'DELETE') {
      await route.fulfill({ json: {} });
      return;
    }


    const credentials = request.postDataJSON();
    expect(request.method()).toBe('PUT');
    expect(credentials.password).toBe(password);
    user = { ...user, email: credentials.email };
    await route.fulfill({ json: { user, token: `${role}-token` } });
  });

  await page.route(`*/**/api/user/${role}-1`, async (route) => {
    expect(route.request().method()).toBe('PUT');
    updateRequest = route.request().postDataJSON();
    user = {
      ...user,
      name: updateRequest?.name as string,
      email: updateRequest?.email as string,
    };
    password = (updateRequest?.password as string) || password;
    await route.fulfill({ json: { user, token: `${role}-updated-token` } });
  });

  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({ json: user });
  });

  await page.route('*/**/api/order', async (route) => {
    await route.fulfill({ json: { orders: [] } });
  });

  return {
    getUpdateRequest: () => updateRequest,
  };
}

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email address' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByRole('link', { name: 'Logout' })).toBeVisible();
  await page.goto('/diner-dashboard');
}

async function updateUserFields(page: Page, name: string, email: string, password: string, onUpdate: () => Record<string, unknown> | undefined) {
  await page.getByRole('button', { name: 'Edit' }).click();
  await expect(page.locator('#hs-jwt-modal')).toHaveClass(/\bopen\b/);
  const fields = page.locator('[role="dialog"] input');
  await fields.nth(0).fill(name);
  await fields.nth(1).fill(email);
  await fields.nth(2).fill(password);
  await page.getByRole('button', { name: 'Update' }).click();
  await expect.poll(onUpdate).toBeTruthy();
}

async function mockRegisterApi(page: Page) {
  const accounts = new Map<string, { user: Record<string, unknown>; password: string }>();
  let currentUser: Record<string, unknown> | null = null;

  await page.route('*/**/api/auth', async (route) => {
    const request = route.request();
    const body = request.postDataJSON();
    if (request.method() === 'POST') {
      const user = { id: '7', name: body.name, email: body.email, roles: [{ role: 'diner' }] };
      accounts.set(body.email, { user, password: body.password });
      currentUser = user;
      await route.fulfill({ json: { user, token: 'register-token' } });
    } else if (request.method() === 'PUT') {
      const account = accounts.get(body.email);
      if (!account || account.password !== body.password) {
        await route.fulfill({ status: 404, json: { message: 'unknown user' } });
        return;
      }
      currentUser = account.user;
      await route.fulfill({ json: { user: account.user, token: 'login-token' } });
    } else {
      currentUser = null;
      await route.fulfill({ json: { message: 'logout successful' } });
    }
  });

  await page.route('*/**/api/user/me', async (route) => {
    await route.fulfill({ json: currentUser });
  });

  await page.route(/\/api\/user\/\d+$/, async (route) => {
    expect(route.request().method()).toBe('PUT');
    const body = route.request().postDataJSON();
    const account = accounts.get(currentUser?.email as string)!;
    const user = { ...account.user, name: body.name, email: body.email };
    accounts.delete(account.user.email as string);
    accounts.set(user.email, { user, password: body.password || account.password });
    currentUser = user;
    await route.fulfill({ json: { user, token: 'updated-token' } });
  });

  await page.route('*/**/api/order', async (route) => {
    await route.fulfill({ json: { orders: [] } });
  });
}

test('updateUser', async ({ page }) => {
  await mockRegisterApi(page);
  const email = `user${Math.floor(Math.random() * 10000)}@jwt.com`;
  await page.goto('/');
  await page.getByRole('link', { name: 'Register' }).click();
  await page.getByRole('textbox', { name: 'Full name' }).fill('pizza diner');
  await page.getByRole('textbox', { name: 'Email address' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill('diner');
  await page.getByRole('button', { name: 'Register' }).click();

  await page.getByRole('link', { name: 'pd' }).click();

  await expect(page.getByRole('main')).toContainText('pizza diner');

  await page.getByRole('button', { name: 'Edit' }).click();
  await expect(page.locator('#hs-jwt-modal')).toHaveClass(/\bopen\b/);
  await expect(page.locator('h3')).toContainText('Edit user');
  await page.getByRole('textbox').first().fill('pizza dinerx');
  await page.getByRole('button', { name: 'Update' }).click();

  await page.waitForSelector('[role="dialog"].hidden', { state: 'attached' });

  await expect(page.getByRole('main')).toContainText('pizza dinerx');

  await page.getByRole('link', { name: 'Logout' }).click();
  await page.getByRole('link', { name: 'Login' }).click();

  await page.getByRole('textbox', { name: 'Email address' }).fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill('diner');
  await page.getByRole('button', { name: 'Login' }).click();

  await page.getByRole('link', { name: 'pd' }).click();

  await expect(page.getByRole('main')).toContainText('pizza dinerx');
});

test('persists an updated email address after logging in again', async ({ page }) => {
  const api = await mockUserApi(page, 'diner');
  await loginAs(page, 'diner@example.com', 'old-password');

  await updateUserFields(page, 'diner user', 'new-diner@example.com', '', api.getUpdateRequest);
  await expect(page.getByRole('main')).toContainText('new-diner@example.com');
  expect(api.getUpdateRequest()).toMatchObject({ email: 'new-diner@example.com' });
});

test('persists an updated password after logging in again', async ({ page }) => {
  const api = await mockUserApi(page, 'diner');
  await loginAs(page, 'diner@example.com', 'old-password');

  await updateUserFields(page, 'diner user', 'diner@example.com', 'new-password', api.getUpdateRequest);
  expect(api.getUpdateRequest()).toMatchObject({ password: 'new-password' });
});

for (const role of ['franchisee', 'admin'] as const) {
  test(`updates user information for the ${role} role`, async ({ page }) => {
    const api = await mockUserApi(page, role);
    await loginAs(page, `${role}@example.com`, 'old-password');

    await updateUserFields(page, `${role} updated`, `${role}@example.com`, '', api.getUpdateRequest);

    await expect(page.getByRole('main')).toContainText(`${role} updated`);
    expect(api.getUpdateRequest()).toMatchObject({
      name: `${role} updated`,
      email: `${role}@example.com`,
    });
  });
}