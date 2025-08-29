import { useState } from 'react';
import api from '../api';

export default function CampeonatoForm({ usuarioId, onCreated }) {
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('futebol de campo');
  const [formato, setFormato] = useState('pontos_corridos');
  const [numeroEquipes, setNumeroEquipes] = useState(4);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await api.post('/campeonatos', {
      usuario_id: usuarioId,
      nome,
      categoria,
      formato,
      numero_equipes,
      ida_volta: false,
      duracao_tempo: 10,
      prorrogação: false,
      qtd_penaltis: 5
    });
    onCreated(res.data);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input placeholder="Nome Campeonato" value={nome} onChange={e => setNome(e.target.value)} required/>
      <select value={categoria} onChange={e => setCategoria(e.target.value)}>
        <option>futebol de campo</option>
        <option>futsal</option>
        <option>society</option>
        <option>futebol de botão</option>
      </select>
      <select value={formato} onChange={e => setFormato(e.target.value)}>
        <option value="pontos_corridos">Pontos Corridos</option>
        <option value="grupos">Grupos</option>
        <option value="mata_mata">Mata-mata</option>
      </select>
      <input type="number" min="4" max="16" value={numeroEquipes} onChange={e => setNumeroEquipes(Number(e.target.value))}/>
      <button type="submit">Criar Campeonato</button>
    </form>
  );
}
