import { test, expect, } from '@playwright/test';

async function login(page) {
  await page.goto('http://localhost:3000/auth/signin?callbackUrl=http%3A%2F%2Flocalhost%3A3000%2Fprograms');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('textbox', { name: 'Username or email' }).click();
  await page.getByRole('textbox', { name: 'Username or email' }).fill('johndoe');
  await page.getByRole('textbox', { name: 'Username or email' }).press('Tab');
  await page.getByRole('textbox', { name: 'Password' }).fill('password');
  await page.getByRole('button', { name: 'Sign In' }).click();
}

test('Creates a draft program', async ({ page }) => {
  login(page)
  await page.getByTestId('expander-button-SpecificationLibrary').click();
  await page.getByRole('button', { name: 'Clone' }).click();
  await page.getByRole('button', { name: 'YES, clone' }).click();
  await expect(page.getByRole('cell', { name: 'DRAFT', exact: true }).locator('div').first()).toHaveCount(1);
});

test('Retires an active program', async ({ page }) => {
  login(page)
  await page.getByTestId('expander-button-SpecificationLibrary').click();
  await page.locator('body').press('ControlOrMeta+r');
  await page.locator('body').press('ControlOrMeta+r');
  await page.getByRole('button', { name: 'Retire' }).click();
  await page.getByRole('button', { name: 'YES, retire' }).click();
  await expect(page.getByText('RETIRED', { exact: true })).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'Show retired programs' }).check();
  await expect(page.getByText('RETIRED', { exact: true })).toHaveCount(1);
});



