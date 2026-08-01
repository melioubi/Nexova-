const teamMembers = [
  {
    name: "Andrés Silva",
    role: "CEO & Fundador",
    bio: "15+ años en consultoría de RR.HH. Ex-Director de Talento en Mercado Libre. Especialista en estrategia organizacional.",
    image: "AS",
    color: "bg-nexova-600",
  },
  {
    name: "Carolina Méndez",
    role: "Directora de Adquisición de Talento",
    bio: "Experta en Executive Search para minería y tecnología. Lidera el equipo de búsqueda en Chile.",
    image: "CM",
    color: "bg-nexova-500",
  },
  {
    name: "Federico Lagos",
    role: "Director de Consultoría RR.HH.",
    bio: "Psicólogo organizacional. Ha liderado transformaciones culturales en empresas del retail y banca.",
    image: "FL",
    color: "bg-nexova-400",
  },
  {
    name: "Lucía Peralta",
    role: "Head de People Analytics",
    bio: "Data Scientist especializada en métricas de RR.HH. Creadora del modelo predictivo de fuga de talento de Nexova.",
    image: "LP",
    color: "bg-nexova-700",
  },
  {
    name: "Martín Ross",
    role: "Director Argentina",
    bio: "Lidera la operación en Buenos Aires. Especialista en fintech y agroindustria con 12 años de experiencia.",
    image: "MR",
    color: "bg-nexova-800",
  },
  {
    name: "Valentina Ruiz",
    role: "Head de Evaluación de Talento",
    bio: "Psicóloga laboral con máster en Evaluación de Potencial. Diseñó el sistema de assessment de Nexova.",
    image: "VR",
    color: "bg-nexova-950",
  },
];

export default function TeamSection() {
  return (
    <section id="equipo" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Nuestro Equipo</h2>
          <p className="mt-4 text-lg text-gray-600">
            Más de 45 consultores apasionados por conectar personas con oportunidades extraordinarias.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {teamMembers.map((member) => (
            <div
              key={member.name}
              className="bg-white rounded-2xl p-8 border border-gray-100 hover:border-nexova-200 hover:shadow-lg transition-all duration-300 text-center group"
            >
              {/* Avatar */}
              <div className={`w-20 h-20 ${member.color} rounded-2xl mx-auto flex items-center justify-center text-white text-xl font-bold group-hover:scale-110 transition-transform duration-300`}>
                {member.image}
              </div>
              <h3 className="mt-5 text-lg font-semibold text-gray-900">{member.name}</h3>
              <p className="text-nexova-700 text-sm font-medium">{member.role}</p>
              <p className="mt-3 text-gray-600 text-sm leading-relaxed">{member.bio}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}