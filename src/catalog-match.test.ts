import {describe,it,expect,vi,afterEach} from 'vitest';
import {titleScore,rankTitles} from './catalog-match';
import {parseCatalog,parseOpenLibrarySearch,searchCatalog} from './catalog';
afterEach(()=>vi.unstubAllGlobals());
describe('Соответствие названия и русский язык',()=>{
 it('отбрасывает книгу со скриншота и ранжирует точное название первым',()=>{
  const query='записки из подполья';expect(titleScore('Минус один глоток воздуха',query)).toBe(0);
  expect(rankTitles([{title:'Избранное: Записки из подполья'},{title:'Минус один глоток воздуха'},{title:'Записки из подполья'}],query).map(b=>b.title)).toEqual(['Записки из подполья','Избранное: Записки из подполья']);
  expect(titleScore('Записки путешественника',query)).toBe(0);expect(titleScore('Джейн-Эйр','джейн эйр')).toBe(100);
 });
 it('не принимает английское издание даже с русским названием в записи',()=>{
  expect(parseCatalog({items:[{volumeInfo:{language:'en',title:'Записки из подполья',authors:['Writer']}}]})).toEqual([]);
  expect(parseOpenLibrarySearch({docs:[{title:'Записки из подполья',language:['eng'],author_name:['Автор']}]})).toEqual([]);
  expect(parseOpenLibrarySearch({docs:[{title:'Notes from Underground',language:['eng','rus'],author_name:['Автор']}]})).toEqual([]);
 });
 it('не подменяет произведение случайным первым изданием',()=>{
  const books=parseOpenLibrarySearch({docs:[{key:'/works/OL1W',title:'Записки из подполья',author_name:['Фёдор Достоевский'],language:['rus','eng'],editions:{docs:[
   {key:'/books/OL111M',language:['rus'],title:'Минус один глоток воздуха',publisher:['Чужое издательство'],number_of_pages:999},
   {key:'/books/OL222M',language:['rus'],title:'Записки из подполья',publisher:['Проверенное издательство'],number_of_pages:240},
  ]}}]},'Записки из подполья');
  expect(books[0].title).toBe('Записки из подполья');expect(books[0].publisher).toBe('Проверенное издательство');expect(books[0].pages).toBe(240);expect(books[0].id).toBe('ol:/books/OL222M');
 });
 it('не переносит данные неподходящего издания в подходящее произведение',()=>{
  const [book]=parseOpenLibrarySearch({docs:[{title:'Записки из подполья',author_name:['Фёдор Достоевский'],language:['rus'],editions:{docs:[{key:'/books/OL111M',language:['rus'],title:'Другая книга',publisher:['Не то издательство'],number_of_pages:999,cover_i:123}]}}]},'Записки из подполья');
  expect(book.kind).toBe('work');expect(book.pages).toBeNull();expect(book.publisher).toBe('');expect(book.cover).toBe('');
 });
 it('отправляет поля названия, писателя и обязательного русского языка в оба API',async()=>{
  const fetch=vi.fn().mockResolvedValueOnce(new Response('{"items":[]}')).mockResolvedValueOnce(new Response(JSON.stringify({docs:[{title:'Записки из подполья',author_name:['Фёдор Достоевский'],language:['rus']}]})));vi.stubGlobal('fetch',fetch);
  await searchCatalog('записки из подполья',new AbortController().signal,'Достоевский');const google=new URL(fetch.mock.calls[0][0]),open=new URL(fetch.mock.calls[1][0]);
  expect(google.searchParams.get('q')).toBe('intitle:"записки из подполья" inauthor:"Достоевский"');expect(google.searchParams.get('langRestrict')).toBe('ru');expect(open.searchParams.get('title')).toBe('записки из подполья');expect(open.searchParams.get('author')).toBe('Достоевский');expect(open.searchParams.get('language')).toBe('rus');expect(open.searchParams.has('q')).toBe(false);
 });
 it('не показывает нерелевантные рекомендации из успешного ответа сервиса',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({items:[{volumeInfo:{language:'ru',title:'Другая книга',authors:['Автор']}}]}))).mockResolvedValueOnce(new Response(JSON.stringify({docs:[{title:'Минус один глоток воздуха',author_name:['Karen White'],language:['rus']}]}))));
  expect(await searchCatalog('Записки из подполья',new AbortController().signal)).toEqual([]);
 });
 it('проверяет язык точного ISBN по записи издания, а не по языку автора',async()=>{
  const fetch=vi.fn().mockResolvedValueOnce(new Response('{"items":[]}')).mockResolvedValueOnce(new Response(JSON.stringify({'ISBN:9780141441146':{key:'/books/OL123M',title:'Тестовая запись каталога',authors:[{name:'Автор'}]}}))).mockResolvedValueOnce(new Response(JSON.stringify({languages:[{key:'/languages/eng'}]})));vi.stubGlobal('fetch',fetch);
  expect(await searchCatalog('9780141441146',new AbortController().signal)).toEqual([]);expect(new URL(fetch.mock.calls[2][0]).pathname).toBe('/books/OL123M.json');
 });
});
