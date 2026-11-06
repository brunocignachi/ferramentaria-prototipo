import { useState } from 'react';
import { apiRequest } from '../api/client';

/**
 * Formulário de criação rápida de solicitação, acionado pelo botão
 * "+ adicionar tarefa" do Dashboard (RF01 — POST /api/solicitacoes).
 * Visível apenas para solicitante/administrador, que são os únicos
 * perfis autorizados pela rota no backend (solicitacaoRoutes.js).
 */
export default function NovaSolicitacaoForm({ onCriado }) {
  const [numeroDesenho, setNumeroDesenho] = useState('');
  const [descricao, setDescricao] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [prioridade, setPrioridade] = useState('normal');
  const [dataPrazo, setDataPrazo] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const criada = await apiRequest('/solicitacoes', {
        method: 'POST',
        body: {
          numero_desenho: numeroDesenho,
          descricao: descricao || undefined,
          quantidade: Number(quantidade),
          prioridade,
          data_prazo: dataPrazo,
        },
      });
      setNumeroDesenho('');
      setDescricao('');
      setQuantidade(1);
      setPrioridade('normal');
      setDataPrazo('');
      onCriado(criada);
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <div className="task-form__row">
        <input
          placeholder="Número do desenho"
          value={numeroDesenho}
          onChange={(e) => setNumeroDesenho(e.target.value)}
          required
        />
        <input
          type="number"
          min="1"
          placeholder="Quantidade"
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
          required
        />
      </div>

      <input
        placeholder="Descrição"
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
      />

      <div className="task-form__row">
        <select value={prioridade} onChange={(e) => setPrioridade(e.target.value)}>
          <option value="urgente">Urgente</option>
          <option value="alta">Alta</option>
          <option value="normal">Normal</option>
          <option value="baixa">Baixa</option>
        </select>
        <input
          type="date"
          value={dataPrazo}
          onChange={(e) => setDataPrazo(e.target.value)}
          required
        />
      </div>

      {erro && <p className="field-error">{erro}</p>}

      <button type="submit" className="btn-primary" disabled={enviando}>
        {enviando ? 'Salvando...' : 'Salvar solicitação'}
      </button>
    </form>
  );
}
