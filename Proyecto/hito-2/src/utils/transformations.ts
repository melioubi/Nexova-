import type { RegistroTalento, ResumenTalento } from '../types/models.js';

export function contarPorCategoria<T, K extends keyof T>(items: T[], campo: K): Record<string, number> {
  return items.reduce<Record<string, number>>((acumulador, item) => {
    const llave = String(item[campo]);
    acumulador[llave] = (acumulador[llave] ?? 0) + 1;
    return acumulador;
  }, {});
}

export function sumarValores<T>(items: T[], obtenerValor: (item: T) => number): number {
  return items.reduce((acumulador, item) => acumulador + obtenerValor(item), 0);
}

export function calcularPromedio<T>(items: T[], obtenerValor: (item: T) => number): number {
  if (items.length === 0) {
    return 0;
  }

  return sumarValores(items, obtenerValor) / items.length;
}

export function obtenerMaximo<T>(items: T[], obtenerValor: (item: T) => number): number | null {
  if (items.length === 0) {
    return null;
  }

  return items.reduce((maximo, item) => {
    const valor = obtenerValor(item);
    return valor > maximo ? valor : maximo;
  }, obtenerValor(items[0]));
}

export function obtenerMinimo<T>(items: T[], obtenerValor: (item: T) => number): number | null {
  if (items.length === 0) {
    return null;
  }

  return items.reduce((minimo, item) => {
    const valor = obtenerValor(item);
    return valor < minimo ? valor : minimo;
  }, obtenerValor(items[0]));
}

export function generarResumenTalento(registros: RegistroTalento[]): ResumenTalento {
  const totalRegistros = registros.length;
  const totalConLinkedIn = registros.filter((registro) => Boolean(registro['LinkedIn (URL del perfil)']?.trim())).length;

  return {
    'Total de registros': totalRegistros,
    'Total con LinkedIn': totalConLinkedIn,
    'Promedio de años de experiencia': calcularPromedio(registros, (registro) => registro['Años de experiencia']),
    'Mínimo de años de experiencia': obtenerMinimo(registros, (registro) => registro['Años de experiencia']),
    'Máximo de años de experiencia': obtenerMaximo(registros, (registro) => registro['Años de experiencia']),
    'Conteo por país': contarPorCategoria(registros, 'País de residencia'),
    'Conteo por sector': contarPorCategoria(registros, 'Sector de interés'),
    'Conteo por nivel de inglés': contarPorCategoria(registros, 'Nivel de inglés'),
    'Conteo por disponibilidad': contarPorCategoria(registros, 'Disponibilidad'),
  };
}
