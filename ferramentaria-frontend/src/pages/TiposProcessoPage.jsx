import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api/client';
import { useConfirmar } from '../context/ConfirmacaoContext';
import { useValidacao } from '../hooks/useValidacao';
import Sidebar from '../components/Sidebar';
import CampoErro from '../components/CampoErro';
import { LIMITES, erroTexto } from '../utils/validacao';
import './DashboardPage.css';
import '../styles/Solicitacoes.css';

// Formulário de criação e de edição de um tipo de processo.
function FormularioTipo({ inicial, textoEnviar, onEnviar, onCancelar, ocupado }) {
  const [campos, setCampos] = useState(inicial);
  const erros = {
    nome: erroTexto(campos.nome, { rotulo: 'Nome', max: LIMITES.nomeTipo, obrigatorio: true }),
    descricao: erroTexto(campos.descricao, { rotulo: 'Descrição', max: LIMITES.descricaoTipo }),
  };
  const { erroDe, podeEnviar, reiniciar } = useValidacao(erros, campos);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!podeEnviar()) return;
    if (await onEnviar(campos)) {
      setCampos(inicial);
      reiniciar();
    }
  }

  return (
    <form className={onCancelar ? 'linha-edicao' : undefined} onSubmit={handleSubmit} noValidate>
      <div className="form-campos">
        <label>
          Nome
          <input
            value={campos.nome}
            aria-invalid={!!erroDe('nome')}
            onChange={(e) => setCampos({ ...campos, nome: e.target.value })}
          />
          <CampoErro mensagem={erroDe('nome')} />
        </label>
        <label>
          Descrição (opcional)
          <input
            value={campos.descricao}
            aria-invalid={!!erroDe('descricao')}
            onChange={(e) => setCampos({ ...campos, descricao: e.target.value })}
          />
          <CampoErro mensagem={erroDe('descricao')} />
        </label>
      </div>
      <div className="form-acoes">
        <button type="submit" className="btn btn--primario" disabled={ocupado}>
          {textoEnviar}
        </button>
        {onCancelar && (
          <button type="button" className="btn" disabled={ocupado} onClick={onCancelar}>
            Voltar sem salvar
          </button>
        )}
      </div>
    </form>
  );
}

// Cadastro dos tipos de processo produtivo (RF11, UC16, E11). Um tipo que nunca
// entrou em um roteiro pode ser excluído; os já usados só podem ser
// desativados, porque as etapas registradas continuam apontando para eles.
export default function TiposProcessoPage() {
  const confirmar = useConfirmar();
  const [tipos, setTipos] = useState([]);
  const [idEmEdicao, setIdEmEdicao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    try {
      setTipos(await apiRequest('/tipos-processo'));
      setErro('');
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Devolve true quando a ação deu certo.
  async function executar(acao) {
    setOcupado(true);
    setErro('');
    try {
      await acao();
      await carregar();
      return true;
    } catch (err) {
      setErro(err.message);
      return false;
    } finally {
      setOcupado(false);
    }
  }

  function alternarAtivo(tipo) {
    executar(() =>
      apiRequest(`/tipos-processo/${tipo.id_tipo_processo}`, { method: 'PATCH', body: { ativo: !tipo.ativo } })
    );
  }

  async function excluir(tipo) {
    const confirmado = await confirmar({
      titulo: 'Excluir tipo de processo',
      mensagem: `"${tipo.nome}" será excluído permanentemente e deixará de aparecer na lista.`,
      textoConfirmar: 'Excluir',
      perigo: true,
    });
    if (!confirmado) return;
    executar(() => apiRequest(`/tipos-processo/${tipo.id_tipo_processo}`, { method: 'DELETE' }));
  }

  return (
    <div className="dashboard">
      <Sidebar />

      <main className="dashboard__main">
        <header>
          <h1 className="page-title">Tipos de processo</h1>
          <p className="page-subtitle">
            Processos disponíveis para montar o roteiro das peças. Os que já foram usados em algum roteiro não podem
            ser excluídos, só desativados.
          </p>
        </header>

        {erro && <p className="dashboard__error">{erro}</p>}

        <section className="card">
          <h2>Novo tipo de processo</h2>
          <FormularioTipo
            inicial={{ nome: '', descricao: '' }}
            textoEnviar="Adicionar tipo"
            ocupado={ocupado}
            onEnviar={(campos) => executar(() => apiRequest('/tipos-processo', { method: 'POST', body: campos }))}
          />
        </section>

        <section className="card">
          <h2>Cadastrados</h2>
          {carregando ? (
            <p className="card__empty">Carregando...</p>
          ) : tipos.length === 0 ? (
            <p className="card__empty">Nenhum tipo de processo cadastrado.</p>
          ) : (
            <ul className="linhas">
              {tipos.map((tipo) => (
                <li key={tipo.id_tipo_processo}>
                  {idEmEdicao === tipo.id_tipo_processo ? (
                    <FormularioTipo
                      inicial={{ nome: tipo.nome, descricao: tipo.descricao ?? '' }}
                      textoEnviar="Salvar alterações"
                      ocupado={ocupado}
                      onCancelar={() => setIdEmEdicao(null)}
                      onEnviar={async (campos) => {
                        const salvo = await executar(() =>
                          apiRequest(`/tipos-processo/${tipo.id_tipo_processo}`, { method: 'PATCH', body: campos })
                        );
                        if (salvo) setIdEmEdicao(null);
                        return salvo;
                      }}
                    />
                  ) : (
                    <div className="linha">
                      <div className="linha__info">
                        <strong>{tipo.nome}</strong>
                        <small>
                          {tipo.descricao || 'Sem descrição'}
                          {tipo.em_uso ? ' · usado em roteiros' : ''}
                        </small>
                      </div>
                      <span className={`badge ${tipo.ativo ? 'badge--concluida' : ''}`}>
                        {tipo.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                      <div className="linha__acoes">
                        <button
                          type="button"
                          className="btn"
                          disabled={ocupado}
                          onClick={() => setIdEmEdicao(tipo.id_tipo_processo)}
                        >
                          Editar
                        </button>
                        <button type="button" className="btn" disabled={ocupado} onClick={() => alternarAtivo(tipo)}>
                          {tipo.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                        {!tipo.em_uso && (
                          <button
                            type="button"
                            className="btn btn--perigo"
                            disabled={ocupado}
                            onClick={() => excluir(tipo)}
                          >
                            Excluir
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
