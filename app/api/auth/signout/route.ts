import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createClient();
  await supabase.auth.signOut();

  const url = new URL(request.url);
  const origin = process.env.NEXT_PUBLIC_APP_URL || url.origin;
  return NextResponse.redirect(`${origin}/login`, {
    status: 303,
  });
}
