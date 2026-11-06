import { useEffect, useRef, useState } from 'react';
import { apiArquivo } from '../api/client';
import { tipoVisualizavel } from '../utils/solicitacao';

// Mostra um desenho em PDF ou imagem dentro do site, sem precisar baixá-lo.
export default function VisualizadorAnexo({ anexo, onFechar }) {
  const janela = useRef(null);
  const [url, setUrl] = useState('');
  const [erro, setErro] = useState('');
  const tipo = tipoVisualizavel(anexo.nome_arquivo);

  useEffect(() => {
    janela.current.showModal();
  }, []);

  useEffect(() => {
    let ativo = true;
    let urlCriada = '';
    apiArquivo(`/anexos/${anexo.id_anexo}/download`)
      .then((arquivo) => {
        if (!ativo) return;
        // O tipo vem da extensão permitida, nunca do conteúdo enviado por usuários.
        urlCriada = URL.createObjectURL(new Blob([arquivo], { type: tipo }));
        setUrl(urlCriada);
      })
      .catch((err) => {
        if (ativo) setErro(err.message);
      });
    return () => {
      ativo = false;
      if (urlCriada) URL.revokeObjectURL(urlCriada);
    };
  }, [anexo.id_anexo, tipo]);

  return (
    <dialog ref={janela} className="visualizador" aria-label={anexo.nome_arquivo} onClose={onFechar}>
      <header className="visualizador__topo">
        <strong>{anexo.nome_arquivo}</strong>
        <div className="visualizador__acoes">
          {url && (
            <>
              <a className="btn btn--link" href={url} target="_blank" rel="noreferrer">
                Abrir em nova aba
              </a>
              <a className="btn btn--link" href={url} download={anexo.nome_arquivo}>
                Baixar
              </a>
            </>
          )}
          <button type="button" className="btn btn--primario" onClick={() => janela.current.close()}>
            Fechar
          </button>
        </div>
      </header>

      <div className="visualizador__conteudo">
        {erro && <p className="field-error">{erro}</p>}
        {!erro && !url && <p className="card__empty">Carregando...</p>}
        {url &&
          (tipo === 'application/pdf' ? (
            <iframe src={url} title={anexo.nome_arquivo} />
          ) : (
            <img src={url} alt={anexo.nome_arquivo} />
          ))}
      </div>
    </dialog>
  );
}
