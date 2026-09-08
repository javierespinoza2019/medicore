import { lazy } from "react";
import type { RouteObject } from "react-router-dom";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/login/page";
import { EnApp, Pantalla } from "@/router/pantallas";

// Login y NotFound se cargan con el arranque: son la primera pantalla útil y el 404.
// Todo lo demás llega por ruta, para que una estación de clínica abra rápido y opere
// con red intermitente sin descargar la aplicación completa de una sola vez.
const Dashboard = lazy(() => import("@/pages/dashboard/page"));
const Reportes = lazy(() => import("@/pages/reportes/page"));
const PortalPaciente = lazy(() => import("@/pages/portal-paciente/page"));
const Agenda = lazy(() => import("@/pages/agenda/page"));
const SalaEspera = lazy(() => import("@/pages/sala-espera/page"));
const Triage = lazy(() => import("@/pages/triage/page"));
const Urgencias = lazy(() => import("@/pages/urgencias/page"));
const Pacientes = lazy(() => import("@/pages/pacientes/page"));
const PacienteNuevo = lazy(() => import("@/pages/pacientes/nuevo/page"));
const PacienteDetalle = lazy(() => import("@/pages/pacientes/detalle/page"));
const Consultas = lazy(() => import("@/pages/consultas/page"));
const Recetas = lazy(() => import("@/pages/recetas/page"));
const Estudios = lazy(() => import("@/pages/estudios/page"));
const Farmacia = lazy(() => import("@/pages/farmacia/page"));
const Caja = lazy(() => import("@/pages/caja/page"));
const CortesCaja = lazy(() => import("@/pages/caja/cortes/page"));
const Facturacion = lazy(() => import("@/pages/facturacion/page"));
const AdminUsuarios = lazy(() => import("@/pages/administracion/usuarios/page"));
const AdminMedicos = lazy(() => import("@/pages/administracion/medicos/page"));
const AdminEspecialidades = lazy(() => import("@/pages/administracion/especialidades/page"));
const AdminSucursales = lazy(() => import("@/pages/administracion/sucursales/page"));
const AdminServicios = lazy(() => import("@/pages/administracion/servicios/page"));
const AdminCatalogos = lazy(() => import("@/pages/administracion/catalogos/page"));
const AdminDispositivos = lazy(() => import("@/pages/administracion/dispositivos/page"));
const SeguridadRoles = lazy(() => import("@/pages/seguridad/roles/page"));
const SeguridadAuditoria = lazy(() => import("@/pages/seguridad/auditoria/page"));
const MonitorTurnos = lazy(() => import("@/pages/monitor-turnos/page"));
const AvisoPrivacidad = lazy(() => import("@/pages/normatividad/aviso-privacidad/page"));
const Consentimientos = lazy(() => import("@/pages/normatividad/consentimientos/page"));
const DerechosARCO = lazy(() => import("@/pages/normatividad/derechos-arco/page"));
const Referencias = lazy(() => import("@/pages/normatividad/referencias/page"));
const Egresos = lazy(() => import("@/pages/normatividad/egresos/page"));
const RetencionDocumental = lazy(() => import("@/pages/normatividad/retencion/page"));
const VigilanciaEpidemiologica = lazy(() => import("@/pages/normatividad/vigilancia/page"));
const GestionProfesionales = lazy(() => import("@/pages/normatividad/profesionales/page"));
const NotasEnfermeria = lazy(() => import("@/pages/normatividad/notas-enfermeria/page"));
const DocumentoSeguridad = lazy(() => import("@/pages/normatividad/documento-seguridad/page"));
const ChecklistNOM = lazy(() => import("@/pages/normatividad/checklist-nom/page"));
const Hl7Fhir = lazy(() => import("@/pages/hl7-fhir/page"));

const routes: RouteObject[] = [
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/portal-paciente",
    element: (
      <Pantalla>
        <PortalPaciente />
      </Pantalla>
    ),
  },
  {
    path: "/app",
    element: <EnApp><Agenda /></EnApp>,
  },
  {
    path: "/app/dashboard",
    element: <EnApp><Dashboard /></EnApp>,
  },
  {
    path: "/app/reportes",
    element: <EnApp><Reportes /></EnApp>,
  },
  {
    path: "/app/agenda",
    element: <EnApp><Agenda /></EnApp>,
  },
  {
    path: "/app/sala-espera",
    element: <EnApp><SalaEspera /></EnApp>,
  },
  {
    path: "/app/triage",
    element: <EnApp><Triage /></EnApp>,
  },
  {
    path: "/app/urgencias",
    element: <EnApp><Urgencias /></EnApp>,
  },
  {
    path: "/app/pacientes",
    element: <EnApp><Pacientes /></EnApp>,
  },
  {
    path: "/app/pacientes/nuevo",
    element: <EnApp><PacienteNuevo /></EnApp>,
  },
  {
    path: "/app/pacientes/:id",
    element: <EnApp><PacienteDetalle /></EnApp>,
  },
  {
    path: "/app/consultas",
    element: <EnApp><Consultas /></EnApp>,
  },
  {
    path: "/app/recetas",
    element: <EnApp><Recetas /></EnApp>,
  },
  {
    path: "/app/estudios",
    element: <EnApp><Estudios /></EnApp>,
  },
  {
    path: "/app/farmacia",
    element: <EnApp><Farmacia /></EnApp>,
  },
  {
    path: "/app/caja",
    element: <EnApp><Caja /></EnApp>,
  },
  {
    path: "/app/caja/cortes",
    element: <EnApp><CortesCaja /></EnApp>,
  },
  {
    path: "/app/facturacion",
    element: <EnApp><Facturacion /></EnApp>,
  },
  {
    path: "/app/administracion/usuarios",
    element: <EnApp><AdminUsuarios /></EnApp>,
  },
  {
    path: "/app/administracion/medicos",
    element: <EnApp><AdminMedicos /></EnApp>,
  },
  {
    path: "/app/administracion/especialidades",
    element: <EnApp><AdminEspecialidades /></EnApp>,
  },
  {
    path: "/app/administracion/sucursales",
    element: <EnApp><AdminSucursales /></EnApp>,
  },
  {
    path: "/app/administracion/servicios",
    element: <EnApp><AdminServicios /></EnApp>,
  },
  {
    path: "/app/administracion/catalogos",
    element: <EnApp><AdminCatalogos /></EnApp>,
  },
  {
    path: "/app/administracion/dispositivos",
    element: <EnApp><AdminDispositivos /></EnApp>,
  },
  {
    path: "/app/seguridad/roles",
    element: <EnApp><SeguridadRoles /></EnApp>,
  },
  {
    path: "/app/seguridad/auditoria",
    element: <EnApp><SeguridadAuditoria /></EnApp>,
  },
  {
    path: "/app/monitor-turnos",
    element: (
      <Pantalla>
        <MonitorTurnos />
      </Pantalla>
    ),
  },
  {
    path: "/app/normatividad/aviso-privacidad",
    element: <EnApp><AvisoPrivacidad /></EnApp>,
  },
  {
    path: "/app/normatividad/consentimientos",
    element: <EnApp><Consentimientos /></EnApp>,
  },
  {
    path: "/app/normatividad/derechos-arco",
    element: <EnApp><DerechosARCO /></EnApp>,
  },
  {
    path: "/app/normatividad/referencias",
    element: <EnApp><Referencias /></EnApp>,
  },
  {
    path: "/app/normatividad/egresos",
    element: <EnApp><Egresos /></EnApp>,
  },
  {
    path: "/app/normatividad/retencion",
    element: <EnApp><RetencionDocumental /></EnApp>,
  },
  {
    path: "/app/normatividad/vigilancia",
    element: <EnApp><VigilanciaEpidemiologica /></EnApp>,
  },
  {
    path: "/app/normatividad/profesionales",
    element: <EnApp><GestionProfesionales /></EnApp>,
  },
  {
    path: "/app/normatividad/notas-enfermeria",
    element: <EnApp><NotasEnfermeria /></EnApp>,
  },
  {
    path: "/app/normatividad/documento-seguridad",
    element: <EnApp><DocumentoSeguridad /></EnApp>,
  },
  {
    path: "/app/normatividad/checklist-nom",
    element: <EnApp><ChecklistNOM /></EnApp>,
  },
  {
    path: "/app/hl7-fhir",
    element: <EnApp><Hl7Fhir /></EnApp>,
  },
  {
    path: "/",
    element: <Login />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
];

export default routes;
