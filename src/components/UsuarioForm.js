import { useState } from 'react';
import api from '../api';

export default function UsuarioForm({ onCreated }) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [timeCoracao, setTimeCoracao] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await api.post('/usuarios', { nome, email, senha, time_coracao: timeCoracao });
    onCreated(res.data);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input placeholder="Nome" value={nome} onChange={e => setNome(e.target.value)} required/>
      <input placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required/>
      <input placeholder="Senha" type="password" value={senha} onChange={e => setSenha(e.target.value)} required/>
      <input placeholder="Time do coração" value={timeCoracao} onChange={e => setTimeCoracao(e.target.value)} required/>
      <button type="submit">Criar Usuário</button>
    </form>
  );
}
