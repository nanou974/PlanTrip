import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './lib/auth.jsx'
import PublicLayout from './layout/PublicLayout.jsx'
import AppShell from './layout/AppShell.jsx'
import { Button } from './design/ui.jsx'
import { useCrossTabSync } from './state/store.js'
import Home from './pages/Home.jsx'
import Vehicules from './pages/Vehicules.jsx'
import VehiculeDetail from './pages/VehiculeDetail.jsx'
import Fonctionnalites from './pages/Fonctionnalites.jsx'
import PreparerVoyage from './pages/PreparerVoyage.jsx'
import { Skeleton } from './design/ui.jsx'
import SimplePage from './pages/SimplePage.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Profile from './pages/Profile.jsx'
import Dashboard from './pages/app/Dashboard.jsx'
import Trips from './pages/app/Trips.jsx'
import BudgetOverview from './pages/app/BudgetOverview.jsx'
import TripLayout from './components/trip/TripLayout.jsx'
import TripOverview from './pages/app/trip/TripOverview.jsx'
import TripItinerary from './pages/app/trip/TripItinerary.jsx'
import TripCalendar from './pages/app/trip/TripCalendar.jsx'
import TripBudget from './pages/app/trip/TripBudget.jsx'
import TripPlaces from './pages/app/trip/TripPlaces.jsx'
import TripDocuments from './pages/app/trip/TripDocuments.jsx'
import TripOrganization from './pages/app/trip/TripOrganization.jsx'
import MentionsLegales from './pages/legal/MentionsLegales.jsx'
import Confidentialite from './pages/legal/Confidentialite.jsx'
import Accessibilite from './pages/legal/Accessibilite.jsx'

const ResultatVoyage = lazy(() => import('./pages/ResultatVoyage.jsx'))

function RouteFallback() {
  return (
    <div className="space-y-4 px-5 py-10 lg:px-8">
      <Skeleton className="h-8 w-64" lines={1} />
      <Skeleton className="h-72 w-full" lines={1} />
    </div>
  )
}

export default function App() {
  useCrossTabSync()

  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/tableau-de-bord" element={<Dashboard />} />
              <Route path="/mes-voyages" element={<Trips />} />
              <Route path="/budget" element={<BudgetOverview />} />
              <Route path="/mon-profil" element={<Profile />} />
              <Route path="/voyages/:tripId" element={<TripLayout />}>
                <Route index element={<TripOverview />} />
                <Route path="itineraire" element={<TripItinerary />} />
                <Route path="calendrier" element={<TripCalendar />} />
                <Route path="budget" element={<TripBudget />} />
                <Route path="lieux" element={<TripPlaces />} />
                <Route path="documents" element={<TripDocuments />} />
                <Route path="organisation" element={<TripOrganization />} />
              </Route>
            </Route>

            <Route element={<PublicLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/vehicules" element={<Vehicules />} />
              <Route path="/vehicules/:slug" element={<VehiculeDetail />} />
              <Route path="/fonctionnalites" element={<Fonctionnalites />} />
              <Route path="/preparer-son-voyage" element={<PreparerVoyage />} />
              <Route path="/resultat-voyage" element={<ResultatVoyage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/blog"
                element={
                  <SimplePage
                    title="Blog"
                    subtitle="Guides pratiques, astuces d'itinéraire et idées de séjour. Bientôt en ligne."
                    icon="note"
                    eyebrow="Ressources"
                  />
                }
              />
              <Route path="/faq" element={<FaqPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/mentions-legales" element={<MentionsLegales />} />
              <Route path="/confidentialite" element={<Confidentialite />} />
              <Route path="/accessibilite" element={<Accessibilite />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}

function FaqPage() {
  return (
    <SimplePage
      title="Questions fréquentes"
      subtitle="Tout ce qu'il faut savoir avant de construire votre voyage."
      icon="help"
      eyebrow="Aide"
    >
      <ul className="space-y-4">
        <li>
          <strong>Pourquoi éviter les ponts ?</strong>
          <p className="text-pt-neutral/80 mt-1">
            Le gabarit de votre véhicule impose des hauteurs et des largeurs maximales. PlanTrip
            filtre automatiquement les itinéraires incompatibles.
          </p>
        </li>
        <li>
          <strong>Comment le budget est-il calculé ?</strong>
          <p className="text-pt-neutral/80 mt-1">
            Carburant (consommation réelle × distance), péages, repas × voyageurs × jours,
            hébergement et activités. Le total se met à jour à chaque choix.
          </p>
        </li>
        <li>
          <strong>Ça fonctionne hors connexion ?</strong>
          <p className="text-pt-neutral/80 mt-1">
            Oui : après une première visite, PlanTrip s'ouvre sans réseau. Voyages, documents et
            checklists restent consultables, modifiables et exportables en GPX depuis votre
            appareil. La recherche d'adresses, le calcul d'itinéraire, les hébergements et les
            fonds de carte nécessitent Internet — l'application le signale alors dans l'écran.
          </p>
        </li>
        <li>
          <strong>PlanTrip est-il gratuit ?</strong>
          <p className="text-pt-neutral/80 mt-1">
            Oui, entièrement. Pas de carte bancaire, pas de version premium cachée.
          </p>
        </li>
      </ul>
    </SimplePage>
  )
}

function ContactPage() {
  return (
    <SimplePage
      title="Contact"
      subtitle="Une question, un bug, une idée ? Parlons-en."
      icon="mail"
      eyebrow="À votre écoute"
    >
      <p className="text-pt-neutral/70">
        Une question, un bug, une idée ? Écrivez-nous à{' '}
        <a href="mailto:contact@plantrip.fr" className="text-pt-orange-ink font-semibold hover:underline">
          contact@plantrip.fr
        </a>{' '}
        — nous répondons sous 48 h.
      </p>
      <div className="mt-8 card p-5">
        <h2 className="font-display font-semibold">Besoin d'aide immédiate ?</h2>
        <p className="text-sm text-pt-neutral/80 mt-2">
          La plupart des réponses se trouvent dans la FAQ. Pour un problème d'itinéraire,
          joignez le lien de votre voyage.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button to="/faq" variant="secondary" icon="help">
            Consulter la FAQ
          </Button>
        </div>
      </div>
    </SimplePage>
  )
}

function NotFoundPage() {
  return (
    <SimplePage title="404">
      <div className="text-center">
        <p className="text-sm uppercase tracking-widest text-pt-neutral/75">Erreur 404</p>
        <p className="mt-3 text-pt-neutral/70">Cette page n'existe pas ou a été déplacée.</p>
        <div className="mt-6 flex justify-center">
          <Button to="/" icon="home">
            Retour à l'accueil
          </Button>
        </div>
      </div>
    </SimplePage>
  )
}
