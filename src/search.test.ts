import {describe,it,expect} from 'vitest';
import {seed} from './data';
import {searchDiary,excerpt} from './search';
import {splitTags,validISBN,normalizedISBN} from './collections';
describe('Общий поиск',()=>{
 it('находит книги, впечатления, цитаты и полки из общих данных',()=>{const d=seed();d.shelves=[{id:'garden',name:'Тихий сад'}];Object.assign(d.books[0],{notes:'В саду растёт каштан. Ёжик под деревом.',seasons:['autumn'],tags:['уют'],shelfIds:['garden']});d.quotes=[{id:'quote',bookId:d.books[1].id,text:'Каштан в саду',favorite:false,page:12,createdAt:new Date().toISOString()}];expect(searchDiary(d,'каштан').map(r=>r.kind)).toEqual(['notes','quote']);expect(searchDiary(d,'ежик')[0].kind).toBe('notes');expect(searchDiary(d,'Тихий сад')[0].bookId).toBe(d.books[0].id);expect(searchDiary(d,'осень')[0].bookId).toBe(d.books[0].id);expect(searchDiary(d,'уют')[0].kind).toBe('book');expect(searchDiary(d,'  ')).toEqual([]);expect(searchDiary(d,'сад невозможное')).toEqual([])});
 it('даёт фрагмент вокруг найденного слова и не теряет текст',()=>{const text='А'.repeat(500)+'каштан'+'Б'.repeat(500);expect(excerpt(text,'каштан')).toContain('каштан');expect(excerpt(text,'каштан').length).toBeLessThan(250)});
 it('проверяет ISBN и нормализует пользовательские теги',()=>{expect(validISBN('978-0-14-144114-6')).toBe(true);expect(validISBN('0141441143')).toBe(true);expect(validISBN('9780141441140')).toBe(false);expect(normalizedISBN('ISBN: 978-0-14-144114-6')).toBe('9780141441146');expect(splitTags('сад, уют, Сад,,')).toEqual(['Сад','уют'])});
});
