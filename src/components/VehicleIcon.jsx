/** Illustration d'un véhicule (champ `image` de vehicles.json), avec l'émoji en secours. */
export default function VehicleIcon({ vehicle, className = 'h-10 w-10' }) {
  if (vehicle?.image) {
    return <img src={vehicle.image} alt="" loading="lazy" className={`${className} object-contain`} />
  }
  return (
    <span aria-hidden="true" className="text-2xl">
      {vehicle?.icon}
    </span>
  )
}
