import {createClient,type Session} from '@supabase/supabase-js';
import {parseLibrary,type Library} from './data';
const url=import.meta.env.VITE_SUPABASE_URL||'',key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||'';
export const cloudConfigured=!!url&&!!key;
const callback=typeof window!=='undefined'?new URLSearchParams(window.location.hash.slice(1)):new URLSearchParams();
const query=typeof window!=='undefined'?new URLSearchParams(window.location.search):new URLSearchParams();
export const recoveryCallbackPresent=callback.get('type')==='recovery'||callback.has('error_code')||query.has('error_code');
export const recoveryCallbackError=callback.has('error')||query.has('error');
export const cloud=cloudConfigured?createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'implicit',storageKey:'moya-library.auth'},global:{fetch:(input,init={})=>fetch(input,{...init,signal:AbortSignal.any([...(init.signal?[init.signal]:[]),AbortSignal.timeout(15000)])})}}):null;
// Capture verified recovery events before React mounts (storage initialization can take time).
let recovering=false;
const RECOVERY='moya-library.password-recovery';
function recoverySessionId(session:Session){
 try{const claims=JSON.parse(atob(session.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));return typeof claims.session_id==='string'?claims.session_id:`${session.user.id}:${session.expires_at}`}catch{return ''}
}
function restoreRecovery(session:Session|null){
 try{const marker=JSON.parse(sessionStorage.getItem(RECOVERY)||'null');return !recoveryCallbackError&&!!session&&marker?.userId===session.user.id&&marker.sessionId===recoverySessionId(session)&&marker.expiresAt>Date.now()}catch{return false}
}
export const passwordRecoveryActive=()=>recovering;
export const finishPasswordRecovery=()=>{recovering=false;try{sessionStorage.removeItem(RECOVERY)}catch{}};
cloud?.auth.onAuthStateChange((event,session)=>{
 if(event==='PASSWORD_RECOVERY'&&session){
  recovering=true;
  try{sessionStorage.setItem(RECOVERY,JSON.stringify({userId:session.user.id,sessionId:recoverySessionId(session),expiresAt:Date.now()+30*60*1000}))}catch{}
 }
 if(event==='INITIAL_SESSION'||event==='SIGNED_IN')recovering=restoreRecovery(session);
 if(event==='SIGNED_OUT')finishPasswordRecovery();
});
export interface RemoteLibrary {data:Library;revision:number;updatedAt:string}
export class SyncConflict extends Error {}
function decode(value:unknown):RemoteLibrary{
 const row=value as Record<string,unknown>;
 if(!row||!Number.isSafeInteger(row.revision)||Number(row.revision)<1||typeof row.updated_at!=='string')throw new Error('Некорректная версия облачной библиотеки.');
 return {data:parseLibrary(row.data),revision:Number(row.revision),updatedAt:row.updated_at};
}
export function backend(userId:string){return {
 async read():Promise<RemoteLibrary|null>{
  if(!cloud)throw new Error('Облако не настроено');
  const {data,error}=await cloud.from('moya_libraries').select('data,revision,updated_at').eq('user_id',userId).maybeSingle();
  if(error)throw error;return data?decode(data):null;
 },
 async write(data:Library,revision:number):Promise<RemoteLibrary>{
  if(!cloud)throw new Error('Облако не настроено');
  const {data:rows,error}=await cloud.rpc('save_moya_library',{expected_user:userId,expected_revision:revision,library_data:parseLibrary(data)});
  if(error){if(error.code==='PT409'||error.code==='23505')throw new SyncConflict();throw error}
  if(!Array.isArray(rows)||rows.length!==1)throw new Error('Облако не подтвердило сохранение.');return decode(rows[0]);
 }
}}
