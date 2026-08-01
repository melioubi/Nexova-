import Link from "next/link";

const services = [
  {
    title: "Executive Search",
    description: "Búsqueda y selección de perfiles ejecutivos y mandos medios con alcance regional en Chile y Argentina.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    sectors: ["Minería", "Tecnología", "Finanzas", "Retail", "Salud"],
  },
  {
    title: "Recruitment Process Outsourcing",
    description: "Externalización integral del proceso de reclutamiento para empresas en crecimiento que necesitan escalar su equipo rápidamente.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    sectors: ["Startups", "Scale-ups", "Corporaciones"],
  },
  {
    title: "Consultoría en RR.HH.",
    description: "Diagnóstico organizacional, diseño de estructuras salariales, planes de carrera y transformación cultural.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    sectors: ["Todos los sectores"],
  },
  {
    title: "People Analytics",
    description: "Dashboards de métricas de RR.HH., modelos predictivos de fuga de talento y análisis de equidad salarial.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
      </svg>
    ),
    sectors: ["RR.HH.", "Finanzas", "Dirección"],
  },
  {
    title: "Evaluación de Talento",
    description: "Evaluación psicométrica y por competencias con metodologías validadas para procesos de selección y desarrollo.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    sectors: ["Todos los sectores"],
  },
  {
    title: "Outsourcing de Nómina",
    description: "Administración externalizada de nómina y gestión de personal, asegurando cumplimiento legal en Chile y Argentina.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    sectors: ["PYMES", "Corporaciones", "Gobierno"],
  },
];

export default function ServicesSection() {
  return (
    <section id="servicios" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Nuestros Servicios</h2>
          <p className="mt-4 text-lg text-gray-600">
            Soluciones integrales de RR.HH. para empresas que buscan el mejor talento en Chile y Argentina.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service) => (
            <div
              key={service.title}
              className="group bg-white rounded-2xl p-8 border border-gray-100 hover:border-nexova-200 hover:shadow-lg hover:shadow-nexova-50 transition-all duration-300"
            >
              <div className="w-14 h-14 bg-nexova-50 text-nexova-700 rounded-xl flex items-center justify-center group-hover:bg-nexova-600 group-hover:text-white transition-colors duration-300">
                {service.icon}
              </div>
              <h3 className="mt-6 text-lg font-semibold text-gray-900">{service.title}</h3>
              <p className="mt-3 text-gray-600 text-sm leading-relaxed">{service.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {service.sectors.map((sector) => (
                  <span key={sector} className="text-xs bg-gray-50 text-gray-500 px-2.5 py-1 rounded-full">
                    {sector}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link
            href="#contacto"
            className="inline-flex items-center gap-2 text-nexova-700 font-semibold hover:text-nexova-800 transition-colors"
          >
            ¿Necesitas un servicio personalizado?
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}