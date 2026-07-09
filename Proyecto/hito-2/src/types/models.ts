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
  id: string;
  nombreCompleto: string;
  correoElectronico: string;
  telefono: string;
  paisResidencia: PaisResidencia;
  anosExperiencia: number;
  sectorInteres: SectorInteres;
  nivelIngles: NivelIngles;
  disponibilidad: Disponibilidad;
  linkedInUrl?: string;
  comentariosAdicionales?: string;
  aceptoPoliticaDatos: boolean;
  fechaRegistroISO: string;
}

export interface FiltrosRegistroTalento {
  paisResidencia?: PaisResidencia;
  sectorInteres?: SectorInteres;
  nivelIngles?: NivelIngles;
  disponibilidad?: Disponibilidad;
  anosExperienciaMin?: number;
  anosExperienciaMax?: number;
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
  totalRegistros: number;
  totalConLinkedIn: number;
  promedioAniosExperiencia: number;
  minimoAniosExperiencia: number | null;
  maximoAniosExperiencia: number | null;
  porPais: Record<string, number>;
  porSector: Record<string, number>;
  porNivelIngles: Record<string, number>;
  porDisponibilidad: Record<string, number>;
}
