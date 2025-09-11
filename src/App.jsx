// src/App.jsx
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Times from "./pages/Times";
import Jogadores from "./pages/Jogadores";
import Campeonatos from "./pages/Campeonatos";
import CampeonatoEquipes from "./pages/CampeonatoEquipes";
import CampeonatoPartidas from "./pages/CampeonatoPartidas";
import Placar from "./pages/Placar";
import CampeonatoTabela from "./pages/CampeonatoTabela";
import CampeonatoChaveamento from "./pages/CampeonatoChaveamento";
import TimeDetalhes from "./pages/TimeDetalhes"

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/times" element={<Times />} />
        <Route path="/jogadores" element={<Jogadores />} />
        <Route path="/campeonatos" element={<Campeonatos />} />
        <Route path="/campeonatos/:id/equipes" element={<CampeonatoEquipes />} />
        <Route path="/campeonatos/:id/partidas" element={<CampeonatoPartidas />} />
        <Route path="/partidas/:partidaId/placar" element={<Placar />} />
        <Route path="/placar" element={<Placar />} /> {/* modo avulso */}
        <Route path="/campeonatos/:id/classificacao" element={<CampeonatoTabela />} />
        <Route path="/campeonatos/:id/chaveamento" element={<CampeonatoChaveamento />} />
        <Route path="/times/:id" element={<TimeDetalhes />} />
        {/* rota coringa opcional */}
        <Route path="*" element={<Home />} />
      </Routes>
    </>
  );
}
