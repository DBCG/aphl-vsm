// import { chromium } from '@playwright/test';
import { setupData } from './util';

async function globalSetup(config) {
  await setupData()
}

export default globalSetup;