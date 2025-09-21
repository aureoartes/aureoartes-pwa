import { Routes, Route } from "react-router-dom";

// 🔐 Auth (novo)
import { AuthProvider } from "./auth/AuthProvider";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { SupabaseSessionListener } from "./auth/SupabaseSessionListener";
import SignIn from "./auth/SignIn";
import Signup from "./pages/Signup";

// UI
import Navbar from "./components/Navbar";
import InstallPrompt from "./components/InstallPrompt"; // 👈 NOVO

// Páginas (mantidas)
import Home from "./pages/Home";
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
import AtualizaUsuario from "./pages/AtualizaUsuario";
import ChangelogPage from "./pages/ChangelogPage";

export default function App() {
  return (
    <>
      <Navbar />

      {/* Provider + Listener de sessão */}
      <AuthProvider>
        <SupabaseSessionListener />

        <Routes>
          {/* Rotas livres */}
          <Route path="/" element={<Home />} />
          <Route path="placar" element={<Placar mode="avulso" />} />
          {/* Login (mantive /login e adicionei /entrar para compatibilidade) */}
          <Route path="/login" element={<SignIn />} />
          <Route path="/entrar" element={<SignIn />} />
          <Route path="/signup" element={<Signup />} /> 
          <Route path="/atualiza-usuario" element={<AtualizaUsuario />} />
          <Route path="/changelog" element={<ChangelogPage />} />

          {/* Rotas protegidas (grupo) */}
          <Route element={<ProtectedRoute />}>
            {/* Alias padrão pós-login do SignIn */}
            <Route path="/app" element={<Campeonatos />} />

            <Route path="/times" element={<Times />} />
            <Route path="/times/:id" element={<TimeDetalhes />} />
            <Route path="/jogadores" element={<Jogadores />} />
            <Route path="/campeonatos" element={<Campeonatos />} />
            <Route path="/campeonatos/:id/equipes" element={<CampeonatoEquipes />} />
            <Route path="/campeonatos/:id/partidas" element={<CampeonatoPartidas />} />
            <Route path="/campeonatos/:id/classificacao" element={<CampeonatoTabela />} />
            <Route path="/campeonatos/:id/chaveamento" element={<CampeonatoChaveamento />} />
            <Route path="partidas/:partidaId/placar" element={<Placar />} />
            <Route path="/perfil" element={<Perfil />} />
          </Route>
        </Routes>

        {/* 👇 aparece em todas as telas; respeita theme.css */}
        <InstallPrompt />
      </AuthProvider>
    </>
  );
}
