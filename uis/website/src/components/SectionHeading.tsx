// Componente compartido para encabezados de sección
// Elimina duplicación de patrón título+subtítulo en ServicesSection, MethodologySection, TeamSection y ContactSection

interface SectionHeadingProps {
  title: string;
  subtitle: string;
}

export default function SectionHeading({ title, subtitle }: SectionHeadingProps) {
  return (
    <div className="text-center max-w-2xl mx-auto mb-16">
      <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">{title}</h2>
      <p className="mt-4 text-lg text-gray-600">{subtitle}</p>
    </div>
  );
}