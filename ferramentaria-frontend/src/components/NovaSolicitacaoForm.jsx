import { useEffect, useRef, useState } from 'react';
import { apiRequest, apiUpload } from '../api/client';
import { FORMATOS_ANEXO, formatarTamanho, validarArquivo } from '../utils/solicitacao';

/**
 * Formulário de nova solicitação, acionado pelo botão "+ adicionar tarefa" do
 * Dashboard (RF01, RF03, RF04). Reúne os dados, o roteiro e os desenhos técnicos.
 * Visível apenas para solicitante/administrador, os perfis autorizados pela
 * rota no backend (solicitacaoRoutes.js).
 */
export default function NovaSolicitacaoForm({ onCriado }) {
  const [numeroDesenho, setNumeroDesenho] = useState('');
  const [descricao, setDescricao] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [prioridade, setPrioridade] = useState('normal');
  const [dataPrazo, setDataPrazo] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const [tipos, setTipos] = useState([]);
  const [operadores, setOperadores] = useState([]);
  const [etapas, setEtapas] = useState([]);
  const [idTipo, setIdTipo] = useState('');
  const [idOperador, setIdOperador] = useState('');
  const proximaChave = useRef(0);

  const [arquivos, setArquivos] = useState([]);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    Promise.all([apiRequest('/tipos-processo'), apiRequest('/usuarios/operadores')])
      .then(([listaTipos, listaOperadores]) => {
        setTipos(listaTipos.filter((tipo) => tipo.ativo));
        setOperadores(listaOperadores);
      })
      .catch((err) => setErro(err.message));
  }, []);

  function incluirEtapa() {
    const tipo = tipos.find((t) => t.id_tipo_processo === Number(idTipo));
    if (!tipo) return;
    const operador = operadores.find((op) => op.id_usuario === Number(idOperador));
    proximaChave.current += 1;
    setEtapas((atuais) => [...atuais, { chave: proximaChave.current, tipo, operador }]);
    setIdTipo('');
    setIdOperador('');
  }

  function moverEtapa(indice, deslocamento) {
    setEtapas((atuais) => {
      const novas = [...atuais];
      [novas[indice], novas[indice + deslocamento]] = [novas[indice + deslocamento], novas[indice]];
      return novas;
    });
  }

  function selecionarArquivos(event) {
    const selecionados = [...event.target.files];
    event.target.value = '';
    const problema = selecionados.map(validarArquivo).find(Boolean);
    setErro(problema ?? '');
    setArquivos((atuais) => [...atuais, ...selecionados.filter((arquivo) => !validarArquivo(arquivo))]);
  }

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
          observacoes: observacoes || undefined,
          processos: etapas.map(({ tipo, operador }) => ({
            id_tipo_processo: tipo.id_tipo_processo,
            ...(operador ? { id_operador: operador.id_usuario } : {}),
          })),
        },
      });

      // A solicitação já existe: um desenho recusado não pode impedir de abri-la.
      const naoEnviados = [];
      for (const arquivo of arquivos) {
        try {
          await apiUpload(`/solicitacoes/${criada.id_solicitacao}/anexos`, 'arquivo', arquivo);
        } catch {
          naoEnviados.push(arquivo.name);
        }
      }

      onCriado(
        criada,
        naoEnviados.length ? `A solicitação foi criada, mas estes arquivos não foram anexados: ${naoEnviados.join(', ')}.` : ''
      );
    } catch (err) {
      setErro(err.message);
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
          aria-label="Quantidade"
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
        <select aria-label="Prioridade" value={prioridade} onChange={(e) => setPrioridade(e.target.value)}>
          <option value="urgente">Urgente</option>
          <option value="alta">Alta</option>
          <option value="normal">Normal</option>
          <option value="baixa">Baixa</option>
        </select>
        <input
          type="date"
          aria-label="Prazo"
          value={dataPrazo}
          onChange={(e) => setDataPrazo(e.target.value)}
          required
        />
      </div>

      <input
        placeholder="Observações"
        value={observacoes}
        onChange={(e) => setObservacoes(e.target.value)}
      />

      <fieldset className="task-form__secao">
        <legend>Roteiro</legend>

        {etapas.length > 0 && (
          <ol className="rascunho">
            {etapas.map((etapa, indice) => (
              <li key={etapa.chave}>
                <span className="rascunho__texto">
                  <strong>
                    {indice + 1}. {etapa.tipo.nome}
                  </strong>{' '}
                  <small>{etapa.operador?.nome ?? 'Sem operador'}</small>
                </span>
                <button
                  type="button"
                  className="btn btn--icone"
                  aria-label={`Subir etapa ${indice + 1}`}
                  disabled={indice === 0}
                  onClick={() => moverEtapa(indice, -1)}
                >
                  {'↑︎'}
                </button>
                <button
                  type="button"
                  className="btn btn--icone"
                  aria-label={`Descer etapa ${indice + 1}`}
                  disabled={indice === etapas.length - 1}
                  onClick={() => moverEtapa(indice, 1)}
                >
                  {'↓︎'}
                </button>
                <button
                  type="button"
                  className="btn btn--icone btn--perigo"
                  aria-label={`Tirar etapa ${indice + 1}`}
                  onClick={() => setEtapas((atuais) => atuais.filter((e) => e.chave !== etapa.chave))}
                >
                  ×
                </button>
              </li>
            ))}
          </ol>
        )}

        <div className="task-form__row">
          <select aria-label="Processo da etapa" value={idTipo} onChange={(e) => setIdTipo(e.target.value)}>
            <option value="">Processo</option>
            {tipos.map((tipo) => (
              <option key={tipo.id_tipo_processo} value={tipo.id_tipo_processo}>
                {tipo.nome}
              </option>
            ))}
          </select>
          <select aria-label="Operador da etapa" value={idOperador} onChange={(e) => setIdOperador(e.target.value)}>
            <option value="">Operador (opcional)</option>
            {operadores.map((op) => (
              <option key={op.id_usuario} value={op.id_usuario}>
                {op.nome}
              </option>
            ))}
          </select>
          <button type="button" className="btn" disabled={!idTipo} onClick={incluirEtapa}>
            Incluir etapa
          </button>
        </div>
      </fieldset>

      <fieldset className="task-form__secao">
        <legend>Desenhos técnicos</legend>

        {arquivos.length > 0 && (
          <ul className="rascunho">
            {arquivos.map((arquivo, indice) => (
              <li key={`${arquivo.name}-${indice}`}>
                <span className="rascunho__texto">
                  <strong>{arquivo.name}</strong> <small>{formatarTamanho(arquivo.size)}</small>
                </span>
                <button
                  type="button"
                  className="btn btn--icone btn--perigo"
                  aria-label={`Tirar ${arquivo.name}`}
                  onClick={() => setArquivos((atuais) => atuais.filter((_, i) => i !== indice))}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        <label className="btn btn--arquivo">
          Escolher arquivos
          <input type="file" multiple accept={FORMATOS_ANEXO} onChange={selecionarArquivos} />
        </label>
      </fieldset>

      {erro && <p className="field-error">{erro}</p>}

      <button type="submit" className="btn-primary" disabled={enviando}>
        {enviando ? 'Salvando...' : 'Salvar solicitação'}
      </button>
    </form>
  );
}
