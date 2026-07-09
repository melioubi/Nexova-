export type Orden = 'asc' | 'desc';

export interface CriterioOrden<T> {
  campo: keyof T;
  orden: Orden;
}

export type Predicado<T> = (item: T) => boolean;

export function filtrarPor<T>(items: T[], predicado: Predicado<T>): T[] {
  return items.filter(predicado);
}

export function filtrarPorCriterios<T>(
  items: T[],
  criterios: Partial<{ [K in keyof T]: T[K] | ((valor: T[K]) => boolean) }>,
): T[] {
  const entries = Object.entries(criterios) as [keyof T, T[keyof T] | ((valor: T[keyof T]) => boolean)][];

  return items.filter((item) => {
    return entries.every(([campo, criterio]) => {
      const valor = item[campo];
      if (typeof criterio === 'function') {
        return (criterio as (valor: T[keyof T]) => boolean)(valor);
      }
      return valor === criterio;
    });
  });
}

export function ordenarPorCampo<T>(items: T[], campo: keyof T, orden: Orden = 'asc'): T[] {
  const copia = [...items];

  copia.sort((a, b) => {
    const valorA = a[campo];
    const valorB = b[campo];

    if (valorA === valorB) {
      return 0;
    }

    if (valorA > valorB) {
      return orden === 'asc' ? 1 : -1;
    }

    return orden === 'asc' ? -1 : 1;
  });

  return copia;
}

export function ordenarPorMultiplesCampos<T>(items: T[], criterios: CriterioOrden<T>[]): T[] {
  const copia = [...items];

  copia.sort((a, b) => {
    for (const criterio of criterios) {
      const valorA = a[criterio.campo];
      const valorB = b[criterio.campo];

      if (valorA === valorB) {
        continue;
      }

      if (valorA > valorB) {
        return criterio.orden === 'asc' ? 1 : -1;
      }

      return criterio.orden === 'asc' ? -1 : 1;
    }

    return 0;
  });

  return copia;
}

export function agruparPor<T, K extends keyof T>(items: T[], campo: K): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((acumulador, item) => {
    const llave = String(item[campo]);
    if (!acumulador[llave]) {
      acumulador[llave] = [];
    }
    acumulador[llave].push(item);
    return acumulador;
  }, {});
}
