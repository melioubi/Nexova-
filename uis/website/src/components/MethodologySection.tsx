const steps = [
  {
    number: "01",
    title: "Diagnóstico",
    description: "Analizamos la cultura organizacional, necesidades de talento y brechas del cliente mediante entrevistas y data.",
    color: "bg-nexova-100 text-nexova-700",
  },
  {
    number: "02",
    title: "Estrategia",
    description: "Diseñamos un plan de búsqueda personalizado con perfil de competencias, fuentes de talento y cronograma.",
    color: "bg-nexova-200 text-nexova-800",
  },
  {
    number: "03",
    title: "Búsqueda y Selección",
    description: "Ejecutamos la búsqueda multicanal con evaluación psicométrica y por competencias de cada candidato.",
    color: "bg-nexova-300 text-nexova-800",
  },
  {
    number: "04",
    title: "Presentación",
    description: "Entregamos una shortlist de candidatos evaluados con informes detallados para la decisión final del cliente.",
    color: "bg-nexova-400 text-white",
  },
  {
    number: "05",
    title: "Acompañamiento",
    description: "Soporte durante el proceso de oferta, negociación y onboarding para asegurar una integración exitosa.",
    color: "bg-nexova-700 text-nexova-200",
  },
  {
    number: "06",
    title: "Seguimiento",
    description: "Evaluamos la retención y desempeño a los 3, 6 y 12 meses, ajustando la estrategia según resultados.",
    color: "bg-nexova-950 text-nexova-200",
  },
];

export default function MethodologySection() {
  return (
    <section id="metodologia" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Nuestra Metodología</h2>
          <p className="mt-4 text-lg text-gray-600">
            Un proceso probado en 6 pasos que garantiza resultados consistentes y medibles.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              {/* Connector line (desktop) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-gray-200 -z-10" />
              )}

              <div className="bg-white rounded-2xl p-8 border border-gray-100 hover:shadow-md transition-shadow">
                <div className={`w-12 h-12 rounded-xl ${step.color} flex items-center justify-center text-lg font-bold`}>
                  {step.number}
                </div>
                <h3 className="mt-5 text-lg font-semibold text-gray-900">{step.title}</h3>
                <p className="mt-3 text-gray-600 text-sm leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* SLA highlight */}
        <div className="mt-16 bg-nexova-700 rounded-2xl p-8 md:p-12 text-center text-white">
          <p className="text-2xl md:text-3xl font-bold">
            SLA de contratación ejecutiva: <span className="text-nexova-200">45 días hábiles</span>
          </p>
          <p className="mt-3 text-nexova-200 text-lg">
            Nuestro compromiso con la velocidad sin sacrificar calidad.
          </p>
        </div>
      </div>
    </section>
  );
}