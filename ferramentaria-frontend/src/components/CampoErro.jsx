// Mensagem de validação logo abaixo do campo.
export default function CampoErro({ id, mensagem }) {
  if (!mensagem) return null;
  return (
    <small id={id} className="campo-erro">
      {mensagem}
    </small>
  );
}
