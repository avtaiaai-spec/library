import {useState} from 'react';
import {Search,ArrowUpRight} from 'lucide-react';
import {Modal} from './UI';
import {searchDiary,excerpt} from '../search';
import type {Library} from '../data';
export function DiarySearch({data,onBook,onQuote,onClose}:{data:Library;onBook:(id:string)=>void;onQuote:(id:string)=>void;onClose:()=>void}){
 const [query,setQuery]=useState('');const results=searchDiary(data,query);
 return <Modal title="Поиск по дневнику" wide onClose={onClose}><div className="form-scroll diary-search"><label className="search-field"><Search size={19}/><input autoFocus aria-label="Поиск во всей библиотеке" placeholder="Книга, цитата, впечатление, тег…" value={query} onChange={e=>setQuery(e.target.value)}/></label><p className="fine-print" aria-live="polite">{query.trim()?`Найдено: ${results.length}`:'Поиск по книгам, цитатам, впечатлениям, полкам и тегам.'}</p>{(['book','notes','quote'] as const).map(kind=>{const group=results.filter(r=>r.kind===kind);return group.length?<section className="search-group" key={kind}><h3>{{book:'Книги',notes:'Впечатления и заметки',quote:'Цитаты'}[kind]} <small>{group.length}</small></h3>{group.map(r=><button className="search-result" key={r.id} onClick={()=>{if(kind==='quote')onQuote(r.id);else onBook(r.bookId);onClose()}}><span><strong>{r.title}</strong><small>{r.author}</small>{r.text&&<span className={kind==='quote'?'search-quote':''}>{excerpt(r.text,query)}</span>}</span><ArrowUpRight size={17}/></button>)}</section>:null})}{query.trim()&&!results.length&&<p className="search-no-results">Совпадений нет. Попробуйте другое слово или часть названия.</p>}</div></Modal>
}
