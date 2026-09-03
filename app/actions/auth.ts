'use server';

import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const LoginSchema = z.object({
  email: z.string().email({ message: "Adresse email invalide" }),
  password: z.string().min(1, { message: "Le mot de passe est requis" }),
});

// Mode Test : Auto-confirme l'email si bloqué lors de la connexion pour faciliter les tests.
// En Production (BYPASS_EMAIL_CONFIRM_FOR_TESTING = false) :
// Le membre ne peut pas se connecter tant qu'il n'a pas confirmé son email via le lien reçu.
const BYPASS_EMAIL_CONFIRM_FOR_TESTING = true;

export async function signIn(formData: any) {
  const result = LoginSchema.safeParse(formData);

  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  const { email, password } = result.data;
  const supabase = createClient();
  const { createAdminClient } = require('@/lib/supabase/admin');
  const supabaseAdmin = createAdminClient();

  let { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // En Mode Test uniquement : Auto-confirmer l'email si non confirmé et réessayer
  if (BYPASS_EMAIL_CONFIRM_FOR_TESTING && error && (error.message.includes('Email not confirmed') || error.message.includes('email'))) {
    try {
      const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
      const authUser = usersData?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
      if (authUser) {
        await supabaseAdmin.auth.admin.updateUserById(authUser.id, { email_confirm: true });
        const retry = await supabase.auth.signInWithPassword({ email, password });
        error = retry.error;
      }
    } catch (e) {
      console.warn("Auto-confirm email retry failed:", e);
    }
  }

  if (error) {
    console.error('Erreur Supabase Auth lors de la connexion:', error);
    const userFriendlyError = error.message.includes('Invalid login credentials')
      ? "Adresse email ou mot de passe incorrect."
      : `Erreur de connexion : ${error.message}`;
    return { error: userFriendlyError };
  }

  // Fetch the user's role using the Admin Client to bypass RLS latency during the sign-in request
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('email', email)
    .single();

  return { success: true, role: profile?.role || 'membre' };
}
