import {test,expect,type Page} from '@playwright/test';
async function latest(page:Page){return page.evaluate(async()=>new Promise<{data:{books:{title:string}[];quotes:unknown[]}}|null>((resolve,reject)=>{const open=indexedDB.open('moya-biblioteka-storage',1);open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result;if(!db.objectStoreNames.contains('snapshots')){db.close();resolve(null);return}const request=db.transaction('snapshots','readonly').objectStore('snapshots').get('latest');request.onsuccess=()=>{db.close();resolve(request.result??null)};request.onerror=()=>{db.close();reject(request.error)}}}))}
async function addBook(page:Page,title:string){const desktop=page.getByRole('navigation',{name:'Основная навигация',exact:true});await desktop.getByRole('button',{name:'Мои книги'}).click();await page.locator('.page-heading').getByRole('button',{name:'Добавить книгу',exact:true}).click();const d=page.getByRole('dialog');await d.getByLabel('Название книги').fill(title);await d.getByLabel('Автор',{exact:false}).fill('Автор дневника');await d.getByRole('button',{name:'Сохранить',exact:true}).click()}

test('Случайная цитата переключается и фильтруется по сезонам книг',async({page})=>{
 await page.goto('./');await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('moya-biblioteka.v1')!);delete d._storage;d.books[0].seasons=['winter'];d.books[1].seasons=['summer'];d.books[2].seasons=['winter'];d.quotes=d.books.slice(0,3).map((b:{id:string},i:number)=>({id:`quote-${i}`,bookId:b.id,text:`Моя личная запись ${i}`,favorite:i===0,page:null,createdAt:new Date().toISOString()}));localStorage.setItem('moya-biblioteka.v1',JSON.stringify(d))});await page.reload();
 const quote=page.locator('.diary-section blockquote');await expect(quote).toContainText('Моя личная запись');const before=await quote.textContent();await page.getByRole('button',{name:'Другая цитата'}).click();await expect(quote).not.toHaveText(before!);
 await page.getByLabel('Сезон цитаты на главной').selectOption('summer');await expect(quote).toContainText('Моя личная запись 1');await expect(page.getByRole('button',{name:'Другая цитата'})).toHaveCount(0);
 await page.getByRole('button',{name:'Все цитаты',exact:true}).click();await expect(page.locator('.quote-card')).toHaveCount(1);await page.getByLabel('Фильтр цитат по сезону').selectOption('winter');await expect(page.locator('.quote-card')).toHaveCount(2);
 await page.getByRole('navigation',{name:'Основная навигация',exact:true}).getByRole('button',{name:'Мои книги'}).click();await expect(page.locator('.season-filters')).toBeHidden();await page.getByRole('button',{name:/Полки и фильтры/}).click();await expect(page.locator('.season-filters')).toBeVisible();
});

test('Локальная копия восстанавливает записи при потере localStorage',async({page})=>{
 await page.goto('./');await addBook(page,'Моя сохранённая история');await expect.poll(async()=>((await latest(page))?.data.books||[]).some(b=>b.title==='Моя сохранённая история')).toBe(true);
 await page.evaluate(()=>localStorage.removeItem('moya-biblioteka.v1'));await page.reload();await page.getByRole('navigation',{name:'Основная навигация',exact:true}).getByRole('button',{name:'Мои книги'}).click();await expect(page.getByRole('button',{name:'Моя сохранённая история',exact:true})).toBeVisible();
 await page.getByLabel('Настройки',{exact:true}).click();await page.getByRole('button',{name:'Найти локальные копии'}).click();await expect(page.locator('.local-copies>div').first()).toBeVisible();
});

test('Удалённая пользователем библиотека остаётся пустой после восстановления',async({page})=>{
 await page.goto('./');await page.getByLabel('Настройки',{exact:true}).click();await page.getByLabel('JSON-файл резервной копии').setInputFiles({name:'empty.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({version:1,books:[],quotes:[],shelves:[],settings:{goals:{}}}))});await page.getByRole('dialog').getByRole('button',{name:'Восстановить',exact:true}).click();await expect.poll(async()=>(await latest(page))?.data.books.length).toBe(0);
 await page.evaluate(()=>localStorage.removeItem('moya-biblioteka.v1'));await page.reload();await page.getByRole('navigation',{name:'Основная навигация',exact:true}).getByRole('button',{name:'Мои книги'}).click();await expect(page.getByText('Первая книга — начало коллекции')).toBeVisible();
});

test('Постоянный адрес, кнопка обновления и чтение сохранённой библиотеки без сети',async({page,context})=>{
 test.setTimeout(45000);await page.goto('./?v=old-bookmark');await expect(page).toHaveURL(/\/library\/$/);await addBook(page,'История без потерь');
 await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
 await page.route('**/version.json',route=>route.fulfill({json:{version:'future-version'}}));await page.getByLabel('Настройки',{exact:true}).click();await page.getByRole('button',{name:'Проверить обновление'}).click();await expect(page.locator('.update-banner')).toBeVisible();
 const navigation=page.waitForEvent('load');await page.locator('.update-banner').getByRole('button',{name:'Обновить приложение'}).click();await navigation;await expect(page).toHaveURL(/\/library\/$/);await page.unroute('**/version.json');
 await expect.poll(async()=>((await latest(page))?.data.books||[]).some(b=>b.title==='История без потерь')).toBe(true);
 await context.setOffline(true);await page.reload();await page.getByRole('navigation',{name:'Основная навигация',exact:true}).getByRole('button',{name:'Мои книги'}).click();await expect(page.getByRole('button',{name:'История без потерь',exact:true})).toBeVisible();await context.setOffline(false);
});

test('Другое окно не перезаписывает более свежие записи',async({page,context})=>{
 await page.goto('./');await page.getByRole('navigation',{name:'Основная навигация',exact:true}).getByRole('button',{name:'Мои книги'}).click();await page.locator('.page-heading').getByRole('button',{name:'Добавить книгу',exact:true}).click();const d=page.getByRole('dialog');await d.getByLabel('Название книги').fill('Устаревшая форма');await d.getByLabel('Автор',{exact:false}).fill('Автор');
 const other=await context.newPage();await other.goto('./');await addBook(other,'Запись из другого окна');await expect(page.locator('.storage-warning')).toContainText('другом окне');await d.getByRole('button',{name:'Сохранить',exact:true}).click();await expect(d).toBeVisible();const titles=await other.evaluate(()=>JSON.parse(localStorage.getItem('moya-biblioteka.v1')!).books.map((b:{title:string})=>b.title));expect(titles).toContain('Запись из другого окна');expect(titles).not.toContain('Устаревшая форма');
});
