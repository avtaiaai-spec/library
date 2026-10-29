import {describe,it,expect,vi,afterEach} from 'vitest';
import {parseCatalog,searchCatalog} from './catalog';
const volume={id:'book',volumeInfo:{title:'Джейн Эйр',authors:['Шарлотта Бронте'],publisher:'Penguin',publishedDate:'2006',pageCount:640,industryIdentifiers:[{type:'ISBN_13',identifier:'9780141441146'}],imageLinks:{thumbnail:'http://books.google.com/cover.jpg'}}};
afterEach(()=>vi.unstubAllGlobals());
describe('Каталог книг',()=>{
 it('нормализует найденное издание и безопасную обложку',()=>{const [b]=parseCatalog({items:[volume]});expect(b.title).toBe('Джейн Эйр');expect(b.isbn).toBe('9780141441146');expect(b.publisher).toBe('Penguin');expect(b.cover).toBe('https://books.google.com/cover.jpg');expect(b.pages).toBe(640)});
 it('не придумывает автора, объём или издание и отбрасывает опасный URL',()=>{expect(parseCatalog({items:[{volumeInfo:{title:'Без автора'}}]})).toEqual([]);const [b]=parseCatalog({items:[{volumeInfo:{title:'Книга',authors:['Автор'],imageLinks:{thumbnail:'javascript:alert(1)'},pageCount:-1}}]});expect(b.pages).toBeNull();expect(b.publisher).toBe('');expect(b.cover).toBe('');expect(parseCatalog({})).toEqual([])});
 it('ищет по ISBN и не отправляет неправильный ISBN',async()=>{const fetch=vi.fn().mockResolvedValue(new Response(JSON.stringify({items:[volume]})));vi.stubGlobal('fetch',fetch);const results=await searchCatalog('978-0-14-144114-6',new AbortController().signal);expect(results).toHaveLength(1);expect(new URL(fetch.mock.calls[0][0]).searchParams.get('q')).toBe('isbn:9780141441146');await expect(searchCatalog('9780141441140',new AbortController().signal)).rejects.toThrow('ISBN');expect(fetch).toHaveBeenCalledTimes(1)});
 it('отличает недоступный сервис от пустого результата',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('{}',{status:429})));await expect(searchCatalog('Джейн Эйр',new AbortController().signal)).rejects.toThrow('ограничил')});
});
describe('Резервный поиск Open Library',()=>{
 it('находит Записки из подполья после отказа Google Books',async()=>{
  const fetch=vi.fn().mockResolvedValueOnce(new Response('{}',{status:403})).mockResolvedValueOnce(new Response(JSON.stringify({docs:[{key:'/works/OLtestW',title:'Записки из подполья',author_name:['Фёдор Достоевский'],cover_i:123,first_publish_year:1864,number_of_pages_median:240,isbn:['9780141441146']}]})));
  vi.stubGlobal('fetch',fetch);const [book]=await searchCatalog('Записки из подполья',new AbortController().signal);
  expect(book.title).toBe('Записки из подполья');expect(book.author).toBe('Фёдор Достоевский');expect(book.source).toBe('openlibrary');expect(book.kind).toBe('work');expect(book.pages).toBeNull();expect(book.isbn).toBe('');expect(book.publicationDate).toBe('');expect(new URL(fetch.mock.calls[1][0]).hostname).toBe('openlibrary.org');expect(new URL(fetch.mock.calls[1][0]).searchParams.get('q')).toBe('Записки из подполья');
 });
 it('получает точное издание по ISBN из резервного каталога',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockRejectedValueOnce(new TypeError('network')).mockResolvedValueOnce(new Response(JSON.stringify({'ISBN:9780141441146':{title:'Джейн Эйр',authors:[{name:'Шарлотта Бронте'}],publishers:[{name:'Penguin'}],publish_date:'2006',number_of_pages:640,cover:{large:'https://covers.openlibrary.org/b/id/123-L.jpg'}}}))));
  const [book]=await searchCatalog('978-0-14-144114-6',new AbortController().signal);expect(book.isbn).toBe('9780141441146');expect(book.publisher).toBe('Penguin');expect(book.pages).toBe(640);expect(book.kind).toBe('edition');
 });
 it('пробует резервный каталог при пустом результате первого',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(new Response('{"totalItems":0}')).mockResolvedValueOnce(new Response(JSON.stringify({docs:[{key:'/works/OL1W',title:'Книга',author_name:['Автор']}]}))));expect((await searchCatalog('Книга',new AbortController().signal))[0].title).toBe('Книга')});
 it('отличает два пустых результата от отказа обоих сервисов',async()=>{const fetch=vi.fn().mockResolvedValueOnce(new Response('{"items":[]}')).mockResolvedValueOnce(new Response('{"docs":[]}'));vi.stubGlobal('fetch',fetch);expect(await searchCatalog('Редкая книга',new AbortController().signal)).toEqual([]);expect(fetch).toHaveBeenCalledTimes(2)});
 it('отмена пользователем не запускает резервный запрос',async()=>{const controller=new AbortController();vi.stubGlobal('fetch',vi.fn().mockImplementation(()=>{controller.abort();return Promise.reject(new DOMException('Cancelled','AbortError'))}));await expect(searchCatalog('Книга',controller.signal)).rejects.toMatchObject({name:'AbortError'});expect(fetch).toHaveBeenCalledTimes(1)});
 it('при зависшем Google Books переходит к резервному после тайм-аута',async()=>{
  vi.useFakeTimers();try{const fetch=vi.fn().mockImplementationOnce((_url,options)=>new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('timeout','AbortError'))))).mockResolvedValueOnce(new Response(JSON.stringify({docs:[{title:'Книга',author_name:['Автор']}]})));vi.stubGlobal('fetch',fetch);const pending=searchCatalog('Книга',new AbortController().signal);await vi.advanceTimersByTimeAsync(4501);expect((await pending)[0].source).toBe('openlibrary');expect(fetch).toHaveBeenCalledTimes(2)}finally{vi.useRealTimers()}
 });
});
