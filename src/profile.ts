export interface ReaderProfile {displayName:string;avatar:string}
export function parseProfile(value:unknown):ReaderProfile{
 if(!value||typeof value!=='object')throw new Error('Некорректные данные профиля.');
 const profile=value as Record<string,unknown>;
 if(typeof profile.displayName!=='string'||!profile.displayName.trim()||profile.displayName.length>80||typeof profile.avatar!=='string'||profile.avatar.length>200000||(profile.avatar!==''&&!/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(profile.avatar)))throw new Error('Некорректное имя или фото профиля.');
 return {displayName:profile.displayName.trim(),avatar:profile.avatar};
}
export function passwordError(password:string,confirmation:string,current?:string){
 if(password.length<8||password.length>128)return 'Новый пароль должен содержать от 8 до 128 символов.';
 if(password!==confirmation)return 'Новые пароли не совпадают.';
 if(current!==undefined&&!current)return 'Введите текущий пароль.';
 if(current!==undefined&&password===current)return 'Новый пароль должен отличаться от текущего.';
 return '';
}
export async function prepareAvatar(file:File):Promise<string>{
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Выберите фото в формате JPEG, PNG или WebP.');
 if(file.size>5*1024*1024)throw new Error('Фото слишком большое. Максимум 5 МБ.');
 const url=URL.createObjectURL(file);
 try{
  const image=new Image();image.src=url;await image.decode();
  if(!image.naturalWidth||!image.naturalHeight||image.naturalWidth*image.naturalHeight>40000000)throw new Error('Изображение слишком большое или повреждено.');
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
  const context=canvas.getContext('2d');if(!context)throw new Error('Браузер не смог подготовить фото.');
  context.fillStyle='#f6f1e8';context.fillRect(0,0,256,256);
  const size=Math.min(image.naturalWidth,image.naturalHeight);
  context.drawImage(image,(image.naturalWidth-size)/2,(image.naturalHeight-size)/2,size,size,0,0,256,256);
  const result=canvas.toDataURL('image/jpeg',.85);
  if(!result.startsWith('data:image/jpeg;base64,')||result.length>200000)throw new Error('Не удалось уменьшить фото. Выберите другое изображение.');
  return result;
 }finally{URL.revokeObjectURL(url)}
}
