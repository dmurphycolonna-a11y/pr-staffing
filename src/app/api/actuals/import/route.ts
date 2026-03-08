import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * POST /api/actuals/import
 *
 * Accepts a JSON array of actuals rows parsed from CSV.
 * Maps by employee_email + client_code + year + month.
 * Returns a summary of rows imported, skipped, and errors.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { rows } = body as {
    rows: Array<{
      employee_email: string;
      client_code: string;
      year: string | number;
      month: string | number;
      actual_hours?: string | number;
      actual_revenue?: string | number;
      actual_billings?: string | number;
    }>;
  };

  if (!rows || !Array.isArray(rows)) {
    return NextResponse.json({ error: "rows array required" }, { status: 400 });
  }

  // Pre-fetch lookup tables to avoid N+1 queries
  const employees = await prisma.employee.findMany({ select: { id: true, email: true } });
  const clients = await prisma.client.findMany({ select: { id: true, code: true } });

  const emailToId: Record<string, string> = {};
  const codeToId: Record<string, string> = {};
  for (const e of employees) emailToId[e.email.toLowerCase()] = e.id;
  for (const c of clients) codeToId[c.code.toUpperCase()] = c.id;

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];
  const importedAt = new Date();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // account for header row

    const employeeId = emailToId[row.employee_email?.toLowerCase()];
    const clientId = codeToId[row.client_code?.toUpperCase()];
    const year = parseInt(String(row.year));
    const month = parseInt(String(row.month));

    if (!employeeId) { errors.push(`Row ${rowNum}: unknown employee_email "${row.employee_email}"`); skipped++; continue; }
    if (!clientId) { errors.push(`Row ${rowNum}: unknown client_code "${row.client_code}"`); skipped++; continue; }
    if (isNaN(year) || year < 2000 || year > 2100) { errors.push(`Row ${rowNum}: invalid year "${row.year}"`); skipped++; continue; }
    if (isNaN(month) || month < 1 || month > 12) { errors.push(`Row ${rowNum}: invalid month "${row.month}"`); skipped++; continue; }

    const actualHours = row.actual_hours != null && row.actual_hours !== "" ? parseFloat(String(row.actual_hours)) : null;
    const actualRevenue = row.actual_revenue != null && row.actual_revenue !== "" ? parseFloat(String(row.actual_revenue)) : null;
    const actualBillings = row.actual_billings != null && row.actual_billings !== "" ? parseFloat(String(row.actual_billings)) : null;

    try {
      await prisma.actual.upsert({
        where: { employeeId_clientId_year_month: { employeeId, clientId, year, month } },
        create: { employeeId, clientId, year, month, actualHours, actualRevenue, actualBillings, source: "csv_import", importedAt },
        update: { actualHours, actualRevenue, actualBillings, source: "csv_import", importedAt },
      });
      imported++;
    } catch {
      errors.push(`Row ${rowNum}: database error`);
      skipped++;
    }
  }

  return NextResponse.json({ imported, skipped, errors });
}
