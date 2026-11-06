import { useRef, useState } from 'react';
import { apiDownload, apiRequest, apiUpload } from '../api/client';
import VisualizadorAnexo from './VisualizadorAnexo';
import { FORMATOS_ANEXO, formatarDataHora, formatarTamanho, tipoVisualizavel } from '../utils/solicitacao';

// Desenhos técnicos da solicitação (RF03, UC06).
export default function AnexosCard({ idSolicitacao, anexos, podeEditar, onAlterado }) {
  const entradaArquivo = useRef(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [emVisualizacao, setEmVisualizacao] = useState(null);

  async function executar(acao) {
    setOcupado(true);
    setErro('');
    try {
      await acao();
    } catch (err) {
      setErro(err.message);
    } finally {
      setOcupado(false);
    }
  }

  function enviar(event) {
    const arquivo = event.target.files[0];
    if (!arquivo) return;
    executar(async () => {
      await apiUpload(`/solicitacoes/${idSolicitacao}/anexos`, 'arquivo', arquivo);
      await onAlterado();
    }).finally(() => {
      // Permite enviar de novo o mesmo arquivo depois de um erro.
      if (entradaArquivo.current) entradaArquivo.current.value = '';
    });
  }

  function remover(anexo) {
    if (!window.confirm(`Remover o anexo "${anexo.nome_arquivo}"?`)) return;
    executar(async () => {
      await apiRequest(`/anexos/${anexo.id_anexo}`, { method: 'DELETE' });
      await onAlterado();
    });
  }

  return (
    <section className="card">
      <div className="card__header">
        <h2>Desenhos técnicos</h2>
        {podeEditar && (
          <label className={`btn btn--arquivo ${ocupado ? 'is-ocupado' : ''}`}>
            {ocupado ? 'Aguarde...' : 'Anexar arquivo'}
            <input
              ref={entradaArquivo}
              type="file"
              accept={FORMATOS_ANEXO}
              disabled={ocupado}
              onChange={enviar}
            />
          </label>
        )}
      </div>

      {anexos.length === 0 ? (
        <p className="card__empty">Nenhum arquivo anexado.</p>
      ) : (
        <ul className="anexos">
          {anexos.map((anexo) => (
            <li key={anexo.id_anexo}>
              <div className="anexos__info">
                <strong>{anexo.nome_arquivo}</strong>
                <small>
                  {formatarTamanho(anexo.tamanho_bytes)} · {anexo.nome_usuario ?? '—'} ·{' '}
                  {formatarDataHora(anexo.enviado_em)}
                </small>
              </div>
              <div className="anexos__acoes">
                {tipoVisualizavel(anexo.nome_arquivo) && (
                  <button
                    type="button"
                    className="btn btn--primario"
                    aria-label={`Visualizar ${anexo.nome_arquivo}`}
                    onClick={() => setEmVisualizacao(anexo)}
                  >
                    Visualizar
                  </button>
                )}
                <button
                  type="button"
                  className="btn"
                  disabled={ocupado}
                  onClick={() =>
                    executar(() => apiDownload(`/anexos/${anexo.id_anexo}/download`, anexo.nome_arquivo))
                  }
                >
                  Baixar
                </button>
                {podeEditar && (
                  <button type="button" className="btn btn--perigo" disabled={ocupado} onClick={() => remover(anexo)}>
                    Remover
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {erro && <p className="field-error">{erro}</p>}

      {emVisualizacao && <VisualizadorAnexo anexo={emVisualizacao} onFechar={() => setEmVisualizacao(null)} />}
    </section>
  );
}
