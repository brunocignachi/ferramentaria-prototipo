import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const PERFIS_DA_FILA = ['operador', 'administrador'];

// Itens do protótipo que ainda não têm tela: ficam desativados para não
// simular uma funcionalidade que não existe.
const ITENS_FUTUROS = [
  { key: 'configuracoes', label: 'Configurações' },
  { key: 'ajuda', label: 'Ajuda' },
];

export default function Sidebar() {
  const { usuario, logout } = useAuth();
  const { pathname, search } = useLocation();

  const noHistorico = pathname === '/solicitacoes' && search === '?status=concluida';
  const emSolicitacoes = pathname.startsWith('/solicitacoes') && !noHistorico;

  const classeDoLink = (ativo) => `sidebar__link ${ativo ? 'is-active' : ''}`;

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">Ferramentaria</div>

      <div className="sidebar__user">
        <div className="sidebar__avatar">{usuario?.nome?.charAt(0).toUpperCase() ?? '?'}</div>
        <div className="sidebar__user-info">
          <strong>{usuario?.nome}</strong>
          <span>{usuario?.email}</span>
        </div>
      </div>

      <nav className="sidebar__nav">
        <Link to="/" className={classeDoLink(pathname === '/')}>
          Dashboard
        </Link>

        <Link to="/solicitacoes" className={classeDoLink(emSolicitacoes)}>
          Solicitações
        </Link>

        {PERFIS_DA_FILA.includes(usuario?.perfil) && (
          <Link to="/fila" className={classeDoLink(pathname === '/fila')}>
            Tarefas
          </Link>
        )}

        <Link to="/solicitacoes?status=concluida" className={classeDoLink(noHistorico)}>
          Histórico
        </Link>

        {usuario?.perfil === 'administrador' && (
          <>
            <Link to="/relatorios" className={classeDoLink(pathname === '/relatorios')}>
              Relatórios
            </Link>
            <Link to="/usuarios" className={classeDoLink(pathname.startsWith('/usuarios'))}>
              Usuários
            </Link>
            <Link to="/tipos-processo" className={classeDoLink(pathname === '/tipos-processo')}>
              Tipos de processo
            </Link>
          </>
        )}

        {ITENS_FUTUROS.map((item) => (
          <span key={item.key} className="sidebar__link is-disabled" title="Em breve">
            {item.label}
          </span>
        ))}
      </nav>

      <button type="button" className="sidebar__logout" onClick={logout}>
        Desconectar
      </button>
    </aside>
  );
}
