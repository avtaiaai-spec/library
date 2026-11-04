import {useEffect,useRef,useState} from 'react';
import type {Session} from '@supabase/supabase-js';
import {cloud,backend} from './cloud-client';
import {LibrarySync,type Checkpoint,type SyncState} from './cloud-sync';
import type {Library} from './data';
const OWNER='moya-library.cloud-owner';
export function useCloudLibrary(data:Library,receive:(data:Library)=>boolean,blocked:boolean){
 const [recovery,setRecovery]=useState(false);
 const [session,setSession]=useState<Session|null>(null),[authReady,setAuthReady]=useState(!cloud);
 const [state,setState]=useState<SyncState>({phase:'connecting',message:'Подключение…',remote:null});
 const current=useRef({data,receive,blocked});current.current={data,receive,blocked};
 const engine=useRef<LibrarySync|null>(null),engineOwner=useRef<string|null>(null);
 useEffect(()=>{
  if(!cloud)return;let active=true,authVersion=0;
  const {data:{subscription}}=cloud.auth.onAuthStateChange((event,next)=>{if(active){authVersion++;if(next?.user.id!==engineOwner.current&&engine.current){engine.current.active=false;engine.current=null}if(event==='PASSWORD_RECOVERY')setRecovery(true);if(event==='SIGNED_OUT')setRecovery(false);setSession(next);setAuthReady(true)}});
  const version=authVersion;
  void cloud.auth.getSession().then(({data:{session},error})=>{if(active&&version===authVersion){setSession(error?null:session);setAuthReady(true)}});
  return()=>{active=false;subscription.unsubscribe()};
 },[]);
 const userId=session?.user.id;
 useEffect(()=>{
  if(!userId)return;
  const key=`moya-library.cloud-base.${userId}`;
  let checkpoint:Checkpoint|null=null;
  try{const raw=JSON.parse(localStorage.getItem(key)||'null');if(localStorage.getItem(OWNER)===userId&&Number.isSafeInteger(raw?.revision)&&raw.revision>0&&/^[0-9a-f]{64}$/.test(raw?.hash))checkpoint=raw}catch{}
  const sync=new LibrarySync(backend(userId),{get:()=>current.current.data,receive:d=>current.current.receive(d),blocked:()=>current.current.blocked},checkpoint,base=>{localStorage.setItem(key,JSON.stringify(base));localStorage.setItem(OWNER,userId)},setState);
  engine.current=sync;engineOwner.current=userId;void sync.run();
  const poll=setInterval(()=>void sync.run(),15000);
  const wake=()=>void sync.run();window.addEventListener('online',wake);window.addEventListener('focus',wake);
  return()=>{sync.active=false;if(engine.current===sync){engine.current=null;engineOwner.current=null}clearInterval(poll);window.removeEventListener('online',wake);window.removeEventListener('focus',wake)};
 },[userId]);
 useEffect(()=>{const timer=setTimeout(()=>void engine.current?.run(),800);return()=>clearTimeout(timer)},[data,blocked]);
 return {session,authReady,recovery,finishRecovery:()=>setRecovery(false),state,sync:()=>engine.current?.run(),choose:(choice:'local'|'remote',revision:number)=>engine.current?.run(choice,revision)};
}
export type CloudAccount=ReturnType<typeof useCloudLibrary>;
