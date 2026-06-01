import { NextRequest, NextResponse } from 'next/server';
import { processIncomingEmails } from '@/lib/email-processor';

// Manual trigger for email polling — protected by API key
export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  if (apiKey !== process.env.API_SECRET_KEY) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const logs: string[] = [];
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  console.log = (...args) => { logs.push('[LOG] ' + args.join(' ')); originalLog(...args); };
  console.error = (...args) => { logs.push('[ERR] ' + args.join(' ')); originalError(...args); };
  console.warn = (...args) => { logs.push('[WRN] ' + args.join(' ')); originalWarn(...args); };

  try {
    await processIncomingEmails();
    return NextResponse.json({ ok: true, logs });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err), logs }, { status: 500 });
  } finally {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
  }
}
