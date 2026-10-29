import type {Library} from './data';
export const KEY='moya-biblioteka.v1';
export const DB_NAME='moya-biblioteka-storage';
export interface Snapshot{id:string;data:Library;savedAt:number;revision?:string}
let queue:Promise<unknown>=Promise.resolve();
function database():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{
 if(typeof indexedDB==='undefined'){reject(new Error('Локальные копии недоступны'));return}
 const request=indexedDB.open(DB_NAME,1);let done=false;
 const timer=setTimeout(()=>{done=true;reject(new Error('Хранилище не ответило'))},2500);
 request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('snapshots'))request.result.createObjectStore('snapshots',{keyPath:'id'})};
 request.onerror=()=>{done=true;clearTimeout(timer);reject(request.error)};
 request.onblocked=()=>{done=true;clearTimeout(timer);reject(new Error('Хранилище занято другим окном'))};
 request.onsuccess=()=>{clearTimeout(timer);if(done){request.result.close();return}request.result.onversionchange=()=>request.result.close();resolve(request.result)};
})}
async function writeSnapshot(snapshot:Snapshot){const db=await database();try{await new Promise<void>((resolve,reject)=>{
 const tx=db.transaction('snapshots','readwrite'),store=tx.objectStore('snapshots');store.put(snapshot);
 const latest=store.get('latest');latest.onsuccess=()=>{if(!latest.result||latest.result.savedAt<=snapshot.savedAt)store.put({...snapshot,id:'latest',revision:snapshot.id})};
 const all=store.getAll();all.onsuccess=()=>{const older=(all.result as Snapshot[]).filter(s=>s.id!=='latest').sort((a,b)=>b.savedAt-a.savedAt).slice(5);for(const item of older)store.delete(item.id)};
 tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
})}finally{db.close()}}
export async function listSnapshots():Promise<Snapshot[]>{const db=await database();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('snapshots','readonly');const request=tx.objectStore('snapshots').getAll();request.onsuccess=()=>{const all=request.result as Snapshot[],latest=all.find(s=>s.id==='latest');const items=all.filter(s=>s.id!=='latest');if(latest&&!items.some(s=>s.id===latest.revision))items.push({...latest,id:latest.revision||'recovered-latest'});items.sort((a,b)=>(b.savedAt-a.savedAt)||(a.id===latest?.revision?-1:b.id===latest?.revision?1:0));resolve(items.slice(0,5))};request.onerror=()=>reject(request.error)})}finally{db.close()}}
export function revisionOf(raw:string|null):string|null{try{const value=JSON.parse(raw||'null');return typeof value?._storage?.revision==='string'?value._storage.revision:null}catch{return null}}
export function currentRevision(){return revisionOf(localStorage.getItem(KEY))}
function enqueue(snapshot:Snapshot){queue=queue.catch(()=>{}).then(()=>writeSnapshot(snapshot));void queue.catch(()=>{});return queue}
export function flushSnapshots(){return queue.catch(()=>{})}
export function persistLibrary(data:Library,expectedRevision?:string|null){
 if(expectedRevision!==undefined&&currentRevision()!==expectedRevision)throw new Error('Библиотека изменена в другом окне. Обновите приложение перед сохранением.');
 const revision=crypto.randomUUID(),savedAt=Date.now();
 localStorage.setItem(KEY,JSON.stringify({...data,_storage:{revision,savedAt}}));
 void enqueue({id:revision,data,savedAt});return revision;
}
// Run before React mounts. Never replace an existing (including empty) library with a backup.
export async function initializeStorage(validate:(value:unknown)=>Library){
 const initial=localStorage.getItem(KEY);
 if(initial!==null){try{const data=validate(JSON.parse(initial));const meta=JSON.parse(initial)._storage;void enqueue({id:typeof meta?.revision==='string'?meta.revision:crypto.randomUUID(),savedAt:typeof meta?.savedAt==='number'?meta.savedAt:Date.now(),data})}catch{}return}
 try{const snapshots=await listSnapshots();for(const snapshot of snapshots){let data:Library;try{data=validate(snapshot.data)}catch{continue}if(localStorage.getItem(KEY)===null){localStorage.setItem(KEY,JSON.stringify({...data,_storage:{revision:snapshot.id,savedAt:snapshot.savedAt}}))}return}}catch{}
}
