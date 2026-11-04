import {test,expect,type BrowserContext,type Page} from '@playwright/test';
const configured=process.env.PLAYWRIGHT_CLOUD_TEST==='1';
test.beforeEach(()=>test.skip(!configured,'Requires the configured mock-cloud test server'));
const user={id:'11111111-1111-4111-8111-111111111111',aud:'authenticated',role:'authenticated',email:'reader@example.com',user_metadata:{},created_at:'2026-11-04T00:00:00Z'};
const token=[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:user.id,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'test-signature'].join('.');
function fakeCloud(){
 let row:{data:any;revision:number;updated_at:string}|null=null;
 const updates:Record<string,unknown>[]=[],resets:{body:any;redirect:string|null}[]=[];
 async function install(context:BrowserContext){await context.route('https://library-test.supabase.co/**',async route=>{
  const url=new URL(route.request().url()),method=route.request().method();
  if(method==='OPTIONS'){await route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'GET,POST,PUT,OPTIONS'}});return}
  if(url.pathname==='/auth/v1/token'){
   if(route.request().postDataJSON()?.password==='wrong-old'){await route.fulfill({status:400,json:{code:'invalid_credentials',msg:'Invalid login credentials'}});return}
   await route.fulfill({json:{access_token:token,refresh_token:'test-refresh',token_type:'bearer',expires_in:3600,user}});return;
  }
  if(url.pathname==='/auth/v1/user'){if(method==='PUT')updates.push(route.request().postDataJSON());await route.fulfill({json:user});return}
  if(url.pathname==='/auth/v1/recover'){resets.push({body:route.request().postDataJSON(),redirect:url.searchParams.get('redirect_to')});await route.fulfill({json:{}});return}
  if(url.pathname==='/auth/v1/logout'){await route.fulfill({status:204});return}
  if(url.pathname==='/rest/v1/moya_libraries'){await route.fulfill({json:row});return}
  if(url.pathname==='/rest/v1/rpc/save_moya_library'){
   const body=route.request().postDataJSON();
   if(body.expected_revision!==(row?.revision||0)){await route.fulfill({status:409,json:{code:'PT409'}});return}
   row={data:body.library_data,revision:(row?.revision||0)+1,updated_at:new Date().toISOString()};await route.fulfill({json:[row]});return;
  }
  await route.abort();
 })}
 return {install,updates,resets,row:()=>row};
}
async function login(page:Page){await page.goto('./');await page.getByRole('button',{name:'Личный кабинет',exact:true}).click();await page.getByLabel('Email',{exact:true}).fill(user.email);await page.getByLabel('Пароль',{exact:true}).fill('old-password');await page.getByRole('button',{name:'Войти',exact:true}).click()}
async function connect(page:Page){await page.getByRole('button',{name:'Перенести эту библиотеку в облако'}).click();await page.getByRole('dialog').getByRole('button',{name:'Подтвердить выбор'}).click();await expect(page.getByText('Библиотека синхронизирована',{exact:true})).toBeVisible()}

test('Имя и фото сохраняются, синхронизируются и остаются после перезагрузки',async({browser})=>{
 const api=fakeCloud(),aContext=await browser.newContext(),bContext=await browser.newContext();
 try{
  await api.install(aContext);await api.install(bContext);const a=await aContext.newPage(),b=await bContext.newPage();
  await login(a);await connect(a);await a.getByLabel('Имя',{exact:true}).fill('Анна');await a.getByLabel('Фотография профиля').setInputFiles('public/icon-192.png');
  await expect(a.getByRole('img',{name:'Моя аватарка',exact:true})).toHaveAttribute('src',/^data:image\/jpeg;base64,/);
  await a.getByRole('button',{name:'Сохранить профиль',exact:true}).click();await expect.poll(()=>api.row()?.data.profile?.displayName).toBe('Анна');expect(api.row()!.data.profile.avatar.length).toBeLessThan(200000);
  await a.reload();await a.getByRole('button',{name:'Личный кабинет',exact:true}).click();await expect(a.getByLabel('Имя',{exact:true})).toHaveValue('Анна');
  await login(b);await b.getByRole('button',{name:'Открыть облачную библиотеку'}).click();await b.getByRole('dialog').getByRole('button',{name:'Подтвердить выбор'}).click();await expect(b.getByLabel('Имя',{exact:true})).toHaveValue('Анна');await expect(b.getByRole('img',{name:'Моя аватарка',exact:true})).toHaveAttribute('src',api.row()!.data.profile.avatar);
  await b.setViewportSize({width:320,height:740});expect(await b.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await b.getByRole('button',{name:'Удалить фото',exact:true}).click();await b.getByRole('button',{name:'Сохранить профиль',exact:true}).click();await expect.poll(()=>api.row()?.data.profile?.avatar).toBe('');
 }finally{await aContext.close();await bContext.close()}
});
test('Смена пароля проверяет текущий; неверный пароль не меняет новый',async({context,page})=>{
 const api=fakeCloud();await api.install(context);await login(page);await page.getByRole('button',{name:'Изменить пароль',exact:true}).click();
 async function fill(old:string){await page.getByLabel('Текущий пароль',{exact:true}).fill(old);await page.getByLabel('Новый пароль',{exact:true}).fill('new-password-42');await page.getByLabel('Повторите новый пароль',{exact:true}).fill('new-password-42');await page.getByRole('button',{name:'Сохранить пароль',exact:true}).click()}
 await fill('wrong-old');await expect(page.getByText('Текущий пароль неверен или вход сейчас недоступен.')).toBeVisible();expect(api.updates).toHaveLength(0);
 await fill('old-password');await expect(page.getByText('Пароль изменён. Используйте новый пароль при следующем входе.')).toBeVisible();expect(api.updates).toHaveLength(1);expect(api.updates[0]).toMatchObject({password:'new-password-42',current_password:'old-password'});
 await expect(page.getByRole('button',{name:'Выйти',exact:true})).toBeVisible();
});
test('Забыли пароль отправляет письмо; ссылка сразу открывает новый пароль без старого',async({browser})=>{
 const api=fakeCloud(),requestContext=await browser.newContext(),recoveryContext=await browser.newContext();
 try{
  await api.install(requestContext);await api.install(recoveryContext);const requestPage=await requestContext.newPage();await requestPage.goto('./');await requestPage.getByRole('button',{name:'Личный кабинет',exact:true}).click();await requestPage.getByRole('button',{name:'Забыли пароль?',exact:true}).click();await requestPage.getByLabel('Email',{exact:true}).fill(user.email);await requestPage.getByRole('button',{name:'Отправить письмо',exact:true}).click();await expect(requestPage.getByText('Если аккаунт с таким адресом существует, на него отправлено письмо восстановления.')).toBeVisible();expect(api.resets[0].body.email).toBe(user.email);
  const page=await recoveryContext.newPage();await page.goto(`./#access_token=${token}&refresh_token=test-refresh&token_type=bearer&expires_in=3600&type=recovery`);
  await expect(page.getByRole('heading',{name:'Личный кабинет',exact:true})).toBeVisible();await expect(page.getByLabel('Новый пароль',{exact:true})).toBeVisible();await expect(page.getByLabel('Текущий пароль',{exact:true})).toHaveCount(0);
  await page.reload();await expect(page.getByLabel('Новый пароль',{exact:true})).toBeVisible();await expect(page.getByLabel('Текущий пароль',{exact:true})).toHaveCount(0);
  await page.getByLabel('Новый пароль',{exact:true}).fill('recovered-password-42');await page.getByLabel('Повторите новый пароль',{exact:true}).fill('different-password');await page.getByRole('button',{name:'Сохранить новый пароль',exact:true}).click();await expect(page.getByText('Новые пароли не совпадают.')).toBeVisible();expect(api.updates).toHaveLength(0);
  await page.getByLabel('Повторите новый пароль',{exact:true}).fill('recovered-password-42');await page.getByRole('button',{name:'Сохранить новый пароль',exact:true}).click();await expect(page.getByText('Новый пароль сохранён.')).toBeVisible();expect(api.updates[0].password).toBe('recovered-password-42');expect(api.updates[0].current_password).toBeUndefined();
 }finally{await requestContext.close();await recoveryContext.close()}
});
test('Истёкшая ссылка предлагает запросить новую и не открывает смену пароля',async({context,page})=>{
 const api=fakeCloud();await api.install(context);await page.goto('./#error=access_denied&error_code=otp_expired&error_description=expired');await expect(page.getByRole('heading',{name:'Личный кабинет',exact:true})).toBeVisible();await expect(page.getByText('Ссылка недействительна или истекла. Запросите новое письмо восстановления.')).toBeVisible();await expect(page.getByRole('button',{name:'Забыли пароль?',exact:true})).toBeVisible();expect(api.updates).toHaveLength(0);
});
