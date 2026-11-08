// src/services/sincronizacao.js
import { supabase } from './supabase';
import { obterPendentes, removerPendente } from './offlineStorage';
import { enviarFoto } from './fotos';

// Envia uma OS completa: fotos, registro, checklist e vínculo das fotos.
// É idempotente: se algo falhar no meio, repetir o envio não duplica dados.
export async function enviarOrdemServico(os) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sessão expirada. Faça login novamente.');

  // 1. Envia as fotos que ainda não estão no servidor
  const fotos = [];
  for (const foto of os.fotos ?? []) {
    const caminho = foto.caminho ?? (await enviarFoto({ userId: user.id, obraId: os.obraId, foto }));
    fotos.push({ id: foto.id, caminho });
  }

  // 2. Registra a OS
  const { error: erroOs } = await supabase.from('ordens_servico').upsert(
    {
      id_local: os.idLocal,
      obra_id: os.obraId,
      checklist: os.checklist,
      tensao_rede_medida_v: os.tensaoRedeMedida,
      assinado: os.assinado,
    },
    { onConflict: 'id_local', ignoreDuplicates: true }
  );
  if (erroOs) throw erroOs;

  // 3. Liga as fotos à OS
  if (fotos.length > 0) {
    const { error: erroFotos } = await supabase.from('os_fotos').upsert(
      fotos.map((f) => ({ id: f.id, os_id_local: os.idLocal, caminho: f.caminho })),
      { onConflict: 'id', ignoreDuplicates: true }
    );
    if (erroFotos) throw erroFotos;
  }

  // 4. Apaga o progresso salvo: a obra agora está finalizada
  const { error: erroProgresso } = await supabase
    .from('obra_progresso')
    .delete()
    .eq('obra_id', os.obraId);
  if (erroProgresso) throw erroProgresso;

  return true;
}

let sincronizando = false;

// Tenta enviar, em ordem, as OS guardadas no aparelho.
// Para na primeira falha e mantém as restantes na fila para a próxima tentativa.
export async function sincronizarPendentes() {
  if (sincronizando || !navigator.onLine) return null;

  sincronizando = true;
  try {
    const pendentes = await obterPendentes();
    let enviadas = 0;

    for (const os of pendentes) {
      try {
        await enviarOrdemServico(os);
        await removerPendente(os.id);
        enviadas++;
      } catch (error) {
        console.error(`Falha ao sincronizar OS ${os.id}:`, error);
        break;
      }
    }

    return { enviadas, restantes: pendentes.length - enviadas };
  } finally {
    sincronizando = false;
  }
}
