import {Plus} from 'lucide-react';
import {emptyBook,type Book} from '../data';
import {recommendBooks} from '../recommendations';
import {Cover} from './UI';
export function Recommendations({book,books,onAdd}:{book:Book;books:Book[];onAdd:(book:Book)=>void}){
 const recommendations=recommendBooks(book,books);
 return <section className="recommendations" aria-labelledby="recommendations-heading"><div className="section-header"><div><p className="eyebrow">СЛЕДУЮЩАЯ ИСТОРИЯ</p><h2 id="recommendations-heading">Возможно, вам будет интересно</h2></div></div><p className="muted">Небольшая редакционная подборка по автору и жанру книги «{book.title}».</p>{recommendations.length?<div className="recommendation-grid">{recommendations.map(item=><article className="recommendation-card" key={`${item.title}:${item.author}`}><Cover book={{...item,cover:''}}/><div><p className="fine-print">{item.reason}</p><h3>{item.title}</h3><p className="muted">{item.author}</p><button className="button secondary" onClick={()=>onAdd({...emptyBook(),title:item.title,author:item.author,genre:item.genre})}><Plus size={16}/>Хочу прочитать</button></div></article>)}</div>:<p className="muted">Пока нет подходящей рекомендации. Укажите жанр в редакторе книги или попробуйте другую книгу — подборка ещё пополняется.</p>}</section>
}
