import {SEASONS,normalizeText} from './collections';
import type {Library} from './data';
export interface SearchResult{kind:'book'|'notes'|'quote';id:string;bookId:string;title:string;author:string;text:string}
export function searchDiary(data:Library,query:string):SearchResult[]{
 const words=normalizeText(query).split(/\s+/).filter(Boolean);if(!words.length)return [];
 const matches=(text:string)=>{const value=normalizeText(text);return words.every(w=>value.includes(w))};
 const results:SearchResult[]=[];
 for(const book of data.books){const shelves=data.shelves.filter(s=>book.shelfIds.includes(s.id)).map(s=>s.name);const metadata=[book.title,book.author,book.genre,book.isbn,book.publisher,book.publicationDate,...book.tags,...book.seasons.map(s=>SEASONS[s]),...shelves].join(' ');
 if(matches(metadata))results.push({kind:'book',id:book.id,bookId:book.id,title:book.title,author:book.author,text:[book.genre,...book.seasons.map(s=>SEASONS[s]),...shelves,...book.tags].filter(Boolean).join(' · ')});
 if(book.notes.trim()&&matches(book.notes))results.push({kind:'notes',id:book.id,bookId:book.id,title:book.title,author:book.author,text:book.notes});
 }
 for(const quote of data.quotes){if(!matches(quote.text))continue;const book=data.books.find(b=>b.id===quote.bookId);if(book)results.push({kind:'quote',id:quote.id,bookId:book.id,title:book.title,author:book.author,text:quote.text})}
 return results;
}
export function excerpt(text:string,query:string){const lower=normalizeText(text);const indices=normalizeText(query).split(/\s+/).filter(Boolean).map(w=>lower.indexOf(w)).filter(n=>n>=0);const start=Math.max(0,(indices.length?Math.min(...indices):0)-65);return `${start?'…':''}${text.slice(start,start+240)}${text.length>start+240?'…':''}`}
