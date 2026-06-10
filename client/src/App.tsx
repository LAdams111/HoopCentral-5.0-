import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { Home } from "./pages/Home";
import { PlayerProfile } from "./pages/PlayerProfile";
import { Players } from "./pages/Players";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/players" element={<Players />} />
        <Route path="/players/:id" element={<PlayerProfile />} />
      </Routes>
    </Layout>
  );
}
