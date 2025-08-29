import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api', // ajuste conforme seu backend
});

export default api;
