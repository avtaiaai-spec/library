import type {Plugin} from 'vite';
export function libraryPWA(buildId:string):Plugin{
 let base='/';
 return {name:'library-pwa',enforce:'post',configResolved(config){base=config.base},generateBundle(_options,bundle){
  const prefix='moya-library-shell-';
  const paths=[...new Set([base,...Object.keys(bundle).filter(p=>p!=='index.html'&&!p.endsWith('.map')).map(p=>base+p),...['manifest.webmanifest','icon.svg','icon-192.png','icon-512.png','apple-touch-icon.png'].map(p=>base+p)])];
  this.emitFile({type:'asset',fileName:'version.json',source:JSON.stringify({version:buildId})});
  this.emitFile({type:'asset',fileName:'sw.js',source:`
const CACHE=${JSON.stringify(prefix+buildId)};
const BASE=${JSON.stringify(base)};
const PRECACHE=${JSON.stringify(paths)};
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 await cache.addAll(PRECACHE.map(url=>new Request(url,{cache:'reload'})));
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();
 await Promise.all(keys.filter(k=>k.startsWith(${JSON.stringify(prefix)})&&k!==CACHE).map(k=>caches.delete(k)));
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(BASE))return;
 if(url.pathname===BASE+'version.json'||url.pathname===BASE+'sw.js')return;
 if(request.mode==='navigate'){
  event.respondWith((async()=>{
   const cache=await caches.open(CACHE);
   try{const response=await fetch(request,{cache:'no-store'});if(!response.ok)throw new Error('navigation');await cache.put(BASE,response.clone());return response}
   catch(error){const saved=await cache.match(BASE);if(saved)return saved;throw error}
  })());return;
 }
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE),saved=await cache.match(request);
  if(saved)return saved;
  const response=await fetch(request);if(response.ok)await cache.put(request,response.clone());return response;
 })());
});
`});
 }};
}
