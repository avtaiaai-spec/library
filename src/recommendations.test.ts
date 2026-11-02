import {describe,it,expect} from 'vitest';
import {recommendBooks} from './recommendations';
describe('recommendations',()=>{
 it('prefers the same author and excludes the source and existing books',()=>{
  const book={title:'Имя розы',author:'Умберто Эко',genre:'Детектив'};
  const result=recommendBooks(book,[book,{title:'Собака Баскервилей',author:'Артур Конан Дойл'}]);
  expect(result[0]).toMatchObject({title:'Маятник Фуко',reason:'Ещё одна книга этого автора'});
  expect(result.some(b=>['Имя розы','Собака Баскервилей'].includes(b.title))).toBe(false);
  expect(new Set(result.map(b=>b.title)).size).toBe(result.length);
 });
 it('matches normalized genres without recommending unrelated books',()=>{
  const result=recommendBooks({title:'Новая книга',author:'Автор',genre:' фантастика '},[]);
  expect(result.length).toBeGreaterThan(0);
  expect(result.some(b=>b.title==='Солярис')).toBe(true);
  expect(result.some(b=>b.title==='Реквием')).toBe(false);
 });
 it('returns no fabricated match for unknown authors and genres',()=>{
  expect(recommendBooks({title:'Новая книга',author:'Автор',genre:''},[])).toEqual([]);
 });
 it('does not suggest existing titles with punctuation or case differences',()=>{
  expect(recommendBooks({title:'Другая книга',author:'Автор',genre:'Классика'},[{title:'ПОРТРЕТ ДОРИАНА ГРЕЯ!',author:'О. Уайльд'}]).some(b=>b.title==='Портрет Дориана Грея')).toBe(false);
 });
});
