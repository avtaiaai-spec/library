// Shared by the browser and the build-time downloader (Node 24 strips TypeScript).
export function coverIdentity(value:string){return value.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/ё/g,'е').replace(/[^\p{L}\p{N}]/gu,'')}
export function selectCover(value:unknown,title:string,author:string):string{
 if(!value||typeof value!=='object'||!('docs' in value)||!Array.isArray(value.docs))return '';
 const expected=coverIdentity(title),writer=coverIdentity(author);
 for(const doc of value.docs){
  if(!doc||typeof doc!=='object')continue;
  const match=typeof doc.title==='string'&&coverIdentity(doc.title)===expected;
  const authors=Array.isArray(doc.author_name)?doc.author_name:[];
  const matchingAuthor=authors.some((name:unknown)=>typeof name==='string'&&(coverIdentity(name)===writer||(writer.length>=8&&coverIdentity(name).includes(writer))));
  if(match&&matchingAuthor&&Number.isSafeInteger(doc.cover_i)&&doc.cover_i>0)return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg?default=false`;
 }
 return '';
}
export async function lookupCover(source:{title:string;author:string;englishTitle:string;englishAuthor:string},signal:AbortSignal,pause=0):Promise<string>{
 for(const [title,author,language] of [[source.title,source.author,'rus'],[source.englishTitle,source.englishAuthor,'']]){
  if(pause)await new Promise(resolve=>setTimeout(resolve,pause));
  if(signal.aborted)return '';
  const url=new URL('https://openlibrary.org/search.json');
  url.searchParams.set('title',title);url.searchParams.set('author',author);url.searchParams.set('limit','10');url.searchParams.set('fields','title,author_name,cover_i');if(language)url.searchParams.set('language',language);
  try{const response=await fetch(url,{signal:AbortSignal.any([signal,AbortSignal.timeout(7000)]),credentials:'omit'});if(!response.ok)continue;const cover=selectCover(await response.json(),title,author);if(cover)return cover}catch{if(signal.aborted)return ''}
 }
 return '';
}
