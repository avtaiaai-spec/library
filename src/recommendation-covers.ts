import sources from './recommendation-cover-sources.json';
import {coverIdentity} from './recommendation-cover-lookup';
const bundled=import.meta.glob<string>('./assets/recommendation-covers/*-ru.jpg',{eager:true,query:'?url',import:'default'});
export function recommendationCoverSource(book:{title:string;author:string}){return sources.find(s=>coverIdentity(s.title)===coverIdentity(book.title)&&coverIdentity(s.author)===coverIdentity(book.author))}
export function bundledRecommendationCover(book:{title:string;author:string}){const source=recommendationCoverSource(book);return source?bundled[`./assets/recommendation-covers/${source.id}-ru.jpg`]||'':''}
