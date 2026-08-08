import type { Schema, Struct } from '@strapi/strapi';

export interface PedidoPedidoDireccion extends Struct.ComponentSchema {
  collectionName: 'components_pedido_pedido_direccions';
  info: {
    displayName: 'pedido.direccion';
  };
  attributes: {
    ciudad: Schema.Attribute.String;
    direccion: Schema.Attribute.String;
    nombreCompleto: Schema.Attribute.String;
    notas: Schema.Attribute.Text;
    telefono: Schema.Attribute.String;
  };
}

export interface PedidoPedidoHistorialEstado extends Struct.ComponentSchema {
  collectionName: 'components_pedido_pedido_historial_estados';
  info: {
    displayName: 'pedido.historial-estado';
  };
  attributes: {
    estado: Schema.Attribute.String;
    fecha: Schema.Attribute.DateTime;
    nota: Schema.Attribute.String;
  };
}

export interface PedidoPedidoItem extends Struct.ComponentSchema {
  collectionName: 'components_pedido_pedido_items';
  info: {
    displayName: 'pedido.item';
  };
  attributes: {
    cantidad: Schema.Attribute.Integer;
    nombreProducto: Schema.Attribute.String;
    precioUnitario: Schema.Attribute.Decimal;
    producto: Schema.Attribute.Relation<'oneToOne', 'api::product.product'>;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'pedido.pedido-direccion': PedidoPedidoDireccion;
      'pedido.pedido-historial-estado': PedidoPedidoHistorialEstado;
      'pedido.pedido-item': PedidoPedidoItem;
    }
  }
}
