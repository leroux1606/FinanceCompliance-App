import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/db';
import { parseCSV, parseExcel, validateColumns } from '@/src/lib/compliance-engine';
import { runComplianceChecks } from '@/src/lib/compliance-engine';
import { requireSession } from '@/src/lib/auth';

export async function POST(request: Request) {
  const unauth = await requireSession();
  if (unauth) return unauth;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const companyId = formData.get('companyId') as string;
    const periodEnd = formData.get('periodEnd') as string;

    if (!file || !companyId || !periodEnd) {
      return NextResponse.json(
        { error: 'File, companyId, and periodEnd are required' },
        { status: 400 }
      );
    }

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = (file.name || '').toLowerCase();

    let rows: { accountCode: string; accountName: string; debit: number; credit: number }[];
    let headers: string[];

    if (ext.endsWith('.csv')) {
      const content = buffer.toString('utf-8');
      const parsed = parseCSV(content);
      rows = parsed.rows;
      headers = parsed.headers;
    } else if (ext.endsWith('.xlsx') || ext.endsWith('.xls')) {
      const parsed = parseExcel(buffer);
      rows = parsed.rows;
      headers = parsed.headers;
    } else {
      return NextResponse.json(
        { error: 'Invalid file type. Use CSV or Excel (.xlsx, .xls)' },
        { status: 400 }
      );
    }

    const colCheck = validateColumns(headers);
    if (!colCheck.valid) {
      return NextResponse.json(
        {
          error: `Missing required columns: ${colCheck.missing.join(', ')}. Required: accountCode, accountName, debit, credit`,
        },
        { status: 400 }
      );
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No data rows found in file' },
        { status: 400 }
      );
    }

    // Note: we no longer hard-reject unbalanced trial balances here.
    // The compliance engine's TB_BALANCE check will flag this as HIGH_RISK in the report,
    // giving the user actionable feedback rather than a raw error.

    const trialBalance = await prisma.trialBalance.create({
      data: {
        companyId,
        periodEnd: new Date(periodEnd),
      },
    });

    await prisma.trialBalanceEntry.createMany({
      data: rows.map((r) => ({
        trialBalanceId: trialBalance.id,
        accountCode: r.accountCode,
        accountName: r.accountName,
        debit: r.debit,
        credit: r.credit,
      })),
    });

    const rules = await prisma.complianceRule.findMany({ where: { enabled: true } });
    if (rules.length === 0) {
      return NextResponse.json(
        { error: 'Compliance rules not initialized. Please run: pnpm run db:seed' },
        { status: 503 }
      );
    }
    const summary = runComplianceChecks(rows);

    // Build results array, skipping any check whose ruleCode has no matching DB rule
    const resultsData = summary.results
      .map((r) => {
        const rule = rules.find((ru) => ru.code === r.ruleCode);
        if (!rule) {
          console.error(`[Upload] No rule found for code: ${r.ruleCode}. Skipping result.`);
          return null;
        }
        return {
          trialBalanceId: trialBalance.id,
          ruleId: rule.id,
          status: r.status,
          riskScore: r.riskScore,
          message: r.message,
          details: r.details ? JSON.stringify(r.details) : null,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    // Batch insert all check results in a single query instead of N sequential creates
    if (resultsData.length > 0) {
      await prisma.complianceCheckResult.createMany({ data: resultsData });
    }

    const reportData = {
      executiveSummary: `Compliance assessment completed. Overall score: ${summary.overallScore}%. Risk level: ${summary.riskLevel}.`,
      complianceScore: summary.overallScore,
      riskLevel: summary.riskLevel,
      issues: summary.results.filter((r) => r.status !== 'COMPLIANT'),
      recommendations: summary.results
        .filter((r) => r.status !== 'COMPLIANT')
        .map((r) => r.message),
    };

    const report = await prisma.complianceReport.create({
      data: {
        companyId,
        trialBalanceId: trialBalance.id,
        complianceScore: summary.overallScore,
        riskLevel: summary.riskLevel,
        summaryJson: JSON.stringify(reportData),
      },
    });

    const tbWithEntries = await prisma.trialBalance.findUnique({
      where: { id: trialBalance.id },
      include: { entries: true, checkResults: { include: { rule: true } } },
    });

    return NextResponse.json({
      trialBalance: tbWithEntries,
      complianceSummary: summary,
      reportId: report.id,
    });
  } catch (error) {
    console.error('[API] Trial balance upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process trial balance' },
      { status: 500 }
    );
  }
}
