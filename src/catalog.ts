import {normalizedISBN,validISBN} from './collections';
export interface CatalogBook{id:string;title:string;author:string;isbn:string;publisher:string;publicationDate:string;pages:number|null;cover:string}
const record=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const text=(value:unknown)=>typeof value==='string'?value.trim():'';
function imageURL(value:unknown){try{const u=new URL(text(value));if(!['http:','https:'].includes(u.protocol))return '';u.protocol='https:';return u.href}catch{return ''}}
export function parseCatalog(value:unknown):CatalogBook[]{const items=record(value).items;if(!Array.isArray(items))return [];return items.flatMap(item=>{
 const root=record(item),v=record(root.volumeInfo),image=record(v.imageLinks);
 const title=text(v.title),author=Array.isArray(v.authors)?v.authors.filter(a=>typeof a==='string').join(', '):'';
 if(!title||!author)return [];
 const identifiers=Array.isArray(v.industryIdentifiers)?v.industryIdentifiers.map(record):[];
 const found=identifiers.find(i=>i.type==='ISBN_13'&&validISBN(text(i.identifier)))||identifiers.find(i=>validISBN(text(i.identifier)));
 return [{id:text(root.id)||`${title}:${author}`,title,author,isbn:found?normalizedISBN(text(found.identifier)):'',publisher:text(v.publisher),publicationDate:text(v.publishedDate),pages:typeof v.pageCount==='number'&&Number.isSafeInteger(v.pageCount)&&v.pageCount>0?v.pageCount:null,cover:imageURL(image.thumbnail||image.smallThumbnail)}];
}).slice(0,8)}
export async function searchCatalog(query:string,signal:AbortSignal):Promise<CatalogBook[]>{
 const value=query.trim();if(!value)throw new Error('Введите название книги или ISBN.');
 const compact=normalizedISBN(value);const isISBN=/^[\dX]+$/i.test(compact)&&compact.length>=10;
 if(isISBN&&!validISBN(compact))throw new Error('Проверьте ISBN: контрольная цифра не совпадает.');
 const url=new URL('https://www.googleapis.com/books/v1/volumes');url.searchParams.set('q',isISBN?`isbn:${compact}`:value);url.searchParams.set('maxResults','8');url.searchParams.set('printType','books');
 const response=await fetch(url,{signal,credentials:'omit'});
 if(!response.ok)throw new Error(response.status===429||response.status===403?'Каталог временно ограничил запросы. Попробуйте позже или заполните книгу вручную.':'Не удалось получить сведения из каталога. Попробуйте позже.');
 return parseCatalog(await response.json());
}
