import {describe,it,expect,vi,beforeEach} from 'vitest';
const mock=vi.hoisted(()=>({signIn:vi.fn(),update:vi.fn(),signOut:vi.fn(),getSession:vi.fn()}));
vi.mock('@supabase/supabase-js',()=>({createClient:()=>({auth:{signInWithPassword:mock.signIn,updateUser:mock.update,signOut:mock.signOut}})}));
vi.mock('./cloud-client',()=>({cloud:{auth:{getSession:mock.getSession}}}));
import {changeAccountPassword} from './account-password';
beforeEach(()=>{vi.clearAllMocks();mock.signIn.mockResolvedValue({data:{session:{},user:{id:'reader'}},error:null});mock.update.mockResolvedValue({error:null});mock.signOut.mockResolvedValue({error:null});mock.getSession.mockResolvedValue({data:{session:{user:{id:'reader'}}}})});
describe('ordinary password change',()=>{
 it('checks the old password before submitting the new one',async()=>{
  await changeAccountPassword('reader','reader@example.com','old-password','new-password','new-password');
  expect(mock.signIn).toHaveBeenCalledWith({email:'reader@example.com',password:'old-password'});expect(mock.update).toHaveBeenCalledWith({current_password:'old-password',password:'new-password'});expect(mock.signOut).toHaveBeenCalledWith({scope:'local'});
 });
 it('never changes the password after a failed verification',async()=>{
  mock.signIn.mockResolvedValue({data:{},error:new Error('invalid')});await expect(changeAccountPassword('reader','reader@example.com','wrong','new-password','new-password')).rejects.toThrow('Текущий пароль');expect(mock.update).not.toHaveBeenCalled();
 });
 it('refuses an account switch during verification and cleans up its temporary session',async()=>{
  mock.getSession.mockResolvedValue({data:{session:{user:{id:'other'}}}});await expect(changeAccountPassword('reader','reader@example.com','old-password','new-password','new-password')).rejects.toThrow('Аккаунт изменился');expect(mock.update).not.toHaveBeenCalled();expect(mock.signOut).toHaveBeenCalled();
 });
});
