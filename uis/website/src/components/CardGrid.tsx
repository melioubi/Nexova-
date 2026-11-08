// Componente compartido para cuadrícula de tarjetas reutilizable
// Elimina duplicación del patrón grid+card en ServicesSection, MethodologySection y TeamSection

interface CardGridItem {
  key: string;
  icon: React.ReactNode;     // El contenido del icon/número/avatar
  title: string;
  description: string;
  // Metadatos adicionales opcionales que cada sección puede inyectar
  meta?: React.ReactNode;
}

interface CardGridProps {
  items: CardGridItem[];
  className?: string;
  cols?: string; // Tailwind grid cols, p.ej. "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
}

export default function CardGrid({
  items,
  className = "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8",
}: CardGridProps) {
  return (
    <div className={className}>
      {items.map((item) => (
        <div
          key={item.key}
          className="group bg-white rounded-2xl p-8 border border-gray-100 hover:border-nexova-200 hover:shadow-lg hover:shadow-nexova-50 transition-all duration-300"
        >
          <div className="w-14 h-14 bg-nexova-50 text-nexova-700 rounded-xl flex items-center justify-center group-hover:bg-nexova-600 group-hover:text-white transition-colors duration-300">
            {item.icon}
          </div>
          <h3 className="mt-6 text-lg font-semibold text-gray-900">{item.title}</h3>
          <p className="mt-3 text-gray-600 text-sm leading-relaxed">{item.description}</p>
          {item.meta && <div className="mt-4">{item.meta}</div>}
        </div>
      ))}
    </div>
  );
}