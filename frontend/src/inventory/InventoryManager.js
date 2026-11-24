/**
 * Catálogo visual y lógico del inventario (separado entre Consumibles de Capa B y Objetos Clave).
 */

export const CONSUMABLE_DEFS = {
  medkit: {
    key: 'medkit',
    name: 'Botiquín de Emergencia',
    shortDesc: 'Restaura +45 Salud y +15 Cordura.',
    category: 'consumable',
  },
  battery: {
    key: 'battery',
    name: 'Batería de Litio 9V',
    shortDesc: 'Recarga +60% de energía de la linterna.',
    category: 'consumable',
  },
  flare: {
    key: 'flare',
    name: 'Bengala de Distracción',
    shortDesc: 'Al lanzarla [Q] ilumina la zona y atrae a El Eco lejos de ti.',
    category: 'consumable',
  },
};

export const KEY_ITEM_DEFS = {
  linterna_estandar: {
    key: 'linterna_estandar',
    name: 'Linterna Táctica A-09',
    shortDesc: 'Tu fuente principal de luz [F]. Las paredes proyectan sombras reales.',
  },
  credencial_09e: {
    key: 'credencial_09e',
    name: 'Credencial Borrosa #09-E',
    shortDesc: 'Identificación manchada del Proyecto Mnemosyne. Pertenece a tu expediente.',
  },
  tarjeta_nivel_2: {
    key: 'tarjeta_nivel_2',
    name: 'Tarjeta de Acceso Nivel 2',
    shortDesc: 'Obtenida en la Caja Fuerte de Seguridad. Abre la Oficina de la Dra. Elena Vance.',
  },
};
