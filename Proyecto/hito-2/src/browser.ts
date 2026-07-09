import { filtrarPorCriterios, ordenarPorCampo, ordenarPorMultiplesCampos } from './utils/collections.js';
import { busquedaBinaria, busquedaLineal } from './utils/search.js';
import { generarResumenTalento } from './utils/transformations.js';
import { validarRegistroTalento } from './utils/validations.js';
import { registrosTalentoDemo } from './sampleData.js';
import type { PaisResidencia, SectorInteres } from './types/models.js';

const sectoresValidos: SectorInteres[] = ['Tecnología', 'Retail', 'Servicios Financieros', 'Consultoría', 'Otro'];
const paisesValidos: PaisResidencia[] = ['España', 'Estados Unidos', 'Otro'];

function renderJSON(data: unknown): void {
  const output = document.getElementById('output');
  if (!output) {
    return;
  }
  output.textContent = JSON.stringify(data, null, 2);
}

function inicializarEventos(): void {
  const btnFiltrar = document.getElementById('btn-filtrar');
  const btnOrdenar = document.getElementById('btn-ordenar');
  const btnOrdenarMultiple = document.getElementById('btn-ordenar-multiple');
  const btnBusquedaLineal = document.getElementById('btn-busqueda-lineal');
  const btnBusquedaBinaria = document.getElementById('btn-busqueda-binaria');
  const btnReporte = document.getElementById('btn-reporte');
  const btnValidar = document.getElementById('btn-validar');

  btnFiltrar?.addEventListener('click', () => {
    const sectorValor = (document.getElementById('filtro-sector') as HTMLSelectElement | null)?.value;
    const paisValor = (document.getElementById('filtro-pais') as HTMLSelectElement | null)?.value;

    const sector = sectoresValidos.find((item) => item === sectorValor);
    const pais = paisesValidos.find((item) => item === paisValor);

    const filtrados = filtrarPorCriterios(registrosTalentoDemo, {
      ...(sector ? { 'Sector de interés': sector } : {}),
      ...(pais ? { 'País de residencia': pais } : {}),
    });

    renderJSON(filtrados);
  });

  btnOrdenar?.addEventListener('click', () => {
    const orden = (document.getElementById('orden-experiencia') as HTMLSelectElement | null)?.value === 'desc' ? 'desc' : 'asc';
    renderJSON(ordenarPorCampo(registrosTalentoDemo, 'Años de experiencia', orden));
  });

  btnOrdenarMultiple?.addEventListener('click', () => {
    const resultado = ordenarPorMultiplesCampos(registrosTalentoDemo, [
      { campo: 'Sector de interés', orden: 'asc' },
      { campo: 'Años de experiencia', orden: 'desc' },
    ]);
    renderJSON(resultado);
  });

  btnBusquedaLineal?.addEventListener('click', () => {
    const correo = (document.getElementById('input-correo') as HTMLInputElement | null)?.value?.trim() ?? '';
    const indice = busquedaLineal(registrosTalentoDemo, (item) => item['Correo electrónico'] === correo);

    renderJSON({
      correo,
      indice,
      registro: indice >= 0 ? registrosTalentoDemo[indice] : null,
    });
  });

  btnBusquedaBinaria?.addEventListener('click', () => {
    const valorInput = (document.getElementById('input-anos') as HTMLInputElement | null)?.value ?? '';
    const anos = Number(valorInput);
    const ordenados = ordenarPorCampo(registrosTalentoDemo, 'Años de experiencia', 'asc');

    const indice = busquedaBinaria(
      ordenados,
      { ...ordenados[0], 'Años de experiencia': anos },
      (a, b) => a['Años de experiencia'] - b['Años de experiencia'],
    );

    renderJSON({
      anosBuscados: anos,
      indice,
      registro: indice >= 0 ? ordenados[indice] : null,
      arregloOrdenado: ordenados,
    });
  });

  btnReporte?.addEventListener('click', () => {
    renderJSON(generarResumenTalento(registrosTalentoDemo));
  });

  btnValidar?.addEventListener('click', () => {
    const registroInvalido = {
      'Nombre completo': 'Nombre',
      'Correo electrónico': 'correo-sin-formato',
      Teléfono: '999',
      'País de residencia': undefined,
      'Años de experiencia': 70,
      'Sector de interés': undefined,
      'Nivel de inglés': undefined,
      Disponibilidad: undefined,
      'LinkedIn (URL del perfil)': 'linkedin.com/in/perfil',
      'Comentarios adicionales': 'x'.repeat(510),
      'Acepto política de datos': false,
    };

    renderJSON(validarRegistroTalento(registroInvalido));
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderJSON(registrosTalentoDemo);
  inicializarEventos();
});
