import type { ErrorValidacion, RegistroTalento, ResultadoValidacion } from '../types/models.js';

const MENSAJES_ERROR = {
  'Nombre completo': 'El nombre debe contener al menos nombre y apellido',
  'Correo electrónico': 'Ingresa un email válido (ejemplo: nombre@empresa.com )',
  Teléfono: 'El teléfono debe incluir código de país (ejemplo: +34 612 345 678)',
  'País de residencia': 'Selecciona tu país de residencia',
  'Años de experiencia': 'Los años de experiencia deben estar entre 0 y 50',
  'Sector de interés': 'Selecciona el sector de tu interés',
  'Nivel de inglés': 'Indica tu nivel de inglés',
  Disponibilidad: 'Selecciona tu disponibilidad',
  'LinkedIn (URL del perfil)': 'Si incluye LinkedIn, debe ser una URL válida',
  'Comentarios adicionales': 'Los comentarios no pueden exceder los 500 caracteres (quedan X)',
  'Acepto política de datos': 'Debes aceptar la política de tratamiento de datos para continuar',
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
    agregarError(errores, 'Nombre completo', MENSAJES_ERROR['Nombre completo']);
  }
}

function validarCorreoElectronico(correoElectronico: string | undefined, errores: ErrorValidacion[]): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test((correoElectronico ?? '').trim())) {
    agregarError(errores, 'Correo electrónico', MENSAJES_ERROR['Correo electrónico']);
  }
}

function validarTelefono(telefono: string | undefined, errores: ErrorValidacion[]): void {
  const telefonoRegex = /^\+\d{1,3}(\s\d+)+$/;
  if (!telefonoRegex.test((telefono ?? '').trim())) {
    agregarError(errores, 'Teléfono', MENSAJES_ERROR.Teléfono);
  }
}

function validarCamposObligatorios(registro: Partial<RegistroTalento>, errores: ErrorValidacion[]): void {
  if (!registro['País de residencia']) {
    agregarError(errores, 'País de residencia', MENSAJES_ERROR['País de residencia']);
  }

  if (!registro['Sector de interés']) {
    agregarError(errores, 'Sector de interés', MENSAJES_ERROR['Sector de interés']);
  }

  if (!registro['Nivel de inglés']) {
    agregarError(errores, 'Nivel de inglés', MENSAJES_ERROR['Nivel de inglés']);
  }

  if (!registro.Disponibilidad) {
    agregarError(errores, 'Disponibilidad', MENSAJES_ERROR.Disponibilidad);
  }

  if (!registro['Acepto política de datos']) {
    agregarError(errores, 'Acepto política de datos', MENSAJES_ERROR['Acepto política de datos']);
  }
}

function validarRangoExperiencia(anosExperiencia: number | undefined, errores: ErrorValidacion[]): void {
  if (typeof anosExperiencia !== 'number' || Number.isNaN(anosExperiencia) || anosExperiencia < 0 || anosExperiencia > 50) {
    agregarError(errores, 'Años de experiencia', MENSAJES_ERROR['Años de experiencia']);
  }
}

function validarLinkedIn(linkedInUrl: string | undefined, errores: ErrorValidacion[]): void {
  if (!linkedInUrl || linkedInUrl.trim() === '') {
    return;
  }

  const linkedInRegex = /^https?:\/\/.+/i;
  if (!linkedInRegex.test(linkedInUrl.trim())) {
    agregarError(errores, 'LinkedIn (URL del perfil)', MENSAJES_ERROR['LinkedIn (URL del perfil)']);
  }
}

function validarComentarios(comentariosAdicionales: string | undefined, errores: ErrorValidacion[]): void {
  const comentarios = comentariosAdicionales ?? '';
  if (comentarios.length > 500) {
    const restantes = 500 - comentarios.length;
    agregarError(
      errores,
      'Comentarios adicionales',
      MENSAJES_ERROR['Comentarios adicionales'].replace('X', String(restantes)),
    );
  }
}

export function validarRegistroTalento(registro: Partial<RegistroTalento>): ResultadoValidacion {
  const errores: ErrorValidacion[] = [];

  validarNombreCompleto(registro['Nombre completo'], errores);
  validarCorreoElectronico(registro['Correo electrónico'], errores);
  validarTelefono(registro.Teléfono, errores);
  validarCamposObligatorios(registro, errores);
  validarRangoExperiencia(registro['Años de experiencia'], errores);
  validarLinkedIn(registro['LinkedIn (URL del perfil)'], errores);
  validarComentarios(registro['Comentarios adicionales'], errores);

  return {
    esValido: errores.length === 0,
    errores,
  };
}

export function esRegistroTalentoValido(registro: Partial<RegistroTalento>): boolean {
  return validarRegistroTalento(registro).esValido;
}
