export function busquedaLineal<T>(items: T[], predicado: (item: T) => boolean): number {
  for (let indice = 0; indice < items.length; indice += 1) {
    if (predicado(items[indice])) {
      return indice;
    }
  }
  return -1;
}

export function busquedaBinaria<T>(
  itemsOrdenados: T[],
  valorBuscado: T,
  comparador: (a: T, b: T) => number,
): number {
  let izquierda = 0;
  let derecha = itemsOrdenados.length - 1;

  while (izquierda <= derecha) {
    const medio = Math.floor((izquierda + derecha) / 2);
    const comparacion = comparador(itemsOrdenados[medio], valorBuscado);

    if (comparacion === 0) {
      return medio;
    }

    if (comparacion < 0) {
      izquierda = medio + 1;
    } else {
      derecha = medio - 1;
    }
  }

  return -1;
}
