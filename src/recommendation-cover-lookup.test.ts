import {describe,it,expect,vi,afterEach} from 'vitest';
import {selectCover,lookupCover} from './recommendation-cover-lookup';
afterEach(()=>vi.unstubAllGlobals());
const source={title:'Маятник Фуко',author:'Умберто Эко',englishAuthor:'Umberto Eco'};
const edition={key:'/books/OL123M',title:source.title,language:['rus'],cover_i:102};
const result=(editions:unknown[],author=source.author)=>({docs:[{title:source.title,author_name:[author],cover_i:999,language:['rus','eng'],editions:{docs:editions}}]});
describe('Russian edition covers',()=>{
 it('selects the Russian edition cover instead of the work cover',()=>{
  expect(selectCover(result([edition]),source.title,source.author)).toContain('/102-L.jpg');
  expect(selectCover(result([edition],'Другой автор'),source.title,source.author)).toBe('');
 });
 it('rejects English, unverified and mismatched editions even in Russian works',()=>{
  for(const override of [{language:['eng']},{language:undefined},{title:'Имя розы'},{key:'/works/OL123W'},{cover_i:0}])expect(selectCover(result([{...edition,...override}]),source.title,source.author)).toBe('');
  expect(selectCover(result([]),source.title,source.author)).toBe('');
 });
 it('does not fall back to an original-language search',async()=>{
  const fetchMock=vi.fn().mockResolvedValue({ok:true,json:async()=>result([{...edition,language:['eng']}])});vi.stubGlobal('fetch',fetchMock);
  expect(await lookupCover(source,new AbortController().signal)).toBe('');expect(fetchMock).toHaveBeenCalledTimes(1);
  const url=new URL(fetchMock.mock.calls[0][0]);expect(url.searchParams.get('language')).toBe('rus');expect(url.searchParams.get('title')).toBe(source.title);
 });
 it('accepts canonical author metadata while requiring a Russian edition',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>result([edition],'Umberto Eco')}));
  expect(await lookupCover(source,new AbortController().signal)).toContain('/102-L.jpg');
 });
 it('handles errors and cancellation',async()=>{
  const fetchMock=vi.fn().mockRejectedValue(new Error('offline'));vi.stubGlobal('fetch',fetchMock);
  expect(await lookupCover(source,new AbortController().signal)).toBe('');
  const controller=new AbortController();controller.abort();fetchMock.mockClear();
  expect(await lookupCover(source,controller.signal)).toBe('');expect(fetchMock).not.toHaveBeenCalled();
 });
});
