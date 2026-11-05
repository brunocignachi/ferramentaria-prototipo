import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

// Itens meramente ilustrativos (fora do escopo das 3 telas funcionais
// pedidas inicialmente) — mantidos no visual do protótipo, mas desativados,
// para não simular uma funcionalidade que ainda não existe.
const ITENS_FUTUROS = [
  { key: 'solicitacoes', label: 'Solicitações' },
  { key: 'tarefas', label: 'Tarefas' },
  { key: 'historico', label: 'Histórico' },
  { key: 'configuracoes', label: 'Configurações' },
  { key: 'ajuda', label: 'Ajuda' },
];

export default function Sidebar() {
  const { usuario, logout } = useAuth();
  const location = useLocation();

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
        <Link to="/" className={`sidebar__link ${location.pathname === '/' ? 'is-active' : ''}`}>
          Dashboard
        </Link>

        {usuario?.perfil === 'administrador' && (
          <Link
            to="/usuarios/novo"
            className={`sidebar__link ${location.pathname === '/usuarios/novo' ? 'is-active' : ''}`}
          >
            Cadastrar usuário
          </Link>
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
