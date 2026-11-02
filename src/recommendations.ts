import type {Book} from './data';
import {normalizeText} from './collections';
export interface Recommendation {title:string;author:string;genre:string;reason:string}
// A small editorial collection, available offline. No invented edition metadata.
const collection:[string,string,string[]][]=[
 ['Портрет Дориана Грея','Оскар Уайльд',['Роман','Классика']],
 ['Фауст','Иоганн Вольфганг Гёте',['Классика','Поэзия']],
 ['Мастер и Маргарита','Михаил Булгаков',['Роман','Классика','Фантастика']],
 ['Джейн Эйр','Шарлотта Бронте',['Роман','Классика']],
 ['Городок','Шарлотта Бронте',['Роман','Классика']],
 ['Грозовой перевал','Эмили Бронте',['Роман','Классика']],
 ['Гордость и предубеждение','Джейн Остин',['Роман','Классика']],
 ['Очарованный апрель','Элизабет фон Арним',['Роман','Классика']],
 ['Скорбь сатаны','Мария Корелли',['Роман','Классика']],
 ['Роман двух миров','Мария Корелли',['Роман','Фантастика']],
 ['Имя розы','Умберто Эко',['Детектив','Роман']],
 ['Маятник Фуко','Умберто Эко',['Детектив','Роман']],
 ['Убийство в Восточном экспрессе','Агата Кристи',['Детектив']],
 ['Собака Баскервилей','Артур Конан Дойл',['Детектив']],
 ['Солярис','Станислав Лем',['Фантастика']],
 ['Пикник на обочине','Аркадий и Борис Стругацкие',['Фантастика']],
 ['451 градус по Фаренгейту','Рэй Брэдбери',['Фантастика']],
 ['Хоббит, или Туда и обратно','Джон Рональд Руэл Толкин',['Фэнтези']],
 ['Волшебник Земноморья','Урсула Ле Гуин',['Фэнтези']],
 ['Последнее желание','Анджей Сапковский',['Фэнтези']],
 ['Реквием','Анна Ахматова',['Поэзия']],
 ['Камень','Осип Мандельштам',['Поэзия']],
 ['Думай медленно… решай быстро','Даниэль Канеман',['Нон-фикшн']],
 ['Краткая история времени','Стивен Хокинг',['Нон-фикшн']],
 ['Сказать жизни «Да!»','Виктор Франкл',['Нон-фикшн','Биография']],
 ['Долгий путь к свободе','Нельсон Мандела',['Биография']],
 ['Былое и думы','Александр Герцен',['Биография','Классика']],
];
const key=(title:string)=>normalizeText(title).replace(/[^\p{L}\p{N}]/gu,'');
export function recommendBooks(book:Pick<Book,'title'|'author'|'genre'>,library:Pick<Book,'title'|'author'>[]):Recommendation[]{
 const author=normalizeText(book.author),genre=normalizeText(book.genre);
 const excluded=new Set([...library.map(b=>key(b.title)),key(book.title)]);
 return collection.map(([title,writer,genres],index)=>{
  const sameAuthor=!!author&&normalizeText(writer)===author;
  const sameGenre=!!genre&&genres.some(g=>normalizeText(g)===genre);
  return {title,author:writer,genre:genres[0],reason:sameAuthor?'Ещё одна книга этого автора':`Общий жанр: ${book.genre}`,score:sameAuthor?2:sameGenre?1:0,index};
 }).filter(b=>b.score>0&&!excluded.has(key(b.title))).sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,4).map(({title,author,genre,reason})=>({title,author,genre,reason}));
}
