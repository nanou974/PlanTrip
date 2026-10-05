import { useState, useEffect } from 'react'
import { AuthCtx } from './authContext.js'
import { hashPassword, verifyPassword, isPasswordHashingAvailable } from './password.js'
import { api, apiEnabled, isUnreachable } from './api.js'
const USER_KEY = "plantrip_user"
const USERS_KEY = "plantrip_users_db"
const OTP_KEY = "plantrip_otp"

const INCORRECT = "Email ou mot de passe incorrect"

function uid(){ return Math.random().toString(36).slice(2,9) }

/** Email d'entrée : la même forme partout (client et serveur), pour que les miroirs matchent. */
function normEmail(email){ return String(email||'').trim().toLowerCase() }

function getUsers(){
  try{ return JSON.parse(localStorage.getItem(USERS_KEY)||"[]")}catch{ return []}
}
function saveUsers(u){ localStorage.setItem(USERS_KEY, JSON.stringify(u)) }

/** Forme publique d'un utilisateur : jamais la fiche de hachage. */
function publicView(u){
  return { id:u.id, email:u.email, name:u.name, provider:u.provider }
}

/**
 * Codes d'attente par adresse (un seul envoi à la fois, mais deux adresses
 * peuvent attendre leur code en parallèle). L'ancien format mono-adresse
 * (`{email, code, …}`) est relu tel quel pour ne pas perdre un envoi en vol.
 */
function readOtpStore(){
  try{
    const v=JSON.parse(localStorage.getItem(OTP_KEY)||"null")
    if(!v || typeof v!=="object") return {}
    if(typeof v.email==="string" && typeof v.code==="string") return { [v.email]: v }
    return v
  }catch{ return {} }
}
function writeOtpStore(map){ localStorage.setItem(OTP_KEY, JSON.stringify(map)) }

/**
 * Passe les comptes créés avant le hachage (mot de passe en clair) au format
 * haché. Un seul travail par session, relu juste avant écriture pour ne pas
 * écraser un compte créé pendant le hachage.
 */
function migratePlaintextPasswords(){
  if(!isPasswordHashingAvailable()) return Promise.resolve()
  const legacy=getUsers().filter(u=>typeof u.password==="string")
  if(!legacy.length) return Promise.resolve()
  return legacy.reduce((chain,u)=>chain.then(async()=>{
    const auth=await hashPassword(u.password)
    const users=getUsers()
    const target=users.find(x=>x.id===u.id)
    if(target && typeof target.password==="string"){
      target.auth=auth
      delete target.password
      saveUsers(users)
    }
  }), Promise.resolve())
}
let migration=null
function ensureMigrated(){
  if(!migration) migration=migratePlaintextPasswords().catch(()=>{}).finally(()=>{ migration=null })
  return migration
}

/** Dernière tentative d'envoi d'un code (lue par l'interface via `getMagicSend`). */
let magicSendPromise=null

export function AuthProvider({children}){
  const [user,setUser]=useState(()=>{
    try{ const v=localStorage.getItem(USER_KEY); return v?JSON.parse(v):null }catch{ return null}
  })
  useEffect(()=>{
    if(user) localStorage.setItem(USER_KEY, JSON.stringify(user))
    else localStorage.removeItem(USER_KEY)
  },[user])
  useEffect(()=>{
    ensureMigrated()
  },[])

  /**
   * Tient aussi le miroir local du compte (hash PBKDF2) : les données de
   * l'appareil restent lisibles hors connexion, jamais en clair.
   */
  async function mirrorLocalAccount({id,email,name,provider,password}){
    const clean=normEmail(email)
    if(!clean) return null
    const users=getUsers()
    let row=users.find(u=>u.email===clean)
    if(!row){
      row={id:id||uid(), email:clean, name:name||clean.split("@")[0], provider:provider||"email", avatar:null, createdAt:new Date().toISOString()}
      if(password) row.auth=await hashPassword(password)
      users.push(row)
      saveUsers(users)
    }else if(password && (!row.auth && typeof row.password!=="string")){
      row.auth=await hashPassword(password)
      saveUsers(users)
    }
    return row
  }

  async function register({email,password,name}){
    await ensureMigrated()
    const clean=normEmail(email)
    if(apiEnabled()){
      try{
        const data=await api('/auth/register',{method:'POST',body:{email:clean,password,name}})
        await mirrorLocalAccount({...data.user,password})
        setUser(publicView(data.user))
        return data.user
      }catch(err){
        // Injoignable → repli local ; sinon le message du serveur fait foi
        // (email déjà utilisé, email invalide, mot de passe trop court…).
        if(!isUnreachable(err)) throw err
      }
    }
    const users=getUsers()
    if(users.find(u=>u.email===clean)) throw new Error("Email déjà utilisé")
    const auth=await hashPassword(password)
    const nu={id:uid(), email:clean, name: name||clean.split("@")[0], provider:"email", avatar:null, createdAt:new Date().toISOString(), auth}
    users.push(nu); saveUsers(users)
    setUser({id:nu.id,email:nu.email,name:nu.name,provider:nu.provider})
    return nu
  }

  async function login({email,password}){
    await ensureMigrated()
    const clean=normEmail(email)
    const users=getUsers()
    const u=users.find(x=>x.email===clean)
    // Compte sans aucun secret local (ouvert par lien magique ou fournisseur) :
    // il n'y a rien à vérifier ici, et le serveur n'a pas de mot de passe non plus.
    if(u && !u.auth && typeof u.password!=="string") throw new Error(INCORRECT)

    let localOk=false
    if(u && u.auth){
      // Vérification locale d'abord : pas de requête pour un secret déjà
      // connu faux sur l'appareil (sauf pour la remontée serveur ci-dessous).
      localOk=await verifyPassword(password,u.auth)
    }else if(u && typeof u.password==="string"){
      localOk=u.password===password
      if(localOk){
        u.auth=await hashPassword(password)
        delete u.password
        saveUsers(users)
      }
    }

    if(apiEnabled()){
      try{
        // Le serveur fait foi : il accepte aussi un mot de passe changé depuis
        // un autre appareil — le miroir local est alors resynchronisé.
        const data=await api('/auth/login',{method:'POST',body:{email:clean,password}},{timeoutMs:4000})
        await mirrorLocalAccount({...data.user,password})
        setUser(publicView(data.user))
        return data.user
      }catch(err){
        if(isUnreachable(err)){
          // Hors connexion : le repli local ci-dessous fait foi.
        }else if(err.status===401 && u && localOk){
          // Compte validé sur l'appareil mais absent du serveur : premier
          // import en ligne (le serveur re-hache de son côté).
          try{
            const data=await api('/auth/register',{method:'POST',body:{email:clean,password,name:u.name}})
            setUser(publicView(data.user))
            return data.user
          }catch(importErr){
            if(!isUnreachable(importErr)) throw importErr
          }
        }else if(err.status===401){
          throw new Error(INCORRECT)
        }else{
          throw err
        }
      }
    }
    if(u){
      if(!localOk) throw new Error(INCORRECT)
      setUser({id:u.id,email:u.email,name:u.name,provider:u.provider})
      return u
    }
    throw new Error(INCORRECT)
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

  /**
   * Demande d'un code de connexion. Toujours synchrone : le code local sert
   * de secours hors connexion, l'envoi serveur (email) part en arrière-plan et
   * sa promesse est exposée (`magicSend`) pour que l'interface puisse signaler
   * un échec d'envoi au lieu de faire croire à un envoi.
   */
  function sendMagicLink(email){
    const clean=normEmail(email)
    const code = Math.floor(100000+Math.random()*900000).toString()
    const store=readOtpStore()
    store[clean]={email:clean, code, expires:Date.now()+10*60*1000}
    writeOtpStore(store)
    if(apiEnabled()){
      magicSendPromise=api('/auth/magic-link',{method:'POST',body:{email:clean}})
    }
    return code
  }

  async function verifyOTP(email,code){
    const clean=normEmail(email)
    const typed=String(code||'').trim()
    if(apiEnabled()){
      try{
        const data=await api('/auth/magic-link/verify',{method:'POST',body:{email:clean,code:typed}})
        setUser(publicView(data.user))
        await mirrorLocalAccount(data.user)
        const store=readOtpStore(); delete store[clean]; writeOtpStore(store)
        return data.user
      }catch(err){
        if(!isUnreachable(err) && err.code!=='no_code') throw err
        // « no_code » : l'envoi a échoué ou le délai a purgé le code serveur —
        // on retente le code de secours local ; injoignable → idem.
      }
    }
    const store=readOtpStore()
    const p=store[clean]
    if(!p) throw new Error("Aucun code envoyé")
    if(p.code!==typed) throw new Error("Code incorrect")
    if(Date.now()>p.expires) throw new Error("Code expiré")
    const users=getUsers()
    let u=users.find(x=>x.email===clean)
    if(!u){ u={id:uid(), email:clean, name:clean.split("@")[0], provider:"magic", avatar:null, createdAt:new Date().toISOString()}; users.push(u); saveUsers(users) }
    setUser({id:u.id,email:u.email,name:u.name,provider:"magic"})
    const after=readOtpStore(); delete after[clean]; writeOtpStore(after)
    return u
  }

  /** Ouvre la session depuis un lien magique (`/login?magique=…`). */
  async function consumeMagicToken(token){
    if(!apiEnabled()) return false
    try{
      const data=await api('/auth/magic-link/open',{method:'POST',body:{token}})
      setUser(publicView(data.user))
      await mirrorLocalAccount(data.user)
      return true
    }catch(err){
      if(isUnreachable(err)) throw new Error("Connexion au serveur impossible : vérifiez votre connexion réseau puis réessayez.")
      throw err
    }
  }

  function logout(){
    if(apiEnabled()) api('/auth/logout',{method:'POST',keepalive:true}).catch(()=>{})
    setUser(null)
  }

  async function updateProfile(patch){
    if(!user) return
    await ensureMigrated()
    const clean={...patch}
    delete clean.password
    delete clean.auth
    if(apiEnabled() && typeof clean.name==="string" && clean.name.trim()){
      try{
        await api('/auth/profile',{method:'PATCH',body:{name:clean.name.trim()}})
      }catch(err){
        // Injoignable → le miroir local reste la source de vérité de l'appareil ;
        // sinon le serveur d'accord (session expirée, nom invalide) fait foi.
        if(!isUnreachable(err)) throw err
      }
    }
    const users=getUsers()
    const idx=users.findIndex(u=>u.id===user.id)
    if(idx>=0){ users[idx]={...users[idx],...clean}; saveUsers(users) }
    setUser(u=> ({...u, ...clean}))
  }

  async function changePassword({currentPassword,newPassword}){
    if(!user) throw new Error("Connectez-vous pour changer de mot de passe")
    if(!newPassword || String(newPassword).length<6) throw new Error("Nouveau mot de passe : 6 caractères minimum")
    await ensureMigrated()
    if(apiEnabled()){
      try{
        await api('/auth/password',{method:'POST',body:{currentPassword,newPassword}})
        const users=getUsers()
        const idx=users.findIndex(u=>u.email===user.email)
        if(idx>=0){
          users[idx].auth=await hashPassword(newPassword)
          delete users[idx].password
          saveUsers(users)
        }
        return idx>=0?users[idx]:null
      }catch(err){
        if(!isUnreachable(err)){
          if(err.code==='no_session') throw new Error("Session expirée : déconnectez-vous puis reconnectez-vous pour changer votre mot de passe.")
          throw err
        }
        // Injoignable → vérification locale ci-dessous.
      }
    }
    const users=getUsers()
    const idx=users.findIndex(u=>u.id===user.id)
    if(idx<0) throw new Error("Compte introuvable sur cet appareil")
    const u=users[idx]
    if(u.auth){
      if(!await verifyPassword(currentPassword,u.auth)) throw new Error("Mot de passe actuel incorrect")
    }else if(typeof u.password==="string"){
      if(u.password!==currentPassword) throw new Error("Mot de passe actuel incorrect")
    }else{
      throw new Error("Ce compte n'a pas de mot de passe : il passe par un lien magique ou un fournisseur.")
    }
    u.auth=await hashPassword(newPassword)
    delete u.password
    saveUsers(users)
    return u
  }

  return <AuthCtx.Provider value={{user, register, login, loginWithProvider, sendMagicLink, verifyOTP, consumeMagicToken, getMagicSend: ()=>magicSendPromise, logout, updateProfile, changePassword, isAuthenticated: !!user}}>{children}</AuthCtx.Provider>
}
