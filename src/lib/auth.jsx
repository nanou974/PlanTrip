import { useState, useEffect } from 'react'
import { AuthCtx } from './authContext.js'
const USER_KEY = "plantrip_user"
const USERS_KEY = "plantrip_users_db"
const OTP_KEY = "plantrip_otp"

function uid(){ return Math.random().toString(36).slice(2,9) }

function getUsers(){
  try{ return JSON.parse(localStorage.getItem(USERS_KEY)||"[]")}catch{ return []}
}
function saveUsers(u){ localStorage.setItem(USERS_KEY, JSON.stringify(u)) }

export function AuthProvider({children}){
  const [user,setUser]=useState(()=>{
    try{ const v=localStorage.getItem(USER_KEY); return v?JSON.parse(v):null }catch{ return null}
  })
  useEffect(()=>{
    if(user) localStorage.setItem(USER_KEY, JSON.stringify(user))
    else localStorage.removeItem(USER_KEY)
  },[user])

  function register({email,password,name}){
    const users=getUsers()
    if(users.find(u=>u.email===email)) throw new Error("Email déjà utilisé")
    const nu={id:uid(), email, password, name: name||email.split("@")[0], provider:"email", avatar:null, createdAt:new Date().toISOString()}
    users.push(nu); saveUsers(users)
    setUser({id:nu.id,email:nu.email,name:nu.name,provider:nu.provider})
    return nu
  }
  function login({email,password}){
    const users=getUsers()
    const u=users.find(x=>x.email===email && x.password===password)
    if(!u) throw new Error("Email ou mot de passe incorrect")
    setUser({id:u.id,email:u.email,name:u.name,provider:u.provider})
    return u
  }
  function loginWithProvider(provider){
    // Mock OAuth - en prod, remplacer par Supabase/Firebase
    // Pour démo, crée un user fictif et connecte
    const fakeEmail=`${provider}_${uid()}@example.com`
    const name= provider==="google" ? "Utilisateur Google" : provider==="facebook" ? "Utilisateur Facebook" : "Utilisateur"
    const users=getUsers()
    const nu={id:uid(), email:fakeEmail, name, provider, avatar:null, createdAt:new Date().toISOString()}
    users.push(nu); saveUsers(users)
    setUser({id:nu.id,email:nu.email,name:nu.name,provider})
    return nu
  }
  function sendMagicLink(email){
    const code = Math.floor(100000+Math.random()*900000).toString()
    const payload={email,code,expires:Date.now()+10*60*1000}
    localStorage.setItem(OTP_KEY, JSON.stringify(payload))
    // En prod, envoyer par email via Supabase/Resend ; ici le code est affiché dans l'interface.
    return code
  }
  function verifyOTP(email,code){
    const p=JSON.parse(localStorage.getItem(OTP_KEY)||"null")
    if(!p) throw new Error("Aucun code envoyé")
    if(p.email!==email) throw new Error("Email ne correspond pas")
    if(p.code!==code) throw new Error("Code incorrect")
    if(Date.now()>p.expires) throw new Error("Code expiré")
    const users=getUsers()
    let u=users.find(x=>x.email===email)
    if(!u){ u={id:uid(), email, name:email.split("@")[0], provider:"magic", avatar:null, createdAt:new Date().toISOString()}; users.push(u); saveUsers(users) }
    setUser({id:u.id,email:u.email,name:u.name,provider:"magic"})
    localStorage.removeItem(OTP_KEY)
    return u
  }
  function logout(){ setUser(null) }
  function updateProfile(patch){
    if(!user) return
    const users=getUsers()
    const idx=users.findIndex(u=>u.id===user.id)
    if(idx>=0){ users[idx]={...users[idx],...patch}; saveUsers(users) }
    setUser(u=> ({...u, ...patch}))
  }

  return <AuthCtx.Provider value={{user, register, login, loginWithProvider, sendMagicLink, verifyOTP, logout, updateProfile, isAuthenticated: !!user}}>{children}</AuthCtx.Provider>
}
