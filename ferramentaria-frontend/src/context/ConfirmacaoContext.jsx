import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const ConfirmacaoContext = createContext(null);

function JanelaConfirmacao({ titulo, mensagem, textoConfirmar, perigo, onResponder }) {
  const janela = useRef(null);

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
      <div className="confirmacao__acoes">
        <button type="button" className="btn" autoFocus onClick={() => onResponder(false)}>
          Voltar
        </button>
        <button
          type="button"
          className={`btn ${perigo ? 'btn--perigo-cheio' : 'btn--primario'}`}
          onClick={() => onResponder(true)}
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
 */
export function ConfirmacaoProvider({ children }) {
  const [pedido, setPedido] = useState(null);

  const confirmar = useCallback(
    ({ titulo = 'Confirmar ação', mensagem, textoConfirmar = 'Confirmar', perigo = false }) =>
      new Promise((resolve) => setPedido({ titulo, mensagem, textoConfirmar, perigo, resolve })),
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
