import { useEffect, useState } from 'react';
import api from '../api';

export default function Classificacao({ campeonatoId }) {
  const [tabela, setTabela] = useState([]);

  useEffect(() => {
    const fetchClassificacao = async () => {
      const res = await api.get(`/classificacao/${campeonatoId}`);
      setTabela(res.data);
    };
    fetchClassificacao();
  }, [campeonatoId]);

  return (
    <table>
      <thead>
        <tr><th>Time</th><th>Pontos</th><th>Vitórias</th><th>Empates</th><th>Derrotas</th><th>Gols Pró</th><th>Gols Contra</th><th>Saldo</th></tr>
      </thead>
      <tbody>
        {tabela.map(t => (
          <tr key={t.time_id}>
            <td>{t.nome}</td>
            <td>{t.pontos}</td>
            <td>{t.vitorias}</td>
            <td>{t.empates}</td>
            <td>{t.derrotas}</td>
            <td>{t.gols_pro}</td>
            <td>{t.gols_contra}</td>
            <td>{t.saldo}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
