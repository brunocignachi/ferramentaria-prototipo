import { useState } from 'react';
import { apiRequest } from '../api/client';
import { PRIORIDADE_LABEL, dataParaInput } from '../utils/solicitacao';

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

  function alterar(campo, valor) {
    setCampos((atuais) => ({ ...atuais, [campo]: valor }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErro('');
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
    <form onSubmit={handleSubmit}>
      <div className="form-campos">
        <label>
          Número do desenho
          <input
            value={campos.numero_desenho}
            onChange={(e) => alterar('numero_desenho', e.target.value)}
            required
          />
        </label>
        <label>
          Quantidade
          <input
            type="number"
            min="1"
            value={campos.quantidade}
            onChange={(e) => alterar('quantidade', e.target.value)}
            required
          />
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
            value={campos.data_prazo}
            onChange={(e) => alterar('data_prazo', e.target.value)}
            required
          />
        </label>
        <label className="form-campo--largo">
          Descrição
          <textarea rows="2" value={campos.descricao} onChange={(e) => alterar('descricao', e.target.value)} />
        </label>
        <label className="form-campo--largo">
          Observações
          <textarea rows="2" value={campos.observacoes} onChange={(e) => alterar('observacoes', e.target.value)} />
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
