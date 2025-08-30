// src/App.jsx
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Times from "./pages/Times";
import Jogadores from "./pages/Jogadores";
import Campeonatos from "./pages/Campeonatos";

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/times" element={<Times />} />
        <Route path="/jogadores" element={<Jogadores />} />
        <Route path="/campeonatos" element={<Campeonatos />} />
        {/* rota coringa opcional */}
        <Route path="*" element={<Home />} />
      </Routes>
    </>
  );
}
