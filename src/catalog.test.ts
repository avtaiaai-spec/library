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
