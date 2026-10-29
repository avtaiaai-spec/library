export const SEASONS={spring:'Весна',summer:'Лето',autumn:'Осень',winter:'Зима'} as const;
export type Season=keyof typeof SEASONS;
export interface Shelf{id:string;name:string}
export const normalizeText=(value:string)=>value.toLocaleLowerCase('ru').replace(/ё/g,'е').trim();
export const splitTags=(text:string)=>[...new Map(text.split(',').map(t=>t.trim()).filter(Boolean).map(t=>[normalizeText(t),t])).values()];
export function normalizedISBN(value:string){return value.replace(/^ISBN(?:-1[03])?:?\s*/i,'').replace(/[\s-]/g,'').toUpperCase()}
export function validISBN(value:string){const s=normalizedISBN(value);if(/^\d{9}[\dX]$/.test(s))return [...s].reduce((n,c,i)=>n+(c==='X'?10:Number(c))*(10-i),0)%11===0;if(/^\d{13}$/.test(s))return [...s].reduce((n,c,i)=>n+Number(c)*(i%2?3:1),0)%10===0;return false}
