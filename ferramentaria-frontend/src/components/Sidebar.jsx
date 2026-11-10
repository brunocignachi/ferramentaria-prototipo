import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotificacoes } from '../context/NotificacoesContext';
import Icone from './Icone';
import './Sidebar.css';

// Itens do protótipo que ainda não têm tela: ficam desativados para não
// simular uma funcionalidade que não existe.
const ITENS_FUTUROS = [];

// Número de não lidas ao lado do item; acima de 99 mostra "99+".
function Contador({ valor, className = '' }) {
  if (!valor) return null;
  return (
    <span className={`contador ${className}`.trim()} aria-label={`${valor} não lidas`}>
      {valor > 99 ? '99+' : valor}
    </span>
  );
}

// Itens visíveis para o perfil, com a marcação do item da página atual.
function itensDoMenu(perfil, pathname, search) {
  const noHistorico = pathname === '/solicitacoes' && search === '?status=concluida';
  const itens = [
    { chave: 'inicio', para: '/', rotulo: 'Dashboard', curto: 'Início', ativo: pathname === '/' },
    {
      chave: 'solicitacoes',
      para: '/solicitacoes',
      rotulo: 'Solicitações',
      ativo: pathname.startsWith('/solicitacoes') && !noHistorico,
    },
  ];
  if (perfil === 'operador' || perfil === 'administrador') {
    itens.push({ chave: 'tarefas', para: '/fila', rotulo: 'Tarefas', ativo: pathname === '/fila' });
  }
  itens.push({ chave: 'historico', para: '/solicitacoes?status=concluida', rotulo: 'Histórico', ativo: noHistorico });
  if (perfil === 'administrador') {
    itens.push(
      { chave: 'relatorios', para: '/relatorios', rotulo: 'Relatórios', ativo: pathname === '/relatorios' },
      { chave: 'usuarios', para: '/usuarios', rotulo: 'Usuários', ativo: pathname.startsWith('/usuarios') },
      { chave: 'tipos', para: '/tipos-processo', rotulo: 'Tipos de processo', ativo: pathname === '/tipos-processo' }
    );
  }
  itens.push(
    { chave: 'sino', para: '/notificacoes', rotulo: 'Notificações', ativo: pathname === '/notificacoes', contador: true },
    { chave: 'configuracoes', para: '/configuracoes', rotulo: 'Configurações', ativo: pathname === '/configuracoes' },
    { chave: 'ajuda', para: '/ajuda', rotulo: 'Ajuda', ativo: pathname === '/ajuda' }
  );
  return itens;
}

// No celular, a barra de baixo mostra os três atalhos mais usados pelo perfil;
// o restante fica na gaveta "Mais".
const ATALHOS_POR_PERFIL = {
  operador: ['inicio', 'tarefas', 'solicitacoes'],
  administrador: ['inicio', 'solicitacoes', 'tarefas'],
  solicitante: ['inicio', 'solicitacoes', 'historico'],
};

function Gaveta({ itens, usuario, naoLidas, onFechar, onSair }) {
  const janela = useRef(null);

  useEffect(() => {
    janela.current.showModal();
  }, []);

  return (
    <dialog
      ref={janela}
      className="gaveta"
      aria-label="Menu"
      onCancel={(event) => {
        event.preventDefault();
        onFechar();
      }}
      // Toque fora do painel (no fundo escurecido) fecha a gaveta.
      onClick={(event) => {
        if (event.target === janela.current) onFechar();
      }}
    >
      <div className="gaveta__painel">
        <div className="gaveta__alca" aria-hidden="true" />
        <div className="sidebar__user gaveta__usuario">
          <div className="sidebar__avatar">{usuario?.nome?.charAt(0).toUpperCase() ?? '?'}</div>
          <div className="sidebar__user-info">
            <strong>{usuario?.nome}</strong>
            <span>{usuario?.email}</span>
          </div>
        </div>
        <nav className="gaveta__nav">
          {itens.map((item) => (
            <Link
              key={item.chave}
              to={item.para}
              className={`gaveta__link ${item.ativo ? 'is-active' : ''}`}
              aria-current={item.ativo ? 'page' : undefined}
              onClick={onFechar}
            >
              <Icone nome={item.chave} />
              {item.rotulo}
              {item.contador && <Contador valor={naoLidas} />}
            </Link>
          ))}
        </nav>
        <div className="gaveta__rodape">
          <button type="button" className="gaveta__link gaveta__sair" onClick={onSair}>
            <Icone nome="sair" />
            Desconectar
          </button>
          <button type="button" className="btn" onClick={onFechar}>
            Fechar
          </button>
        </div>
      </div>
    </dialog>
  );
}

export default function Sidebar() {
  const { usuario, logout } = useAuth();
  const { pathname, search } = useLocation();
  const [gavetaAberta, setGavetaAberta] = useState(false);
  const { naoLidas } = useNotificacoes();

  const itens = itensDoMenu(usuario?.perfil, pathname, search);
  const atalhos = (ATALHOS_POR_PERFIL[usuario?.perfil] ?? ['inicio', 'solicitacoes'])
    .map((chave) => itens.find((item) => item.chave === chave))
    .filter(Boolean);
  const ativoForaDosAtalhos = itens.some((item) => item.ativo && !atalhos.includes(item));

  return (
    <>
      {/* Computador: barra lateral fixa */}
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
          {itens.map((item) => (
            <Link
              key={item.chave}
              to={item.para}
              className={`sidebar__link ${item.ativo ? 'is-active' : ''}`}
              aria-current={item.ativo ? 'page' : undefined}
            >
              {item.rotulo}
              {item.contador && <Contador valor={naoLidas} />}
            </Link>
          ))}

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

      {/* Celular: barra superior compacta e abas na parte de baixo */}
      <header className="barra-movel">
        <span className="barra-movel__marca">Ferramentaria</span>
        <div className="barra-movel__acoes">
          <Link
            to="/notificacoes"
            className="barra-movel__sino"
            aria-label={naoLidas ? `Notificações, ${naoLidas} não lidas` : 'Notificações'}
          >
            <Icone nome="sino" />
            <Contador valor={naoLidas} className="contador--sobre" />
          </Link>
          <button
            type="button"
            className="barra-movel__avatar"
            aria-label={`Menu de ${usuario?.nome ?? 'usuário'}`}
            onClick={() => setGavetaAberta(true)}
          >
            {usuario?.nome?.charAt(0).toUpperCase() ?? '?'}
          </button>
        </div>
      </header>

      <nav className="abas-movel" aria-label="Navegação principal">
        {atalhos.map((item) => (
          <Link
            key={item.chave}
            to={item.para}
            className={`abas-movel__item ${item.ativo ? 'is-active' : ''}`}
            aria-current={item.ativo ? 'page' : undefined}
          >
            <Icone nome={item.chave} />
            <span>{item.curto ?? item.rotulo}</span>
          </Link>
        ))}
        <button
          type="button"
          className={`abas-movel__item ${ativoForaDosAtalhos ? 'is-active' : ''}`}
          aria-haspopup="dialog"
          onClick={() => setGavetaAberta(true)}
        >
          <Icone nome="mais" />
          <span>Mais</span>
        </button>
      </nav>

      {gavetaAberta && (
        <Gaveta
          itens={itens}
          usuario={usuario}
          naoLidas={naoLidas}
          onFechar={() => setGavetaAberta(false)}
          onSair={logout}
        />
      )}
    </>
  );
}
