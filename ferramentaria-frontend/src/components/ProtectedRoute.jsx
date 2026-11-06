import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Bloqueia o acesso a uma rota até o usuário estar autenticado e,
 * opcionalmente, até ter um dos perfis em `perfis` (ex.: ['administrador']).
 * Usado para a tela de Cadastro de Usuário (UC15/RN03 — só admin).
 */
export default function ProtectedRoute({ children, perfis }) {
  const { estaAutenticado, usuario } = useAuth();
  const location = useLocation();

  if (!estaAutenticado) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (perfis && !perfis.includes(usuario.perfil)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
