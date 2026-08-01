import type { Candidate } from '../types/models';

export function findCandidateById(candidates: Candidate[], id: string): Candidate | null {
  for (const candidate of candidates) {
    if (candidate.id === id) {
      return candidate;
    }
  }
  return null;
}

export function findCandidateByEmail(candidates: Candidate[], email: string): Candidate | null {
  const targetEmail = email.toLowerCase();

  for (const candidate of candidates) {
    if (candidate.email.toLowerCase() === targetEmail) {
      return candidate;
    }
  }
  return null;
}

export function binarySearchCandidateBySalary(sortedCandidates: Candidate[], targetSalary: number): number {
  let left = 0;
  let right = sortedCandidates.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const salary = sortedCandidates[mid].expectedSalary;

    if (salary === targetSalary) {
      return mid;
    }

    if (salary < targetSalary) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return -1;
}