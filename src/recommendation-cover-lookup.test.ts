import {describe,it,expect,vi,afterEach} from 'vitest';
import {selectCover,lookupCover} from './recommendation-cover-lookup';
afterEach(()=>vi.unstubAllGlobals());
const source={title:'Маятник Фуко',author:'Умберто Эко',englishTitle:'Foucault’s Pendulum',englishAuthor:'Umberto Eco'};
describe('real recommendation covers',()=>{
 it('accepts only the matching work and author with a real cover ID',()=>{
  const docs=[{title:'Маятник Фуко',author_name:['Другой автор'],cover_i:100},{title:'Имя розы',author_name:['Умберто Эко'],cover_i:101},{title:'Маятник Фуко',author_name:['Умберто Эко'],cover_i:102}];
  expect(selectCover({docs},source.title,source.author)).toBe('https://covers.openlibrary.org/b/id/102-L.jpg?default=false');
  expect(selectCover({docs:[{...docs[2],cover_i:0}]},source.title,source.author)).toBe('');
 });
 it('tries the original edition when no Russian cover is found',async()=>{
  const fetchMock=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({docs:[]})}).mockResolvedValueOnce({ok:true,json:async()=>({docs:[{title:"Foucault's Pendulum",author_name:['Umberto Eco'],cover_i:123}]})});
  vi.stubGlobal('fetch',fetchMock);
  expect(await lookupCover(source,new AbortController().signal)).toContain('/123-L.jpg');
  expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get('language')).toBe('rus');
  expect(fetchMock.mock.calls[0][1].credentials).toBe('omit');
 });
 it('handles catalogue errors and cancellation without selecting an unrelated image',async()=>{
  const fetchMock=vi.fn().mockRejectedValue(new Error('offline'));vi.stubGlobal('fetch',fetchMock);
  expect(await lookupCover(source,new AbortController().signal)).toBe('');
  const controller=new AbortController();controller.abort();fetchMock.mockClear();
  expect(await lookupCover(source,controller.signal)).toBe('');expect(fetchMock).not.toHaveBeenCalled();
 });
});
