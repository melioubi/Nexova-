"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

/*
 * Lazy loading of the contact form (CACHING_REPORT.md, frontend decision 2).
 *
 * The contact section is the last block of a long landing page: most visits
 * never reach it, but its form (state + handlers) was shipped and hydrated on
 * every load. The section's text stays server-rendered (SEO, no JS); only the
 * interactive form is downloaded when the section is ~600px from the viewport,
 * early enough that it is ready by the time the visitor sees it.
 *
 * `next/dynamic` is used from this Client Component on purpose: when a Server
 * Component dynamically imports a Client Component, Next does not code-split it.
 */
const ContactForm = dynamic(() => import("./ContactForm"), {
  ssr: false,
  loading: () => <FormPlaceholder />,
});

function FormPlaceholder() {
  // Same footprint as the form to avoid layout shift while it loads.
  return (
    <div
      className="bg-white rounded-2xl p-8 md:p-10 border border-gray-100 min-h-[560px] flex items-center justify-center text-gray-500"
      role="status"
    >
      Cargando formulario…
    </div>
  );
}

export default function LazyContactForm() {
  const anchor = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = anchor.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return <div ref={anchor}>{visible ? <ContactForm /> : <FormPlaceholder />}</div>;
}
