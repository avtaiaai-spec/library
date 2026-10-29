const ignored=new Set(['из','в','во','на','и','с','со','о','об','к','ко','по','от','до','за','у','a','an','the','of','in','to','and','from']);
const words=(value:string)=>value.normalize('NFKC').toLocaleLowerCase('ru').replace(/ё/g,'е').match(/[\p{L}\p{N}]+/gu)||[];
export function titleScore(title:string,query:string){
 const original=words(query);if(!original.length)return 1;
 const actual=words(title);if(!actual.length)return 0;
 const wanted=original.filter(w=>!ignored.has(w));const required=[...new Set(wanted.length?wanted:original)];
 if(!required.every(w=>actual.some(t=>t===w||(w.length>=3&&t.startsWith(w)))))return 0;
 const full=actual.join(' '),asked=original.join(' ');
 if(full===asked)return 100;
 if(full.startsWith(asked+' '))return 90;
 if((' '+full+' ').includes(' '+asked+' '))return 80;
 return 50+Math.min(20,Math.round(required.length/actual.length*20));
}
export function rankTitles<T extends {title:string}>(items:T[],query:string){return items.map((book,index)=>({book,index,score:titleScore(book.title,query)})).filter(item=>item.score>0).sort((a,b)=>b.score-a.score||a.index-b.index).map(item=>item.book).slice(0,8)}
export const catalogPhrase=(value:string)=>value.replace(/["\\]/g,' ').replace(/\s+/g,' ').trim();
