import {createClient} from '@supabase/supabase-js';
import {cloud} from './cloud-client';
import {passwordError} from './profile';
// A separate in-memory session verifies the old password without replacing the current account.
export async function changeAccountPassword(userId:string,email:string,current:string,next:string,confirmation:string){
 const validation=passwordError(next,confirmation,current);if(validation)throw new Error(validation);
 const verifier=createClient(import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:`moya-password-check-${crypto.randomUUID()}`},global:{fetch:(input,init={})=>fetch(input,{...init,signal:AbortSignal.any([...(init.signal?[init.signal]:[]),AbortSignal.timeout(15000)])})}});
 let verified=false;
 try{
  const result=await verifier.auth.signInWithPassword({email,password:current});
  verified=!!result.data.session;
  if(result.error||!result.data.session||result.data.user?.id!==userId)throw new Error('Текущий пароль неверен или вход сейчас недоступен.');
  const latest=await cloud?.auth.getSession();
  if(latest?.data.session?.user.id!==userId)throw new Error('Аккаунт изменился. Войдите заново перед сменой пароля.');
  const update=await verifier.auth.updateUser({password:next,current_password:current});
  if(update.error)throw new Error('Не удалось изменить пароль. Проверьте подключение и требования к паролю или воспользуйтесь восстановлением по почте.');
 }finally{
  if(verified)await verifier.auth.signOut({scope:'local'}).catch(()=>{});
 }
}
