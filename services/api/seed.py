from database import suppliers_table
from models import SupplierCreate, now_utc


SUPPLIERS_SEED = [
    {
        "name": "LinkedIn Talent Solutions",
        "country": "Spain",
        "categories": ["job_boards"],
        "monthly_rate": 1200.0,
        "currency": "EUR",
        "status": "active",
        "contract_renewal_date": "2025-03-31",
        "contact_email": "account@linkedin.com",
        "notes": "Licencia corporativa para publicación de ofertas y búsqueda de candidatos.",
    },
    {
        "name": "InfoJobs Premium",
        "country": "Spain",
        "categories": ["job_boards"],
        "monthly_rate": 490.0,
        "currency": "EUR",
        "status": "active",
        "contract_renewal_date": "2025-06-30",
        "contact_email": "empresas@infojobs.net",
    },
    {
        "name": "Indeed Sponsored",
        "country": "USA",
        "categories": ["job_boards"],
        "monthly_rate": 850.0,
        "currency": "USD",
        "status": "active",
        "contact_email": "sales@indeed.com",
        "notes": "Campañas de pago por clic para perfiles de customer support en Miami.",
    },
    {
        "name": "Workable",
        "country": "Spain",
        "categories": ["ats_software"],
        "monthly_rate": 299.0,
        "currency": "EUR",
        "status": "active",
        "contract_renewal_date": "2025-09-15",
        "contact_email": "support@workable.com",
        "notes": "ATS principal para el equipo de selección de Valencia.",
    },
    {
        "name": "Greenhouse",
        "country": "USA",
        "categories": ["ats_software"],
        "monthly_rate": 620.0,
        "currency": "USD",
        "status": "suspended",
        "contact_email": "accounts@greenhouse.io",
        "notes": "Suspendido tras no renovar. Sergio está evaluando si migrar todo a Workable.",
    },
    {
        "name": "Thomas International",
        "country": "Spain",
        "categories": ["assessment_tools"],
        "monthly_rate": 380.0,
        "currency": "EUR",
        "status": "active",
        "contract_renewal_date": "2025-12-01",
        "contact_email": "clientes@thomas.es",
        "notes": "Tests de personalidad y aptitud para procesos de mandos intermedios.",
    },
    {
        "name": "HireVue",
        "country": "USA",
        "categories": ["video_interview"],
        "monthly_rate": 540.0,
        "currency": "USD",
        "status": "active",
        "contract_renewal_date": "2025-08-31",
        "contact_email": "support@hirevue.com",
    },
    {
        "name": "Udemy Business",
        "country": "Spain",
        "categories": ["training_platforms"],
        "monthly_rate": 420.0,
        "currency": "EUR",
        "status": "active",
        "contract_renewal_date": "2026-01-15",
        "contact_email": "business@udemy.com",
        "notes": "Licencias para el equipo interno. Gestionado por Elena Vargas.",
    },
    {
        "name": "Coursera for Teams",
        "country": "USA",
        "categories": ["training_platforms"],
        "monthly_rate": 399.0,
        "currency": "USD",
        "status": "suspended",
        "contact_email": "teams@coursera.com",
        "notes": "Suspendido por bajo uso. Revisar antes de Q4.",
    },
    {
        "name": "Sage HR",
        "country": "Spain",
        "categories": ["payroll_and_hr_software"],
        "monthly_rate": 310.0,
        "currency": "EUR",
        "status": "active",
        "contract_renewal_date": "2025-10-01",
        "contact_email": "soporte@sage.com",
        "notes": "Software de nóminas y gestión de personal para la sede de Valencia.",
    },
    {
        "name": "Gusto",
        "country": "USA",
        "categories": ["payroll_and_hr_software"],
        "monthly_rate": 280.0,
        "currency": "USD",
        "status": "active",
        "contact_email": "support@gusto.com",
        "notes": "Gestión de nóminas para los empleados de la oficina de Miami.",
    },
    {
        "name": "Checkr",
        "country": "USA",
        "categories": ["background_check"],
        "monthly_rate": 195.0,
        "currency": "USD",
        "status": "active",
        "contract_renewal_date": "2025-11-30",
        "contact_email": "sales@checkr.com",
    },
    {
        "name": "Microsoft 365 Business",
        "country": "Spain",
        "categories": ["it_and_software_licenses"],
        "monthly_rate": 760.0,
        "currency": "EUR",
        "status": "active",
        "contact_email": "enterprise@microsoft.com",
        "notes": "Licencias para toda la plantilla de Valencia y Miami.",
    },
    {
        "name": "Regus Valencia",
        "country": "Spain",
        "categories": ["office_and_facilities"],
        "monthly_rate": 2400.0,
        "currency": "EUR",
        "status": "active",
        "contract_renewal_date": "2025-07-01",
        "contact_email": "valencia@regus.com",
        "notes": "Alquiler de la oficina principal en Valencia. Incluye sala de reuniones.",
    },
    {
        "name": "WeWork Miami",
        "country": "USA",
        "categories": ["office_and_facilities"],
        "monthly_rate": 3100.0,
        "currency": "USD",
        "status": "active",
        "contract_renewal_date": "2025-09-30",
        "contact_email": "miami@wework.com",
    },
]


# Proveedores de material de formación y kits de incorporación
# (nexova-BRIEFING §2: imprenta, plataforma de e-learning, proveedor de hardware).
SUPPLIERS_SEED += [
    {
        "name": "Imprenta Levante",
        "country": "Spain",
        "categories": ["training_platforms"],
        "monthly_rate": 650.0,
        "currency": "EUR",
        "status": "active",
        "contract_renewal_date": "2027-02-28",
        "contact_email": "pedidos@imprentalevante.es",
        "notes": "Impresión de kits de certificación y manuales de formación (Valencia).",
    },
    {
        "name": "Equipos Turia",
        "country": "Spain",
        "categories": ["it_and_software_licenses"],
        "monthly_rate": 1200.0,
        "currency": "EUR",
        "status": "active",
        "contact_email": "comercial@equiposturia.es",
        "notes": "Laptops de asignación temporal para nuevas incorporaciones en Valencia.",
    },
    {
        "name": "Miami Print & Training Supplies",
        "country": "USA",
        "categories": ["training_platforms"],
        "monthly_rate": 720.0,
        "currency": "USD",
        "status": "active",
        "contact_email": "orders@miamiprint.com",
        "notes": "Manuales de onboarding para los agentes de soporte outsourced.",
    },
    {
        "name": "TechRent Florida",
        "country": "USA",
        "categories": ["it_and_software_licenses"],
        "monthly_rate": 1500.0,
        "currency": "USD",
        "status": "active",
        "contact_email": "accounts@techrentflorida.com",
        "notes": "Laptops y credenciales de acceso para incorporaciones en Miami.",
    },
]


def main() -> None:
    existing_names = {record["name"] for record in suppliers_table.all()}
    inserted = 0
    for supplier_data in SUPPLIERS_SEED:
        if supplier_data["name"] in existing_names:
            continue
        supplier = SupplierCreate.model_validate(supplier_data)
        record = supplier.model_dump(mode="json")
        record["updated_at"] = now_utc().isoformat()
        suppliers_table.insert(record)
        existing_names.add(supplier.name)
        inserted += 1
    print(f"Seed completado: {inserted} proveedores insertados.")


if __name__ == "__main__":
    main()