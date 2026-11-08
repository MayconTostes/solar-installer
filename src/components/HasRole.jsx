import { useAuth } from '../context/AuthContext';

export default function HasRole({ role, children }) {
  const { user } = useAuth();

  if (!user || user.role !== role) {
    return null; // Não exibe o conteúdo se o usuário não tiver o perfil correto
  }

  return children;
}