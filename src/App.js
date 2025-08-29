import UsuarioForm from './components/UsuarioForm';
import TimeForm from './components/TimeForm';
import JogadorForm from './components/JogadorForm';
import CampeonatoForm from './components/CampeonatoForm';
import TabelaPartidas from './components/TabelaPartidas';
import Classificacao from './components/Classificacao';
import { useState } from 'react';

function App() {
  const [usuario, setUsuario] = useState(null);
  const [time, setTime] = useState(null);
  const [campeonato, setCampeonato] = useState(null);

  return (
    <div>
      {!usuario && <UsuarioForm onCreated={setUsuario} />}
      {usuario && !time && <TimeForm usuarioId={usuario.id} onCreated={setTime} />}
      {time && !campeonato && <CampeonatoForm usuarioId={usuario.id} onCreated={setCampeonato} />}
      {campeonato && (
        <>
          <TabelaPartidas campeonatoId={campeonato.id} />
          <Classificacao campeonatoId={campeonato.id} />
        </>
      )}
    </div>
  );
}

export default App;
