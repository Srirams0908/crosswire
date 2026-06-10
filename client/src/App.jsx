import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import FacilitatorSetup from './pages/FacilitatorSetup';
import FacilitatorDashboard from './pages/FacilitatorDashboard';
import ParticipantJoin from './pages/ParticipantJoin';
import ParticipantGame from './pages/ParticipantGame';
import Debrief from './pages/Debrief';
import ObserverJoin from './pages/ObserverJoin';
import ObserverView from './pages/ObserverView';
import EndCard from './pages/EndCard';
import SessionHistory from './pages/SessionHistory';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/facilitator/setup" element={<FacilitatorSetup />} />
        <Route path="/facilitator/dashboard" element={<FacilitatorDashboard />} />
        <Route path="/join" element={<ParticipantJoin />} />
        <Route path="/game" element={<ParticipantGame />} />
        <Route path="/debrief" element={<Debrief />} />
        <Route path="/observer" element={<ObserverJoin />} />
        <Route path="/observer/view" element={<ObserverView />} />
        <Route path="/end" element={<EndCard />} />
        <Route path="/history" element={<SessionHistory />} />
      </Routes>
    </BrowserRouter>
  );
}
