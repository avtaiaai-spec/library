import {test,expect} from '@playwright/test';
const configured=process.env.PLAYWRIGHT_CLOUD_TEST==='1';
const user={id:'11111111-1111-4111-8111-111111111111',aud:'authenticated',role:'authenticated',email:'reader@example.com',created_at:'2026-11-04T00:00:00Z'};
const token=[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:user.id,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'test-signature'].join('.');
test('Личный кабинет: локальные данные доступны без настройки облака',async({page})=>{
 test.skip(configured,'Separate configured cloud workflow below');
 await page.goto('./');await page.getByRole('button',{name:'Личный кабинет',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Личный кабинет',exact:true})).toBeVisible();
 await expect(page.getByText('Облачная синхронизация пока не подключена владельцем приложения.')).toBeVisible();
 await page.setViewportSize({width:320,height:740});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('Аккаунт: вход, явный перенос и синхронизация между двумя устройствами',async({browser})=>{
 test.skip(!configured,'Requires the test-only configured Vite server');test.setTimeout(60000);
 let row:{data:unknown;revision:number;updated_at:string}|null=null;let writes=0;
 const contexts=await Promise.all([browser.newContext(),browser.newContext()]);
 try{
  for(const context of contexts){await context.route('https://library-test.supabase.co/**',async route=>{
   const url=new URL(route.request().url());
   if(route.request().method()==='OPTIONS'){await route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS'}});return}
   if(url.pathname==='/auth/v1/token'){await route.fulfill({json:{access_token:token,refresh_token:'test-refresh',token_type:'bearer',expires_in:3600,user}});return}
   if(url.pathname==='/auth/v1/user'){await route.fulfill({json:user});return}
   if(url.pathname==='/auth/v1/logout'){await route.fulfill({status:204});return}
   if(url.pathname==='/rest/v1/moya_libraries'){await route.fulfill({json:row});return}
   if(url.pathname==='/rest/v1/rpc/save_moya_library'){
    const body=route.request().postDataJSON();if(body.expected_user!==user.id){await route.fulfill({status:403,json:{code:'PT403'}});return}if(body.expected_revision!==(row?.revision||0)){await route.fulfill({status:409,json:{code:'PT409',message:'conflict'}});return}
    row={data:body.library_data,revision:(row?.revision||0)+1,updated_at:new Date().toISOString()};writes++;await route.fulfill({json:[row]});return;
   }
   await route.abort();
  })}
  const a=await contexts[0].newPage(),b=await contexts[1].newPage();
  async function login(page:typeof a){await page.goto('./');await page.getByRole('button',{name:'Личный кабинет',exact:true}).click();await page.getByLabel('Email',{exact:true}).fill('reader@example.com');await page.getByLabel('Пароль',{exact:true}).fill('example-password');await page.getByRole('button',{name:'Войти',exact:true}).click()}
  await login(a);await expect(a.getByRole('button',{name:'Перенести эту библиотеку в облако'})).toBeVisible();expect(writes).toBe(0);
  await a.getByRole('button',{name:'Перенести эту библиотеку в облако'}).click();await a.getByRole('dialog').getByRole('button',{name:'Подтвердить выбор'}).click();await expect(a.getByText('Библиотека синхронизирована',{exact:true})).toBeVisible();expect(writes).toBe(1);
  await login(b);await b.getByRole('button',{name:'Открыть облачную библиотеку'}).click();await b.getByRole('dialog').getByRole('button',{name:'Подтвердить выбор'}).click();await expect(b.getByText('Библиотека синхронизирована',{exact:true})).toBeVisible();
  await a.getByRole('navigation',{name:'Основная навигация',exact:true}).getByRole('button',{name:'Мои книги'}).click();await a.locator('.page-heading').getByRole('button',{name:'Добавить книгу',exact:true}).click();const dialog=a.getByRole('dialog');await dialog.getByLabel('Название книги').fill('Книга между устройствами');await dialog.getByLabel('Автор',{exact:false}).fill('Автор');await dialog.getByRole('button',{name:'Сохранить',exact:true}).click();
  await expect.poll(()=>writes).toBe(2);
  await b.getByRole('button',{name:'Синхронизировать',exact:true}).click();await expect(b.getByText('Библиотека синхронизирована',{exact:true})).toBeVisible();
  await b.getByRole('navigation',{name:'Основная навигация',exact:true}).getByRole('button',{name:'Мои книги'}).click();await expect(b.getByRole('button',{name:'Открыть книгу Книга между устройствами',exact:true})).toBeVisible();
  await b.getByRole('button',{name:'Личный кабинет',exact:true}).click();await b.getByRole('button',{name:'Выйти',exact:true}).click();await expect(b.getByRole('button',{name:'Войти',exact:true})).toBeVisible();
  await b.setViewportSize({width:320,height:740});expect(await b.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }finally{await Promise.all(contexts.map(context=>context.close()))}
});
