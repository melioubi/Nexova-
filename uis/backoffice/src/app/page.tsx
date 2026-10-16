'use client';

import { useState, useMemo, useCallback } from 'react';

// ── Importaciones del módulo de lógica de negocio ──
import {
  sampleCandidates,
  sampleVacancy,
  sampleSelectionProcesses,
  rankCandidatesForVacancy,
  calculateCandidateScore,
  calculateAverageSalary,
  findTopSkills,
  groupCandidatesBySeniority,
  countCandidatesByStatus,
  calculateVacancyFillRate,
  filterCandidatesBySkills,
  filterCandidatesBySeniority,
  filterCandidatesByAvailability,
  sortCandidatesBySalary,
  sortCandidatesByExperience,
  findCandidateById,
  findCandidateByEmail,
} from '@nexova/business-logic';

// ── Componentes visuales pequeños ──

function StatCard({ title, value, sub }: { title: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function Badge({ children, color = 'nexova' }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    nexova: 'bg-nexova-100 text-nexova-800',
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
    blue: 'bg-blue-100 text-blue-800',
    gray: 'bg-gray-100 text-gray-800',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color] || colors.nexova}`}>
      {children}
    </span>
  );
}

function Bar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div className={`${color} h-2 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── Página principal ──

export default function DashboardPage() {
  // ── Estado ──
  const [skillFilter, setSkillFilter] = useState('');
  const [seniorityFilter, setSeniorityFilter] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchId, setSearchId] = useState('');
  const [searchResult, setSearchResult] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ranking' | 'reports' | 'collections' | 'search'>('ranking');

  // ── Datos derivados (memorizados) ──
  const ranking = useMemo(() => rankCandidatesForVacancy(sampleCandidates, sampleVacancy), []);

  const seniorityCounts = useMemo(() => {
    const grouped = groupCandidatesBySeniority(sampleCandidates);
    return Object.entries(grouped).map(([level, list]) => ({ level, count: list.length }));
  }, []);

  const statusCounts = useMemo(() => countCandidatesByStatus(sampleCandidates), []);

  const avgSalary = useMemo(() => calculateAverageSalary(sampleCandidates), []);

  const topSkills = useMemo(() => findTopSkills(sampleCandidates, 5), []);

  const fillRate = useMemo(() => calculateVacancyFillRate(sampleSelectionProcesses), []);

  const filteredCandidates = useMemo(() => {
    let result = [...sampleCandidates];
    if (skillFilter.trim()) {
      result = filterCandidatesBySkills(result, skillFilter.split(',').map((s) => s.trim()));
    }
    if (seniorityFilter) {
      result = filterCandidatesBySeniority(result, seniorityFilter as any);
    }
    result = sortCandidatesBySalary(result, sortOrder);
    return result;
  }, [skillFilter, seniorityFilter, sortOrder]);

  const handleSearch = useCallback(() => {
    if (!searchId.trim()) {
      setSearchResult(null);
      return;
    }
    const byId = findCandidateById(sampleCandidates, searchId.trim());
    if (byId) {
      setSearchResult(`✅ Encontrado: ${byId.fullName} — ${byId.email}`);
      return;
    }
    const byEmail = findCandidateByEmail(sampleCandidates, searchId.trim());
    if (byEmail) {
      setSearchResult(`✅ Encontrado: ${byEmail.fullName} — ${byEmail.email}`);
      return;
    }
    setSearchResult('❌ Candidato no encontrado');
  }, [searchId]);

  // ── Render ──
  return (
    <div className="space-y-8">
      {/* ── Sección: Resumen ── */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Panel General</h2>
        <p className="text-sm text-gray-500 mb-5">
          Datos cargados desde{' '}
          <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">@nexova/business-logic</code>
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard title="Candidatos" value={sampleCandidates.length} />
          <StatCard title="Vacantes Activas" value={1} sub={sampleVacancy.title} />
          <StatCard title="Procesos" value={sampleSelectionProcesses.length} />
          <StatCard title="Salario Promedio" value={`$${avgSalary.toLocaleString('es-CL')}`} sub="USD/mes" />
          <StatCard title="Tasa de Colocación" value={`${fillRate}%`} />
          <StatCard
            title="Score Máximo"
            value={`${Math.max(...ranking.map((r) => r.score))}%`}
            sub={ranking[0]?.candidate.fullName}
          />
        </div>
      </section>

      {/* ── Pestañas ── */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {[
            { key: 'ranking', label: 'Ranking & Scoring' },
            { key: 'reports', label: 'Reportes' },
            { key: 'collections', label: 'Colecciones' },
            { key: 'search', label: 'Búsqueda' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-nexova-600 text-nexova-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Contenido según pestaña ── */}

      {/* ── Tab: Ranking & Scoring ── */}
      {activeTab === 'ranking' && (
        <section>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Matching Candidates —{' '}
              <span className="text-nexova-600">{sampleVacancy.title}</span>
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Basado en skills, experiencia, seniority, inglés y salario (máx. 100 pts)
            </p>
            <div className="space-y-4">
              {ranking.map((entry, i) => {
                const c = entry.candidate;
                const tier = entry.score >= 80 ? 'High' : entry.score >= 50 ? 'Medium' : 'Low';
                const tierColor = tier === 'High' ? 'green' : tier === 'Medium' ? 'yellow' : 'red';
                return (
                  <div key={c.id} className="border border-gray-100 rounded-lg p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-500">#{i + 1}</span>
                          <h4 className="font-semibold text-gray-900">{c.fullName}</h4>
                          <Badge color={tierColor as any}>{tier}</Badge>
                          <Badge color="gray">{c.seniority}</Badge>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">{c.email} · {c.location}</p>
                      </div>
                      <span className="text-2xl font-bold text-nexova-600">{entry.score}%</span>
                    </div>
                    <Bar value={entry.score} />
                    <div className="flex flex-wrap gap-2 mt-3">
                      {c.skills.map((skill) => (
                        <span key={skill} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                          {skill}
                        </span>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-3 text-xs text-gray-500">
                      <div>
                        <span className="font-medium text-gray-700">Experiencia:</span>{' '}
                        {c.yearsOfExperience} años
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Inglés:</span> {c.englishLevel}
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Salario esperado:</span>{' '}
                        ${c.expectedSalary.toLocaleString('es-CL')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Tab: Reportes ── */}
      {activeTab === 'reports' && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Seniority Distribution */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución por Seniority</h3>
            <div className="space-y-3">
              {seniorityCounts.map(({ level, count }) => (
                <div key={level} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700 w-28">{level}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-3">
                    <div
                      className="bg-nexova-500 h-3 rounded-full transition-all"
                      style={{ width: `${(count / sampleCandidates.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Status Distribution */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Estado de Candidatos</h3>
            <div className="space-y-3">
              {Object.entries(statusCounts).map(([status, count]) => (
                <div key={status} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700 w-28">{status}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-3">
                    <div
                      className="bg-green-500 h-3 rounded-full transition-all"
                      style={{ width: `${(count / sampleCandidates.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Skills */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Skills</h3>
            <div className="space-y-3">
              {topSkills.map(({ skill, count }, i) => (
                <div key={skill} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-400 w-6">#{i + 1}</span>
                  <span className="text-sm font-medium text-gray-700 flex-1">{skill}</span>
                  <div className="w-32 bg-gray-100 rounded-full h-3">
                    <div
                      className="bg-blue-500 h-3 rounded-full transition-all"
                      style={{ width: `${(count / sampleCandidates.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Vacancy Fill Rate */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col justify-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tasa de Colocación</h3>
            <div className="flex items-center gap-6">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#2a6a6c"
                    strokeWidth="3"
                    strokeDasharray={`${fillRate}, 100`}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-nexova-600">
                  {fillRate}%
                </span>
              </div>
              <div className="text-sm text-gray-500">
                <p><span className="font-medium text-gray-700">Procesos totales:</span> {sampleSelectionProcesses.length}</p>
                <p><span className="font-medium text-gray-700">Colocados:</span> {sampleSelectionProcesses.filter((p) => p.stage === 'Hired').length}</p>
                <p className="mt-2 text-xs">Calculado con <code className="bg-gray-100 px-1 rounded">calculateVacancyFillRate()</code></p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Tab: Colecciones ── */}
      {activeTab === 'collections' && (
        <section>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Filtros y Ordenamiento</h3>

              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-gray-500 mb-1">Skills requeridos (separados por coma)</label>
                <input
                  type="text"
                  value={skillFilter}
                  onChange={(e) => setSkillFilter(e.target.value)}
                  placeholder="Ej: TypeScript, React"
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-nexova-200 focus:border-nexova-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Seniority</label>
                <select
                  value={seniorityFilter}
                  onChange={(e) => setSeniorityFilter(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-nexova-200 outline-none"
                >
                  <option value="">Todos</option>
                  <option value="Junior">Junior</option>
                  <option value="Semi-Senior">Semi-Senior</option>
                  <option value="Senior">Senior</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Orden por salario</label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-nexova-200 outline-none"
                >
                  <option value="desc">Mayor a menor</option>
                  <option value="asc">Menor a mayor</option>
                </select>
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              {filteredCandidates.length} de {sampleCandidates.length} candidatos
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Nombre</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Seniority</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Skills</th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500">Salario Esp.</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Disponibilidad</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.map((c) => (
                    <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-2">
                        <span className="font-medium text-gray-900">{c.fullName}</span>
                        <span className="block text-xs text-gray-400">{c.email}</span>
                      </td>
                      <td className="py-3 px-2">
                        <Badge color={c.seniority === 'Senior' ? 'green' : c.seniority === 'Semi-Senior' ? 'yellow' : 'blue'}>
                          {c.seniority}
                        </Badge>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex flex-wrap gap-1">
                          {c.skills.map((s) => (
                            <span key={s} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{s}</span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right font-medium">${c.expectedSalary.toLocaleString('es-CL')}</td>
                      <td className="py-3 px-2">{c.availability}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ── Tab: Búsqueda ── */}
      {activeTab === 'search' && (
        <section>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Buscar Candidato</h3>
            <p className="text-sm text-gray-500 mb-4">
              Usa <code className="bg-gray-100 px-1.5 rounded text-xs">findCandidateById()</code> o{' '}
              <code className="bg-gray-100 px-1.5 rounded text-xs">findCandidateByEmail()</code>
            </p>
            <div className="flex gap-3">
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="ID (C-2024-0451) o email..."
                className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-nexova-200 focus:border-nexova-400 outline-none"
              />
              <button
                onClick={handleSearch}
                className="px-5 py-2 bg-nexova-600 text-white text-sm font-medium rounded-lg hover:bg-nexova-700 transition-colors"
              >
                Buscar
              </button>
            </div>
            {searchResult && (
              <div className={`mt-4 p-3 rounded-lg text-sm font-medium ${
                searchResult.startsWith('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}>
                {searchResult}
              </div>
            )}
            <div className="mt-6 text-xs text-gray-400">
              <p className="font-medium text-gray-600 mb-1">IDs disponibles para prueba:</p>
              <ul className="space-y-0.5">
                {sampleCandidates.map((c) => (
                  <li key={c.id}>
                    <code className="bg-gray-100 px-1 rounded">{c.id}</code> — {c.fullName} ({c.email})
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
