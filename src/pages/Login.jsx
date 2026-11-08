import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Lock, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [entrando, setEntrando] = useState(false);
  const navigate = useNavigate();
  const { user, carregando, login } = useAuth();

  // Quando a sessão estiver pronta, leva cada perfil para a sua área
  useEffect(() => {
    if (!carregando && user) {
      navigate(user.role === 'admin' ? '/admin/dashboard' : '/campo/obras', { replace: true });
    }
  }, [user, carregando, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro('');
    setEntrando(true);

    try {
      await login(email.trim(), senha);
    } catch (error) {
      console.error(error);
      if (!navigator.onLine) setErro('Sem conexão com a internet.');
      else setErro(error.mensagemUsuario ?? 'E-mail ou senha inválidos.');
    } finally {
      setEntrando(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.iconBadge}>
            <Sun size={36} color="#f59e0b" />
          </div>
          <h1 style={styles.title}>Solar Installer</h1>
          <p style={styles.subtitle}>Gestão e Operações Solar Fotovoltaica</p>
        </div>

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <Mail size={20} color="#64748b" style={styles.inputIcon} />
            <input
              type="email"
              placeholder="Seu e-mail"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <Lock size={20} color="#64748b" style={styles.inputIcon} />
            <input
              type="password"
              placeholder="Sua senha"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          {erro && <p style={styles.erro}>{erro}</p>}

          <button type="submit" style={{ ...styles.submitButton, opacity: entrando ? 0.6 : 1 }} disabled={entrando}>
            {entrando ? 'Entrando...' : 'Entrar no Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    padding: '20px',
    boxSizing: 'border-box',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: '16px',
    padding: '32px 24px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
    border: '1px solid #334155',
  },
  header: {
    textAlign: 'center',
    marginBottom: '28px',
  },
  iconBadge: {
    backgroundColor: '#27272a',
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 12px auto',
    border: '1px solid #3f3f46',
  },
  title: {
    color: '#f8fafc',
    fontSize: '1.5rem',
    fontWeight: 'bold',
    margin: '0 0 6px 0',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: '0.875rem',
    margin: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputGroup: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '12px',
  },
  input: {
    width: '100%',
    padding: '12px 12px 12px 42px',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#f8fafc',
    fontSize: '0.95rem',
    outline: 'none',
    boxSizing: 'border-box',
  },
  erro: {
    color: '#f87171',
    fontSize: '0.85rem',
    margin: 0,
  },
  submitButton: {
    padding: '12px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '8px',
  },
};
