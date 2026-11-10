import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const ConfirmacaoContext = createContext(null);

function JanelaConfirmacao({ titulo, mensagem, textoConfirmar, perigo, campoTexto, onResponder }) {
  const janela = useRef(null);
  const [texto, setTexto] = useState('');
  const excedeu = campoTexto && texto.length > campoTexto.max;

  useEffect(() => {
    janela.current.showModal();
  }, []);

  return (
    <dialog
      ref={janela}
      className="confirmacao"
      aria-labelledby="confirmacao-titulo"
      aria-describedby="confirmacao-mensagem"
      onCancel={(event) => {
        // Esc equivale a desistir.
        event.preventDefault();
        onResponder(false);
      }}
    >
      <h2 id="confirmacao-titulo">{titulo}</h2>
      <p id="confirmacao-mensagem">{mensagem}</p>
      {campoTexto && (
        <label className="confirmacao__campo">
          {campoTexto.rotulo}
          <textarea
            rows={3}
            autoFocus
            value={texto}
            placeholder={campoTexto.placeholder}
            aria-invalid={excedeu}
            onChange={(e) => setTexto(e.target.value)}
          />
          {excedeu ? (
            <span className="campo-erro">
              {campoTexto.rotulo} pode ter no máximo {campoTexto.max} caracteres ({texto.length}).
            </span>
          ) : (
            <small>Opcional</small>
          )}
        </label>
      )}
      <div className="confirmacao__acoes">
        <button type="button" className="btn" autoFocus={!campoTexto} onClick={() => onResponder(false)}>
          Voltar
        </button>
        <button
          type="button"
          className={`btn ${perigo ? 'btn--perigo-cheio' : 'btn--primario'}`}
          disabled={excedeu}
          onClick={() => onResponder(campoTexto ? { texto: texto.trim() } : true)}
        >
          {textoConfirmar}
        </button>
      </div>
    </dialog>
  );
}

/**
 * Janela de confirmação do próprio sistema, no lugar do window.confirm.
 * Uso: const confirmar = useConfirmar();
 *      if (!(await confirmar({ titulo, mensagem, textoConfirmar, perigo }))) return;
 * Com campoTexto: { rotulo, placeholder, max }, a janela pede um texto opcional
 * e a resposta é { texto } ao confirmar, ou false ao desistir.
 */
export function ConfirmacaoProvider({ children }) {
  const [pedido, setPedido] = useState(null);

  const confirmar = useCallback(
    ({ titulo = 'Confirmar ação', mensagem, textoConfirmar = 'Confirmar', perigo = false, campoTexto = null }) =>
      new Promise((resolve) => setPedido({ titulo, mensagem, textoConfirmar, perigo, campoTexto, resolve })),
    []
  );

  function responder(resposta) {
    pedido.resolve(resposta);
    setPedido(null);
  }

  return (
    <ConfirmacaoContext.Provider value={confirmar}>
      {children}
      {pedido && <JanelaConfirmacao {...pedido} onResponder={responder} />}
    </ConfirmacaoContext.Provider>
  );
}

export function useConfirmar() {
  return useContext(ConfirmacaoContext);
}
