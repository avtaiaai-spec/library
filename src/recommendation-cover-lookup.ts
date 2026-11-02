// Shared by the browser and the build-time downloader (Node 24 strips TypeScript).
export function coverIdentity(value:string){return value.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/ё/g,'е').replace(/[^\p{L}\p{N}]/gu,'')}
const russian=(value:unknown)=>Array.isArray(value)&&value.some(code=>code==='rus'||code==='ru'||(code&&typeof code==='object'&&'key' in code&&code.key==='/languages/rus'));
export function selectCover(value:unknown,title:string,author:string,canonicalAuthor=''):string{
 if(!value||typeof value!=='object'||!('docs' in value)||!Array.isArray(value.docs))return '';
 const expected=coverIdentity(title),writers=[author,canonicalAuthor].filter(Boolean).map(coverIdentity);
 for(const doc of value.docs){
  if(!doc||typeof doc!=='object')continue;
  const authors=Array.isArray(doc.author_name)?doc.author_name:[];
  if(!authors.some((name:unknown)=>typeof name==='string'&&writers.includes(coverIdentity(name))))continue;
  const editions=doc.editions&&Array.isArray(doc.editions.docs)?doc.editions.docs:[];
  // A work's cover_i can belong to an English edition, even when the work has Russian translations.
  for(const edition of editions){
   if(!edition||typeof edition!=='object'||!russian(edition.language))continue;
   if(typeof edition.key!=='string'||!/^\/books\/OL\d+M$/.test(edition.key))continue;
   if(typeof edition.title!=='string'||coverIdentity(edition.title)!==expected)continue;
   if(Number.isSafeInteger(edition.cover_i)&&edition.cover_i>0)return `https://covers.openlibrary.org/b/id/${edition.cover_i}-L.jpg?default=false`;
  }
 }
 return '';
}
export async function lookupCover(source:{title:string;author:string;englishAuthor:string},signal:AbortSignal,pause=0):Promise<string>{
 if(pause)await new Promise(resolve=>setTimeout(resolve,pause));
 if(signal.aborted)return '';
 const url=new URL('https://openlibrary.org/search.json');
 url.searchParams.set('title',source.title);url.searchParams.set('author',source.englishAuthor||source.author);url.searchParams.set('limit','10');
 url.searchParams.set('language','rus');url.searchParams.set('lang','ru');
 url.searchParams.set('fields','title,author_name,editions,editions.key,editions.title,editions.language,editions.cover_i');
 try{
  const response=await fetch(url,{signal:AbortSignal.any([signal,AbortSignal.timeout(7000)]),credentials:'omit'});
  if(!response.ok)return '';
  return selectCover(await response.json(),source.title,source.author,source.englishAuthor);
 }catch{return ''}
}
