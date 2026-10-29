import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import {libraryPWA} from './pwa-build';
const commit=process.env.GITHUB_SHA||'local';
const buildId=`${commit.slice(0,12)}-${Date.now()}`;
export default defineConfig({define:{__APP_BUILD__:JSON.stringify(buildId)},plugins:[react(),tailwindcss(),libraryPWA(buildId)]});
