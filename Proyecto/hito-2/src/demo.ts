import { filtrarPorCriterios, ordenarPorCampo, ordenarPorMultiplesCampos } from './utils/collections.js';
import { busquedaBinaria, busquedaLineal } from './utils/search.js';
import { generarResumenTalento } from './utils/transformations.js';
import { validarRegistroTalento } from './utils/validations.js';
import { registrosTalentoDemo } from './sampleData.js';

function mostrarTitulo(titulo: string): void {
  console.log('\n' + '='.repeat(80));
  console.log(titulo);
  console.log('='.repeat(80));
}

mostrarTitulo('Demo Hito 2 - Utilidades de datos de Nexova');

mostrarTitulo('1) Filtrado por criterios (sector Tecnología + país España)');
const filtrados = filtrarPorCriterios(registrosTalentoDemo, {
  sectorInteres: 'Tecnología',
  paisResidencia: 'España',
});
console.log(filtrados);

mostrarTitulo('2) Ordenamiento por anosExperiencia (desc)');
const ordenadosDesc = ordenarPorCampo(registrosTalentoDemo, 'anosExperiencia', 'desc');
console.log(ordenadosDesc.map((item) => ({ nombre: item.nombreCompleto, anos: item.anosExperiencia })));

mostrarTitulo('3) Ordenamiento por multiples campos (sector asc, anos desc)');
const ordenadosMultiples = ordenarPorMultiplesCampos(registrosTalentoDemo, [
  { campo: 'sectorInteres', orden: 'asc' },
  { campo: 'anosExperiencia', orden: 'desc' },
]);
console.log(ordenadosMultiples.map((item) => ({ sector: item.sectorInteres, nombre: item.nombreCompleto, anos: item.anosExperiencia })));

mostrarTitulo('4) Busqueda lineal por correo en arreglo desordenado');
const indiceLineal = busquedaLineal(registrosTalentoDemo, (item) => item.correoElectronico === 'valentina.rojas@nexova-demo.com');
console.log({ indiceLineal, registro: indiceLineal >= 0 ? registrosTalentoDemo[indiceLineal] : null });

mostrarTitulo('5) Busqueda binaria por anosExperiencia en arreglo ordenado');
const registrosOrdenadosPorAnos = ordenarPorCampo(registrosTalentoDemo, 'anosExperiencia', 'asc');
const indiceBinario = busquedaBinaria(
  registrosOrdenadosPorAnos,
  { ...registrosOrdenadosPorAnos[0], anosExperiencia: 10 },
  (a, b) => a.anosExperiencia - b.anosExperiencia,
);
console.log({
  indiceBinario,
  registro: indiceBinario >= 0 ? registrosOrdenadosPorAnos[indiceBinario] : null,
});

mostrarTitulo('6) Agregaciones y reportes');
const resumen = generarResumenTalento(registrosTalentoDemo);
console.log(resumen);

mostrarTitulo('7) Validaciones de negocio');
const resultadoValido = validarRegistroTalento(registrosTalentoDemo[0]);
console.log('Registro valido:', resultadoValido);

const resultadoInvalido = validarRegistroTalento({
  id: 'REG-BAD',
  nombreCompleto: 'SoloNombre',
  correoElectronico: 'correo-invalido',
  telefono: '12345',
  paisResidencia: undefined,
  anosExperiencia: 99,
  sectorInteres: undefined,
  nivelIngles: undefined,
  disponibilidad: undefined,
  linkedInUrl: 'linkedin.com/in/sin-http',
  comentariosAdicionales: 'X'.repeat(501),
  aceptoPoliticaDatos: false,
  fechaRegistroISO: '3026-01-01T00:00:00.000Z',
});
console.log('Registro invalido:', resultadoInvalido);
