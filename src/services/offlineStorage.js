// src/services/offlineStorage.js

const DB_NAME = 'SolarInstallerOfflineDB';
const STORE_NAME = 'ordensServicoPendentes';
const DB_VERSION = 2;

// Reutiliza uma única conexão com o IndexedDB em vez de abrir uma nova a cada chamada
let dbPromise = null;

export function abrirBancoDados() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        dbPromise = null;
        reject(request.error);
      };
      request.onsuccess = () => {
        const db = request.result;
        // Se outra aba precisar atualizar o banco, fecha esta conexão para não travar a atualização
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };
      request.onblocked = () => console.warn('Atualização do banco local bloqueada: feche as outras abas do app.');

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }
  return dbPromise;
}

// Guarda uma OS pendente para envio posterior
export async function salvarOsOffline(dadosOS) {
  const db = await abrirBancoDados();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const request = store.add({
      ...dadosOS,
      dataCriacao: new Date().toISOString(),
      sincronizado: false,
    });

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Obtém todas as OS guardadas offline
export async function obterPendentes() {
  const db = await abrirBancoDados();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Remove uma OS da fila depois de enviada com sucesso
export async function removerPendente(id) {
  const db = await abrirBancoDados();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}
