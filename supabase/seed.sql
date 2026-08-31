-- Seed default Super Admin account for local development

-- 1. Create User in auth.users table
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'd9b2326b-67a4-472e-b6d6-6a56e2938cf1',
  'authenticated',
  'authenticated',
  'admin@synergie-uqo.ca',
  '$2a$10$Uj.qjvQUcnAgyV6tVINdjOzZdlu3M/yEdIM.dh8fe31BnbcrXPQSW',
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"prenom": "Super", "nom": "Admin"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- 2. Create corresponding Identity in auth.identities
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  'd9b2326b-67a4-472e-b6d6-6a56e2938cf1',
  'd9b2326b-67a4-472e-b6d6-6a56e2938cf1',
  jsonb_build_object('sub', 'd9b2326b-67a4-472e-b6d6-6a56e2938cf1', 'email', 'admin@synergie-uqo.ca'),
  'email',
  'd9b2326b-67a4-472e-b6d6-6a56e2938cf1',
  NULL,
  NOW(),
  NOW()
);

-- 3. Create Profile in public.profiles table (enriched)
INSERT INTO public.profiles (
  id,
  email,
  prenom,
  nom,
  role,
  categorie,
  statut_adhesion,
  consentement_loi_25,
  poste_association,
  ville,
  pays
) VALUES (
  'd9b2326b-67a4-472e-b6d6-6a56e2938cf1',
  'admin@synergie-uqo.ca',
  'Super',
  'Admin',
  'superadmin',
  'honneur',
  'approuve',
  true,
  'superadmin',
  'Gatineau',
  'Canada'
);
