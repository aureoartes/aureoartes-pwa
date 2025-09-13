// src/config/appUser.js
const KEY = "USUARIO_ID";

export function getUsuarioId() {
  return localStorage.getItem(KEY) || "";
}

export function setUsuarioId(id) {
  if (id && typeof id === "string") localStorage.setItem(KEY, id);
  else localStorage.removeItem(KEY);
}

export function clearUsuario() {
  localStorage.removeItem(KEY);
}

export function isLogged() {
  return !!getUsuarioId();
}
