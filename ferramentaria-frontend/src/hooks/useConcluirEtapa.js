import { useCallback } from 'react';
import { useConfirmar } from '../context/ConfirmacaoContext';
import { LIMITES } from '../utils/validacao';

/**
 * Pergunta antes de concluir uma etapa e deixa o operador anotar uma
 * observação (ex.: "medida ajustada"), que vai para o histórico da peça.
 * Devolve o corpo da requisição, ou null se a pessoa desistir.
 */
export function useConcluirEtapa() {
  const confirmar = useConfirmar();

  return useCallback(
    async (nomeDaEtapa) => {
      const resposta = await confirmar({
        titulo: 'Concluir etapa',
        mensagem: `Confirme a conclusão de ${nomeDaEtapa}. Se quiser, deixe uma observação para o histórico da peça.`,
        textoConfirmar: 'Concluir etapa',
        campoTexto: {
          rotulo: 'Observação',
          placeholder: 'Ex.: medida ajustada, faltou material...',
          max: LIMITES.textoLongo,
        },
      });
      if (!resposta) return null;
      return resposta.texto ? { observacao: resposta.texto } : {};
    },
    [confirmar]
  );
}
