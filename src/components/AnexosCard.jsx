import { useRef, useState } from 'react';
import { apiDownload, apiRequest, apiUpload } from '../api/client';
import { formatarDataHora } from '../utils/solicitacao';

const FORMATOS_ACEITOS = '.pdf,.png,.jpg,.jpeg,.tif,.tiff,.dwg,.dxf,.step,.stp,.iges,.igs';

function formatarTamanho(bytes) {
  const valor = Number(bytes);
  if (valor < 1024 * 1024) return `${Math.max(1, Math.round(valor / 1024))} KB`;
  return `${(valor / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

// Desenhos técnicos da solicitação (RF03, UC06).
export default function AnexosCard({ idSolicitacao, anexos, podeEditar, onAlterado }) {
  const entradaArquivo = useRef(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');

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
              accept={FORMATOS_ACEITOS}
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
    </section>
  );
}
