import { useEffect, useState } from 'react';
import api from '../api';

export default function TabelaPartidas({ campeonatoId }) {
  const [partidas, setPartidas] = useState([]);

  useEffect(() => {
    const fetchPartidas = async () => {
      const res = await api.get(`/partidas/${campeonatoId}`);
      setPartidas(res.data);
    };
    fetchPartidas();
  }, [campeonatoId]);

  const atualizarPlacar = async (id, golsA, golsB) => {
    await api.patch(`/partidas/${id}`, { gols_time_a: golsA, gols_time_b: golsB, encerrada: true });
    setPartidas(partidas.map(p => p.id === id ? {...p, gols_time_a: golsA, gols_time_b: golsB, encerrada: true} : p));
  };

  return (
    <table>
      <thead>
        <tr><th>Rodada</th><th>Time A</th><th>Placar</th><th>Time B</th><th>Ações</th></tr>
      </thead>
      <tbody>
        {partidas.map(p => (
          <tr key={p.id}>
            <td>{p.rodada}</td>
            <td>{p.time_a_nome}</td>
            <td>{p.gols_time_a} x {p.gols_time_b}</td>
            <td>{p.time_b_nome}</td>
            <td>
              {!p.encerrada && <button onClick={() => atualizarPlacar(p.id, Math.floor(Math.random()*5), Math.floor(Math.random()*5))}>Gerar Placar</button>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
