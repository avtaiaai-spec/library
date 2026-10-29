import type {Book,Quote} from './data';
import type {Season} from './collections';
export function quotesForSeason(quotes:Quote[],books:Book[],season:string){if(!season)return quotes;const ids=new Set(books.filter(b=>b.seasons.includes(season as Season)).map(b=>b.id));return quotes.filter(q=>ids.has(q.bookId))}
export function randomQuote(quotes:Quote[],previousId='',random:()=>number=Math.random):Quote|undefined{const choices=quotes.length>1?quotes.filter(q=>q.id!==previousId):quotes;if(!choices.length)return undefined;return choices[Math.min(choices.length-1,Math.max(0,Math.floor(random()*choices.length)))]}
