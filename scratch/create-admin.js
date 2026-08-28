const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Erreur : NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant dans .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function run() {
  const email = 'admin@synergie-uqo.ca';
  const password = 'admin123';
  const userId = 'd9b2326b-67a4-472e-b6d6-6a56e2938cf1';

  console.log(`Création de l'utilisateur ${email}...`);

  // 1. Supprimer l'utilisateur s'il existe déjà pour éviter les doublons
  await supabase.auth.admin.deleteUser(userId).catch(() => {});

  // 2. Créer l'utilisateur via l'API Admin de Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    id: userId,
    email: email,
    password: password,
    email_confirm: true,
    user_metadata: { prenom: "Super", nom: "Admin" }
  });

  if (authError) {
    console.error("Erreur lors de la création de l'utilisateur auth :", authError.message);
    return;
  }

  console.log("Utilisateur d'authentification créé avec succès !");

  // 3. Insérer ou mettre à jour le profil public associé dans public.profiles
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      email: email,
      prenom: 'Super',
      nom: 'Admin',
      role: 'superadmin',
      categorie: 'honneur',
      statut_adhesion: 'approuve',
      consentement_loi_25: true,
      poste_association: 'superadmin',
      ville: 'Gatineau',
      pays: 'Canada'
    });

  if (profileError) {
    console.error("Erreur lors de la création du profil public :", profileError.message);
  } else {
    console.log("Profil administrateur créé et configuré avec succès !");
  }
}

run();
