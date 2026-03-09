import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── Clear existing data (order matters for FK constraints) ──────────────
  await prisma.actual.deleteMany();
  await prisma.allocation.deleteMany();
  await prisma.capacity.deleteMany();
  await prisma.clientRate.deleteMany();
  await prisma.client.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.jobTitle.deleteMany();
  await prisma.department.deleteMany();
  await prisma.office.deleteMany();
  await prisma.user.deleteMany();

  // ── Offices ─────────────────────────────────────────────────────────────
  const [nyc, ldn, lax] = await Promise.all([
    prisma.office.create({ data: { name: "New York", code: "NYC" } }),
    prisma.office.create({ data: { name: "London", code: "LDN" } }),
    prisma.office.create({ data: { name: "Los Angeles", code: "LAX" } }),
  ]);

  // ── Departments ──────────────────────────────────────────────────────────
  const [nycConsumer, nycCorp, nycDigital, ldnConsumer, ldnCorp, laxConsumer] =
    await Promise.all([
      prisma.department.create({ data: { name: "Consumer PR", officeId: nyc.id } }),
      prisma.department.create({ data: { name: "Corporate & Financial PR", officeId: nyc.id } }),
      prisma.department.create({ data: { name: "Digital & Social", officeId: nyc.id } }),
      prisma.department.create({ data: { name: "Consumer PR", officeId: ldn.id } }),
      prisma.department.create({ data: { name: "Corporate PR", officeId: ldn.id } }),
      prisma.department.create({ data: { name: "Consumer & Lifestyle PR", officeId: lax.id } }),
    ]);

  // ── Job Titles (level codes: WS_MANAGE.N = senior, WS_ASSOC.N = junior) ──
  const [mdTitle, vpTitle, adTitle, samTitle, amTitle, saeTitle, aeTitle] =
    await Promise.all([
      prisma.jobTitle.create({ data: { name: "Managing Director",      level: "WS_MANAGE.1" } }),
      prisma.jobTitle.create({ data: { name: "Vice President",         level: "WS_MANAGE.2" } }),
      prisma.jobTitle.create({ data: { name: "Account Director",       level: "WS_MANAGE.3" } }),
      prisma.jobTitle.create({ data: { name: "Senior Account Manager", level: "WS_ASSOC.1" } }),
      prisma.jobTitle.create({ data: { name: "Account Manager",        level: "WS_ASSOC.2" } }),
      prisma.jobTitle.create({ data: { name: "Senior Account Executive", level: "WS_ASSOC.3" } }),
      prisma.jobTitle.create({ data: { name: "Account Executive",      level: "WS_ASSOC.4" } }),
    ]);

  // ── Users (hashed passwords) ─────────────────────────────────────────────
  const hash = (pw: string) => bcrypt.hashSync(pw, 10);
  await Promise.all([
    prisma.user.create({
      data: { email: "admin@agency.com", name: "Alex Admin", password: hash("Admin123!"), role: "ADMIN" },
    }),
    prisma.user.create({
      data: { email: "staffing@agency.com", name: "Sam Staffing", password: hash("Staffing123!"), role: "STAFFING_MANAGER" },
    }),
    prisma.user.create({
      data: { email: "finance@agency.com", name: "Fiona Finance", password: hash("Finance123!"), role: "FINANCE" },
    }),
    prisma.user.create({
      data: { email: "director@agency.com", name: "Dana Director", password: hash("Director123!"), role: "DEPARTMENT_LEADER" },
    }),
  ]);

  // ── Employees ────────────────────────────────────────────────────────────
  const [
    sarahChen, marcusJohnson, emilyRodriguez, davidKim, jessicaPark, tylerBrooks,
    jamesWilson, charlotteDavies, oliverSmith, sophieTaylor,
    amandaFoster, ryanChen, mariaSantos, kevinLee, priyaPatel,
  ] = await Promise.all([
    // NYC
    prisma.employee.create({ data: { name: "Sarah Chen", email: "sarah.chen@agency.com", jobTitleId: vpTitle.id, officeId: nyc.id, departmentId: nycConsumer.id, startDate: new Date("2019-03-01") } }),
    prisma.employee.create({ data: { name: "Marcus Johnson", email: "marcus.johnson@agency.com", jobTitleId: adTitle.id, officeId: nyc.id, departmentId: nycConsumer.id, startDate: new Date("2020-07-15") } }),
    prisma.employee.create({ data: { name: "Emily Rodriguez", email: "emily.rodriguez@agency.com", jobTitleId: samTitle.id, officeId: nyc.id, departmentId: nycConsumer.id, startDate: new Date("2021-02-01") } }),
    prisma.employee.create({ data: { name: "David Kim", email: "david.kim@agency.com", jobTitleId: amTitle.id, officeId: nyc.id, departmentId: nycCorp.id, startDate: new Date("2022-05-16") } }),
    prisma.employee.create({ data: { name: "Jessica Park", email: "jessica.park@agency.com", jobTitleId: saeTitle.id, officeId: nyc.id, departmentId: nycDigital.id, startDate: new Date("2023-01-09") } }),
    prisma.employee.create({ data: { name: "Tyler Brooks", email: "tyler.brooks@agency.com", jobTitleId: aeTitle.id, officeId: nyc.id, departmentId: nycDigital.id, startDate: new Date("2023-08-21") } }),
    // London
    prisma.employee.create({ data: { name: "James Wilson", email: "james.wilson@agency.com", jobTitleId: vpTitle.id, officeId: ldn.id, departmentId: ldnConsumer.id, startDate: new Date("2018-11-01") } }),
    prisma.employee.create({ data: { name: "Charlotte Davies", email: "charlotte.davies@agency.com", jobTitleId: adTitle.id, officeId: ldn.id, departmentId: ldnConsumer.id, startDate: new Date("2020-09-01") } }),
    prisma.employee.create({ data: { name: "Oliver Smith", email: "oliver.smith@agency.com", jobTitleId: samTitle.id, officeId: ldn.id, departmentId: ldnCorp.id, startDate: new Date("2021-06-14") } }),
    prisma.employee.create({ data: { name: "Sophie Taylor", email: "sophie.taylor@agency.com", jobTitleId: amTitle.id, officeId: ldn.id, departmentId: ldnCorp.id, startDate: new Date("2022-03-07") } }),
    // Los Angeles
    prisma.employee.create({ data: { name: "Amanda Foster", email: "amanda.foster@agency.com", jobTitleId: adTitle.id, officeId: lax.id, departmentId: laxConsumer.id, startDate: new Date("2020-01-06") } }),
    prisma.employee.create({ data: { name: "Ryan Chen", email: "ryan.chen@agency.com", jobTitleId: samTitle.id, officeId: lax.id, departmentId: laxConsumer.id, startDate: new Date("2021-10-18") } }),
    prisma.employee.create({ data: { name: "Maria Santos", email: "maria.santos@agency.com", jobTitleId: aeTitle.id, officeId: lax.id, departmentId: laxConsumer.id, startDate: new Date("2023-04-03") } }),
    prisma.employee.create({ data: { name: "Kevin Lee", email: "kevin.lee@agency.com", jobTitleId: amTitle.id, officeId: lax.id, departmentId: laxConsumer.id, startDate: new Date("2022-08-22") } }),
    prisma.employee.create({ data: { name: "Priya Patel", email: "priya.patel@agency.com", jobTitleId: saeTitle.id, officeId: lax.id, departmentId: laxConsumer.id, startDate: new Date("2023-02-13") } }),
  ]);

  // ── Clients ───────────────────────────────────────────────────────────────
  const [luxBrand, techVision, greenLeaf, meridian, atlas, nova, clearpath, beacon, summit, coastal] =
    await Promise.all([
      prisma.client.create({ data: { name: "LuxBrand International", code: "LUXB", industry: "Luxury Retail", contactName: "Victoria Harmon" } }),
      prisma.client.create({ data: { name: "TechVision Corp", code: "TECH", industry: "Technology", contactName: "Derek Pang" } }),
      prisma.client.create({ data: { name: "GreenLeaf Foods", code: "GNLF", industry: "FMCG / Food & Beverage", contactName: "Lisa Moreau" } }),
      prisma.client.create({ data: { name: "Meridian Health", code: "MERH", industry: "Healthcare", contactName: "Dr. Paul Ng" } }),
      prisma.client.create({ data: { name: "Atlas Financial Group", code: "ATLF", industry: "Financial Services", contactName: "Robert Ashby" } }),
      prisma.client.create({ data: { name: "Nova Entertainment", code: "NOVA", industry: "Entertainment & Media", contactName: "Chloe Ramos" } }),
      prisma.client.create({ data: { name: "Clearpath Mobility", code: "CLRP", industry: "Automotive / EV", contactName: "Thomas Brandt" } }),
      prisma.client.create({ data: { name: "Beacon Retail", code: "BCNR", industry: "Retail", contactName: "Nancy Fields" } }),
      prisma.client.create({ data: { name: "Summit Energy", code: "SMTE", industry: "Energy & Utilities", contactName: "Greg Holloway" } }),
      prisma.client.create({ data: { name: "Coastal Properties", code: "CSTL", industry: "Real Estate", contactName: "Anna Levi" } }),
    ]);

  // ── Client Rates ──────────────────────────────────────────────────────────
  // Base hourly rates by title. Client multipliers applied below.
  const baseRates: Record<string, number> = {
    [mdTitle.id]:  420,
    [vpTitle.id]:  320,
    [adTitle.id]:  260,
    [samTitle.id]: 200,
    [amTitle.id]:  160,
    [saeTitle.id]: 130,
    [aeTitle.id]:  100,
  };

  const clientMultipliers: Record<string, number> = {
    [luxBrand.id]:  1.20, // premium luxury client
    [techVision.id]: 1.15,
    [greenLeaf.id]: 1.00,
    [meridian.id]:  1.10,
    [atlas.id]:     1.25, // premium financial
    [nova.id]:      0.95,
    [clearpath.id]: 1.05,
    [beacon.id]:    0.90, // value/price-sensitive
    [summit.id]:    1.00,
    [coastal.id]:   0.95,
  };

  const effectiveFrom = new Date("2025-01-01");
  const clients = [luxBrand, techVision, greenLeaf, meridian, atlas, nova, clearpath, beacon, summit, coastal];
  const titles = [mdTitle, vpTitle, adTitle, samTitle, amTitle, saeTitle, aeTitle];

  await Promise.all(
    clients.flatMap((client) =>
      titles.map((title) =>
        prisma.clientRate.create({
          data: {
            clientId: client.id,
            jobTitleId: title.id,
            hourlyRate: Math.round(baseRates[title.id] * clientMultipliers[client.id]),
            effectiveFrom,
          },
        })
      )
    )
  );

  // ── Monthly Capacity (Jan–Jun 2025, 160h default) ─────────────────────────
  const allEmployees = [sarahChen, marcusJohnson, emilyRodriguez, davidKim, jessicaPark, tylerBrooks,
    jamesWilson, charlotteDavies, oliverSmith, sophieTaylor,
    amandaFoster, ryanChen, mariaSantos, kevinLee, priyaPatel];

  await Promise.all(
    allEmployees.flatMap((emp) =>
      [1, 2, 3, 4, 5, 6].map((month) =>
        prisma.capacity.create({
          data: { employeeId: emp.id, year: 2025, month, totalHours: 160 },
        })
      )
    )
  );

  // ── Allocation Plan (Jan–Jun 2025) ────────────────────────────────────────
  // Each entry: [employee, client, hours/month]
  // Employees are on 2–4 clients, total ~120–144h / 160h capacity.
  const allocationPlan: Array<{ emp: typeof sarahChen; client: typeof luxBrand; monthlyHours: number[] }> = [
    // Sarah Chen (VP) → LuxBrand 60h, TechVision 40h, Atlas 40h = 140h
    { emp: sarahChen, client: luxBrand, monthlyHours: [60, 60, 60, 60, 60, 60] },
    { emp: sarahChen, client: techVision, monthlyHours: [40, 40, 40, 40, 40, 40] },
    { emp: sarahChen, client: atlas, monthlyHours: [40, 40, 40, 40, 40, 40] },

    // Marcus Johnson (AD) → LuxBrand 80h, GreenLeaf 60h = 140h
    { emp: marcusJohnson, client: luxBrand, monthlyHours: [80, 80, 80, 80, 80, 80] },
    { emp: marcusJohnson, client: greenLeaf, monthlyHours: [60, 60, 60, 60, 60, 60] },

    // Emily Rodriguez (SAM) → LuxBrand 60h, GreenLeaf 80h = 140h
    { emp: emilyRodriguez, client: luxBrand, monthlyHours: [60, 60, 60, 60, 60, 60] },
    { emp: emilyRodriguez, client: greenLeaf, monthlyHours: [80, 80, 80, 80, 80, 80] },

    // David Kim (AM) → Atlas 100h, Meridian 40h = 140h
    { emp: davidKim, client: atlas, monthlyHours: [100, 100, 100, 100, 100, 100] },
    { emp: davidKim, client: meridian, monthlyHours: [40, 40, 40, 40, 40, 40] },

    // Jessica Park (SAE) → TechVision 80h, Nova 60h = 140h
    { emp: jessicaPark, client: techVision, monthlyHours: [80, 80, 80, 80, 80, 80] },
    { emp: jessicaPark, client: nova, monthlyHours: [60, 60, 60, 60, 60, 60] },

    // Tyler Brooks (AE) → Nova 80h, Beacon 60h = 140h
    { emp: tylerBrooks, client: nova, monthlyHours: [80, 80, 80, 80, 80, 80] },
    { emp: tylerBrooks, client: beacon, monthlyHours: [60, 60, 60, 60, 60, 60] },

    // James Wilson (VP, LDN) → LuxBrand 80h, GreenLeaf 40h = 120h
    { emp: jamesWilson, client: luxBrand, monthlyHours: [80, 80, 80, 80, 80, 80] },
    { emp: jamesWilson, client: greenLeaf, monthlyHours: [40, 40, 40, 40, 40, 40] },

    // Charlotte Davies (AD, LDN) → GreenLeaf 100h, Meridian 40h = 140h
    { emp: charlotteDavies, client: greenLeaf, monthlyHours: [100, 100, 100, 100, 100, 100] },
    { emp: charlotteDavies, client: meridian, monthlyHours: [40, 40, 40, 40, 40, 40] },

    // Oliver Smith (SAM, LDN) → Clearpath 80h, Summit 60h = 140h
    { emp: oliverSmith, client: clearpath, monthlyHours: [80, 80, 80, 80, 80, 80] },
    { emp: oliverSmith, client: summit, monthlyHours: [60, 60, 60, 60, 60, 60] },

    // Sophie Taylor (AM, LDN) → Clearpath 80h, Coastal 60h = 140h
    { emp: sophieTaylor, client: clearpath, monthlyHours: [80, 80, 80, 80, 80, 80] },
    { emp: sophieTaylor, client: coastal, monthlyHours: [60, 60, 60, 60, 60, 60] },

    // Amanda Foster (AD, LAX) → Nova 80h, Beacon 60h = 140h
    { emp: amandaFoster, client: nova, monthlyHours: [80, 80, 80, 80, 80, 80] },
    { emp: amandaFoster, client: beacon, monthlyHours: [60, 60, 60, 60, 60, 60] },

    // Ryan Chen (SAM, LAX) → Beacon 80h, Clearpath 40h = 120h
    { emp: ryanChen, client: beacon, monthlyHours: [80, 80, 80, 80, 80, 80] },
    { emp: ryanChen, client: clearpath, monthlyHours: [40, 40, 40, 40, 40, 40] },

    // Maria Santos (AE, LAX) → Beacon 80h, Coastal 40h = 120h
    { emp: mariaSantos, client: beacon, monthlyHours: [80, 80, 80, 80, 80, 80] },
    { emp: mariaSantos, client: coastal, monthlyHours: [40, 40, 40, 40, 40, 40] },

    // Kevin Lee (AM, LAX) → Coastal 80h, Summit 60h = 140h
    { emp: kevinLee, client: coastal, monthlyHours: [80, 80, 80, 80, 80, 80] },
    { emp: kevinLee, client: summit, monthlyHours: [60, 60, 60, 60, 60, 60] },

    // Priya Patel (SAE, LAX) → Nova 60h, Coastal 40h, Beacon 40h = 140h
    { emp: priyaPatel, client: nova, monthlyHours: [60, 60, 60, 60, 60, 60] },
    { emp: priyaPatel, client: coastal, monthlyHours: [40, 40, 40, 40, 40, 40] },
    { emp: priyaPatel, client: beacon, monthlyHours: [40, 40, 40, 40, 40, 40] },
  ];

  // Resolve the rate for each employee-client pair
  async function getRate(clientId: string, jobTitleId: string): Promise<number | null> {
    const rate = await prisma.clientRate.findFirst({
      where: { clientId, jobTitleId, effectiveFrom: { lte: new Date("2025-01-01") } },
      orderBy: { effectiveFrom: "desc" },
    });
    return rate?.hourlyRate ?? null;
  }

  for (const plan of allocationPlan) {
    const rate = await getRate(plan.client.id, plan.emp.jobTitleId);
    for (let i = 0; i < 6; i++) {
      const month = i + 1;
      const hours = plan.monthlyHours[i];
      const pct = (hours / 160) * 100;
      const revenue = rate ? hours * rate : null;
      await prisma.allocation.create({
        data: {
          employeeId: plan.emp.id,
          clientId: plan.client.id,
          year: 2025,
          month,
          plannedHours: hours,
          plannedPct: Math.round(pct * 10) / 10,
          plannedRevenue: revenue,
        },
      });
    }
  }

  // ── Actuals (Jan–Mar 2025) ─────────────────────────────────────────────────
  // actuals vary from plan: multiply hours by a variance factor per employee-month
  const varianceFactors: Record<string, number[]> = {
    [sarahChen.id]:       [0.95, 1.02, 0.98],
    [marcusJohnson.id]:   [1.05, 0.92, 1.08],
    [emilyRodriguez.id]:  [0.88, 1.00, 0.95],
    [davidKim.id]:        [1.10, 1.05, 0.90],
    [jessicaPark.id]:     [0.92, 0.88, 1.03],
    [tylerBrooks.id]:     [1.00, 0.95, 0.85],
    [jamesWilson.id]:     [0.90, 1.00, 1.05],
    [charlotteDavies.id]: [1.08, 0.97, 0.92],
    [oliverSmith.id]:     [0.95, 1.10, 1.00],
    [sophieTaylor.id]:    [0.88, 0.93, 1.07],
    [amandaFoster.id]:    [1.05, 1.00, 0.95],
    [ryanChen.id]:        [0.92, 0.88, 1.00],
    [mariaSantos.id]:     [1.00, 1.05, 0.90],
    [kevinLee.id]:        [0.95, 0.98, 1.05],
    [priyaPatel.id]:      [0.88, 1.02, 0.95],
  };

  for (const plan of allocationPlan) {
    const rate = await getRate(plan.client.id, plan.emp.jobTitleId);
    const factors = varianceFactors[plan.emp.id] ?? [1, 1, 1];
    for (let i = 0; i < 3; i++) {
      const month = i + 1;
      const plannedHours = plan.monthlyHours[i];
      const actualHours = Math.round(plannedHours * factors[i] * 10) / 10;
      const actualRevenue = rate ? Math.round(actualHours * rate * 100) / 100 : null;
      const actualBillings = actualRevenue ? Math.round(actualRevenue * 0.92 * 100) / 100 : null;
      await prisma.actual.upsert({
        where: { employeeId_clientId_year_month: { employeeId: plan.emp.id, clientId: plan.client.id, year: 2025, month } },
        create: { employeeId: plan.emp.id, clientId: plan.client.id, year: 2025, month, actualHours, actualRevenue, actualBillings, source: "seed" },
        update: { actualHours, actualRevenue, actualBillings },
      });
    }
  }

  console.log("✅ Seed complete.");
  console.log("\nDemo login credentials:");
  console.log("  Admin:    admin@agency.com     / Admin123!");
  console.log("  Staffing: staffing@agency.com  / Staffing123!");
  console.log("  Finance:  finance@agency.com   / Finance123!");
  console.log("  Director: director@agency.com  / Director123!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
