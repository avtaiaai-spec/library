import {SEASONS,validISBN,type Season,type Shelf} from './collections';
export const STATUSES = { planned: 'Хочу прочитать', reading: 'Читаю', finished: 'Прочитано' } as const;
export type Status = keyof typeof STATUSES;
export interface Book {id:string; title:string; author:string; genre:string; pages:number|null; currentPage:number; cover:string; status:Status; startDate:string; endDate:string; rating:number|null; notes:string; favorite:boolean; createdAt:string; seasons:Season[]; tags:string[]; shelfIds:string[]; isbn:string; publisher:string; publicationDate:string}
export interface Quote {id:string; bookId:string; text:string; page:number|null; favorite:boolean; createdAt:string}
export interface Library {version:1; books:Book[]; quotes:Quote[]; shelves:Shelf[]; settings:{goals:Record<string,number>}}
export const KEY='moya-biblioteka.v1';
export const GENRES=['Роман','Классика','Детектив','Фантастика','Фэнтези','Поэзия','Нон-фикшн','Биография'];
export const yearNow=()=>new Date().getFullYear();
export const today=()=>{const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
export function emptyBook():Book {return {id:crypto.randomUUID(),title:'',author:'',genre:'',pages:null,currentPage:0,cover:'',status:'planned',startDate:'',endDate:'',rating:null,notes:'',favorite:false,createdAt:new Date().toISOString(),seasons:[],tags:[],shelfIds:[],isbn:'',publisher:'',publicationDate:''}}
export function seed():Library {return {version:1,books:[
{title:'Скорбь сатаны',author:'Мария Корелли',status:'reading',genre:'Роман',pages:640,currentPage:184,cover:'https://covers.openlibrary.org/b/isbn/9780199556780-L.jpg'},
{title:'Джейн Эйр',author:'Шарлотта Бронте',status:'planned',genre:'Классика',pages:640,cover:'https://covers.openlibrary.org/b/isbn/9780141441146-L.jpg'},
{title:'Имя розы',author:'Умберто Эко',status:'planned',genre:'Детектив',pages:608,cover:'https://covers.openlibrary.org/b/isbn/9780156001311-L.jpg'},
{title:'Элизабет и её немецкий сад',author:'Элизабет фон Арним',status:'planned',genre:'Роман',pages:240,cover:'https://covers.openlibrary.org/b/isbn/9780141192245-L.jpg'}
].map(b=>({...emptyBook(),...b}) as Book),quotes:[],shelves:[],settings:{goals:{}}}}
const isObj=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const str=(x:unknown):x is string=>typeof x==='string';
const integer=(x:unknown)=>typeof x==='number'&&Number.isSafeInteger(x)&&x>=0;
export const validDate=(x:string)=>x==='' || (/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x);
export const validCover=(x:string)=>{if(!x)return true;try{return ['http:','https:'].includes(new URL(x).protocol)}catch{return false}};
export function bookError(b:Book):string {if(b.isbn!==undefined&&(!str(b.isbn)||(b.isbn!==''&&!validISBN(b.isbn))))return 'Проверьте ISBN: нужны 10 или 13 знаков с корректной контрольной цифрой.';if((b.publisher!==undefined&&(!str(b.publisher)||b.publisher.length>500))||(b.publicationDate!==undefined&&(!str(b.publicationDate)||b.publicationDate.length>500)))return 'Сведения об издании слишком длинные или имеют неверный формат.';if(!b.title.trim()||!b.author.trim())return 'Укажите название книги и автора.';if(!validCover(b.cover))return 'Ссылка на обложку должна начинаться с https:// или http://.';if(b.pages!==null&&(!integer(b.pages)||b.pages<1))return 'Количество страниц должно быть положительным целым числом.';if(!integer(b.currentPage)||(b.pages!==null&&b.currentPage>b.pages))return 'Текущая страница должна быть от 0 до общего количества страниц.';if(!validDate(b.startDate)||!validDate(b.endDate))return 'Укажите корректные даты.';if(b.startDate&&b.endDate&&b.endDate<b.startDate)return 'Дата завершения не может быть раньше даты начала.';if(b.rating!==null&&(!integer(b.rating)||b.rating<1||b.rating>5))return 'Оценка должна быть от 1 до 5.';return ''}
export function parseLibrary(value:unknown):Library {
 if(!isObj(value)||value.version!==1||!Array.isArray(value.books)||!Array.isArray(value.quotes)||!isObj(value.settings)||!isObj(value.settings.goals))throw new Error('Неподдерживаемый формат резервной копии. Нужен JSON версии 1.');
 const shelves: Shelf[]=[];
 if(value.shelves!==undefined){
  if(!Array.isArray(value.shelves))throw new Error('Некорректные полки.');
  const shelfNames=new Set<string>();
  for(const shelf of value.shelves){if(!isObj(shelf)||!str(shelf.id)||!shelf.id||shelf.id.length>80||!str(shelf.name)||!shelf.name.trim()||shelf.name.length>80||shelves.some(s=>s.id===shelf.id)||shelfNames.has(shelf.name.trim().toLocaleLowerCase('ru')))throw new Error('Некорректная или повторяющаяся полка.');shelves.push({id:shelf.id as string,name:(shelf.name as string).trim()});shelfNames.add((shelf.name as string).trim().toLocaleLowerCase('ru'));}
 }
 const shelfIds=new Set(shelves.map(s=>s.id));
 const list=(x:unknown)=>Array.isArray(x)&&x.length<=100&&x.every(v=>str(v)&&v.trim()&&v.length<=80)&&new Set(x).size===x.length;
 const ids=new Set<string>();
 for(const b of value.books){if(!isObj(b)||!['id','title','author','genre','cover','startDate','endDate','notes','createdAt'].every(k=>str(b[k]))||!b.id||ids.has(b.id as string)||!Object.keys(STATUSES).includes(b.status as string)||typeof b.favorite!=='boolean'||Number.isNaN(Date.parse(b.createdAt as string))||bookError(b as unknown as Book))throw new Error('Некорректные данные книг в резервной копии.');ids.add(b.id as string)}
 for(const b of value.books){
  for(const key of ['seasons','tags','shelfIds'])if(b[key]!==undefined&&!list(b[key]))throw new Error('Некорректные теги или полки книги.');
  if(b.seasons?.some((season:string)=>!Object.hasOwn(SEASONS,season)))throw new Error('Неизвестный сезон.');
  if(b.shelfIds?.some((id:string)=>!shelfIds.has(id)))throw new Error('Книга ссылается на отсутствующую полку.');
  for(const key of ['isbn','publisher','publicationDate'])if(b[key]!==undefined&&(!str(b[key])||b[key].length>500))throw new Error('Некорректные сведения об издании.');
 }
 const qids=new Set<string>();for(const q of value.quotes){if(!isObj(q)||!str(q.id)||!q.id||qids.has(q.id as string)||!ids.has(q.bookId as string)||!str(q.text)||!q.text.trim()||typeof q.favorite!=='boolean'||!str(q.createdAt)||Number.isNaN(Date.parse(q.createdAt as string))||(q.page!==null&&(!integer(q.page)||(q.page as number)<1)))throw new Error('Некорректная цитата или потерянная связь с книгой.');qids.add(q.id as string)}
 for(const [y,g] of Object.entries(value.settings.goals)){if(!/^\d{4}$/.test(y)||!integer(g)||Number(g)>10000)throw new Error('Некорректная годовая цель.');}
 // Rebuild only known schema fields; do not retain arbitrary imported properties.
 return {version:1,books:value.books.map((b:Book)=>({id:b.id,title:b.title,author:b.author,genre:b.genre,pages:b.pages,currentPage:b.currentPage,cover:b.cover,status:b.status,startDate:b.startDate,endDate:b.endDate,rating:b.rating,notes:b.notes,favorite:b.favorite,createdAt:b.createdAt,seasons:b.seasons??[],tags:b.tags??[],shelfIds:b.shelfIds??[],isbn:b.isbn??'',publisher:b.publisher??'',publicationDate:b.publicationDate??''})),shelves,quotes:value.quotes.map((q:Quote)=>({id:q.id,bookId:q.bookId,text:q.text,page:q.page,favorite:q.favorite,createdAt:q.createdAt})),settings:{goals:{...value.settings.goals} as Record<string,number>}};
}
export function readLibrary():{data:Library;error:string} {try{const raw=localStorage.getItem(KEY);return {data:raw===null?seed():parseLibrary(JSON.parse(raw)),error:''}}catch{return {data:{version:1,books:[],quotes:[],shelves:[],settings:{goals:{}}},error:'Не удалось прочитать библиотеку. Исходные данные сохранены без изменений. Скачайте их в настройках, прежде чем восстановить резервную копию.'}}}
export function saveLibrary(data:Library){localStorage.setItem(KEY,JSON.stringify(data))}
export function stats(data:Library,year:number){const finished=data.books.filter(b=>b.status==='finished'&&b.endDate&&Number(b.endDate.slice(0,4))===year);const rated=finished.filter(b=>b.rating!==null);const months=Array.from({length:12},(_,i)=>finished.filter(b=>Number(b.endDate.slice(5,7))===i+1).length);const genres:Record<string,number>={};finished.forEach(b=>{const g=b.genre||'Без жанра';genres[g]=(genres[g]||0)+1});const goal=data.settings.goals[year]||0;return {finished,months,genres,pages:finished.reduce((n,b)=>n+(b.pages||0),0),average:rated.length?rated.reduce((n,b)=>n+b.rating!,0)/rated.length:null,goal,progress:goal?finished.length/goal*100:0}}
export function exportData(data:Library){download(JSON.stringify({...data,exportedAt:new Date().toISOString()},null,2),`моя-библиотека-${today()}.json`)}
export function download(text:string,name:string){const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
