import {describe,it,expect} from 'vitest';
import {randomQuote,quotesForSeason} from './quotes';
import {seed,type Quote} from './data';
describe('Цитаты на главной',()=>{
 const data=seed();data.books[0].seasons=['autumn','winter'];data.books[1].seasons=['summer'];
 const quotes:Quote[]=data.books.slice(0,3).map((b,i)=>({id:String(i),bookId:b.id,text:`Собственная заметка ${i}`,page:null,favorite:i===0,createdAt:new Date().toISOString()}));
 it('выбирает случайную цитату из всех записей без приоритета первой или избранной',()=>{expect(randomQuote(quotes,'',()=>0)?.id).toBe('0');expect(randomQuote(quotes,'',()=>0.6)?.id).toBe('1');expect(randomQuote(quotes,'',()=>0.99)?.id).toBe('2')});
 it('переключает на другую цитату, корректно работает с одной и пустым списком',()=>{expect(randomQuote(quotes,'0',()=>0)?.id).toBe('1');expect(randomQuote([quotes[0]],'0')?.id).toBe('0');expect(randomQuote([])).toBeUndefined()});
 it('фильтрует по сезонам связанных книг и оставляет непомеченные только в общем списке',()=>{expect(quotesForSeason(quotes,data.books,'autumn').map(q=>q.id)).toEqual(['0']);expect(quotesForSeason(quotes,data.books,'winter')).toHaveLength(1);expect(quotesForSeason(quotes,data.books,'spring')).toHaveLength(0);expect(quotesForSeason(quotes,data.books,'')).toHaveLength(3)});
});
