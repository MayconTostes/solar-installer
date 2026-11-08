import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Shield, 
  LogOut, 
  Sun, 
  CheckCircle2, 
  Clock, 
  MapPin,
  Search
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const [obras, setObras] = useState([]);
  const [erroCarregamento, setErroCarregamento] = useState('');

  useEffect(() => {
    // As regras RLS do banco garantem que o admin recebe todas as obras
    // A view obras_resumo já traz o progresso salvo no servidor e o status derivado
    supabase
      .from('obras_resumo')
      .select('id, cliente_nome, cidade, potencia_kwp, status_atual, progresso_pct, tecnico_chefe_nome')
      .order('criado_em', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          setErroCarregamento('Não foi possível carregar as obras.');
          return;
        }
        setObras(
          data.map((o) => ({
            id: o.id,
            cliente: o.cliente_nome,
            cidade: o.cidade,
            potencia: o.potencia_kwp ? `${o.potencia_kwp} kWp` : '—',
            status: o.status_atual,
            tecnicoChefe: o.tecnico_chefe_nome ?? 'Não definido',
            progresso: o.progresso_pct ?? 0,
          }))
        );
      });
  }, []);

  // KPIs calculados a partir da lista (antes estavam fixos e não batiam com a tabela)
  const totalObras = obras.length;
  const emExecucao = obras.filter((o) => o.status === 'Em Instalação').length;
  const concluidas = obras.filter((o) => o.status === 'Finalizado').length;

  const filteredObras = obras.filter(obra => 
    obra.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
    obra.cidade.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={styles.layout}>
      {/* Barra Lateral / Sidebar (PC) */}
      <aside style={styles.sidebar}>
        <div style={styles.brandContainer}>
          <Sun size={28} color="#f59e0b" />
          <span style={styles.brandTitle}>Solar Admin</span>
        </div>

        <nav style={styles.navMenu}>
          <button style={{ ...styles.navItem, ...styles.navActive }}>
            <LayoutDashboard size={18} /> Dashboard
          </button>
          <button style={styles.navItem} onClick={() => navigate('/admin/clientes')}>
            <Users size={18} /> Clientes & Obras
          </button>
          <button style={styles.navItem} onClick={() => navigate('/admin/equipes')}>
            <Shield size={18} /> Equipes de Campo
          </button>
          <button style={styles.navItem} onClick={() => navigate('/admin/relatorios')}>
            <FileText size={18} /> Relatórios & PDFs
          </button>
        </nav>

        <div style={styles.sidebarFooter}>
          <button style={styles.logoutBtn} onClick={() => { logout(); navigate('/'); }}>
            <LogOut size={16} /> Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main style={styles.mainContent}>
        {/* Topo do Dashboard */}
        <header style={styles.topbar}>
          <div>
            <h1 style={styles.pageTitle}>Painel de Gestão Operacional</h1>
            <p style={styles.pageSubtitle}>Acompanhamento em tempo real das instalações solares fotovoltaicas.</p>
          </div>
          <div style={styles.adminProfile}>
            <div style={styles.avatar}>ADM</div>
            <div>
              <strong>Gestor Solar</strong>
              <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8' }}>Administrador</span>
            </div>
          </div>
        </header>

        {/* Cartões de Indicadores (KPIs) */}
        <div style={styles.kpiGrid}>
          <div style={styles.kpiCard}>
            <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}>
              <LayoutDashboard size={24} />
            </div>
            <div>
              <span style={styles.kpiLabel}>Total de Obras</span>
              <h2 style={styles.kpiValue}>{totalObras}</h2>
            </div>
          </div>

          <div style={styles.kpiCard}>
            <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
              <Clock size={24} />
            </div>
            <div>
              <span style={styles.kpiLabel}>Em Execução (Campo)</span>
              <h2 style={styles.kpiValue}>{emExecucao}</h2>
            </div>
          </div>

          <div style={styles.kpiCard}>
            <div style={{ ...styles.kpiIcon, backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <CheckCircle2 size={24} />
            </div>
            <div>
              <span style={styles.kpiLabel}>Concluídas</span>
              <h2 style={styles.kpiValue}>{concluidas}</h2>
            </div>
          </div>
        </div>

        {/* Seção da Tabela de Obras */}
        <div style={styles.sectionHeader}>
          <h3 style={styles.sectionTitle}>Ordens de Serviço Ativas</h3>
          <div style={styles.searchContainer}>
            <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px' }} />
            <input 
              type="text" 
              placeholder="Pesquisar cliente ou cidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>
        </div>

        <div style={styles.tableContainer}>
          {erroCarregamento && <p style={{ color: '#f87171', padding: 16, margin: 0 }}>{erroCarregamento}</p>}
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeaderRow}>
                <th style={styles.th}>Cliente / Local</th>
                <th style={styles.th}>Potência</th>
                <th style={styles.th}>Técnico Chefe</th>
                <th style={styles.th}>Status Atual</th>
                <th style={styles.th}>Progresso</th>
              </tr>
            </thead>
            <tbody>
              {filteredObras.map((obra) => (
                <tr key={obra.id} style={styles.tableRow}>
                  <td style={styles.td}>
                    <strong>{obra.cliente}</strong>
                    <span style={styles.subText}><MapPin size={12} /> {obra.cidade}</span>
                  </td>
                  <td style={styles.td}>{obra.potencia}</td>
                  <td style={styles.td}>{obra.tecnicoChefe}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: obra.status === 'Finalizado' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(37, 99, 235, 0.1)',
                      color: obra.status === 'Finalizado' ? '#10b981' : '#38bdf8'
                    }}>
                      {obra.status}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.progressBarContainer}>
                      <div style={{ ...styles.progressBarFill, width: `${obra.progresso}%` }}></div>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px', display: 'block' }}>{obra.progresso}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

const styles = {
  layout: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    color: '#f8fafc',
  },
  sidebar: {
    width: '260px',
    backgroundColor: '#1e293b',
    borderRight: '1px solid #334155',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '24px 16px',
  },
  brandContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    paddingBottom: '24px',
    borderBottom: '1px solid #334155',
  },
  brandTitle: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#f59e0b',
  },
  navMenu: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '20px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    color: '#94a3b8',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s',
  },
  navActive: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
  },
  sidebarFooter: {
    borderTop: '1px solid #334155',
    paddingTop: '16px',
  },
  logoutBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px',
    backgroundColor: '#334155',
    border: 'none',
    borderRadius: '8px',
    color: '#f8fafc',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.85rem',
  },
  mainContent: {
    flex: 1,
    padding: '32px',
    overflowY: 'auto',
  },
  topbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
  },
  pageTitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    margin: '0 0 4px 0',
  },
  pageSubtitle: {
    fontSize: '0.9rem',
    color: '#94a3b8',
    margin: 0,
  },
  adminProfile: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: '#1e293b',
    padding: '8px 16px',
    borderRadius: '12px',
    border: '1px solid #334155',
  },
  avatar: {
    width: '36px',
    height: '36px',
    backgroundColor: '#2563eb',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '0.85rem',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
    marginBottom: '32px',
  },
  kpiCard: {
    backgroundColor: '#1e293b',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #334155',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  kpiIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiLabel: {
    fontSize: '0.85rem',
    color: '#94a3b8',
  },
  kpiValue: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    margin: '4px 0 0 0',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    margin: 0,
  },
  searchContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '300px',
  },
  searchInput: {
    width: '100%',
    padding: '10px 12px 10px 38px',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#f8fafc',
    fontSize: '0.85rem',
    outline: 'none',
  },
  tableContainer: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    border: '1px solid #334155',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  tableHeaderRow: {
    backgroundColor: '#0f172a',
    borderBottom: '1px solid #334155',
  },
  th: {
    padding: '14px 16px',
    fontSize: '0.85rem',
    color: '#94a3b8',
    fontWeight: '600',
  },
  tableRow: {
    borderBottom: '1px solid #334155',
  },
  td: {
    padding: '16px',
    fontSize: '0.9rem',
  },
  subText: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.75rem',
    color: '#94a3b8',
    marginTop: '2px',
  },
  badge: {
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: '600',
  },
  progressBarContainer: {
    width: '100px',
    height: '6px',
    backgroundColor: '#334155',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2563eb',
  },
};