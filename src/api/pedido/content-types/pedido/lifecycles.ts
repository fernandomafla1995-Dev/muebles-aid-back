export default {
  async beforeUpdate(event) {
    const { params } = event;

    if (!params.data?.estado) return;

    const documentId = params.documentId;
    if (!documentId) return;

    const historialPrevio = await strapi.documents("api::pedido.pedido").findOne({
      documentId,
      populate: ["historialEstados"],
    });

    if (historialPrevio && historialPrevio.estado !== params.data.estado) {
      const historialLimpio = (historialPrevio.historialEstados ?? []).map(
        (h: any) => ({
          estado: h.estado,
          fecha: h.fecha,
          nota: h.nota,
        }),
      );

      params.data.historialEstados = [
        ...historialLimpio,
        {
          estado: params.data.estado,
          fecha: new Date().toISOString(),
          nota: `Cambio automático de estado a ${params.data.estado}`,
        },
      ];
    }
  },

  async afterUpdate(event) {
    const { result, params } = event;

    if (!params.data?.estado) return;

    const nuevoEstado = params.data.estado;

    if (nuevoEstado === "pagado") {
      await notificarArea(
        process.env.EMAIL_FACTURACION!,
        `Pedido #${result.id} pagado`,
        `El pedido #${result.id} (referencia ${result.wompiReference}) fue pagado y está listo para facturar.\nTotal: $${result.total}`,
      );
      await notificarArea(
        process.env.EMAIL_PRODUCCION!,
        `Nuevo pedido para producción #${result.id}`,
        `El pedido #${result.id} fue pagado. Por favor iniciar producción.`,
      );
    }

    if (nuevoEstado === "listo_despacho") {
      await notificarArea(
        process.env.EMAIL_LOGISTICA!,
        `Pedido #${result.id} listo para despacho`,
        `El pedido #${result.id} terminó producción y está listo para ser despachado.`,
      );
    }

    if (nuevoEstado === "cancelado" || nuevoEstado === "reembolsado") {
      await notificarArea(
        process.env.EMAIL_FACTURACION!,
        `Pedido #${result.id} — ${nuevoEstado}`,
        `El pedido #${result.id} pasó a estado "${nuevoEstado}".`,
      );
    }
  },
};

async function notificarArea(to: string, subject: string, text: string) {
  try {
    await strapi.plugins["email"].services.email.send({
      to,
      subject,
      text,
    });
  } catch (error) {
    strapi.log.error(`Error enviando notificación a ${to}:`, error);
  }
}