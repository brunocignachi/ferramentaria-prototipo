import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import './DashboardPage.css';
import '../styles/Solicitacoes.css';

// Guia curto de uso, por perfil. O conteúdo do próprio perfil vem primeiro.
const GUIAS = {
  solicitante: {
    titulo: 'Solicitante',
    resumo: 'Abre pedidos de peças e acompanha o andamento.',
    passos: [
      ['Abrir uma solicitação', 'No Dashboard, clique em "+ adicionar tarefa". Informe a descrição da peça, o número do desenho, a quantidade, a prioridade e o prazo.'],
      ['Montar o roteiro', 'Ainda no cadastro, escolha os processos na ordem em que a peça vai passar (ex.: torno → fresa → torno) e, se souber, o operador de cada etapa. O roteiro também pode ser ajustado depois, na página da solicitação.'],
      ['Anexar desenhos', 'Envie o desenho técnico em PDF ou imagem. Ele pode ser visto no próprio site, sem download.'],
      ['Acompanhar', 'Em Solicitações, o selo colorido mostra se a peça está a fazer, em progresso ou completa. Abra a peça para ver o roteiro e o histórico completo.'],
      ['Cancelar', 'Enquanto a peça não estiver concluída, use "Cancelar solicitação" na página dela. Os operadores envolvidos são avisados.'],
    ],
  },
  operador: {
    titulo: 'Operador',
    resumo: 'Executa as etapas do roteiro na ordem de prioridade.',
    passos: [
      ['Ver o que fazer', 'A tela Tarefas lista só a etapa da vez de cada peça atribuída a você, já ordenada por prioridade e prazo. Desmarque "Apenas minhas etapas" para ver a fila completa.'],
      ['Iniciar e concluir', 'Clique em "Iniciar" ao começar e em "Concluir" ao terminar. A etapa seguinte do roteiro só libera depois que a anterior é concluída.'],
      ['Consultar o desenho', 'Abra a peça pelo nome para ver os desenhos anexados e as observações do solicitante.'],
      ['Notificações', 'Você recebe um aviso quando é incluído em uma solicitação e quando uma peça em que trabalha é cancelada. O sino mostra quantos avisos não foram lidos.'],
    ],
  },
  administrador: {
    titulo: 'Administrador',
    resumo: 'Cadastra usuários e processos, acompanha tudo e gera relatórios.',
    passos: [
      ['Usuários', 'Em Usuários, cadastre pessoas com o perfil certo. Quem já tem registros não pode ser excluído, só desativado; a desativação vale na hora.'],
      ['Tipos de processo', 'Cadastre os processos da ferramentaria (torno, fresa, retífica...). Um tipo já usado em roteiros só pode ser desativado.'],
      ['Roteiros', 'O administrador pode editar qualquer solicitação: adicionar, reordenar, atribuir e remover etapas pendentes.'],
      ['Relatórios', 'Filtre por período, status e operador. O On-Time Delivery mostra a porcentagem de peças concluídas dentro do prazo. Dá para imprimir ou baixar em Excel.'],
      ['Indicadores', 'O Dashboard do administrador mostra as peças em atraso, as que vencem na semana, as etapas sem operador e o OTD dos últimos 30 dias.'],
    ],
  },
};

const ORDEM_PERFIS = ['solicitante', 'operador', 'administrador'];

const STATUS = [
  ['A fazer', 'badge--aberta', 'Solicitação aberta, nenhuma etapa iniciada.'],
  ['Em progresso', 'badge--em_andamento', 'Pelo menos uma etapa do roteiro já começou.'],
  ['Completo', 'badge--concluida', 'Todas as etapas foram concluídas; a peça está pronta.'],
  ['Cancelada', 'badge--cancelada', 'Encerrada antes de ficar pronta. Fica no histórico.'],
];

export default function AjudaPage() {
  const { usuario } = useAuth();
  const perfis = [usuario?.perfil, ...ORDEM_PERFIS.filter((p) => p !== usuario?.perfil)].filter((p) => GUIAS[p]);

  return (
    <div className="dashboard">
      <Sidebar />

      <main className="dashboard__main">
        <header>
          <h1 className="page-title">Ajuda</h1>
          <p className="page-subtitle">Como o sistema funciona, começando pelo seu perfil.</p>
        </header>

        {perfis.map((perfil, indice) => (
          <section key={perfil} className="card">
            <h2>
              {GUIAS[perfil].titulo}
              {indice === 0 && <span className="badge badge--concluida ajuda__seu-perfil">seu perfil</span>}
            </h2>
            <p className="ajuda__resumo">{GUIAS[perfil].resumo}</p>
            <ol className="ajuda__passos">
              {GUIAS[perfil].passos.map(([titulo, texto]) => (
                <li key={titulo}>
                  <strong>{titulo}</strong>
                  <span>{texto}</span>
                </li>
              ))}
            </ol>
          </section>
        ))}

        <section className="card">
          <h2>Status das peças</h2>
          <ul className="ajuda__status">
            {STATUS.map(([rotulo, classe, texto]) => (
              <li key={rotulo}>
                <span className={`badge ${classe}`}>{rotulo}</span>
                <span>{texto}</span>
              </li>
            ))}
          </ul>
          <p className="ajuda__resumo">
            A ordem das listas segue a prioridade (Urgente, Alta, Normal, Baixa) e, dentro dela, o prazo mais próximo.
          </p>
        </section>

        <section className="card">
          <h2>Dúvidas comuns</h2>
          <dl className="ajuda__faq">
            <dt>Esqueci a senha.</dt>
            <dd>Peça a um administrador para definir uma nova em Usuários → Editar. Depois, troque-a em <Link to="/configuracoes">Configurações</Link>.</dd>
            <dt>Minha etapa não aparece em Tarefas.</dt>
            <dd>A etapa só entra na fila quando chega a vez dela no roteiro e quando está atribuída a você. Confira a peça e o filtro "Apenas minhas etapas".</dd>
            <dt>Como uso o site no celular?</dt>
            <dd>Abra o mesmo endereço no navegador do celular, na mesma rede Wi-Fi. O menu fica nas abas de baixo; o restante está em "Mais".</dd>
            <dt>Modo noturno?</dt>
            <dd>Em <Link to="/configuracoes">Configurações</Link>, escolha Claro, Escuro ou Automático.</dd>
          </dl>
        </section>
      </main>
    </div>
  );
}
