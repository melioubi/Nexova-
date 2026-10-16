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
  calculateCandidateScore,
  calculateVacancyFillRate,
  countCandidatesByStatus,
  findTopSkills,
  groupCandidatesBySeniority,
  rankCandidatesForVacancy,
} from './utils/transformations.js';
import { isValidEmail, validateCandidate, validateVacancy } from './utils/validations.js';
import { sampleCandidates, sampleSelectionProcesses, sampleVacancy } from './sampleData.js';

function mostrarTitulo(titulo: string): void {
  console.log('\n' + '='.repeat(80));
  console.log(titulo);
  console.log('='.repeat(80));
}

mostrarTitulo('Demo Hito 2 - Candidate/Vacancy/SelectionProcess');

mostrarTitulo('1) Collections');
console.log('filterCandidatesBySkills:', filterCandidatesBySkills(sampleCandidates, ['TypeScript', 'Node.js']));
console.log('filterCandidatesBySeniority:', filterCandidatesBySeniority(sampleCandidates, 'Senior'));
console.log(
  'filterCandidatesByAvailability:',
  filterCandidatesByAvailability(sampleCandidates, ['Immediate', '2 weeks']),
);
console.log('sortCandidatesBySalary desc:', sortCandidatesBySalary(sampleCandidates, 'desc'));
console.log('sortCandidatesByExperience asc:', sortCandidatesByExperience(sampleCandidates, 'asc'));

mostrarTitulo('2) Search');
console.log('findCandidateById:', findCandidateById(sampleCandidates, 'C-2024-0452'));
console.log('findCandidateByEmail case-insensitive:', findCandidateByEmail(sampleCandidates, 'CAROLINA.SILVA@EMAIL.COM'));
const sortedBySalaryAsc = sortCandidatesBySalary(sampleCandidates, 'asc');
console.log('binarySearchCandidateBySalary:', binarySearchCandidateBySalary(sortedBySalaryAsc, 4200));

mostrarTitulo('3) Scoring y Ranking');
console.log('calculateCandidateScore:', calculateCandidateScore(sampleCandidates[2], sampleVacancy));
console.log('rankCandidatesForVacancy:', rankCandidatesForVacancy(sampleCandidates, sampleVacancy));
console.log('groupCandidatesBySeniority:', groupCandidatesBySeniority(sampleCandidates));

mostrarTitulo('4) Agregaciones y Reportes');
console.log('countCandidatesByStatus:', countCandidatesByStatus(sampleCandidates));
console.log('calculateAverageSalary:', calculateAverageSalary(sampleCandidates));
console.log('findTopSkills top 3:', findTopSkills(sampleCandidates, 3));
console.log('calculateVacancyFillRate:', calculateVacancyFillRate(sampleSelectionProcesses));

mostrarTitulo('5) Validaciones');
console.log('isValidEmail OK:', isValidEmail('test@email.com'));
console.log('validateCandidate OK:', validateCandidate(sampleCandidates[0]));
console.log('validateVacancy OK:', validateVacancy(sampleVacancy));
