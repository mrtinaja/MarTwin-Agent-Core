// documentacion/mocks/mock_generator.js
export const MockEngine = {
  // Genera un valor aleatorio basado en el alias de la columna
  generateValue: (columnAlias) => {
    const col = columnAlias.toLowerCase();
    if (col.includes('|money') || col.includes('importe') || col.includes('saldo')) {
      return (Math.random() * 50000).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
    }
    if (col.includes('|date') || col.includes('fecha')) {
      return new Date(+(new Date()) - Math.floor(Math.random() * 10000000000)).toLocaleDateString('es-AR');
    }
    if (col.includes('|int') || col.includes('numero') || col.includes('poliza')) {
      return Math.floor(Math.random() * 999999).toString();
    }
    if (col.includes('|string') || col.includes('nombre') || col.includes('concepto')) {
      const labels = ['PAGO_RECIBIDO', 'AJUSTE_CONTABLE', 'SINIESTRO_PENDIENTE', 'REASEGURO_ACEPTADO'];
      return labels[Math.floor(Math.random() * labels.length)];
    }
    return "MOCK_VAL_" + Math.floor(Math.random() * 100);
  },

  // Escanea el contenido del editor buscando definiciones de columnas
  parseStructure: (rawJs) => {
    const regex = /"([^"]+\\|[^"]+)"/g; // Busca strings con alias
    const found = [];
    let match;
    while ((match = regex.exec(rawJs)) !== null) {
      if (match[1].includes('|')) found.push(match[1]);
    }
    return found.length > 0 ? found : ["Fecha|date", "Concepto|string", "Importe|money"];
  }
};