import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import vehicles from '../data/vehicles.json'
import { saveTrip, updateMemory, getMemory, getTrip, getCurrentTrip } from '../state/store.js'
import { DRIVE_TIMES } from '../domain/trip.js'
import { searchPlaces } from '../services/geocoding.js'
import { isOnline } from '../lib/online.js'

const motivationsList=["Nature","Gastronomie","Patrimoine","Détente","Sport","Culture","Fête","Famille","Photo","Aventure"]

/** Lecture du brouillon à éditer — consommé une seule fois, au montage. */
function readEditDraft(){
  if(!sessionStorage.getItem("plantrip_edit_mode")) return null
  sessionStorage.removeItem("plantrip_edit_mode")
  const id = sessionStorage.getItem("plantrip_edit_trip") || null
  sessionStorage.removeItem("plantrip_edit_trip")
  if (id) {
    const trip = getTrip(id)
    if (trip) return trip
  }
  return getCurrentTrip()
}

function CityInput({label, value, onChange, error, id}){
  const [res,setRes]=useState([])
  const [searchError,setSearchError]=useState("")
  const timer=useRef(null)
  function search(v){
    clearTimeout(timer.current)
    if(v.length<1){ setRes([]); setSearchError(""); return }
    timer.current=setTimeout(async()=>{
      try{
        const found=await searchPlaces(v,{limit:6})
        setRes(found)
        setSearchError("")
      }catch{
        setRes([])
        setSearchError(isOnline()
          ? "Recherche impossible : le service de cartographie ne répond pas."
          : "Recherche impossible : une connexion est nécessaire pour trouver une ville.")
      }
    },200)
  }
  return (
    <div>
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-pt-neutral/75">{label}</label>
      <input
        key={value?.name || ""}
        id={id}
        defaultValue={value?.name || ""}
        onChange={e=>search(e.target.value)}
        placeholder={label==="Départ"?"D'où partez-vous ?":"Où allez-vous ?"}
        aria-label={label}
        className={`w-full mt-1 px-4 py-3 bg-pt-cream border rounded-xl focus:outline-hidden focus:ring-2 ${error?"border-red-400 focus:ring-red-200":"border-pt-line focus:ring-pt-green/20"}`}
      />
      {res.length>0 && (
        <div className="mt-1 bg-white border rounded-xl shadow-sm overflow-hidden max-h-48 overflow-y-auto">
          {res.map(r=> (
            <button key={r.name} onClick={()=>{ onChange(r); setRes([]); setSearchError("")}} className="w-full text-left px-4 py-2 hover:bg-pt-green-soft text-sm">{r.name}</button>
          ))}
        </div>
      )}
      {searchError && <p className="text-xs text-pt-danger mt-1">{searchError}</p>}
      {error && <p className="text-xs text-pt-danger mt-1">{error}</p>}
      {value && <p className="text-xs text-pt-green-ink mt-1">✓ {value.name.split(",").slice(0,2).join(",")}</p>}
    </div>
  )
}

export default function PreparerVoyage(){
  const nav=useNavigate()
  const [draft]=useState(readEditDraft)
  const [depart,setDepart]=useState(()=> draft?.departure ?? null)
  const [dest,setDest]=useState(()=> draft?.destination ?? null)
  const [vehicle,setVehicle]=useState(()=> draft?.vehicle?.slug ?? null)
  const [motor] = useState(null)
  const [vehicleModel,setVehicleModel]=useState(()=> draft?.vehicleModel ?? "")
  const [customConsumption,setCustomConsumption]=useState(()=>{
    const c = draft?.vehicle?.consumption
    if(c && c !== draft?.vehicle?.defaultConsumption) return c.toString()
    return ""
  })
  const [travelers,setTravelers]=useState(()=> draft?.travelers ?? 2)
  const [dates,setDates]=useState(()=> draft?.dates ?? {start:"",end:""})
  const [departureTime,setDepartureTime]=useState(()=> draft?.departureTime ?? "08:00")
  const [arrivalTime,setArrivalTime]=useState(()=> draft?.arrivalTime ?? "18:00")
  const [budget,setBudget]=useState(()=> draft?.budget != null ? String(draft.budget) : "")
  const [profile,setProfile]=useState(()=> draft?.profile ?? {economies:0.5,paysages:0.5,confort:0.5})
  const [avoidTolls,setAvoidTolls]=useState(()=> Boolean(draft?.preferences?.avoidTolls))
  const [avoidHighways,setAvoidHighways]=useState(()=> Boolean(draft?.preferences?.avoidHighways))
  const [driveTime,setDriveTime]=useState(()=> draft?.preferences?.driveTime ?? "balanced")
  const [motivations,setMotivations]=useState(()=> draft?.motivations ?? [])
  const [errors,setErrors]=useState({})
  const [returnTrip,setReturnTrip]=useState(()=> Boolean(draft?.preferences?.returnTrip))

  const veh = vehicles.find(v=>v.slug===vehicle)
  const days = dates.start && dates.end ? Math.ceil((new Date(dates.end)-new Date(dates.start))/(1000*60*60*24))+1 : 0

  function selectVehicle(slug){
    const v=vehicles.find(x=>x.slug===slug)
    setVehicle(slug)
    if(v){
      setAvoidTolls(v.avoidTolls||false)
      setAvoidHighways(v.avoidHighways||false)
    }
  }

  function validate(){
    const e={}
    if(!depart) e.departure="Sélectionnez un point de départ"
    if(!dest) e.destination="Sélectionnez une destination"
    if(!vehicle) e.vehicle="Sélectionnez un véhicule"
    if(!budget || isNaN(budget) || parseFloat(budget)<=0) e.budget="Budget valide requis"
    if(!dates.start) e.dates="Date de départ requise"
    else if(!dates.end) e.dates="Date de retour requise"
    else if(dates.end < dates.start) e.dates="Retour avant départ"
    return e
  }

  function handleSubmit(){
    const e=validate()
    setErrors(e)
    if(Object.keys(e).length) return
    const v = vehicles.find(x=>x.slug===vehicle)
    const consumption = customConsumption ? parseFloat(customConsumption) : v.defaultConsumption
    const trip={
      id: draft?.id,
      tripId: draft?.id || undefined,
      vehicle:{...v,consumption}, departure:depart, destination:dest, dates:{...dates,days},
      departureTime, arrivalTime,
      budget:parseFloat(budget), profile, motivations, travelers, motorisationId:motor,
      vehicleModel:vehicleModel||null,
      preferences:{ ...(avoidTolls?{avoidTolls:true}:{}), ...(avoidHighways?{avoidHighways:true}:{}), driveTime, returnTrip },
      createdAt: draft?.createdAt || new Date().toISOString()
    }
    const saved = saveTrip(trip)
    const mem=getMemory()||{}
    updateMemory({
      preferred_vehicles:[...new Set([...(mem.preferred_vehicles||[]), vehicle])],
      usual_budgets:[...new Set([...(mem.usual_budgets||[]), parseFloat(budget)])].slice(-10),
      last_departure:depart, last_destination:dest, last_vehicle_slug:vehicle, trips_count:(mem.trips_count||0)+1
    })
    if (draft?.id && saved?.id) nav(`/voyages/${saved.id}`)
    else nav("/resultat-voyage")
  }

  return (
    <div>
      <section className="py-16 bg-pt-cream topo-bg text-center">
        <div className="inline-flex px-4 py-2 bg-pt-green-soft border border-pt-green/20 rounded-full mb-4 text-xs font-semibold text-pt-orange-ink uppercase tracking-wider">Moteur de voyage</div>
        <h1 className="hero-heading">PlanTrip construit<br/><span className="text-pt-orange-ink">votre voyage.</span></h1>
        <p className="text-pt-neutral/80 max-w-2xl mx-auto mt-4">Le budget n'est plus une limite : c'est un outil de conception. Définissez vos priorités, PlanTrip arbitre.</p>
      </section>

      <section className="py-12 bg-white">
        <div className="max-w-3xl mx-auto px-5 lg:px-8 space-y-12">

          <div>
            <div className="flex items-center gap-3 mb-4"><span className="text-2xl font-mono text-pt-orange-ink">01</span><h3 className="text-xl font-bold">Votre itinéraire</h3></div>
            <div className="space-y-4">
              <CityInput id="trip-departure" label="Départ" value={depart} onChange={setDepart} error={errors.departure} />
              <CityInput id="trip-destination" label="Arrivée" value={dest} onChange={setDest} error={errors.destination} />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3 mb-4"><span className="text-2xl font-mono text-pt-orange-ink">02</span><h3 className="text-xl font-bold">Votre véhicule</h3></div>
            <div className="mb-6 p-5 bg-pt-green-soft rounded-2xl border border-pt-green/15">
              <label className="text-sm font-bold uppercase tracking-wider text-pt-orange-ink">Nombre de voyageurs</label>
              <div className="flex items-center gap-4 mt-2">
                <button aria-label="Retirer un voyageur" onClick={()=>setTravelers(Math.max(1,travelers-1))} className="w-12 h-12 rounded-full border-2 border-pt-green text-pt-orange-ink font-bold text-xl hover:bg-pt-green hover:text-white transition-colors">−</button>
                <span aria-live="polite" className="text-5xl font-extrabold text-pt-orange-ink w-16 text-center">{travelers}</span>
                <button aria-label="Ajouter un voyageur" onClick={()=>setTravelers(Math.min(20,travelers+1))} className="w-12 h-12 rounded-full border-2 border-pt-green text-pt-orange-ink font-bold text-xl hover:bg-pt-green hover:text-white transition-colors">+</button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {vehicles.map(v=> (
                <button key={v.slug} onClick={()=>selectVehicle(v.slug)} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${vehicle===v.slug?"border-pt-green bg-pt-green-soft":"border-pt-line bg-pt-cream hover:border-pt-green/30"}`}>
                  <span className="text-2xl">{v.icon}</span>
                  <span className="text-xs font-medium text-center">{v.name}</span>
                </button>
              ))}
            </div>
            {errors.vehicle && <p className="text-xs text-pt-danger mt-2">{errors.vehicle}</p>}
            {veh && <div className="mt-3 p-3 bg-pt-green-soft rounded-xl text-sm">✓ {veh.tagline} — {veh.routing.realisticSpeed}</div>}

            {veh && (
              <>
                <div className="mt-4">
                  <label className="text-xs font-semibold uppercase text-pt-neutral/75">Modèle (optionnel)</label>
                  <input value={vehicleModel} onChange={e=>setVehicleModel(e.target.value)} placeholder="Ex: Citroën Ami, Renault Twizy..." className="w-full mt-1 px-4 py-2 bg-pt-cream border border-pt-line rounded-xl text-sm" />
                </div>
                {veh.defaultConsumption && (
                  <div className="mt-3">
                    <label className="text-xs font-semibold uppercase text-pt-neutral/75">Consommation réelle (optionnel)</label>
                    <div className="flex items-center gap-2 mt-1">
                      <input type="number" step="0.1" value={customConsumption} onChange={e=>setCustomConsumption(e.target.value)} placeholder={`Défaut: ${veh.defaultConsumption}`} className="w-32 px-3 py-2 bg-pt-cream border border-pt-line rounded-xl text-sm" />
                      <span className="text-xs text-pt-neutral/75">L/100km</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div>
            <div className="flex items-center gap-3 mb-4"><span className="text-2xl font-mono text-pt-orange-ink">03</span><h3 className="text-xl font-bold">Quand partez-vous ?</h3></div>
            <div className="grid grid-cols-2 gap-4">
              <input aria-label="Date de départ" type="date" value={dates.start} onChange={e=> setDates({...dates,start:e.target.value})} className="px-4 py-3 bg-pt-cream border border-pt-line rounded-xl" />
              <input aria-label="Date de retour" type="date" value={dates.end} onChange={e=> setDates({...dates,end:e.target.value})} className="px-4 py-3 bg-pt-cream border border-pt-line rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div>
                <label htmlFor="trip-departure-time" className="text-xs font-semibold uppercase text-pt-neutral/75">Heure de départ</label>
                <input aria-label="Heure de départ" id="trip-departure-time" type="time" value={departureTime} onChange={e=> setDepartureTime(e.target.value)} className="w-full mt-1 px-4 py-3 bg-pt-cream border border-pt-line rounded-xl" />
              </div>
              <div>
                <label htmlFor="trip-arrival-time" className="text-xs font-semibold uppercase text-pt-neutral/75">Heure d'arrivée</label>
                <input aria-label="Heure d'arrivée" id="trip-arrival-time" type="time" value={arrivalTime} onChange={e=> setArrivalTime(e.target.value)} className="w-full mt-1 px-4 py-3 bg-pt-cream border border-pt-line rounded-xl" />
              </div>
            </div>
            {days>0 && <p className="text-xs text-pt-neutral/75 mt-2">{days} jour(s) — {days-1} nuit(s)</p>}
            {errors.dates && <p className="text-xs text-pt-danger mt-1">{errors.dates}</p>}
            <label className="flex items-center gap-2 mt-3 text-sm"><input type="checkbox" checked={returnTrip} onChange={e=> setReturnTrip(e.target.checked)} /> <span>Préparer le retour <span className="text-pt-neutral/70">(ajoute le trajet retour au budget)</span></span></label>
          </div>

          <div>
            <div className="flex items-center gap-3 mb-4"><span className="text-2xl font-mono text-pt-orange-ink">04</span><h3 className="text-xl font-bold">Votre budget maximal</h3></div>
            <div className="bg-pt-green-soft border border-pt-green/15 p-4 rounded-xl text-sm text-pt-neutral/70 mb-3">Le budget est la <strong>contrainte principale</strong>. Le moteur le répartit entre transport, hébergement, restauration, activités.</div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-pt-neutral/70">€</span>
              <input aria-label="Budget maximal en euros" type="number" min="1" value={budget} onChange={e=> setBudget(e.target.value)} placeholder="Budget maximal en euros" className={`w-full pl-10 pr-4 py-4 bg-pt-cream border rounded-xl focus:outline-hidden focus:ring-2 ${errors.budget?"border-red-400":"border-pt-line focus:ring-pt-green/20"}`} />
            </div>
            {errors.budget && <p className="text-xs text-pt-danger mt-1">{errors.budget}</p>}
          </div>

          <div>
            <div className="flex items-center gap-3 mb-4"><span className="text-2xl font-mono text-pt-orange-ink">05</span><h3 className="text-xl font-bold">Vos priorités</h3></div>
            {[
              {k:"economies",label:"Économies"},
              {k:"paysages",label:"Paysages"},
              {k:"confort",label:"Confort"},
            ].map(p=> (
              <div key={p.k} className="mb-3">
                <div className="flex justify-between text-xs"><span>{p.label}</span><span>{Math.round(profile[p.k]*100)}%</span></div>
                <input aria-label={`Priorité ${p.label}`} type="range" min="0" max="1" step="0.1" value={profile[p.k]} onChange={e=> setProfile({...profile,[p.k]:parseFloat(e.target.value)})} className="w-full accent-pt-green" />
              </div>
            ))}
            <div className="grid sm:grid-cols-2 gap-3 mt-4">
              <label className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer ${avoidTolls?"border-pt-green bg-pt-green-soft":"border-pt-line bg-pt-cream"}`}>
                <input type="checkbox" checked={avoidTolls} onChange={e=> setAvoidTolls(e.target.checked)} disabled={veh?.avoidTolls} /> Sans péage
                {veh?.avoidTolls && <span className="text-[10px] text-pt-orange-ink">(imposé)</span>}
              </label>
              <label className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer ${avoidHighways?"border-pt-green bg-pt-green-soft":"border-pt-line bg-pt-cream"}`}>
                <input type="checkbox" checked={avoidHighways} onChange={e=> setAvoidHighways(e.target.checked)} disabled={veh?.avoidHighways} /> Sans autoroute
                {veh?.avoidHighways && <span className="text-[10px] text-pt-orange-ink">(imposé)</span>}
              </label>
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase text-pt-neutral/75 mb-2">Conduite</p>
              <div className="flex gap-2">
                {DRIVE_TIMES.map(o=> <button key={o.id} onClick={()=> setDriveTime(o.id)} className={`px-3 py-2 rounded-xl border-2 text-xs ${driveTime===o.id?"border-pt-green bg-pt-green-soft":"border-pt-line bg-pt-cream hover:border-pt-green/30"}`}>{o.label}</button>)}
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3 mb-4"><span className="text-2xl font-mono text-pt-orange-ink">06</span><h3 className="text-xl font-bold">Personnalité du voyage <span className="text-sm font-normal text-pt-neutral/70">(optionnel)</span></h3></div>
            <div className="flex flex-wrap gap-2">
              {motivationsList.map(m=> (
                <button key={m} onClick={()=> setMotivations(p=> p.includes(m)?p.filter(x=>x!==m):[...p,m])} className={`px-3 py-2 rounded-full border text-sm ${motivations.includes(m)?"bg-pt-green text-white border-pt-green":"bg-pt-cream border-pt-line"}`}>{m}</button>
              ))}
            </div>
          </div>

          <div className="text-center pt-4">
            <button onClick={handleSubmit} className="px-10 py-4 bg-pt-green text-white font-semibold rounded-xl hover:bg-pt-green-dark hover:shadow-xl transition-all">Construire mon voyage →</button>
          </div>
        </div>
      </section>
    </div>
  )
}
