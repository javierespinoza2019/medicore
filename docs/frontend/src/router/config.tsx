import type { RouteObject } from "react-router-dom";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/login/page";
import AppLayout from "@/components/feature/AppLayout";
import Dashboard from "@/pages/dashboard/page";
import Reportes from "@/pages/reportes/page";
import PortalPaciente from "@/pages/portal-paciente/page";
import Agenda from "@/pages/agenda/page";
import SalaEspera from "@/pages/sala-espera/page";
import Triage from "@/pages/triage/page";
import Urgencias from "@/pages/urgencias/page";
import Pacientes from "@/pages/pacientes/page";
import PacienteNuevo from "@/pages/pacientes/nuevo/page";
import PacienteDetalle from "@/pages/pacientes/detalle/page";
import Consultas from "@/pages/consultas/page";
import Recetas from "@/pages/recetas/page";
import Estudios from "@/pages/estudios/page";
import Farmacia from "@/pages/farmacia/page";
import Caja from "@/pages/caja/page";
import CortesCaja from "@/pages/caja/cortes/page";
import Facturacion from "@/pages/facturacion/page";
import AdminUsuarios from "@/pages/administracion/usuarios/page";
import AdminMedicos from "@/pages/administracion/medicos/page";
import AdminEspecialidades from "@/pages/administracion/especialidades/page";
import AdminSucursales from "@/pages/administracion/sucursales/page";
import AdminServicios from "@/pages/administracion/servicios/page";
import AdminCatalogos from "@/pages/administracion/catalogos/page";
import SeguridadRoles from "@/pages/seguridad/roles/page";
import SeguridadAuditoria from "@/pages/seguridad/auditoria/page";
import MonitorTurnos from "@/pages/monitor-turnos/page";
import AvisoPrivacidad from "@/pages/normatividad/aviso-privacidad/page";
import Consentimientos from "@/pages/normatividad/consentimientos/page";
import DerechosARCO from "@/pages/normatividad/derechos-arco/page";
import Referencias from "@/pages/normatividad/referencias/page";
import Egresos from "@/pages/normatividad/egresos/page";
import RetencionDocumental from "@/pages/normatividad/retencion/page";
import VigilanciaEpidemiologica from "@/pages/normatividad/vigilancia/page";
import GestionProfesionales from "@/pages/normatividad/profesionales/page";
import NotasEnfermeria from "@/pages/normatividad/notas-enfermeria/page";
import DocumentoSeguridad from "@/pages/normatividad/documento-seguridad/page";
import ChecklistNOM from "@/pages/normatividad/checklist-nom/page";
import Hl7Fhir from "@/pages/hl7-fhir/page";

const routes: RouteObject[] = [
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/portal-paciente",
    element: <PortalPaciente />,
  },
  {
    path: "/app",
    element: <AppLayout><Agenda /></AppLayout>,
  },
  {
    path: "/app/dashboard",
    element: <AppLayout><Dashboard /></AppLayout>,
  },
  {
    path: "/app/reportes",
    element: <AppLayout><Reportes /></AppLayout>,
  },
  {
    path: "/app/agenda",
    element: <AppLayout><Agenda /></AppLayout>,
  },
  {
    path: "/app/sala-espera",
    element: <AppLayout><SalaEspera /></AppLayout>,
  },
  {
    path: "/app/triage",
    element: <AppLayout><Triage /></AppLayout>,
  },
  {
    path: "/app/urgencias",
    element: <AppLayout><Urgencias /></AppLayout>,
  },
  {
    path: "/app/pacientes",
    element: <AppLayout><Pacientes /></AppLayout>,
  },
  {
    path: "/app/pacientes/nuevo",
    element: <AppLayout><PacienteNuevo /></AppLayout>,
  },
  {
    path: "/app/pacientes/:id",
    element: <AppLayout><PacienteDetalle /></AppLayout>,
  },
  {
    path: "/app/consultas",
    element: <AppLayout><Consultas /></AppLayout>,
  },
  {
    path: "/app/recetas",
    element: <AppLayout><Recetas /></AppLayout>,
  },
  {
    path: "/app/estudios",
    element: <AppLayout><Estudios /></AppLayout>,
  },
  {
    path: "/app/farmacia",
    element: <AppLayout><Farmacia /></AppLayout>,
  },
  {
    path: "/app/caja",
    element: <AppLayout><Caja /></AppLayout>,
  },
  {
    path: "/app/caja/cortes",
    element: <AppLayout><CortesCaja /></AppLayout>,
  },
  {
    path: "/app/facturacion",
    element: <AppLayout><Facturacion /></AppLayout>,
  },
  {
    path: "/app/administracion/usuarios",
    element: <AppLayout><AdminUsuarios /></AppLayout>,
  },
  {
    path: "/app/administracion/medicos",
    element: <AppLayout><AdminMedicos /></AppLayout>,
  },
  {
    path: "/app/administracion/especialidades",
    element: <AppLayout><AdminEspecialidades /></AppLayout>,
  },
  {
    path: "/app/administracion/sucursales",
    element: <AppLayout><AdminSucursales /></AppLayout>,
  },
  {
    path: "/app/administracion/servicios",
    element: <AppLayout><AdminServicios /></AppLayout>,
  },
  {
    path: "/app/administracion/catalogos",
    element: <AppLayout><AdminCatalogos /></AppLayout>,
  },
  {
    path: "/app/seguridad/roles",
    element: <AppLayout><SeguridadRoles /></AppLayout>,
  },
  {
    path: "/app/seguridad/auditoria",
    element: <AppLayout><SeguridadAuditoria /></AppLayout>,
  },
  {
    path: "/app/monitor-turnos",
    element: <MonitorTurnos />,
  },
  {
    path: "/app/normatividad/aviso-privacidad",
    element: <AppLayout><AvisoPrivacidad /></AppLayout>,
  },
  {
    path: "/app/normatividad/consentimientos",
    element: <AppLayout><Consentimientos /></AppLayout>,
  },
  {
    path: "/app/normatividad/derechos-arco",
    element: <AppLayout><DerechosARCO /></AppLayout>,
  },
  {
    path: "/app/normatividad/referencias",
    element: <AppLayout><Referencias /></AppLayout>,
  },
  {
    path: "/app/normatividad/egresos",
    element: <AppLayout><Egresos /></AppLayout>,
  },
  {
    path: "/app/normatividad/retencion",
    element: <AppLayout><RetencionDocumental /></AppLayout>,
  },
  {
    path: "/app/normatividad/vigilancia",
    element: <AppLayout><VigilanciaEpidemiologica /></AppLayout>,
  },
  {
    path: "/app/normatividad/profesionales",
    element: <AppLayout><GestionProfesionales /></AppLayout>,
  },
  {
    path: "/app/normatividad/notas-enfermeria",
    element: <AppLayout><NotasEnfermeria /></AppLayout>,
  },
  {
    path: "/app/normatividad/documento-seguridad",
    element: <AppLayout><DocumentoSeguridad /></AppLayout>,
  },
  {
    path: "/app/normatividad/checklist-nom",
    element: <AppLayout><ChecklistNOM /></AppLayout>,
  },
  {
    path: "/app/hl7-fhir",
    element: <AppLayout><Hl7Fhir /></AppLayout>,
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