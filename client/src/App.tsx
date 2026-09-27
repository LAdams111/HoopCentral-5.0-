import { useEffect, useRef } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { Classes } from "./pages/Classes";
import { ClassYear } from "./pages/ClassYear";
import { Home } from "./pages/Home";
import { LeagueDetail } from "./pages/LeagueDetail";
import { Leagues } from "./pages/Leagues";
import { PlayerProfile } from "./pages/PlayerProfile";
import { Players } from "./pages/Players";
import { Prospects } from "./pages/Prospects";
import { Roster } from "./pages/Roster";
import { Login } from "./pages/Login";
import { Team } from "./pages/Team";

function TrackPageViews() {
  const location = useLocation();
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
    gtag?.("event", "page_view", {
      page_path: location.pathname + location.search,
      page_location: window.location.href,
    });
  }, [location.pathname, location.search]);

  return null;
}

export default function App() {
  return (
    <Layout>
      <TrackPageViews />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Navigate to="/login?mode=signup" replace />} />
        <Route path="/players" element={<Players />} />
        <Route path="/players/:id" element={<PlayerProfile />} />
        <Route path="/roster/:team/:season" element={<Roster />} />
        <Route path="/teams/:slug" element={<Team />} />
        <Route path="/leagues" element={<Leagues />} />
        <Route path="/leagues/:league/state/:state" element={<LeagueDetail />} />
        <Route path="/leagues/:league/region/:region" element={<LeagueDetail />} />
        <Route path="/leagues/:league/conference/:conference" element={<LeagueDetail />} />
        <Route path="/leagues/:league" element={<LeagueDetail />} />
        <Route path="/prospects" element={<Prospects />} />
        <Route path="/classes" element={<Classes />} />
        <Route path="/classes/:year" element={<ClassYear />} />
      </Routes>
    </Layout>
  );
}
