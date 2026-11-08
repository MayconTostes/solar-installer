// src/services/ids.js

// Gera um UUID v4. crypto.randomUUID só existe em contextos seguros (HTTPS ou localhost),
// então há um fallback para testes pelo IP da rede local.
export function gerarId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
