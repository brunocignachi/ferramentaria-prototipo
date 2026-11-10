import { useState } from 'react';
import { apiRequest } from '../api/client';
import { useConfirmar } from '../context/ConfirmacaoContext';
import { STATUS_ETAPA_LABEL, formatarDataHora, podeAtuarNaEtapa } from '../utils/solicitacao';

// Roteiro de fabricação da peça (RF04, RF05). A ordem é própria de cada
// solicitação, e o mesmo processo pode se repetir (ex.: torno, fresa, torno).
export default function RoteiroCard({ solicitacao, usuario, podeGerenciar, tipos, operadores, onAlterado }) {
  const [idTipo, setIdTipo] = useState('');
  const [idOperador, setIdOperador] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const confirmar = useConfirmar();

  const { processos: etapas } = solicitacao;
  const ativa = solicitacao.status === 'aberta' || solicitacao.status === 'em_andamento';
  const podeEditar = podeGerenciar && ativa;
  const pendentes = etapas.filter((etapa) => etapa.status === 'pendente');
  const idEtapaDaVez = ativa
    ? etapas.find((etapa) => etapa.status === 'pendente' || etapa.status === 'em_andamento')?.id_processo
    : undefined;
  const tiposAtivos = tipos.filter((tipo) => tipo.ativo);

  async function executar(requisicao) {
    setOcupado(true);
    setErro('');
    try {
      await requisicao();
      await onAlterado();
    } catch (err) {
      setErro(err.message);
    } finally {
      setOcupado(false);
    }
  }

  function adicionarEtapa(event) {
    event.preventDefault();
    executar(async () => {
      await apiRequest(`/solicitacoes/${solicitacao.id_solicitacao}/processos`, {
        method: 'POST',
        body: {
          id_tipo_processo: Number(idTipo),
          ...(idOperador ? { id_operador: Number(idOperador) } : {}),
        },
      });
      setIdTipo('');
      setIdOperador('');
    });
  }

  function moverEtapa(idProcesso, deslocamento) {
    const ids = pendentes.map((etapa) => etapa.id_processo);
    const origem = ids.indexOf(idProcesso);
    const destino = origem + deslocamento;
    [ids[origem], ids[destino]] = [ids[destino], ids[origem]];
    executar(() =>
      apiRequest(`/solicitacoes/${solicitacao.id_solicitacao}/processos/ordem`, {
        method: 'PUT',
        body: { processos: ids },
      })
    );
  }

  function atribuirOperador(idProcesso, novoOperador) {
    executar(() =>
      apiRequest(`/processos/${idProcesso}/atribuir`, {
        method: 'PATCH',
        body: { id_operador: Number(novoOperador) },
      })
    );
  }

  async function removerEtapa(etapa) {
    const confirmado = await confirmar({
      titulo: 'Remover etapa',
      mensagem: `A etapa ${etapa.ordem_execucao} (${etapa.nome_tipo_processo}) sairá do roteiro e as seguintes sobem uma posição.`,
      textoConfirmar: 'Remover etapa',
      perigo: true,
    });
    if (!confirmado) return;
    executar(() => apiRequest(`/processos/${etapa.id_processo}`, { method: 'DELETE' }));
  }

  function alterarStatus(idProcesso, acao) {
    executar(() => apiRequest(`/processos/${idProcesso}/${acao}`, { method: 'PATCH' }));
  }

  return (
    <section className="card">
      <h2>Roteiro</h2>

      {ativa && etapas.length === 0 && (
        <p className="aviso">
          Esta solicitação ainda não tem etapas, então não aparece na fila dos operadores.
          {podeEditar ? ' Adicione a primeira abaixo.' : ''}
        </p>
      )}

      {etapas.length > 0 && (
        <ol className="roteiro">
          {etapas.map((etapa) => {
            const indicePendente = pendentes.findIndex((p) => p.id_processo === etapa.id_processo);
            const ehPendente = indicePendente !== -1;
            const daVez = etapa.id_processo === idEtapaDaVez;
            const podeAtuar = podeAtuarNaEtapa(usuario, etapa);

            return (
              <li key={etapa.id_processo} className={`roteiro__etapa ${daVez ? 'roteiro__etapa--atual' : ''}`}>
                <span className="roteiro__ordem">{etapa.ordem_execucao}</span>

                <div className="roteiro__info">
                  <strong>{etapa.nome_tipo_processo}</strong>
                  <small>
                    {STATUS_ETAPA_LABEL[etapa.status]}
                    {daVez ? ' · etapa da vez' : ''}
                    {' · '}Operador: {etapa.nome_operador ?? 'não atribuído'}
                  </small>
                  {etapa.data_inicio && <small>Início: {formatarDataHora(etapa.data_inicio)}</small>}
                  {etapa.data_conclusao && <small>Conclusão: {formatarDataHora(etapa.data_conclusao)}</small>}
                </div>

                <div className="roteiro__controles">
                  {podeEditar && ehPendente && (
                    <>
                      <select
                        aria-label={`Operador da etapa ${etapa.ordem_execucao}`}
                        value={etapa.id_operador ?? ''}
                        disabled={ocupado}
                        onChange={(e) => atribuirOperador(etapa.id_processo, e.target.value)}
                      >
                        <option value="" disabled>
                          Atribuir operador
                        </option>
                        {operadores.map((op) => (
                          <option key={op.id_usuario} value={op.id_usuario}>
                            {op.nome}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn btn--icone"
                        aria-label={`Subir etapa ${etapa.ordem_execucao}`}
                        disabled={ocupado || indicePendente === 0}
                        onClick={() => moverEtapa(etapa.id_processo, -1)}
                      >
                        {'↑︎'}
                      </button>
                      <button
                        type="button"
                        className="btn btn--icone"
                        aria-label={`Descer etapa ${etapa.ordem_execucao}`}
                        disabled={ocupado || indicePendente === pendentes.length - 1}
                        onClick={() => moverEtapa(etapa.id_processo, 1)}
                      >
                        {'↓︎'}
                      </button>
                    </>
                  )}

                  {ativa && ehPendente && usuario?.perfil === 'administrador' && (
                    <button
                      type="button"
                      className="btn btn--perigo"
                      aria-label={`Remover etapa ${etapa.ordem_execucao}`}
                      disabled={ocupado}
                      onClick={() => removerEtapa(etapa)}
                    >
                      Remover
                    </button>
                  )}

                  {daVez && etapa.status === 'pendente' && etapa.id_operador && podeAtuar && (
                    <button
                      type="button"
                      className="btn btn--primario"
                      disabled={ocupado}
                      onClick={() => alterarStatus(etapa.id_processo, 'iniciar')}
                    >
                      Iniciar
                    </button>
                  )}
                  {etapa.status === 'em_andamento' && ativa && podeAtuar && (
                    <button
                      type="button"
                      className="btn btn--primario"
                      disabled={ocupado}
                      onClick={() => alterarStatus(etapa.id_processo, 'concluir')}
                    >
                      Concluir
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {!ativa && etapas.length === 0 && <p className="card__empty">Nenhuma etapa registrada.</p>}

      {erro && <p className="field-error">{erro}</p>}

      {podeEditar && (
        <form className="roteiro__adicionar" onSubmit={adicionarEtapa} noValidate>
          <select
            aria-label="Processo da nova etapa"
            value={idTipo}
            onChange={(e) => setIdTipo(e.target.value)}
          >
            <option value="" disabled>
              Processo
            </option>
            {tiposAtivos.map((tipo) => (
              <option key={tipo.id_tipo_processo} value={tipo.id_tipo_processo}>
                {tipo.nome}
              </option>
            ))}
          </select>
          <select
            aria-label="Operador da nova etapa"
            value={idOperador}
            onChange={(e) => setIdOperador(e.target.value)}
          >
            <option value="">Operador (opcional)</option>
            {operadores.map((op) => (
              <option key={op.id_usuario} value={op.id_usuario}>
                {op.nome}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn--primario" disabled={ocupado || !idTipo}>
            Adicionar etapa
          </button>
        </form>
      )}
    </section>
  );
}
