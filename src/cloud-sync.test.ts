import {describe,it,expect,vi,afterEach} from 'vitest';
import {seed,type Library} from './data';
import {fingerprint,LibrarySync,type SyncState} from './cloud-sync';
import {SyncConflict,type RemoteLibrary} from './cloud-client';
afterEach(()=>vi.unstubAllGlobals());
const remote=(data:Library,revision=1):RemoteLibrary=>({data,revision,updatedAt:'2026-11-04T00:00:00Z'});
function harness(local:Library,server:RemoteLibrary|null,base:Awaited<ReturnType<typeof fingerprint>>|null=null){
 let value=local;const receive=vi.fn((data:Library)=>{value=data;return true});
 const api={read:vi.fn(async()=>server),write:vi.fn(async(data:Library,version:number)=>remote(data,version+1))};
 const reports:SyncState[]=[],save=vi.fn(),blocked=vi.fn(()=>false);
 const engine=new LibrarySync(api,{get:()=>value,receive,blocked},base?{revision:1,hash:base}:null,save,state=>reports.push(state));
 return {engine,api,reports,receive,save,blocked,setLocal:(data:Library)=>{value=data},get:()=>value};
}
describe('cloud synchronization',()=>{
 it('asks before moving an existing library into an empty account',async()=>{
  const h=harness(seed(),null);await h.engine.run();expect(h.reports.at(-1)?.phase).toBe('choose');expect(h.api.write).not.toHaveBeenCalled();
  await h.engine.run('local');expect(h.api.write).toHaveBeenCalledWith(h.get(),0);expect(h.reports.at(-1)?.phase).toBe('synced');
 });
 it('pulls remote changes when local data is clean',async()=>{
  const data=seed(),updated={...data,quotes:[],settings:{goals:{2026:30}}};
  const h=harness(data,remote(updated,2),await fingerprint(data));await h.engine.run();expect(h.receive).toHaveBeenCalledWith(updated);expect(h.api.write).not.toHaveBeenCalled();
 });
 it('pushes a local edit using the last confirmed revision',async()=>{
  const data=seed(),updated={...data,books:[]};const h=harness(updated,remote(data),await fingerprint(data));await h.engine.run();expect(h.api.write).toHaveBeenCalledWith(updated,1);
 });
 it('keeps both versions when devices edited concurrently',async()=>{
  const data=seed(),local={...data,settings:{goals:{2026:10}}},other={...data,settings:{goals:{2026:20}}};
  const h=harness(local,remote(other,2),await fingerprint(data));await h.engine.run();expect(h.reports.at(-1)?.phase).toBe('conflict');expect(h.receive).not.toHaveBeenCalled();expect(h.api.write).not.toHaveBeenCalled();
  await h.engine.run('remote');expect(h.get()).toEqual(other);
 });
 it('does not overwrite a local edit made while a download was in progress',async()=>{
  const data=seed(),h=harness(data,remote({...data,books:[]},2),await fingerprint(data));
  h.api.read.mockImplementation(async()=>{h.setLocal({...data,settings:{goals:{2026:99}}});return remote({...data,books:[]},2)});
  await h.engine.run();expect(h.receive).not.toHaveBeenCalled();expect(h.reports.at(-1)?.phase).toBe('conflict');
 });
 it('keeps edits made during an upload pending for the next sync',async()=>{
  const data=seed(),first={...data,settings:{goals:{2026:11}}},second={...data,settings:{goals:{2026:12}}};
  const h=harness(first,remote(data),await fingerprint(data));let server=remote(data);
  h.api.read.mockImplementation(async()=>server);h.api.write.mockImplementation(async(d,v)=>{h.setLocal(second);return server=remote(d,v+1)});
  await h.engine.run();await h.engine.run();expect(h.api.write).toHaveBeenLastCalledWith(second,2);
 });
 it('does not confirm a stale write rejected by the server',async()=>{
  const data=seed(),h=harness({...data,books:[]},remote(data),await fingerprint(data));h.api.write.mockRejectedValue(new SyncConflict());
  await h.engine.run();expect(h.reports.at(-1)?.phase).toBe('conflict');expect(h.save).not.toHaveBeenCalled();
 });
 it('does not apply in-flight work after sign-out or account change',async()=>{
  const data=seed(),h=harness(data,remote({...data,books:[]},2),await fingerprint(data));h.api.read.mockImplementation(async()=>{h.engine.active=false;return remote({...data,books:[]},2)});
  await h.engine.run();expect(h.receive).not.toHaveBeenCalled();expect(h.api.write).not.toHaveBeenCalled();
 });
 it('retains local data on network errors and blocks sync during editing',async()=>{
  const data=seed(),h=harness(data,null);h.api.read.mockRejectedValue(new Error('network'));
  await h.engine.run();expect(h.get()).toEqual(data);expect(h.reports.at(-1)?.phase).toBe('error');
  h.blocked.mockReturnValue(true);h.api.read.mockClear();await h.engine.run();expect(h.api.read).not.toHaveBeenCalled();
 });
 it('does not acknowledge a remote version if local storage rejected it',async()=>{
  const data=seed(),h=harness(data,remote({...data,books:[]},2),await fingerprint(data));h.receive.mockReturnValue(false);
  await h.engine.run();expect(h.save).not.toHaveBeenCalled();expect(h.reports.at(-1)?.phase).toBe('error');
 });
 it('does not confirm a version that changed while the choice dialog was open',async()=>{
  const data=seed(),h=harness(data,remote({...data,books:[]},1));await h.engine.run();
  h.api.read.mockResolvedValue(remote({...data,books:[]},2));await h.engine.run();
  await h.engine.run('local',1);expect(h.api.write).not.toHaveBeenCalled();expect(h.reports.at(-1)?.phase).toBe('conflict');
 });

 it('queues an offline edit and sends it when connectivity returns',async()=>{
  const data=seed(),local={...data,settings:{goals:{2026:42}}},h=harness(local,remote(data),await fingerprint(data));
  vi.stubGlobal('navigator',{onLine:false});await h.engine.run();expect(h.reports.at(-1)?.phase).toBe('offline');expect(h.api.write).not.toHaveBeenCalled();expect(h.get()).toEqual(local);
  vi.stubGlobal('navigator',{onLine:true});await h.engine.run();expect(h.api.write).toHaveBeenCalledWith(local,1);
 });

});
