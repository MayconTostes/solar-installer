import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, MapPin, Sun, ChevronRight } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

export default function MinhasObras() {
  const { user, logout } = useAuth();
  const [obras, setObras] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    // As regras RLS já filtram: o técnico recebe só as obras da sua equipe
    // A view obras_resumo traz o status e o progresso salvos no servidor
    supabase
      .from('obras_resumo')
      .select('id, cliente_nome, endereco, cidade, status_atual, progresso_pct')
      .order('criado_em', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error('Erro ao listar obras:', error);
          setErro(`Não foi possível carregar as obras. (${error.message})`);
        } else {
          setObras(data);
        }
      });
  }, []);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <div style={styles.brand}>
            <Sun size={20} color="#f59e0b" />
            <span style={styles.brandText}>Solar Installer (Campo)</span>
          </div>
          <p style={styles.hello}>Olá, {user?.nome}</p>
        </div>
        <button style={styles.logoutBtn} onClick={logout} title="Sair">
          <LogOut size={18} color="#f8fafc" />
        </button>
      </header>

      <main style={styles.content}>
        <h3 style={styles.sectionTitle}>Minhas obras</h3>

        {erro && <p style={styles.erro}>{erro}</p>}
        {!erro && obras === null && <p style={styles.muted}>Carregando...</p>}
        {obras?.length === 0 && <p style={styles.muted}>Nenhuma obra atribuída à sua equipe.</p>}

        {obras?.map((obra) => (
          <Link key={obra.id} to={`/campo/instalacao/${obra.id}`} style={styles.card}>
            <div>
              <strong style={styles.cliente}>{obra.cliente_nome}</strong>
              <span style={styles.local}>
                <MapPin size={12} /> {obra.endereco} - {obra.cidade}
              </span>
              <span style={styles.status}>{obra.status_atual}</span>
              <div style={styles.barra}>
                <div style={{ ...styles.barraFill, width: `${obra.progresso_pct ?? 0}%` }} />
              </div>
              <span style={styles.pct}>{obra.progresso_pct ?? 0}% concluído</span>
            </div>
            <ChevronRight size={20} color="#94a3b8" />
          </Link>
        ))}
      </main>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc' },
  header: { backgroundColor: '#1e293b', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155' },
  brand: { display: 'flex', alignItems: 'center', gap: '6px' },
  brandText: { fontSize: '0.85rem', fontWeight: 'bold', color: '#f59e0b' },
  hello: { margin: '4px 0 0 0', fontSize: '1rem' },
  logoutBtn: { backgroundColor: '#334155', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer' },
  content: { padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' },
  sectionTitle: { fontSize: '1rem', color: '#38bdf8', margin: '0 0 4px 0' },
  muted: { color: '#94a3b8', fontSize: '0.9rem' },
  erro: { color: '#f87171', fontSize: '0.9rem' },
  card: { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#f8fafc', textDecoration: 'none' },
  cliente: { display: 'block', fontSize: '1rem' },
  local: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' },
  status: { display: 'inline-block', marginTop: '8px', fontSize: '0.75rem', color: '#38bdf8' },
  barra: { width: '100%', height: '5px', backgroundColor: '#334155', borderRadius: '3px', overflow: 'hidden', marginTop: '6px' },
  barraFill: { height: '100%', backgroundColor: '#10b981' },
  pct: { display: 'block', fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' },
};
