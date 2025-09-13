import { Routes, Route } from "react-router-dom";
import ProtectedRouteFront from "./routes/ProtectedRouteFront";

import Navbar from "./components/Navbar";

// Páginas (ajuste caminhos conforme seu projeto)
import Home from "./pages/Home";
import Login from "./pages/Login";
import Placar from "./pages/Placar";
import Times from "./pages/Times";
import TimeDetalhes from "./pages/TimeDetalhes";
import Jogadores from "./pages/Jogadores";
import CampeonatoEquipes from "./pages/CampeonatoEquipes";
import CampeonatoPartidas from "./pages/CampeonatoPartidas";
import CampeonatoTabela from "./pages/CampeonatoTabela";
import CampeonatoChaveamento from "./pages/CampeonatoChaveamento";
import Perfil from "./pages/Perfil";
import Campeonatos from "./pages/Campeonatos";
export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        {/* Livre */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/placar" element={<Placar />} />

        {/* Protegidas por USUARIO_ID */}
        <Route
          path="/times"
          element={
            <ProtectedRouteFront>
              <Times />
            </ProtectedRouteFront>
          }
        />
        <Route
          path="/times/:id"
          element={
            <ProtectedRouteFront>
              <TimeDetalhes />
            </ProtectedRouteFront>
          }
        />
        <Route
          path="/jogadores"
          element={
            <ProtectedRouteFront>
              <Jogadores />
            </ProtectedRouteFront>
          }
        />
        
        <Route
          path="/campeonatos"
          element={
            <ProtectedRouteFront>
              <Campeonatos />
            </ProtectedRouteFront>
          }
        />

        <Route
          path="/campeonato/equipes"
          element={
            <ProtectedRouteFront>
              <CampeonatoEquipes />
            </ProtectedRouteFront>
          }
        />
        <Route
          path="/campeonato/partidas"
          element={
            <ProtectedRouteFront>
              <CampeonatoPartidas />
            </ProtectedRouteFront>
          }
        />
        <Route
          path="/campeonato/tabela"
          element={
            <ProtectedRouteFront>
              <CampeonatoTabela />
            </ProtectedRouteFront>
          }
        />
        <Route
          path="/campeonato/chaveamento"
          element={
            <ProtectedRouteFront>
              <CampeonatoChaveamento />
            </ProtectedRouteFront>
          }
        />
        <Route
          path="/perfil"
          element={
            <ProtectedRouteFront>
              <Perfil />
            </ProtectedRouteFront>
          }
        />
      </Routes>
    </>
  );
}
