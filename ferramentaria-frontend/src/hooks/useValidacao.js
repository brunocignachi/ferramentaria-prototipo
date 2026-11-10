import { useState } from 'react';

/**
 * Controla quando mostrar os erros de um formulário, no lugar dos balões do
 * navegador. Um campo preenchido com valor inválido (texto longo demais,
 * número grande demais) é avisado na hora; um campo obrigatório vazio só
 * depois da primeira tentativa de envio.
 *
 * @param erros   { campo: 'mensagem' | '' }, recalculado a cada renderização
 * @param valores { campo: valor atual }
 */
export function useValidacao(erros, valores) {
  const [tentouEnviar, setTentouEnviar] = useState(false);

  function erroDe(campo) {
    const preenchido = String(valores[campo] ?? '') !== '';
    return tentouEnviar || preenchido ? erros[campo] || '' : '';
  }

  // Chamar no submit: marca a tentativa e diz se pode enviar.
  function podeEnviar() {
    setTentouEnviar(true);
    return Object.values(erros).every((erro) => !erro);
  }

  function reiniciar() {
    setTentouEnviar(false);
  }

  return { erroDe, podeEnviar, reiniciar };
}
