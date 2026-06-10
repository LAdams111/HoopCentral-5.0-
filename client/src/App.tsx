import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { Classes } from "./pages/Classes";
import { Home } from "./pages/Home";
import { LeagueDetail } from "./pages/LeagueDetail";
import { Leagues } from "./pages/Leagues";
import { PlayerProfile } from "./pages/PlayerProfile";
import { Players } from "./pages/Players";
import { Prospects } from "./pages/Prospects";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/players" element={<Players />} />
        <Route path="/players/:id" element={<PlayerProfile />} />
        <Route path="/leagues" element={<Leagues />} />
        <Route path="/leagues/:league" element={<LeagueDetail />} />
        <Route path="/prospects" element={<Prospects />} />
        <Route path="/classes" element={<Classes />} />
      </Routes>
    </Layout>
  );
}
