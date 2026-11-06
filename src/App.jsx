import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CadastrarUsuarioPage from './pages/CadastrarUsuarioPage';
import FilaPage from './pages/FilaPage';
import SolicitacoesPage from './pages/SolicitacoesPage';
import SolicitacaoDetalhePage from './pages/SolicitacaoDetalhePage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/usuarios/novo"
            element={
              <ProtectedRoute perfis={['administrador']}>
                <CadastrarUsuarioPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/solicitacoes"
            element={
              <ProtectedRoute>
                <SolicitacoesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/solicitacoes/:id"
            element={
              <ProtectedRoute>
                <SolicitacaoDetalhePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/fila"
            element={
              <ProtectedRoute perfis={['operador', 'administrador']}>
                <FilaPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
