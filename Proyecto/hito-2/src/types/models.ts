export type PaisResidencia = 'España' | 'Estados Unidos' | 'Otro';

export type SectorInteres =
  | 'Tecnología'
  | 'Retail'
  | 'Servicios Financieros'
  | 'Consultoría'
  | 'Otro';

export type NivelIngles = 'Básico' | 'Intermedio' | 'Avanzado' | 'Nativo';

export type Disponibilidad = 'Inmediata' | '1 mes' | '2-3 meses' | 'Solo explorando';

export interface RegistroTalento {
  'Nombre completo': string;
  'Correo electrónico': string;
  Teléfono: string;
  'País de residencia': PaisResidencia;
  'Años de experiencia': number;
  'Sector de interés': SectorInteres;
  'Nivel de inglés': NivelIngles;
  Disponibilidad: Disponibilidad;
  'LinkedIn (URL del perfil)'?: string;
  'Comentarios adicionales'?: string;
  'Acepto política de datos': boolean;
}

export interface FiltrosRegistroTalento {
  'País de residencia'?: PaisResidencia;
  'Sector de interés'?: SectorInteres;
  'Nivel de inglés'?: NivelIngles;
  Disponibilidad?: Disponibilidad;
  'Años de experiencia mínimo'?: number;
  'Años de experiencia máximo'?: number;
}

export interface ErrorValidacion {
  campo: keyof RegistroTalento | 'general';
  mensaje: string;
}

export interface ResultadoValidacion {
  esValido: boolean;
  errores: ErrorValidacion[];
}

export interface ResumenTalento {
  'Total de registros': number;
  'Total con LinkedIn': number;
  'Promedio de años de experiencia': number;
  'Mínimo de años de experiencia': number | null;
  'Máximo de años de experiencia': number | null;
  'Conteo por país': Record<string, number>;
  'Conteo por sector': Record<string, number>;
  'Conteo por nivel de inglés': Record<string, number>;
  'Conteo por disponibilidad': Record<string, number>;
}
