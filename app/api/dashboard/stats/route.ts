import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/db';
import { requireSession } from '@/src/lib/auth';

export async function GET() {
  const unauth = await requireSession();
  if (unauth) return unauth;

  try {
    const [companyCount, tbCount, avgScore, lastReports] = await Promise.all([
      prisma.company.count(),
      prisma.trialBalance.count(),
      prisma.complianceReport.aggregate({ _avg: { complianceScore: true } }),
      prisma.complianceReport.findMany({
        orderBy: { generatedAt: 'desc' },
        take: 5,
        include: { company: { select: { name: true, id: true } } },
      }),
    ]);

    return NextResponse.json({
      companies: companyCount,
      trialBalances: tbCount,
      avgScore: Math.round(avgScore._avg.complianceScore ?? 0),
      recentReports: lastReports.map((r) => ({
        id: r.id,
        companyId: r.companyId,
        companyName: r.company.name,
        score: r.complianceScore,
        riskLevel: r.riskLevel,
        generatedAt: r.generatedAt,
      })),
    });
  } catch (error) {
    console.error('[API] Dashboard stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
