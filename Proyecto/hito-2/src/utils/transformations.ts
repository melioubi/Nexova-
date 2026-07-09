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
  const totalConLinkedIn = registros.filter((registro) => Boolean(registro.linkedInUrl?.trim())).length;

  return {
    totalRegistros,
    totalConLinkedIn,
    promedioAniosExperiencia: calcularPromedio(registros, (registro) => registro.anosExperiencia),
    minimoAniosExperiencia: obtenerMinimo(registros, (registro) => registro.anosExperiencia),
    maximoAniosExperiencia: obtenerMaximo(registros, (registro) => registro.anosExperiencia),
    porPais: contarPorCategoria(registros, 'paisResidencia'),
    porSector: contarPorCategoria(registros, 'sectorInteres'),
    porNivelIngles: contarPorCategoria(registros, 'nivelIngles'),
    porDisponibilidad: contarPorCategoria(registros, 'disponibilidad'),
  };
}
