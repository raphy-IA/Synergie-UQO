'use server';

import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const LoginSchema = z.object({
  email: z.string().email({ message: "Adresse email invalide" }),
  password: z.string().min(1, { message: "Le mot de passe est requis" }),
});

export async function signIn(formData: any) {
  const result = LoginSchema.safeParse(formData);

  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  const { email, password } = result.data;
  const supabase = createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Erreur Supabase Auth lors de la connexion:', error);
    return { error: `Erreur de connexion : ${error.message}` };
  }

  // Fetch the user's role using the Admin Client to bypass RLS latency during the sign-in request
  const { createAdminClient } = require('@/lib/supabase/admin');
  const supabaseAdmin = createAdminClient();
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('email', email)
    .single();

  return { success: true, role: profile?.role || 'membre' };
}
