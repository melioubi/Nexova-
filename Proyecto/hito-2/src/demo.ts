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
  'Sector de interés': 'Tecnología',
  'País de residencia': 'España',
});
console.log(filtrados);

mostrarTitulo('2) Ordenamiento por Años de experiencia (desc)');
const ordenadosDesc = ordenarPorCampo(registrosTalentoDemo, 'Años de experiencia', 'desc');
console.log(ordenadosDesc.map((item) => ({ nombre: item['Nombre completo'], anos: item['Años de experiencia'] })));

mostrarTitulo('3) Ordenamiento por multiples campos (sector asc, anos desc)');
const ordenadosMultiples = ordenarPorMultiplesCampos(registrosTalentoDemo, [
  { campo: 'Sector de interés', orden: 'asc' },
  { campo: 'Años de experiencia', orden: 'desc' },
]);
console.log(ordenadosMultiples.map((item) => ({ sector: item['Sector de interés'], nombre: item['Nombre completo'], anos: item['Años de experiencia'] })));

mostrarTitulo('4) Busqueda lineal por correo en arreglo desordenado');
const indiceLineal = busquedaLineal(registrosTalentoDemo, (item) => item['Correo electrónico'] === 'valentina.rojas@nexova-demo.com');
console.log({ indiceLineal, registro: indiceLineal >= 0 ? registrosTalentoDemo[indiceLineal] : null });

mostrarTitulo('5) Busqueda binaria por anosExperiencia en arreglo ordenado');
const registrosOrdenadosPorAnos = ordenarPorCampo(registrosTalentoDemo, 'Años de experiencia', 'asc');
const indiceBinario = busquedaBinaria(
  registrosOrdenadosPorAnos,
  { ...registrosOrdenadosPorAnos[0], 'Años de experiencia': 10 },
  (a, b) => a['Años de experiencia'] - b['Años de experiencia'],
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
  'Nombre completo': 'SoloNombre',
  'Correo electrónico': 'correo-invalido',
  Teléfono: '12345',
  'País de residencia': undefined,
  'Años de experiencia': 99,
  'Sector de interés': undefined,
  'Nivel de inglés': undefined,
  Disponibilidad: undefined,
  'LinkedIn (URL del perfil)': 'linkedin.com/in/sin-http',
  'Comentarios adicionales': 'X'.repeat(501),
  'Acepto política de datos': false,
});
console.log('Registro invalido:', resultadoInvalido);
