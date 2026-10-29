import {useEffect,useState} from 'react';
import {flushSnapshots} from './storage';
export const BUILD=__APP_BUILD__;
export const BASE=import.meta.env.BASE_URL;
export const stableAddress=()=>new URL(BASE,window.location.origin).href;
export function useAppUpdates(){
 const [available,setAvailable]=useState(false),[checking,setChecking]=useState(false),[message,setMessage]=useState('');
 async function check(){setChecking(true);try{
  const response=await fetch(`${BASE}version.json`,{cache:'no-store'});if(!response.ok)throw new Error('version');
  const info=await response.json();if(typeof info.version!=='string')throw new Error('format');
  setAvailable(info.version!==BUILD);setMessage(info.version===BUILD?'Установлена актуальная версия.':'Доступна новая версия приложения.');
  if('serviceWorker' in navigator){const registration=await navigator.serviceWorker.getRegistration(BASE);await registration?.update()}
 }catch{setMessage('Не удалось проверить обновление. Попробуйте при подключении к интернету.')}finally{setChecking(false)}}
 useEffect(()=>{
  if('serviceWorker' in navigator)void navigator.serviceWorker.register(`${BASE}sw.js`,{scope:BASE,updateViaCache:'none'}).catch(()=>{});
  // Historical version query strings are not a storage boundary. Keep one permanent URL.
  const url=new URL(location.href);if(url.searchParams.has('v')){url.searchParams.delete('v');history.replaceState(history.state,'',url.pathname+url.search+url.hash)}
  const visible=()=>{if(document.visibilityState==='visible')void check()};
  const timer=setInterval(visible,5*60*1000);document.addEventListener('visibilitychange',visible);void check();
  return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',visible)};
 },[]);
 async function install(){
  if(document.querySelector('[role="dialog"]')){setMessage('Сохраните и закройте открытую форму перед обновлением.');return}
  setChecking(true);try{
   if('serviceWorker' in navigator){
    const registration=await navigator.serviceWorker.getRegistration(BASE);await registration?.update();
    const worker=registration?.installing;if(worker)await new Promise<void>((resolve,reject)=>{
     const timeout=setTimeout(()=>{worker.removeEventListener('statechange',changed);reject(new Error('timeout'))},20000);
     const changed=()=>{if(worker.state==='activated'){clearTimeout(timeout);worker.removeEventListener('statechange',changed);resolve()}else if(worker.state==='redundant'){clearTimeout(timeout);worker.removeEventListener('statechange',changed);reject(new Error('install'))}};
     worker.addEventListener('statechange',changed);changed();
    });
   }
   const response=await fetch(stableAddress(),{cache:'reload'});if(!response.ok)throw new Error('offline');
   await flushSnapshots();window.location.reload();
  }catch{setMessage('Обновление пока недоступно. Ваши сохранённые записи остаются на устройстве.');setChecking(false)}
 }
 return {available,checking,message,check,install};
}
export type AppUpdate=ReturnType<typeof useAppUpdates>;
