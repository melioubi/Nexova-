import {
  filterCandidatesByAvailability,
  filterCandidatesBySeniority,
  filterCandidatesBySkills,
  sortCandidatesByExperience,
  sortCandidatesBySalary,
} from './utils/collections.js';
import { binarySearchCandidateBySalary, findCandidateByEmail, findCandidateById } from './utils/search.js';
import {
  calculateAverageSalary,
  calculateVacancyFillRate,
  countCandidatesByStatus,
  rankCandidatesForVacancy,
} from './utils/transformations.js';
import { validateCandidate, validateVacancy } from './utils/validations.js';
import { sampleCandidates, sampleSelectionProcesses, sampleVacancy } from './sampleData.js';

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
    renderJSON(filterCandidatesBySkills(sampleCandidates, ['TypeScript', 'React']));
  });

  btnOrdenar?.addEventListener('click', () => {
    renderJSON(sortCandidatesByExperience(sampleCandidates, 'desc'));
  });

  btnOrdenarMultiple?.addEventListener('click', () => {
    renderJSON({
      bySalary: sortCandidatesBySalary(sampleCandidates, 'asc'),
      byAvailability: filterCandidatesByAvailability(sampleCandidates, ['Immediate', '2 weeks']),
      bySeniority: filterCandidatesBySeniority(sampleCandidates, 'Senior'),
    });
  });

  btnBusquedaLineal?.addEventListener('click', () => {
    const email = (document.getElementById('input-correo') as HTMLInputElement | null)?.value?.trim() ?? '';
    renderJSON({ byId: findCandidateById(sampleCandidates, 'C-2024-0452'), byEmail: findCandidateByEmail(sampleCandidates, email) });
  });

  btnBusquedaBinaria?.addEventListener('click', () => {
    const value = (document.getElementById('input-anos') as HTMLInputElement | null)?.value ?? '';
    const targetSalary = Number(value);
    const sorted = sortCandidatesBySalary(sampleCandidates, 'asc');
    const index = binarySearchCandidateBySalary(sorted, targetSalary);
    renderJSON({ targetSalary, index, result: index >= 0 ? sorted[index] : null });
  });

  btnReporte?.addEventListener('click', () => {
    renderJSON({
      ranking: rankCandidatesForVacancy(sampleCandidates, sampleVacancy),
      statusCount: countCandidatesByStatus(sampleCandidates),
      averageSalary: calculateAverageSalary(sampleCandidates),
      fillRate: calculateVacancyFillRate(sampleSelectionProcesses),
    });
  });

  btnValidar?.addEventListener('click', () => {
    renderJSON({ candidate: validateCandidate(sampleCandidates[0]), vacancy: validateVacancy(sampleVacancy) });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderJSON(sampleCandidates);
  inicializarEventos();
});
