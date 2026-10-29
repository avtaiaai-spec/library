import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const directory=new URL('../src/assets/covers/',import.meta.url);
const isbns=['9780199556780','9780141441146','9780156001311','9780141192245'];
const isJpeg=data=>data.length>1024&&data[0]===0xff&&data[1]===0xd8&&data[2]===0xff;
await mkdir(directory,{recursive:true});
await Promise.all(isbns.map(async isbn=>{
  const target=new URL(`${isbn}.jpg`,directory);
  try{if(isJpeg(await readFile(target)))return}catch{}
  try{
    const response=await fetch(`https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`,{
      signal:AbortSignal.timeout(15000),
    });
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const content=Buffer.from(await response.arrayBuffer());
    if(!isJpeg(content))throw new Error('нет подходящей JPEG-обложки');
    await writeFile(target,content);
    console.log(`Обложка ${isbn} сохранена в ${fileURLToPath(target)}`);
  }catch(error){
    // Missing covers must not stop publishing the library. A typographic cover is always visible.
    console.warn(`Обложка ${isbn} недоступна (${error.message}); будет использована типографическая обложка.`);
  }
}));
