import Link from "next/link";

export default function HeroSection() {
  return (
    <section id="hero" className="relative min-h-screen flex items-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 md:py-40">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Text content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-800 px-4 py-2 rounded-full text-sm font-medium">
              <span className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
              Presencia en Chile y Argentina
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              El talento que tu empresa necesita,{" "}
              <span className="text-indigo-700">donde lo necesitas</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 leading-relaxed max-w-lg">
              Somos consultores especializados en RR.HH. y adquisición de talento.
              Conectamos organizaciones con profesionales excepcionales en Chile y Argentina.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="#contacto"
                className="bg-indigo-700 text-white px-8 py-3.5 rounded-xl text-base font-semibold hover:bg-indigo-800 transition-colors shadow-lg shadow-indigo-200"
              >
                Solicitar asesoría
              </Link>
              <Link
                href="#servicios"
                className="border-2 border-gray-300 text-gray-700 px-8 py-3.5 rounded-xl text-base font-semibold hover:border-indigo-400 hover:text-indigo-700 transition-colors"
              >
                Ver servicios
              </Link>
            </div>
          </div>

          {/* Stats / Visual */}
          <div className="hidden lg:grid grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-8 shadow-xl shadow-indigo-100/50 border border-gray-100">
              <p className="text-4xl font-bold text-indigo-700">65+</p>
              <p className="text-gray-500 mt-2">Clientes activos</p>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-xl shadow-indigo-100/50 border border-gray-100 mt-8">
              <p className="text-4xl font-bold text-indigo-700">45+</p>
              <p className="text-gray-500 mt-2">Consultores internos</p>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-xl shadow-indigo-100/50 border border-gray-100">
              <p className="text-4xl font-bold text-indigo-700">500+</p>
              <p className="text-gray-500 mt-2">Vacantes cubiertas</p>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-xl shadow-indigo-100/50 border border-gray-100 mt-8">
              <p className="text-4xl font-bold text-indigo-700">92%</p>
              <p className="text-gray-500 mt-2">Satisfacción NPS</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}