import {describe,it,expect} from 'vitest';
import {parseProfile,passwordError} from './profile';
import {parseLibrary,seed} from './data';
describe('reader profile',()=>{
 it('preserves names and avatars through library export and sync validation',()=>{
  const profile={displayName:' Анна ',avatar:'data:image/jpeg;base64,/9j/AAAA'};
  expect(parseLibrary(JSON.parse(JSON.stringify({...seed(),profile}))).profile).toEqual({...profile,displayName:'Анна'});
 });
 it('keeps old libraries compatible without inventing a profile',()=>{expect(parseLibrary(seed()).profile).toBeUndefined()});
 it('rejects empty names, remote images, oversized photos and SVGs',()=>{
  for(const profile of [{displayName:' ',avatar:''},{displayName:'a'.repeat(81),avatar:''},{displayName:'Анна',avatar:'https://example.com/pic.jpg'},{displayName:'Анна',avatar:'data:image/svg+xml;base64,PHN2Zw=='},{displayName:'Анна',avatar:'data:image/jpeg;base64,/9j/'+ 'A'.repeat(200000)}])expect(()=>parseProfile(profile)).toThrow();
 });
});
describe('password rules',()=>{
 it('requires a matching new password, including during recovery',()=>{
  expect(passwordError('new-password','different')).toContain('не совпадают');expect(passwordError('short','short')).toContain('8');expect(passwordError('new-password','new-password')).toBe('');
 });
 it('requires an old password for an ordinary change and refuses reuse',()=>{
  expect(passwordError('new-password','new-password','')).toContain('текущий');expect(passwordError('new-password','new-password','new-password')).toContain('отличаться');expect(passwordError('new-password','new-password','old-password')).toBe('');
 });
});
