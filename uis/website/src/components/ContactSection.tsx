"use client";

import { useState, type FormEvent } from "react";

const countries = ["Chile", "Argentina", "Otro"];

export default function ContactSection() {
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
    <section id="contacto" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Info */}
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Contacto</h2>
            <p className="mt-4 text-lg text-gray-600">
              Cuéntanos qué necesita tu organización y te contactaremos en menos de 24 horas hábiles.
            </p>

            <div className="mt-12 space-y-8">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-nexova-100 text-nexova-700 rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Oficinas</h4>
                  <p className="text-gray-600 text-sm mt-1">
                    Av. Apoquindo 4500, Santiago, Chile<br />
                    Av. Corrientes 1234, Buenos Aires, Argentina
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-12 h-12 bg-nexova-100 text-nexova-700 rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Email</h4>
                  <p className="text-gray-600 text-sm mt-1">
                    contacto@nexova.com<br />
                    talento@nexova.com
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-12 h-12 bg-nexova-100 text-nexova-700 rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Teléfono</h4>
                  <p className="text-gray-600 text-sm mt-1">
                    Chile: +56 2 2345 6789<br />
                    Argentina: +54 11 4567 8901
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
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
        </div>
      </div>
    </section>
  );
}