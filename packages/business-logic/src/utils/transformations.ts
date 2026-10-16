import type { Candidate, Vacancy, SeniorityLevel, EnglishLevel, SelectionProcess, CandidateStatus } from '../types/models';

const SENIORITY_ORDER: SeniorityLevel[] = ['Junior', 'Semi-Senior', 'Senior', 'Lead', 'Executive'];
const ENGLISH_ORDER: EnglishLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Native'];

function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

function getSkillMatchScore(candidate: Candidate, vacancy: Vacancy): number {
  const candidateSkills = new Set(candidate.skills.map((skill) => skill.toLowerCase()));
  const requiredSkills = vacancy.requiredSkills.map((skill) => skill.toLowerCase());
  const preferredSkills = vacancy.preferredSkills.map((skill) => skill.toLowerCase());

  const requiredMatches = requiredSkills.filter((skill) => candidateSkills.has(skill)).length;
  let score = 0;

  if (requiredSkills.length > 0 && requiredMatches === requiredSkills.length) {
    score += 40;
  } else if (requiredSkills.length > 0 && requiredMatches / requiredSkills.length >= 0.5) {
    score += 20;
  }

  const preferredMatches = preferredSkills.filter((skill) => candidateSkills.has(skill)).length;
  score += Math.min(preferredMatches * 10, 20);

  return score;
}

function getExperienceMatchScore(candidate: Candidate, vacancy: Vacancy): number {
  const years = candidate.yearsOfExperience;

  if (years >= vacancy.minYearsExperience && years <= vacancy.maxYearsExperience) {
    return 20;
  }

  const distanceToRange =
    years < vacancy.minYearsExperience ? vacancy.minYearsExperience - years : years - vacancy.maxYearsExperience;

  if (distanceToRange >= 1 && distanceToRange <= 2) {
    return 10;
  }

  return 0;
}

function getSeniorityMatchScore(candidate: Candidate, vacancy: Vacancy): number {
  if (candidate.seniority === vacancy.requiredSeniority) {
    return 15;
  }

  const candidateIndex = SENIORITY_ORDER.indexOf(candidate.seniority);
  const vacancyIndex = SENIORITY_ORDER.indexOf(vacancy.requiredSeniority);

  if (Math.abs(candidateIndex - vacancyIndex) === 1) {
    return 7;
  }

  return 0;
}

function getEnglishMatchScore(candidate: Candidate, vacancy: Vacancy): number {
  const candidateIndex = ENGLISH_ORDER.indexOf(candidate.englishLevel);
  const requiredIndex = ENGLISH_ORDER.indexOf(vacancy.requiredEnglishLevel);
  return candidateIndex >= requiredIndex ? 15 : 0;
}

function getSalaryMatchScore(candidate: Candidate, vacancy: Vacancy): number {
  const salary = candidate.expectedSalary;

  if (salary >= vacancy.salaryRangeMin && salary <= vacancy.salaryRangeMax) {
    return 10;
  }

  if (salary > vacancy.salaryRangeMax && salary <= vacancy.salaryRangeMax * 1.2) {
    return 5;
  }

  return 0;
}

export function calculateCandidateScore(candidate: Candidate, vacancy: Vacancy): number {
  const score =
    getSkillMatchScore(candidate, vacancy) +
    getExperienceMatchScore(candidate, vacancy) +
    getSeniorityMatchScore(candidate, vacancy) +
    getEnglishMatchScore(candidate, vacancy) +
    getSalaryMatchScore(candidate, vacancy);

  return Math.max(0, Math.min(100, score));
}

export function rankCandidatesForVacancy(
  candidates: Candidate[],
  vacancy: Vacancy,
): Array<{ candidate: Candidate; score: number }> {
  return candidates
    .map((candidate) => ({ candidate, score: calculateCandidateScore(candidate, vacancy) }))
    .sort((a, b) => b.score - a.score);
}

export function groupCandidatesBySeniority(candidates: Candidate[]): Record<SeniorityLevel, Candidate[]> {
  const grouped: Record<SeniorityLevel, Candidate[]> = {
    Junior: [],
    'Semi-Senior': [],
    Senior: [],
    Lead: [],
    Executive: [],
  };

  for (const candidate of candidates) {
    grouped[candidate.seniority].push(candidate);
  }

  return grouped;
}

export function countCandidatesByStatus(candidates: Candidate[]): Record<CandidateStatus, number> {
  const counts: Record<CandidateStatus, number> = {
    Active: 0,
    'In process': 0,
    Hired: 0,
    Inactive: 0,
  };

  for (const candidate of candidates) {
    counts[candidate.status] += 1;
  }

  return counts;
}

export function calculateAverageSalary(candidates: Candidate[]): number {
  if (candidates.length === 0) {
    return 0;
  }

  const total = candidates.reduce((sum, candidate) => sum + candidate.expectedSalary, 0);
  return roundTo2(total / candidates.length);
}

export function findTopSkills(candidates: Candidate[], topN: number): Array<{ skill: string; count: number }> {
  const counts = new Map<string, { skill: string; count: number }>();

  for (const candidate of candidates) {
    const uniqueSkills = new Set(candidate.skills.map((skill) => skill.trim()).filter((skill) => skill.length > 0));
    for (const skill of uniqueSkills) {
      const key = skill.toLowerCase();
      const entry = counts.get(key);
      if (entry) {
        entry.count += 1;
      } else {
        counts.set(key, { skill, count: 1 });
      }
    }
  }

  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.skill.localeCompare(b.skill))
    .slice(0, Math.max(0, topN));
}

export function calculateVacancyFillRate(processes: SelectionProcess[]): number {
  if (processes.length === 0) {
    return 0;
  }

  const hiredCount = processes.filter((process) => process.stage === 'Hired').length;
  return roundTo2((hiredCount / processes.length) * 100);
}