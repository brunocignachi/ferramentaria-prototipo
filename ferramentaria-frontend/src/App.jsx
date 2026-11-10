import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ConfirmacaoProvider } from './context/ConfirmacaoContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CadastrarUsuarioPage from './pages/CadastrarUsuarioPage';
import FilaPage from './pages/FilaPage';
import SolicitacoesPage from './pages/SolicitacoesPage';
import SolicitacaoDetalhePage from './pages/SolicitacaoDetalhePage';
import UsuariosPage from './pages/UsuariosPage';
import TiposProcessoPage from './pages/TiposProcessoPage';
import RelatoriosPage from './pages/RelatoriosPage';
import NotificacoesPage from './pages/NotificacoesPage';
import ConfiguracoesPage from './pages/ConfiguracoesPage';
import AjudaPage from './pages/AjudaPage';
import { NotificacoesProvider } from './context/NotificacoesContext';

export default function App() {
  return (
    <AuthProvider>
      <ConfirmacaoProvider>
        <BrowserRouter>
          <NotificacoesProvider>
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

              <Route
                path="/usuarios"
                element={
                  <ProtectedRoute perfis={['administrador']}>
                    <UsuariosPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/tipos-processo"
                element={
                  <ProtectedRoute perfis={['administrador']}>
                    <TiposProcessoPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/relatorios"
                element={
                  <ProtectedRoute perfis={['administrador']}>
                    <RelatoriosPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/notificacoes"
                element={
                  <ProtectedRoute>
                    <NotificacoesPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/configuracoes"
                element={
                  <ProtectedRoute>
                    <ConfiguracoesPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/ajuda"
                element={
                  <ProtectedRoute>
                    <AjudaPage />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </NotificacoesProvider>
        </BrowserRouter>
      </ConfirmacaoProvider>
    </AuthProvider>
  );
}
