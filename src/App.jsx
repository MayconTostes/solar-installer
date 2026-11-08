import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { sincronizarPendentes } from './services/sincronizacao';

import Login from './pages/Login';
import Dashboard from './pages/admin/Dashboard';
import Clientes from './pages/admin/Clientes';
import Equipes from './pages/admin/Equipes';
import Relatorios from './pages/admin/Relatorios';
import MinhasObras from './pages/campo/MinhasObras';
import Instalacao from './pages/campo/Instalacao';

// Envia automaticamente as OS guardadas offline, mas só com usuário logado
// (o envio precisa da sessão). Roda ao entrar e ao recuperar a conexão.
function SincronizacaoAutomatica() {
  const { user, carregando } = useAuth();
  const userId = user?.id;

  useEffect(() => {
    if (carregando || !userId) return;

    const sincronizar = () => {
      sincronizarPendentes().catch((error) => console.error('Erro na sincronização:', error));
    };

    sincronizar();
    window.addEventListener('online', sincronizar);
    return () => window.removeEventListener('online', sincronizar);
  }, [userId, carregando]);

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <SincronizacaoAutomatica />
      <BrowserRouter>
        <Routes>
          {/* Rota Pública */}
          <Route path="/" element={<Login />} />

          {/* Rotas Protegidas do Admin (PC) */}
          <Route path="/admin/dashboard" element={<ProtectedRoute requiredRole="admin"><Dashboard /></ProtectedRoute>} />
          <Route path="/admin/clientes" element={<ProtectedRoute requiredRole="admin"><Clientes /></ProtectedRoute>} />
          <Route path="/admin/equipes" element={<ProtectedRoute requiredRole="admin"><Equipes /></ProtectedRoute>} />
          <Route path="/admin/relatorios" element={<ProtectedRoute requiredRole="admin"><Relatorios /></ProtectedRoute>} />

          {/* Rotas Protegidas de Campo (Mobile) */}
          <Route path="/campo/obras" element={<ProtectedRoute requiredRole="campo"><MinhasObras /></ProtectedRoute>} />
          <Route path="/campo/instalacao/:obraId" element={<ProtectedRoute requiredRole="campo"><Instalacao /></ProtectedRoute>} />

          {/* Redirecionamento Padrão */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
