import {parseLibrary,type Library} from './data';
import {SyncConflict,type RemoteLibrary} from './cloud-client';
export interface Checkpoint {revision:number;hash:string}
export type SyncPhase='connecting'|'choose'|'synced'|'syncing'|'offline'|'conflict'|'error';
export interface SyncState {phase:SyncPhase;message:string;remote:RemoteLibrary|null;updatedAt?:string}
export async function fingerprint(data:Library){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(parseLibrary(data))));return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('')}
export function syncPlan(hash:string,base:Checkpoint,remote:RemoteLibrary|null){
 const localChanged=hash!==base.hash,remoteChanged=!remote||remote.revision!==base.revision;
 return localChanged&&remoteChanged?'conflict':localChanged?'push':remoteChanged?'pull':'same';
}
export class LibrarySync {
 active=true;busy=false;remote:RemoteLibrary|null=null;prepared=false;
 constructor(private api:{read:()=>Promise<RemoteLibrary|null>;write:(data:Library,revision:number)=>Promise<RemoteLibrary>},private local:{get:()=>Library;receive:(data:Library)=>boolean;blocked:()=>boolean},private checkpoint:Checkpoint|null,private saveCheckpoint:(checkpoint:Checkpoint)=>void,private report:(state:SyncState)=>void){}
 private emit(phase:SyncPhase,message:string){if(this.active)this.report({phase,message,remote:this.remote,updatedAt:this.remote?.updatedAt})}
 private async mark(data:Library,remote:RemoteLibrary){const hash=await fingerprint(data);if(!this.active)return;this.checkpoint={revision:remote.revision,hash};this.saveCheckpoint(this.checkpoint)}
 async run(choice?:'local'|'remote',expectedRevision?:number){
  if(this.busy||!this.active)return;this.busy=true;
  try{
   if(this.local.blocked()){this.emit('error','Завершите редактирование, откройте личный кабинет и устраните ошибку локального хранения, если она есть.');return}
   if(typeof navigator!=='undefined'&&navigator.onLine===false){this.emit('offline','Нет сети. Изменения сохранены на этом устройстве и будут отправлены после подключения.');return}
   const data=parseLibrary(this.local.get()),hash=await fingerprint(data);
   if(!this.active)return;
   this.emit('syncing','Синхронизация…');
   if(!choice){this.remote=await this.api.read();this.prepared=true}
   if(!this.active)return;
   if(choice&&expectedRevision!==undefined&&(this.remote?.revision||0)!==expectedRevision){this.emit('conflict','Облачная версия изменилась после открытия подтверждения. Проверьте версии и подтвердите выбор заново.');return}
   if(choice&&!this.prepared)throw new Error('Сначала загрузите сведения об облачной библиотеке.');
   let action:string=choice||(!this.checkpoint?'choose':syncPlan(hash,this.checkpoint,this.remote));
   if(!choice&&this.remote&&await fingerprint(this.remote.data)===hash){await this.mark(data,this.remote);this.emit('synced','Библиотека синхронизирована');return}
   if(action==='choose'){this.emit('choose',this.remote?'Выберите, какую библиотеку использовать. Автоматическая замена отключена.':'В облаке пока нет книг. Перенесите библиотеку с этого устройства.');return}
   if(action==='conflict'||(action==='pull'&&!this.remote)){this.emit('conflict','Библиотека изменилась на другом устройстве. Выберите версию; ни одна не заменена автоматически.');return}
   if(action==='remote'||action==='pull'){
    if(!this.remote)throw new Error('В облаке пока нет библиотеки.');
    if(this.local.blocked()||await fingerprint(this.local.get())!==hash){this.emit('conflict','Локальная библиотека изменилась во время загрузки. Повторите синхронизацию.');return}
    if(!this.active)return;
    if(!this.local.receive(this.remote.data))throw new Error('Не удалось сохранить облачную библиотеку на устройстве.');
    await this.mark(this.remote.data,this.remote);
   }else if(action==='local'||action==='push'){
    if(!this.active||this.local.blocked())return;
    this.remote=await this.api.write(data,this.remote?.revision||0);
    if(!this.active)return;
    await this.mark(data,this.remote);
   }
   this.emit('synced','Библиотека синхронизирована');
  }catch(error){
   if(!this.active)return;
   if(error instanceof SyncConflict){this.checkpoint=null;this.prepared=false;this.emit('conflict','Другое устройство успело сохранить изменения. Нажмите «Синхронизировать» и выберите версию.');return}
   this.emit(typeof navigator!=='undefined'&&navigator.onLine===false?'offline':'error','Не удалось синхронизировать. Локальные данные сохранены. Проверьте сеть и повторите вход, если сессия истекла.');
  }finally{this.busy=false}
 }
}
