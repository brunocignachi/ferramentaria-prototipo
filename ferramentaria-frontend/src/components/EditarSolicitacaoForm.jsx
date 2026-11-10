import { useState } from 'react';
import { apiRequest } from '../api/client';
import { PRIORIDADE_LABEL, dataParaInput } from '../utils/solicitacao';
import { DATA_MAXIMA, LIMITES, erroData, erroQuantidade, erroTexto } from '../utils/validacao';
import { useValidacao } from '../hooks/useValidacao';
import CampoErro from './CampoErro';

// Edição dos dados da solicitação (RF02, UC03, UC05).
export default function EditarSolicitacaoForm({ solicitacao, onSalvo, onCancelar }) {
  const [campos, setCampos] = useState({
    numero_desenho: solicitacao.numero_desenho,
    descricao: solicitacao.descricao ?? '',
    quantidade: solicitacao.quantidade,
    prioridade: solicitacao.prioridade,
    data_prazo: dataParaInput(solicitacao.data_prazo),
    observacoes: solicitacao.observacoes ?? '',
  });
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const erros = {
    numero_desenho: erroTexto(campos.numero_desenho, {
      rotulo: 'Número do desenho',
      max: LIMITES.numeroDesenho,
      obrigatorio: true,
    }),
    quantidade: erroQuantidade(campos.quantidade),
    data_prazo: erroData(campos.data_prazo, 'Prazo'),
    descricao: erroTexto(campos.descricao, { rotulo: 'Descrição', max: LIMITES.textoLongo }),
    observacoes: erroTexto(campos.observacoes, { rotulo: 'Observações', max: LIMITES.textoLongo }),
  };
  const { erroDe, podeEnviar } = useValidacao(erros, campos);

  function alterar(campo, valor) {
    setCampos((atuais) => ({ ...atuais, [campo]: valor }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErro('');
    if (!podeEnviar()) return;
    setEnviando(true);
    try {
      await apiRequest(`/solicitacoes/${solicitacao.id_solicitacao}`, {
        method: 'PATCH',
        body: { ...campos, quantidade: Number(campos.quantidade) },
      });
      onSalvo();
    } catch (err) {
      setErro(err.message);
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="form-campos">
        <label>
          Número do desenho
          <input
            value={campos.numero_desenho}
            aria-invalid={!!erroDe('numero_desenho')}
            onChange={(e) => alterar('numero_desenho', e.target.value)}
          />
          <CampoErro mensagem={erroDe('numero_desenho')} />
        </label>
        <label>
          Quantidade
          <input
            type="number"
            min="1"
            max={LIMITES.quantidadeMaxima}
            value={campos.quantidade}
            aria-invalid={!!erroDe('quantidade')}
            onChange={(e) => alterar('quantidade', e.target.value)}
          />
          <CampoErro mensagem={erroDe('quantidade')} />
        </label>
        <label>
          Prioridade
          <select value={campos.prioridade} onChange={(e) => alterar('prioridade', e.target.value)}>
            {Object.entries(PRIORIDADE_LABEL).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </label>
        <label>
          Prazo
          <input
            type="date"
            max={DATA_MAXIMA}
            value={campos.data_prazo}
            aria-invalid={!!erroDe('data_prazo')}
            onChange={(e) => alterar('data_prazo', e.target.value)}
          />
          <CampoErro mensagem={erroDe('data_prazo')} />
        </label>
        <label className="form-campo--largo">
          Descrição
          <textarea
            rows="2"
            value={campos.descricao}
            aria-invalid={!!erroDe('descricao')}
            onChange={(e) => alterar('descricao', e.target.value)}
          />
          <CampoErro mensagem={erroDe('descricao')} />
        </label>
        <label className="form-campo--largo">
          Observações
          <textarea
            rows="2"
            value={campos.observacoes}
            aria-invalid={!!erroDe('observacoes')}
            onChange={(e) => alterar('observacoes', e.target.value)}
          />
          <CampoErro mensagem={erroDe('observacoes')} />
        </label>
      </div>

      {erro && <p className="field-error">{erro}</p>}

      <div className="form-acoes">
        <button type="submit" className="btn btn--primario" disabled={enviando}>
          {enviando ? 'Salvando...' : 'Salvar alterações'}
        </button>
        <button type="button" className="btn" onClick={onCancelar} disabled={enviando}>
          Voltar sem salvar
        </button>
      </div>
    </form>
  );
}
