import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite();
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
const library={version:1,books:[],quotes:[],shelves:[],settings:{goals:{}}};
let checks=0,currentUser='';
try{
 await db.exec(`create role anon; create role authenticated; create schema auth;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
 grant usage on schema auth to anon, authenticated;
 insert into auth.users values ('${a}'),('${b}');`);
 await db.exec(await readFile(new URL('../supabase/migrations/202611040001_library_sync.sql',import.meta.url),'utf8'));
 async function as(user,role='authenticated'){currentUser=user;await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub', $1, false)",[user]);await db.exec(`set role ${role}`)}
 async function save(revision,data=library,expectedUser=currentUser){return db.query('select * from public.save_moya_library($1::uuid,$2,$3::jsonb)',[expectedUser||null,revision,JSON.stringify(data)])}
 async function denied(action,code){await assert.rejects(action,error=>error.code===code);checks++}
 await as(a);assert.equal((await save(0)).rows[0].user_id,a);checks++;
 await denied(()=>save(0),'PT409');
 await as(b);await denied(()=>save(0,library,a),'PT403');assert.equal((await db.query('select * from public.moya_libraries')).rows.length,0);checks++;
 assert.equal((await save(0)).rows[0].user_id,b);checks++;
 await denied(()=>db.query('update public.moya_libraries set revision=100'),'42501');
 await denied(()=>db.query('delete from public.moya_libraries'),'42501');
 await as(a);assert.equal((await save(1)).rows[0].revision,2);checks++;
 await denied(()=>save(1),'PT409'); // second device still holds revision 1
 assert.equal((await db.query('select * from public.moya_libraries')).rows.length,1);checks++;
 await denied(()=>save(2,{version:1}),'23514');
 await denied(()=>save(2,{...library,books:'wrong'}),'23514');
 await as('');await denied(()=>save(0),'PT401');
 await as('', 'anon');await denied(()=>db.query('select * from public.moya_libraries'),'42501');await denied(()=>save(0),'42501');
 console.log(`Cloud SQL: ${checks} checks passed (account isolation, RLS, permissions, atomic revisions, validation).`);
}finally{await db.close()}
