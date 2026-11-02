import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {lookupCover} from '../src/recommendation-cover-lookup.ts';
const sources=JSON.parse(await readFile(new URL('../src/recommendation-cover-sources.json',import.meta.url),'utf8'));
const directory=new URL('../src/assets/recommendation-covers/',import.meta.url);
await mkdir(directory,{recursive:true});
const jpeg=data=>data.length>1024&&data[0]===255&&data[1]===216&&data[2]===255;
let saved=0;
// Keep requests sequential to respect the catalogue's rate limits.
for(const source of sources){
 const target=new URL(`${source.id}.jpg`,directory);
 try{if(jpeg(await readFile(target))){saved++;continue}}catch{}
 try{
  const cover=await lookupCover(source,new AbortController().signal,1100);
  if(!cover)throw new Error('нет обложки с подтверждённым названием и автором');
  const response=await fetch(cover,{signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  const content=Buffer.from(await response.arrayBuffer());if(!jpeg(content))throw new Error('неподходящее изображение');
  await writeFile(target,content);saved++;console.log(`${source.title}: ${cover}`);
 }catch(error){console.warn(`${source.title}: ${error.message}`)}
}
console.log(`Сохранено настоящих обложек: ${saved}/${sources.length}`);
if(!saved)process.exitCode=1;
