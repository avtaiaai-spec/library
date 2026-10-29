import {useState,type CSSProperties} from 'react';
import {BookOpen} from 'lucide-react';
import type {Book} from '../data';

// Available covers are included in the build, so phones load them from the site itself.
const bundledCovers=import.meta.glob<string>('../assets/covers/*.jpg',{
  eager:true,query:'?url',import:'default',
});
function sourcesFor(cover:string):string[]{
  if(!cover)return [];
  try{
    const url=new URL(cover);
    if(url.hostname==='covers.openlibrary.org'){
      url.searchParams.set('default','false');
      const isbn=url.pathname.match(/^\/b\/isbn\/(\d{13})-[SML]\.jpg$/i)?.[1];
      const local=isbn?bundledCovers[`../assets/covers/${isbn}.jpg`]:undefined;
      return local?[local,url.href]:[url.href];
    }
    return [cover];
  }catch{return []}
}
export function Cover({book,large=false}:{book:Book;large?:boolean}){
  // A changed URL remounts the image state immediately, including during book editing.
  return <CoverImage key={book.cover} book={book} large={large}/>;
}
function CoverImage({book,large}:{book:Book;large:boolean}){
  const sources=sourcesFor(book.cover);
  const [index,setIndex]=useState(0);
  const [ready,setReady]=useState(false);
  const source=sources[index];
  const next=()=>{setReady(false);setIndex(i=>i+1)};
  return <div className={`cover ${large?'cover-large':''}`} style={{'--book-hue':`${[345,125,32,210][[...book.title].reduce((n,c)=>n+c.charCodeAt(0),0)%4]}`} as CSSProperties}>
    <div className="cover-type" aria-hidden={ready}>
      <span>{book.author}</span><BookOpen size={24} strokeWidth={1}/>
      <strong>{book.title}</strong><small>ЛИЧНАЯ КОЛЛЕКЦИЯ</small>
    </div>
    {source&&<img key={source} className={`cover-image ${ready?'is-ready':''}`} src={source}
      alt={`Обложка книги «${book.title}»`} loading={large?'eager':'lazy'} decoding="async" referrerPolicy="no-referrer"
      onLoad={event=>{const img=event.currentTarget;if(img.naturalWidth>1&&img.naturalHeight>1)setReady(true);else next()}}
      onError={next}/>}</div>;
}
