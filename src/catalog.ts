import {titleScore,rankTitles,catalogPhrase} from './catalog-match';
import {normalizedISBN,validISBN} from './collections';
export interface CatalogBook{
 id:string;title:string;author:string;isbn:string;publisher:string;publicationDate:string;pages:number|null;cover:string;
 source:'google'|'openlibrary';kind:'edition'|'work';
}
const record=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const text=(value:unknown)=>typeof value==='string'?value.trim():'';
const strings=(value:unknown)=>Array.isArray(value)?value.map(text).filter(Boolean):[];
const names=(value:unknown)=>Array.isArray(value)?value.map(v=>text(record(v).name)).filter(Boolean).join(', '):'';
const pages=(value:unknown)=>typeof value==='number'&&Number.isSafeInteger(value)&&value>0?value:null;
function imageURL(value:unknown){try{const u=new URL(text(value));if(!['http:','https:'].includes(u.protocol))return '';u.protocol='https:';return u.href}catch{return ''}}
const isbnFrom=(values:unknown)=>strings(values).find(validISBN)||'';
export function isRussianLanguage(value:unknown):boolean{const values=Array.isArray(value)?value:[value];return values.some(v=>{const code=typeof v==='string'?v:text(record(v).key);return /^(ru|rus|ru[-_]ru|\/languages\/rus)$/i.test(code)})}
export const catalogSource=(book:CatalogBook)=>book.source==='openlibrary'?'Open Library':'Google Books';

export function parseCatalog(value:unknown):CatalogBook[]{
 const items=record(value).items;if(!Array.isArray(items))return [];
 return items.flatMap(item=>{
  const root=record(item),v=record(root.volumeInfo),image=record(v.imageLinks);
  const title=text(v.title),author=strings(v.authors).join(', ');if(!title||!author||!isRussianLanguage(v.language))return [];
  const identifiers=Array.isArray(v.industryIdentifiers)?v.industryIdentifiers.map(record):[];
  const found=identifiers.find(i=>i.type==='ISBN_13'&&validISBN(text(i.identifier)))||identifiers.find(i=>validISBN(text(i.identifier)));
  return [{id:text(root.id)||`${title}:${author}`,title,author,isbn:found?normalizedISBN(text(found.identifier)):'',publisher:text(v.publisher),publicationDate:text(v.publishedDate),pages:pages(v.pageCount),cover:imageURL(image.thumbnail||image.smallThumbnail),source:'google' as const,kind:'edition' as const}];
 }).slice(0,20);
}
export function parseOpenLibrarySearch(value:unknown,query=''):CatalogBook[]{
 const docs=record(value).docs;if(!Array.isArray(docs))return [];
 return docs.flatMap(item=>{
  const work=record(item),editionDocs=record(work.editions).docs;
  const candidates=Array.isArray(editionDocs)?editionDocs.map(record).filter(e=>/^\/books\/OL\d+M$/.test(text(e.key))&&isRussianLanguage(e.language||e.languages)):[];
  // A work can contain a mismatched or differently titled edition. Check its displayed title before using any edition fields.
  const best=candidates.map(e=>({edition:e,score:titleScore(text(e.title),query)})).sort((a,b)=>b.score-a.score)[0];
  const edition=best&&best.score>0&&best.score>=titleScore(text(work.title),query)?best.edition:{};
  const editionKey=text(edition.key),knownEdition=/^\/books\/OL\d+M$/.test(editionKey);
  const title=text(knownEdition?edition.title:work.title)||text(work.title),author=strings(work.author_name).join(', ');
  if(!title||!author||(!knownEdition&&(!isRussianLanguage(work.language)||!/[а-яё]/i.test(title))))return [];
  const cover=knownEdition?edition.cover_i:null;
  const coverId=typeof cover==='number'&&Number.isSafeInteger(cover)&&cover>0?cover:null;
  return [{id:`ol:${knownEdition?editionKey:text(work.key)||title+author}`,title,author,
   isbn:knownEdition?normalizedISBN(isbnFrom(edition.isbn)):'',
   publisher:knownEdition?strings(edition.publisher).join(', '):'',
   publicationDate:knownEdition?(text(edition.publish_date)||strings(edition.publish_date)[0]||''):'',
   pages:knownEdition?pages(edition.number_of_pages):null,
   cover:coverId?`https://covers.openlibrary.org/b/id/${coverId}-L.jpg?default=false`:'',
   source:'openlibrary' as const,kind:knownEdition?'edition' as const:'work' as const}];
 }).slice(0,20);
}
export function parseOpenLibraryISBN(value:unknown,isbn:string,verifiedLanguage?:unknown):CatalogBook[]{
 const book=record(record(value)[`ISBN:${isbn}`]),cover=record(book.cover);
 const title=text(book.title),author=names(book.authors);if(!title||!author||!isRussianLanguage(verifiedLanguage||book.languages||book.language))return [];
 return [{id:`ol:isbn:${isbn}`,title,author,isbn,publisher:names(book.publishers),publicationDate:text(book.publish_date),pages:pages(book.number_of_pages),cover:imageURL(cover.large||cover.medium||cover.small),source:'openlibrary',kind:'edition'}];
}
class ProviderError extends Error{constructor(readonly reason:'restricted'|'unavailable'|'timeout'){super(reason)}}
async function requestJSON(url:URL,signal:AbortSignal,timeout:number):Promise<unknown>{
 if(signal.aborted)throw new DOMException('Поиск отменён','AbortError');
 const controller=new AbortController(),cancel=()=>controller.abort();signal.addEventListener('abort',cancel,{once:true});
 const timer=setTimeout(()=>controller.abort('timeout'),timeout);
 try{
  const response=await fetch(url,{signal:controller.signal,credentials:'omit',headers:{Accept:'application/json'}});
  if(!response.ok)throw new ProviderError(response.status===429||response.status===403?'restricted':'unavailable');
  return await response.json();
 }catch(error){
  if(signal.aborted)throw new DOMException('Поиск отменён','AbortError');
  if(controller.signal.aborted)throw new ProviderError('timeout');
  throw error;
 }finally{clearTimeout(timer);signal.removeEventListener('abort',cancel)}
}
export async function searchCatalog(query:string,signal:AbortSignal,author=''):Promise<CatalogBook[]>{
 const value=catalogPhrase(query),writer=catalogPhrase(author);if(!value&&!writer)throw new Error('Введите название книги, писателя или ISBN.');
 const compact=normalizedISBN(value),isISBN=/^[\dX]+$/i.test(compact)&&compact.length>=10;
 if(isISBN&&!validISBN(compact))throw new Error('Проверьте ISBN: контрольная цифра не совпадает.');
 const google=new URL('https://www.googleapis.com/books/v1/volumes');
 google.searchParams.set('q',isISBN?`isbn:${compact}`:[value?`intitle:"${value}"`:'',writer?`inauthor:"${writer}"`:''].filter(Boolean).join(' '));google.searchParams.set('maxResults','20');google.searchParams.set('printType','books');google.searchParams.set('langRestrict','ru');
 const open=new URL(isISBN?'https://openlibrary.org/api/books':'https://openlibrary.org/search.json');
 if(isISBN){open.searchParams.set('bibkeys',`ISBN:${compact}`);open.searchParams.set('format','json');open.searchParams.set('jscmd','data')}
 else{if(value)open.searchParams.set('title',value);if(writer)open.searchParams.set('author',writer);open.searchParams.set('limit','20');open.searchParams.set('lang','ru');open.searchParams.set('language','rus');open.searchParams.set('fields','key,title,author_name,language,editions,editions.key,editions.title,editions.language,editions.isbn,editions.publisher,editions.publish_date,editions.cover_i')}
 const parseOpen=async(data:unknown):Promise<CatalogBook[]>=>{
  if(!isISBN)return parseOpenLibrarySearch(data,value);
  const entry=record(record(data)[`ISBN:${compact}`]);
  if(isRussianLanguage(entry.languages||entry.language))return parseOpenLibraryISBN(data,compact);
  const key=text(entry.key);if(!/^\/books\/OL\d+M$/.test(key))return [];
  const edition=record(await requestJSON(new URL(`https://openlibrary.org${key}.json`),signal,4500));
  return parseOpenLibraryISBN(data,compact,edition.languages||edition.language);
 };
 const errors:unknown[]=[];
 for(const provider of [{url:google,parse:parseCatalog,timeout:4500},{url:open,parse:parseOpen,timeout:6500}]){
  if(signal.aborted)throw new DOMException('Поиск отменён','AbortError');
  try{const found=await provider.parse(await requestJSON(provider.url,signal,provider.timeout));const relevant=isISBN?found:rankTitles(found,value);if(relevant.length)return relevant}
  catch(error){if(signal.aborted)throw error;errors.push(error)}
 }
 if(errors.length){
  const restricted=errors.some(e=>e instanceof ProviderError&&e.reason==='restricted');
  throw new Error(restricted?'Не удалось завершить поиск: один из каталогов ограничил доступ, а резервный не вернул подходящего русскоязычного издания. Попробуйте название с автором, ISBN или повторите позже.':'Каталоги сейчас недоступны или не смогли завершить поиск. Проверьте интернет и попробуйте ещё раз. Ручной ввод доступен.');
 }
 return [];
}
