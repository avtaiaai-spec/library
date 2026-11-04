import {defineConfig,loadEnv} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import {libraryPWA} from './pwa-build';
const commit=process.env.GITHUB_SHA||'local';
const buildId=`${commit.slice(0,12)}-${Date.now()}`;
export default defineConfig(({mode})=>{
 const env=loadEnv(mode,process.cwd(),'VITE_'),key=env.VITE_SUPABASE_PUBLISHABLE_KEY||'',url=env.VITE_SUPABASE_URL||'';
 if(!!key!==!!url)throw new Error('Set both VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.');
 if(key){
  let role='';try{role=JSON.parse(Buffer.from(key.split('.')[1]||'','base64url').toString()).role||''}catch{}
  if(key.startsWith('sb_secret_')||role==='service_role')throw new Error('Only a public Supabase publishable/anon key is permitted in the browser.');
  const parsed=new URL(url);if(parsed.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(parsed.hostname))throw new Error('Supabase URL must use HTTPS.');
 }
 return {define:{__APP_BUILD__:JSON.stringify(buildId)},plugins:[react(),tailwindcss(),libraryPWA(buildId)]};});
