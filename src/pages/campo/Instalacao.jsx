import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Camera, CheckCircle, LogOut, MapPin, PenTool, Sun, Upload, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  SECOES,
  calcularProgresso,
  itemAtivo,
  montarChecklist,
  normalizarNumero,
} from '../../data/checklist';
import { salvarOsOffline } from '../../services/offlineStorage';
import { enviarOrdemServico } from '../../services/sincronizacao';
import { enviarFoto, urlsAssinadas } from '../../services/fotos';
import { supabase } from '../../services/supabase';
import { gerarId } from '../../services/ids';

const FASES = { monofasico: 'Monofásica', bifasico: 'Bifásica', trifasico: 'Trifásica' };

const formatarDataHora = (dataIso) =>
  new Date(dataIso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export default function Instalacao() {
  const navigate = useNavigate();
  const { obraId } = useParams();
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState('checklist');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [obra, setObra] = useState(null);
  const [erroObra, setErroObra] = useState('');
  const [jaFinalizada, setJaFinalizada] = useState(false);
  const [respostas, setRespostas] = useState({});   // { [id]: { checked?, valor? } }
  const [photos, setPhotos] = useState([]);         // { id, arquivo?, caminho?, url }
  const [isSigned, setIsSigned] = useState(false);
  const [salvoEm, setSalvoEm] = useState(null);     // última gravação no servidor
  const [alteracoes, setAlteracoes] = useState(false);

  // Carrega a obra, o progresso salvo no servidor e a situação da OS
  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const { data: dadosObra, error: erroBusca } = await supabase
          .from('obras')
          .select('id, cliente_nome, endereco, cidade, num_modulos, potencia_inversor_kw, numero_strings, modulos_por_string, fases, tensao_rede_v')
          .eq('id', obraId)
          .maybeSingle();
        if (erroBusca) throw erroBusca;
        if (!ativo) return;
        if (!dadosObra) {
          setErroObra('Obra não encontrada ou sem acesso.');
          return;
        }
        setObra(dadosObra);

        const { count: totalOs, error: erroOs } = await supabase
          .from('ordens_servico')
          .select('id', { count: 'exact', head: true })
          .eq('obra_id', obraId);
        if (erroOs) throw erroOs;
        if (!ativo) return;
        setJaFinalizada(totalOs > 0);

        const { data: progresso, error: erroProgresso } = await supabase
          .from('obra_progresso')
          .select('respostas, fotos, assinado, atualizado_em')
          .eq('obra_id', obraId)
          .maybeSingle();
        if (erroProgresso) throw erroProgresso;
        if (!ativo || !progresso) return;

        const fotosSalvas = progresso.fotos ?? [];
        const urls = await urlsAssinadas(fotosSalvas.map((f) => f.caminho));
        if (!ativo) return;

        setRespostas(progresso.respostas ?? {});
        setIsSigned(progresso.assinado);
        setPhotos(fotosSalvas.map((f) => ({ id: f.id, caminho: f.caminho, url: urls[f.caminho] })));
        setSalvoEm(progresso.atualizado_em);
      } catch (error) {
        console.error('Erro ao carregar a obra:', error);
        if (ativo) setErroObra('Erro ao carregar a obra. Verifique a conexão.');
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    carregar();
    return () => {
      ativo = false;
    };
  }, [obraId]);

  const progresso = calcularProgresso(respostas);
  const bloqueado = jaFinalizada || finalizando;

  const alterarResposta = (id, patch) => {
    setRespostas((r) => ({ ...r, [id]: { ...r[id], ...patch } }));
    setAlteracoes(true);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotos((prev) => [...prev, { id: gerarId(), arquivo: file, url: URL.createObjectURL(file) }]);
    setAlteracoes(true);
    e.target.value = '';
  };

  const handleAssinar = () => {
    setIsSigned(true);
    setAlteracoes(true);
  };

  // Salva o progresso no servidor: respostas, fotos e percentual.
  // Quem assumir a obra depois enxerga exatamente o que foi salvo aqui.
  const handleSalvarProgresso = async () => {
    if (!navigator.onLine) {
      alert('Sem conexão. Não foi possível salvar no servidor. Tente de novo quando tiver sinal.');
      return;
    }

    setSalvando(true);
    try {
      const fotosAtualizadas = [];
      for (const foto of photos) {
        if (foto.caminho) {
          fotosAtualizadas.push(foto);
          continue;
        }
        const caminho = await enviarFoto({ userId: user.id, obraId: obra.id, foto });
        fotosAtualizadas.push({ ...foto, caminho });
      }

      const agora = new Date().toISOString();
      const { error } = await supabase.from('obra_progresso').upsert(
        {
          obra_id: obra.id,
          respostas,
          fotos: fotosAtualizadas.map(({ id, caminho }) => ({ id, caminho })),
          assinado: isSigned,
          progresso_pct: progresso.pct,
          atualizado_em: agora,
          atualizado_por: user.id,
        },
        { onConflict: 'obra_id' }
      );
      if (error) throw error;

      setPhotos(fotosAtualizadas);
      setSalvoEm(agora);
      setAlteracoes(false);
      alert(`Progresso salvo no servidor (${progresso.pct}%).`);
    } catch (error) {
      console.error('Erro ao salvar progresso:', error);
      alert('Não foi possível salvar o progresso. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  };

  const voltarParaObras = () => {
    if (alteracoes && !window.confirm('Há alterações que não foram salvas no servidor. Sair mesmo assim?')) return;
    navigate('/campo/obras');
  };

  const handleFinishOS = async () => {
    if (!obra || bloqueado) return;

    if (progresso.pendentes.length > 0) {
      const lista = progresso.pendentes.slice(0, 4).map((item) => `• ${item.titulo}`).join('\n');
      const mais = progresso.pendentes.length > 4 ? '\n...' : '';
      alert(`Faltam ${progresso.pendentes.length} item(ns) no checklist:\n${lista}${mais}`);
      return;
    }

    if (!isSigned) {
      alert('Por favor, recolha a assinatura do cliente antes de finalizar.');
      return;
    }

    const dadosOs = {
      obraId: obra.id,
      idLocal: gerarId(), // identifica a OS no banco: evita duplicar em caso de reenvio
      checklist: montarChecklist(respostas),
      tensaoRedeMedida: Number(normalizarNumero(respostas.tensaoRede?.valor)),
      assinado: isSigned,
      fotos: photos.map(({ id, arquivo, caminho }) => ({ id, arquivo, caminho })),
    };

    setFinalizando(true);
    try {
      if (navigator.onLine) {
        try {
          await enviarOrdemServico(dadosOs);
          alert('🚀 Instalação concluída e enviada com sucesso!');
        } catch (erroEnvio) {
          console.error('Falha no envio, guardando offline:', erroEnvio);
          await salvarOsOffline(dadosOs);
          alert('⚠️ Falha no envio. A OS foi guardada no aparelho e será reenviada automaticamente.');
        }
      } else {
        await salvarOsOffline(dadosOs);
        alert('📴 Sem conexão. A OS foi guardada no aparelho e será enviada assim que houver rede.');
      }
      navigate('/campo/obras', { replace: true });
    } catch (erroLocal) {
      console.error('Erro ao guardar localmente:', erroLocal);
      alert('Erro ao guardar os dados no aparelho. Não feche o aplicativo e tente novamente.');
    } finally {
      setFinalizando(false);
    }
  };

  if (carregando) {
    return <div style={styles.estado}>Carregando obra...</div>;
  }

  if (!obra) {
    return (
      <div style={styles.estado}>
        <p>{erroObra || 'Obra não encontrada.'}</p>
        <button style={styles.voltarBtn} onClick={() => navigate('/campo/obras')}>
          <ArrowLeft size={16} /> Voltar para obras
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <button style={styles.voltarBtn} onClick={voltarParaObras}>
          <ArrowLeft size={16} /> Obras
        </button>
      </div>

      <header style={styles.header}>
        <div>
          <div style={styles.brand}>
            <Sun size={20} color="#f59e0b" />
            <span style={styles.brandText}>Solar Installer (Campo)</span>
          </div>
          <p style={styles.clientTitle}>{obra.cliente_nome}</p>
          <div style={styles.location}>
            <MapPin size={14} color="#94a3b8" />
            <span>{`${obra.endereco} - ${obra.cidade}`}</span>
          </div>
        </div>
        <button style={styles.logoutBtn} onClick={() => { logout(); navigate('/'); }} title="Sair">
          <LogOut size={18} color="#f8fafc" />
        </button>
      </header>

      <section style={styles.dadosTecnicos}>
        <div>
          <span style={styles.rotulo}>Módulos</span>
          <strong>{obra.num_modulos ?? '—'}</strong>
        </div>
        <div>
          <span style={styles.rotulo}>Inversor</span>
          <strong>{obra.potencia_inversor_kw ? `${obra.potencia_inversor_kw} kW` : '—'}</strong>
        </div>
        <div>
          <span style={styles.rotulo}>Strings</span>
          <strong>
            {obra.numero_strings && obra.modulos_por_string
              ? `${obra.numero_strings} × ${obra.modulos_por_string} módulos`
              : '—'}
          </strong>
        </div>
        <div>
          <span style={styles.rotulo}>Rede</span>
          <strong>{obra.fases ? `${FASES[obra.fases]} ${obra.tensao_rede_v} V` : '—'}</strong>
        </div>
      </section>

      {jaFinalizada && (
        <div style={styles.avisoFinalizada}>Esta obra já foi finalizada. Ela não aceita novo envio de OS.</div>
      )}

      <div style={styles.progressWrapper}>
        <div style={styles.progressoTexto}>
          <span>Progresso do Comissionamento</span>
          <span>{progresso.pct}%</span>
        </div>
        <div style={styles.progressBarContainer}>
          <div style={{ width: `${progresso.pct}%`, ...styles.progressBarFill }}></div>
        </div>
      </div>

      <nav style={styles.tabs}>
        <button
          style={{ ...styles.tabBtn, ...(activeTab === 'checklist' ? styles.activeTab : {}) }}
          onClick={() => setActiveTab('checklist')}
        >
          <CheckCircle size={16} /> Checklist
        </button>
        <button
          style={{ ...styles.tabBtn, ...(activeTab === 'fotos' ? styles.activeTab : {}) }}
          onClick={() => setActiveTab('fotos')}
        >
          <Camera size={16} /> Fotos ({photos.length})
        </button>
        <button
          style={{ ...styles.tabBtn, ...(activeTab === 'assinatura' ? styles.activeTab : {}) }}
          onClick={() => setActiveTab('assinatura')}
        >
          <PenTool size={16} /> Assinatura
        </button>
      </nav>

      <main style={styles.content}>
        <div style={styles.barraSalvar}>
          <button style={styles.salvarBtn} onClick={handleSalvarProgresso} disabled={salvando || bloqueado}>
            {salvando ? 'Salvando...' : 'Salvar progresso'}
            {alteracoes && !salvando && <span style={styles.pontoAlerta}> •</span>}
          </button>
          <span style={styles.salvoTexto}>
            {salvoEm ? `Salvo no servidor em ${formatarDataHora(salvoEm)}` : 'Ainda não salvo no servidor'}
          </span>
        </div>

        {activeTab === 'checklist' && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Verificação Técnica e Medições</h3>

            {SECOES.map((secao) => {
              const itensVisiveis = secao.itens.filter((item) => itemAtivo(item, respostas));
              if (itensVisiveis.length === 0) return null;

              return (
                <div key={secao.titulo} style={styles.secaoBloco}>
                  <h4 style={styles.secaoTitulo}>{secao.titulo}</h4>

                  {itensVisiveis.map((item) => {
                    const resposta = respostas[item.id] ?? {};
                    const desabilitado = bloqueado;

                    return (
                      <div key={item.id} style={styles.checkCard}>
                        {item.tipo === 'check' && (
                          <div style={styles.checkItemTop}>
                            <input
                              type="checkbox"
                              id={`check-${item.id}`}
                              checked={!!resposta.checked}
                              disabled={desabilitado}
                              onChange={() => alterarResposta(item.id, { checked: !resposta.checked })}
                              style={styles.checkbox}
                            />
                            <label htmlFor={`check-${item.id}`} style={{ cursor: 'pointer', flex: 1 }}>
                              <strong style={{ color: resposta.checked ? '#10b981' : '#f8fafc', display: 'block' }}>
                                {item.titulo}
                              </strong>
                              {item.desc && <p style={styles.checkDesc}>{item.desc}</p>}
                            </label>
                          </div>
                        )}

                        {item.tipo !== 'check' && (
                          <div>
                            <strong style={{ color: '#f8fafc', display: 'block' }}>{item.titulo}</strong>
                            {item.desc && <p style={styles.checkDesc}>{item.desc}</p>}
                          </div>
                        )}

                        {item.tipo === 'escolha' && (
                          <select
                            value={resposta.valor ?? ''}
                            disabled={desabilitado}
                            onChange={(e) => alterarResposta(item.id, { valor: e.target.value })}
                            style={styles.select}
                          >
                            <option value="">Selecione...</option>
                            {item.opcoes.map((opcao) => (
                              <option key={opcao} value={opcao}>{opcao}</option>
                            ))}
                          </select>
                        )}

                        {item.tipo === 'simnao' && (
                          <div style={styles.simNao}>
                            {['sim', 'nao'].map((valor) => (
                              <button
                                key={valor}
                                disabled={desabilitado}
                                onClick={() => alterarResposta(item.id, { valor })}
                                style={{
                                  ...styles.simNaoBtn,
                                  ...(resposta.valor === valor ? styles.simNaoAtivo : {}),
                                }}
                              >
                                {valor === 'sim' ? 'Sim' : 'Não'}
                              </button>
                            ))}
                          </div>
                        )}

                        {item.tipo === 'medicao' && (
                          <div style={styles.inputContainer}>
                            <Zap size={16} color="#f59e0b" />
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder={`Valor em ${item.unidade}`}
                              value={resposta.valor ?? ''}
                              disabled={desabilitado}
                              onChange={(e) => alterarResposta(item.id, { valor: e.target.value.replace(/[^0-9.,]/g, '') })}
                              style={styles.techInput}
                            />
                            <span style={styles.unidade}>{item.unidade}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'fotos' && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Registro Fotográfico da Instalação</h3>
            <label style={{ ...styles.uploadArea, ...(bloqueado ? { opacity: 0.5, pointerEvents: 'none' } : {}) }}>
              <Upload size={28} color="#2563eb" />
              <span style={{ marginTop: '8px', color: '#cbd5e1' }}>Adicionar foto da instalação</span>
              <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} style={{ display: 'none' }} />
            </label>

            <div style={styles.photoGrid}>
              {photos.map((photo) => (
                <div key={photo.id} style={styles.photoCard}>
                  {photo.url ? (
                    <img src={photo.url} alt="Foto da obra" style={styles.photoImg} />
                  ) : (
                    <span style={styles.semPreview}>Sem prévia</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'assinatura' && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Termo de Aceitação</h3>
            <p style={styles.textMuted}>Ao assinar, o checklist, as medições e as fotos serão consolidados na Ordem de Serviço.</p>

            <div
              style={{ ...styles.signatureBox, ...(bloqueado ? { cursor: 'default' } : {}) }}
              onClick={() => !bloqueado && handleAssinar()}
            >
              {isSigned ? (
                <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓ Assinado pelo cliente</span>
              ) : (
                <span style={{ color: '#64748b' }}>Clique para simular a assinatura digital</span>
              )}
            </div>

            <button
              style={{ ...styles.finishBtn, opacity: isSigned && !bloqueado ? 1 : 0.6 }}
              onClick={handleFinishOS}
              disabled={bloqueado}
            >
              {jaFinalizada ? 'Obra já finalizada' : finalizando ? 'Finalizando...' : 'Finalizar e Enviar Ordem de Serviço'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  estado: { minHeight: '100vh', backgroundColor: '#0f172a', color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '20px', textAlign: 'center' },
  container: { minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', paddingBottom: '30px' },
  topBar: { backgroundColor: '#1e293b', padding: '10px 16px', borderBottom: '1px solid #334155' },
  voltarBtn: { display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', padding: 0 },
  header: { backgroundColor: '#1e293b', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155' },
  brand: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' },
  brandText: { fontSize: '0.85rem', fontWeight: 'bold', color: '#f59e0b' },
  clientTitle: { fontSize: '1.1rem', fontWeight: 'bold', margin: '2px 0' },
  location: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#94a3b8' },
  logoutBtn: { backgroundColor: '#334155', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer' },
  dadosTecnicos: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', padding: '12px 16px', backgroundColor: '#0f172a', borderBottom: '1px solid #334155', fontSize: '0.9rem' },
  rotulo: { display: 'block', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' },
  avisoFinalizada: { margin: '12px 16px 0', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid #f59e0b', borderRadius: '8px', padding: '10px 12px', fontSize: '0.85rem' },
  progressWrapper: { padding: '12px 16px', backgroundColor: '#1e293b', borderBottom: '1px solid #334155' },
  progressoTexto: { display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px', color: '#94a3b8' },
  progressBarContainer: { width: '100%', height: '6px', backgroundColor: '#334155', borderRadius: '3px', overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#10b981', transition: 'width 0.3s' },
  tabs: { display: 'flex', backgroundColor: '#1e293b', borderBottom: '1px solid #334155' },
  tabBtn: { flex: 1, padding: '12px 8px', backgroundColor: 'transparent', border: 'none', color: '#94a3b8', fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' },
  activeTab: { color: '#2563eb', borderBottom: '2px solid #2563eb', backgroundColor: '#0f172a' },
  content: { padding: '16px' },
  barraSalvar: { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' },
  salvarBtn: { width: '100%', padding: '12px', backgroundColor: '#334155', color: '#f8fafc', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '0.95rem', cursor: 'pointer' },
  salvoTexto: { fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center' },
  pontoAlerta: { color: '#f59e0b' },
  section: { display: 'flex', flexDirection: 'column', gap: '12px' },
  sectionTitle: { fontSize: '1rem', margin: '0 0 8px 0', color: '#38bdf8' },
  secaoBloco: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '8px' },
  secaoTitulo: { fontSize: '0.85rem', margin: '4px 0 0 0', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' },
  checkCard: { backgroundColor: '#1e293b', padding: '14px', borderRadius: '10px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '10px' },
  checkItemTop: { display: 'flex', alignItems: 'flex-start', gap: '12px' },
  checkbox: { marginTop: '4px', width: '18px', height: '18px', accentColor: '#10b981' },
  checkDesc: { fontSize: '0.75rem', color: '#94a3b8', margin: '2px 0 0 0' },
  select: { width: '100%', padding: '10px', backgroundColor: '#0f172a', color: '#f8fafc', border: '1px solid #334155', borderRadius: '8px', fontSize: '0.9rem' },
  simNao: { display: 'flex', gap: '8px' },
  simNaoBtn: { flex: 1, padding: '10px', backgroundColor: '#0f172a', color: '#94a3b8', border: '1px solid #334155', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' },
  simNaoAtivo: { backgroundColor: '#2563eb', color: '#fff', borderColor: '#2563eb' },
  inputContainer: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#0f172a', padding: '8px 12px', borderRadius: '8px', border: '1px solid #334155' },
  techInput: { width: '100%', background: 'transparent', border: 'none', color: '#f8fafc', fontSize: '0.9rem', outline: 'none' },
  unidade: { fontSize: '0.8rem', color: '#94a3b8', whiteSpace: 'nowrap' },
  uploadArea: { border: '2px dashed #334155', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', backgroundColor: '#1e293b' },
  photoGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '12px' },
  photoCard: { height: '100px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  photoImg: { width: '100%', height: '100%', objectFit: 'cover' },
  semPreview: { fontSize: '0.75rem', color: '#94a3b8' },
  textMuted: { fontSize: '0.85rem', color: '#94a3b8', margin: 0 },
  signatureBox: { height: '120px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginTop: '8px' },
  finishBtn: { backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '14px', borderRadius: '10px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '16px' },
};
