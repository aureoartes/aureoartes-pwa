import { useState } from 'react';
import api from '../api';

export default function TimeForm({ usuarioId, onCreated }) {
  const [nome, setNome] = useState('');
  const [abreviacao, setAbreviacao] = useState('');
  const [categoria, setCategoria] = useState('futebol de campo');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await api.post('/times', { usuario_id: usuarioId, nome, abreviacao, categoria });
    onCreated(res.data);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input placeholder="Nome do Time" value={nome} onChange={e => setNome(e.target.value)} required/>
      <input placeholder="Abreviação" value={abreviacao} onChange={e => setAbreviacao(e.target.value)} required/>
      <select value={categoria} onChange={e => setCategoria(e.target.value)}>
        <option>futebol de campo</option>
        <option>futsal</option>
        <option>society</option>
        <option>futebol de botão</option>
      </select>
      <button type="submit">Criar Time</button>
    </form>
  );
}
