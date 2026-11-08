// src/services/fotos.js
import { supabase } from './supabase';

export const BUCKET_FOTOS = 'fotos-os';

// Caminho no Storage: <user_id>/<obra_id>/<id_da_foto>.jpg
export function caminhoFoto(userId, obraId, fotoId) {
  return `${userId}/${obraId}/${fotoId}.jpg`;
}

// Envia um arquivo local ao Storage e devolve o caminho. Pode ser repetido sem duplicar.
export async function enviarFoto({ userId, obraId, foto }) {
  const caminho = caminhoFoto(userId, obraId, foto.id);

  const { error } = await supabase.storage.from(BUCKET_FOTOS).upload(caminho, foto.arquivo, {
    upsert: true,
    contentType: foto.arquivo.type || 'image/jpeg',
  });
  if (error) throw error;

  return caminho;
}

// Links temporários (1 hora) para exibir fotos já enviadas. Devolve { caminho: url }.
export async function urlsAssinadas(caminhos) {
  if (caminhos.length === 0) return {};

  const { data, error } = await supabase.storage.from(BUCKET_FOTOS).createSignedUrls(caminhos, 3600);
  if (error) throw error;

  return Object.fromEntries(
    data.filter((item) => item.signedUrl).map((item) => [item.path, item.signedUrl])
  );
}
