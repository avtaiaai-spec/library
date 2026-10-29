import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests',fullyParallel:false,use:{baseURL:process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173',launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium',args:['--no-sandbox']},trace:'retain-on-failure'},reporter:'list'});
