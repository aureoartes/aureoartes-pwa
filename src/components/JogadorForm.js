import { useState } from 'react';
import api from '../api';

export default function JogadorForm({ timeId, onCreated }) {
  const [nome, setNome] = useState('');
  const [apelido, setApelido] = useState('');
  const [posicao, setPosicao] = useState('-vazio-');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await api.post('/jogadores', { time_id: timeId, nome, apelido, posicao });
    onCreated(res.data);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input placeholder="Nome" value={nome} onChange={e => setNome(e.target.value)} required/>
      <input placeholder="Apelido" value={apelido} onChange={e => setApelido(e.target.value)}/>
      <select value={posicao} onChange={e => setPosicao(e.target.value)}>
        <option>-vazio-</option>
        <option>GOL</option>
        <option>DEF</option>
        <option>MEI</option>
        <option>ATA</option>
      </select>
      <button type="submit">Criar Jogador</button>
    </form>
  );
}
