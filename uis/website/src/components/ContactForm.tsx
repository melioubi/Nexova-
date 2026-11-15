"use client";

import { useState, type FormEvent } from "react";

const countries = ["Chile", "Argentina", "Otro"];

/*
 * Interactive part of the contact section. Loaded lazily by LazyContactForm
 * when the section approaches the viewport (see CACHING_REPORT.md).
 */
export default function ContactForm() {
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    empresa: "",
    pais: "Chile",
    servicio: "",
    mensaje: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // Simulación de envío — en producción iría a un servicio
    setSubmitted(true);
  };

  return (
    <>
      {submitted ? (
        <div className="bg-white rounded-2xl p-12 border border-gray-100 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">¡Mensaje enviado!</h3>
          <p className="mt-3 text-gray-600">
            Gracias por contactarnos. Te responderemos en las próximas 24 horas hábiles.
          </p>
          <button
            onClick={() => { setSubmitted(false); setFormData({ nombre: "", email: "", empresa: "", pais: "Chile", servicio: "", mensaje: "" }); }}
            className="mt-6 text-nexova-700 font-semibold hover:text-nexova-800 transition-colors"
          >
            Enviar otro mensaje
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 md:p-10 border border-gray-100 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-2">Nombre completo</label>
              <input
                id="nombre"
                type="text"
                required
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-nexova-400 focus:ring-2 focus:ring-nexova-100 outline-none transition-colors"
                placeholder="Tu nombre"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-nexova-400 focus:ring-2 focus:ring-nexova-100 outline-none transition-colors"
                placeholder="tu@email.com"
              />
            </div>
          </div>
  
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label htmlFor="empresa" className="block text-sm font-medium text-gray-700 mb-2">Empresa</label>
              <input
                id="empresa"
                type="text"
                value={formData.empresa}
                onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-nexova-400 focus:ring-2 focus:ring-nexova-100 outline-none transition-colors"
                placeholder="Nombre de tu empresa"
              />
            </div>
            <div>
              <label htmlFor="pais" className="block text-sm font-medium text-gray-700 mb-2">País</label>
              <select
                id="pais"
                value={formData.pais}
                onChange={(e) => setFormData({ ...formData, pais: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-nexova-400 focus:ring-2 focus:ring-nexova-100 outline-none transition-colors bg-white"
              >
                {countries.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
  
          <div>
            <label htmlFor="servicio" className="block text-sm font-medium text-gray-700 mb-2">Servicio de interés</label>
            <select
              id="servicio"
              value={formData.servicio}
              onChange={(e) => setFormData({ ...formData, servicio: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-nexova-400 focus:ring-2 focus:ring-nexova-100 outline-none transition-colors bg-white"
            >
              <option value="">Selecciona un servicio</option>
              <option value="executive-search">Executive Search</option>
              <option value="rpo">Recruitment Process Outsourcing</option>
              <option value="consultoria">Consultoría en RR.HH.</option>
              <option value="people-analytics">People Analytics</option>
              <option value="evaluacion">Evaluación de Talento</option>
              <option value="nomina">Outsourcing de Nómina</option>
              <option value="otro">Otro</option>
            </select>
          </div>
  
          <div>
            <label htmlFor="mensaje" className="block text-sm font-medium text-gray-700 mb-2">Mensaje</label>
            <textarea
              id="mensaje"
              rows={4}
              value={formData.mensaje}
              onChange={(e) => setFormData({ ...formData, mensaje: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-nexova-400 focus:ring-2 focus:ring-nexova-100 outline-none transition-colors resize-none"
              placeholder="Cuéntanos sobre tu necesidad de talento..."
            />
          </div>
  
          <button
            type="submit"
            className="w-full bg-nexova-600 text-white py-3.5 rounded-xl font-semibold hover:bg-nexova-700 transition-colors shadow-lg shadow-nexova-200"
          >
            Enviar mensaje
          </button>
        </form>
      )}
    </>
  );
}
