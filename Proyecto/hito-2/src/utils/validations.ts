import type { ErrorValidacion, RegistroTalento, ResultadoValidacion } from '../types/models.js';

const MENSAJES_ERROR = {
  nombreCompleto: 'El nombre debe contener al menos nombre y apellido',
  correoElectronico: 'Ingresa un email válido (ejemplo: nombre@empresa.com )',
  telefono: 'El teléfono debe incluir código de país (ejemplo: +34 612 345 678)',
  paisResidencia: 'Selecciona tu país de residencia',
  anosExperiencia: 'Los años de experiencia deben estar entre 0 y 50',
  sectorInteres: 'Selecciona el sector de tu interés',
  nivelIngles: 'Indica tu nivel de inglés',
  disponibilidad: 'Selecciona tu disponibilidad',
  linkedInUrl: 'Si incluye LinkedIn, debe ser una URL válida',
  comentariosAdicionales: 'Los comentarios no pueden exceder los 500 caracteres (quedan X)',
  aceptoPoliticaDatos: 'Debes aceptar la política de tratamiento de datos para continuar',
  fechaRegistroISO: 'La fecha de registro no puede estar en el futuro',
} as const;

function agregarError(
  errores: ErrorValidacion[],
  campo: ErrorValidacion['campo'],
  mensaje: string,
): void {
  errores.push({ campo, mensaje });
}

function validarNombreCompleto(nombreCompleto: string | undefined, errores: ErrorValidacion[]): void {
  const palabras = (nombreCompleto ?? '').trim().split(/\s+/).filter(Boolean);
  if (palabras.length < 2) {
    agregarError(errores, 'nombreCompleto', MENSAJES_ERROR.nombreCompleto);
  }
}

function validarCorreoElectronico(correoElectronico: string | undefined, errores: ErrorValidacion[]): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test((correoElectronico ?? '').trim())) {
    agregarError(errores, 'correoElectronico', MENSAJES_ERROR.correoElectronico);
  }
}

function validarTelefono(telefono: string | undefined, errores: ErrorValidacion[]): void {
  const telefonoRegex = /^\+\d{1,3}(\s\d+)+$/;
  if (!telefonoRegex.test((telefono ?? '').trim())) {
    agregarError(errores, 'telefono', MENSAJES_ERROR.telefono);
  }
}

function validarCamposObligatorios(registro: Partial<RegistroTalento>, errores: ErrorValidacion[]): void {
  if (!registro.paisResidencia) {
    agregarError(errores, 'paisResidencia', MENSAJES_ERROR.paisResidencia);
  }

  if (!registro.sectorInteres) {
    agregarError(errores, 'sectorInteres', MENSAJES_ERROR.sectorInteres);
  }

  if (!registro.nivelIngles) {
    agregarError(errores, 'nivelIngles', MENSAJES_ERROR.nivelIngles);
  }

  if (!registro.disponibilidad) {
    agregarError(errores, 'disponibilidad', MENSAJES_ERROR.disponibilidad);
  }

  if (!registro.aceptoPoliticaDatos) {
    agregarError(errores, 'aceptoPoliticaDatos', MENSAJES_ERROR.aceptoPoliticaDatos);
  }
}

function validarRangoExperiencia(anosExperiencia: number | undefined, errores: ErrorValidacion[]): void {
  if (typeof anosExperiencia !== 'number' || Number.isNaN(anosExperiencia) || anosExperiencia < 0 || anosExperiencia > 50) {
    agregarError(errores, 'anosExperiencia', MENSAJES_ERROR.anosExperiencia);
  }
}

function validarLinkedIn(linkedInUrl: string | undefined, errores: ErrorValidacion[]): void {
  if (!linkedInUrl || linkedInUrl.trim() === '') {
    return;
  }

  const linkedInRegex = /^https?:\/\/.+/i;
  if (!linkedInRegex.test(linkedInUrl.trim())) {
    agregarError(errores, 'linkedInUrl', MENSAJES_ERROR.linkedInUrl);
  }
}

function validarComentarios(comentariosAdicionales: string | undefined, errores: ErrorValidacion[]): void {
  const comentarios = comentariosAdicionales ?? '';
  if (comentarios.length > 500) {
    const restantes = 500 - comentarios.length;
    agregarError(
      errores,
      'comentariosAdicionales',
      MENSAJES_ERROR.comentariosAdicionales.replace('X', String(restantes)),
    );
  }
}

function validarFechaRegistro(fechaRegistroISO: string | undefined, errores: ErrorValidacion[]): void {
  if (!fechaRegistroISO) {
    return;
  }

  const fecha = new Date(fechaRegistroISO);
  if (Number.isNaN(fecha.getTime())) {
    agregarError(errores, 'fechaRegistroISO', 'La fecha de registro debe ser una fecha válida en formato ISO');
    return;
  }

  if (fecha.getTime() > Date.now()) {
    agregarError(errores, 'fechaRegistroISO', MENSAJES_ERROR.fechaRegistroISO);
  }
}

export function validarRegistroTalento(registro: Partial<RegistroTalento>): ResultadoValidacion {
  const errores: ErrorValidacion[] = [];

  validarNombreCompleto(registro.nombreCompleto, errores);
  validarCorreoElectronico(registro.correoElectronico, errores);
  validarTelefono(registro.telefono, errores);
  validarCamposObligatorios(registro, errores);
  validarRangoExperiencia(registro.anosExperiencia, errores);
  validarLinkedIn(registro.linkedInUrl, errores);
  validarComentarios(registro.comentariosAdicionales, errores);
  validarFechaRegistro(registro.fechaRegistroISO, errores);

  return {
    esValido: errores.length === 0,
    errores,
  };
}

export function esRegistroTalentoValido(registro: Partial<RegistroTalento>): boolean {
  return validarRegistroTalento(registro).esValido;
}
