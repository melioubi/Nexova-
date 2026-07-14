import type { AvailabilityStatus, Candidate, SeniorityLevel } from '../types/models.js';

export function filterCandidatesBySkills(candidates: Candidate[], requiredSkills: string[]): Candidate[] {
  const normalizedRequired = requiredSkills.map((skill) => skill.toLowerCase());

  return candidates.filter((candidate) => {
    const candidateSkills = new Set(candidate.skills.map((skill) => skill.toLowerCase()));
    return normalizedRequired.every((requiredSkill) => candidateSkills.has(requiredSkill));
  });
}

export function filterCandidatesBySeniority(candidates: Candidate[], seniority: SeniorityLevel): Candidate[] {
  return candidates.filter((candidate) => candidate.seniority === seniority);
}

export function filterCandidatesByAvailability(
  candidates: Candidate[],
  availability: AvailabilityStatus[],
): Candidate[] {
  const allowed = new Set(availability);
  return candidates.filter((candidate) => allowed.has(candidate.availability));
}

export function sortCandidatesBySalary(candidates: Candidate[], order: 'asc' | 'desc'): Candidate[] {
  const sorted = [...candidates];
  sorted.sort((a, b) => (order === 'asc' ? a.expectedSalary - b.expectedSalary : b.expectedSalary - a.expectedSalary));
  return sorted;
}

export function sortCandidatesByExperience(candidates: Candidate[], order: 'asc' | 'desc'): Candidate[] {
  const sorted = [...candidates];
  sorted.sort((a, b) =>
    order === 'asc' ? a.yearsOfExperience - b.yearsOfExperience : b.yearsOfExperience - a.yearsOfExperience,
  );
  return sorted;
}
