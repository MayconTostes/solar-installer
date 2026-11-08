import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, carregando } = useAuth();

  // Enquanto a sessão está sendo restaurada, não redireciona
  if (carregando) {
    return <div style={{ padding: 24, color: '#94a3b8', fontFamily: 'sans-serif' }}>Carregando...</div>;
  }

  // Se não estiver logado, redireciona para o login
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Se a rota exige um perfil específico e o usuário não o tem
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/campo/obras'} replace />;
  }

  return children;
}
