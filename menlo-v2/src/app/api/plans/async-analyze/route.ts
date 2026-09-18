import { NextRequest, NextResponse } from 'next/server';
import { verifySupabaseBearer } from '@/lib/server/auth';

export const runtime = 'nodejs';

type AnalyzeRequest = {
  planId?: string;
  fileUrl?: string;
  planType?: string;
  organizationId?: string;
  projectId?: string;
};

export async function POST(req: NextRequest) {
  try {
    const { planId, fileUrl, planType, organizationId, projectId } = (await req.json()) as AnalyzeRequest;

    if (!planId || !organizationId || !projectId) {
      return NextResponse.json({ error: 'Missing planId, organizationId or projectId' }, { status: 400 });
    }

    // 1. רישום מיידי של הסטטוס ב-DB כ-'processing'
    // תגובה תוך פחות מ-200ms -> מניעה מוחלטת של שגיאת 504 Timeout ב-Vercel!
    const jobRecord = {
      organization_id: organizationId,
      project_id: projectId,
      plan_id: planId,
      status: 'queued',
      progress: 0,
      stage: 'queued',
      payload: { file_url: fileUrl ?? null, plan_type: planType ?? null },
      created_at: new Date().toISOString(),
    };

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ success: true, mode: 'simulation', job: jobRecord }, { status: 202 });
    }

    const verified = await verifySupabaseBearer(req, supabaseUrl, serviceRoleKey);
    if (!verified) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { supabase, user } = verified;
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile || profile.organization_id !== organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('plan_analysis_jobs')
      .insert(jobRecord)
      .select('id, status, progress, stage, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Unable to enqueue plan analysis' }, { status: 503 });
    }

    return NextResponse.json({
      success: true,
      message: 'Plan analysis queued successfully.',
      job: data,
    }, { status: 202 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
