import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext({});

// Busca o papel (admin/campo) do usuário na tabela perfis
async function buscarPerfil(userId) {
  const { data, error } = await supabase
    .from('perfis')
    .select('nome, role')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    const erro = new Error('Perfil não encontrado');
    erro.mensagemUsuario = 'Seu usuário ainda não tem perfil cadastrado. Peça ao administrador.';
    throw erro;
  }

  return data;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // { id, email, nome, role }
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;

    async function aplicarSessao(session) {
      if (!session) {
        if (ativo) setUser(null);
        return;
      }

      try {
        const perfil = await buscarPerfil(session.user.id);
        if (ativo) setUser({ id: session.user.id, email: session.user.email, ...perfil });
      } catch (error) {
        console.error('Erro ao carregar perfil:', error);
        await supabase.auth.signOut();
        if (ativo) setUser(null);
      }
    }

    // Restaura a sessão salva no navegador ao abrir ou atualizar a página
    supabase.auth
      .getSession()
      .then(({ data }) => aplicarSessao(data.session))
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_evento, session) => {
      aplicarSessao(session);
    });

    return () => {
      ativo = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // Lança erro com mensagem amigável para a tela de login
  const login = async (email, senha) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) throw error;

    try {
      const perfil = await buscarPerfil(data.user.id);
      setUser({ id: data.user.id, email: data.user.email, ...perfil });
    } catch (erroPerfil) {
      await supabase.auth.signOut();
      throw erroPerfil;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, carregando, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
