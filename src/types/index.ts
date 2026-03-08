// Shared TypeScript types used across the app.
// Prisma types are used directly in server code; these lighter types are for API responses.

export type UserRole =
  | "ADMIN"
  | "STAFFING_MANAGER"
  | "FINANCE"
  | "DEPARTMENT_LEADER"
  | "EMPLOYEE_MANAGER";

export interface UserSummary {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
}

export interface OfficeSummary {
  id: string;
  name: string;
  code: string;
}

export interface DepartmentSummary {
  id: string;
  name: string;
  officeId: string;
  office: OfficeSummary;
}

export interface JobTitleSummary {
  id: string;
  name: string;
  level: number;
}

export interface EmployeeSummary {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  jobTitle: JobTitleSummary;
  office?: OfficeSummary | null;
  department?: DepartmentSummary | null;
}

export interface ClientSummary {
  id: string;
  name: string;
  code: string;
  industry?: string | null;
  contactName?: string | null;
  isActive: boolean;
}

export interface ClientRateSummary {
  id: string;
  clientId: string;
  client: ClientSummary;
  jobTitleId: string;
  jobTitle: JobTitleSummary;
  hourlyRate: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
}

// ── Staffing Grid ───────────────────────────────────────────────────────────

export interface AllocationCell {
  allocationId: string | null;
  plannedHours: number | null;
  plannedPct: number | null;
  plannedRevenue: number | null;
}

export interface GridRow {
  employee: EmployeeSummary;
  rate: number | null; // resolved hourly rate for this client
  cells: Record<string, AllocationCell>; // key = "YYYY-MM"
  capacities: Record<string, number>; // key = "YYYY-MM", value = totalHours
  totalAllocatedHours: Record<string, number>; // all-client totals for utilization warning
}

export interface GridData {
  client: ClientSummary;
  rows: GridRow[];
  months: Array<{ year: number; month: number; label: string; key: string }>;
}

// ── Report types ──────────────────────────────────────────────────────────────

export interface EmployeeReportRow {
  employeeId: string;
  employeeName: string;
  jobTitle: string;
  office: string;
  department: string;
  plannedHours: number;
  plannedRevenue: number;
  actualHours: number;
  actualRevenue: number;
  actualBillings: number;
  hoursVariance: number; // actual - planned
  revenueVariance: number;
  capacityHours: number;
  utilizationPct: number; // actualHours / capacityHours
  avgRealizedRate: number | null;
}

export interface ClientReportRow {
  clientId: string;
  clientName: string;
  industry: string;
  staffCount: number;
  plannedHours: number;
  plannedRevenue: number;
  actualHours: number;
  actualRevenue: number;
  actualBillings: number;
  hoursVariance: number;
  revenueVariance: number;
}

export interface MonthlyReportRow {
  year: number;
  month: number;
  label: string;
  plannedHours: number;
  plannedRevenue: number;
  actualHours: number;
  actualRevenue: number;
  actualBillings: number;
  hoursVariance: number;
  revenueVariance: number;
  capacityHours: number;
  utilizationPct: number;
}

export interface DashboardSummary {
  currentMonth: { year: number; month: number; label: string };
  activeEmployees: number;
  activeClients: number;
  totalPlannedHours: number;
  totalActualHours: number;
  totalPlannedRevenue: number;
  totalActualRevenue: number;
  utilizationPct: number;
  overAllocatedCount: number;
  recentMonths: MonthlyReportRow[];
  topClients: ClientReportRow[];
}
