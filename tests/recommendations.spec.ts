import {test,expect} from '@playwright/test';
test('Рекомендации: подтверждение, сохранение, исключение добавленной книги и мобильная вёрстка',async({page})=>{
 await page.goto('./');
 await page.getByRole('navigation',{name:'Основная навигация',exact:true}).getByRole('button',{name:'Мои книги'}).click();
 await page.getByRole('button',{name:'Открыть книгу Имя розы',exact:true}).click();
 const section=page.getByRole('region',{name:'Возможно, вам будет интересно'});
 await expect(section).toBeVisible();
 const first=section.locator('article').first();
 await expect(first.getByRole('heading',{name:'Маятник Фуко'})).toBeVisible();
 await expect(first).toContainText('Ещё одна книга этого автора');
 await first.getByRole('button',{name:'Хочу прочитать'}).click();
 const dialog=page.getByRole('dialog');
 await expect(dialog).toHaveAccessibleName('Новая история');
 await expect(dialog.getByLabel('Название книги')).toHaveValue('Маятник Фуко');
 await dialog.getByRole('button',{name:'Отмена',exact:true}).click();
 await expect(first).toBeVisible();
 await first.getByRole('button',{name:'Хочу прочитать'}).click();
 await dialog.getByRole('button',{name:'Сохранить',exact:true}).click();
 await expect(section.getByRole('heading',{name:'Маятник Фуко'})).toHaveCount(0);
 await page.reload();
 await page.getByRole('navigation',{name:'Основная навигация',exact:true}).getByRole('button',{name:'Мои книги'}).click();
 await page.getByRole('button',{name:'Открыть книгу Маятник Фуко',exact:true}).click();
 await expect(page.getByRole('heading',{level:1,name:'Маятник Фуко'})).toBeVisible();
 await expect(page.locator('.detail-status')).toContainText('Хочу прочитать');
 await page.setViewportSize({width:320,height:740});
 await expect(section).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('Настоящая обложка из каталога показывается и переносится при добавлении книги',async({page})=>{
 await page.route('https://openlibrary.org/search.json?**',async route=>{
  const title=new URL(route.request().url()).searchParams.get('title');
  await route.fulfill({json:{docs:title==='Маятник Фуко'?[{title:'Маятник Фуко',author_name:['Умберто Эко'],editions:{docs:[{key:'/books/OL123M',title:'Маятник Фуко',language:['rus'],cover_i:123456}]}}]:[]}});
 });
 // The image response is controlled; live catalogue availability is tested separately.
 await page.route('https://covers.openlibrary.org/b/id/123456-L.jpg?**',route=>route.fulfill({path:'public/icon-192.png',contentType:'image/png'}));
 await page.goto('./');
 await page.getByRole('navigation',{name:'Основная навигация',exact:true}).getByRole('button',{name:'Мои книги'}).click();
 await page.getByRole('button',{name:'Открыть книгу Имя розы',exact:true}).click();
 const card=page.locator('.recommendation-card').filter({has:page.getByRole('heading',{name:'Маятник Фуко'})});
 const image=card.getByRole('img',{name:'Обложка книги «Маятник Фуко»'});
 await expect(image).toHaveClass(/is-ready/);
 await card.getByRole('button',{name:'Хочу прочитать'}).click();
 await expect(page.getByRole('dialog').getByLabel('Ссылка на обложку')).toHaveValue('https://covers.openlibrary.org/b/id/123456-L.jpg?default=false');
 await page.getByRole('dialog').getByRole('button',{name:'Сохранить',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('moya-biblioteka.v1')!).books.find((b:{title:string})=>b.title==='Маятник Фуко')?.cover)).toBe('https://covers.openlibrary.org/b/id/123456-L.jpg?default=false');
});
