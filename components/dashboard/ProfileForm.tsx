'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { updateProfile } from '@/app/actions/profile';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, CheckCircle2, User, GraduationCap, Briefcase, FileText, Settings, Sparkles, Lock } from 'lucide-react';
import { UQO_DOMAINS } from '@/lib/constants/uqo';
import { SECTEURS_ACTIVITE } from '@/lib/constants/secteurs';
import ChangePasswordForm from '@/components/dashboard/ChangePasswordForm';

interface ProfileFormProps {
  initialProfile: {
    prenom: string;
    nom: string;
    telephone: string | null;
    bio: string | null;
    linkedin_url: string | null;
    site_web: string | null;
    ville: string | null;
    pays: string | null;
    programme_etudes: string | null;
    niveau_etudes: string | null;
    domaine_etudes: string | null;
    annee_diplome: number | null;
    universite_origine: string | null;
    poste_actuel: string | null;
    employeur: string | null;
    secteur_activite: string | null;
    expertises: string[] | null;
    notifications_email: boolean;
    profil_public: boolean;
    categorie: string | null;
    avatar_url: string | null;
  };
}

type TabType = 'perso' | 'academic' | 'pro' | 'preferences' | 'securite';

const compressAvatarImage = (file: File, maxDimension = 400, quality = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error("Le fichier sélectionné doit être une image."));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Erreur lors de la lecture du fichier image."));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Le format d'image sélectionné est invalide ou corrompu."));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

export default function ProfileForm({ initialProfile }: ProfileFormProps) {
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('perso');

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    defaultValues: {
      prenom: initialProfile.prenom || '',
      nom: initialProfile.nom || '',
      telephone: initialProfile.telephone || '',
      bio: initialProfile.bio || '',
      linkedin_url: initialProfile.linkedin_url || '',
      site_web: initialProfile.site_web || '',
      ville: initialProfile.ville || '',
      pays: initialProfile.pays || '',
      programme_etudes: initialProfile.programme_etudes || '',
      niveau_etudes: initialProfile.niveau_etudes || '',
      domaine_etudes: initialProfile.domaine_etudes || '',
      annee_diplome: initialProfile.annee_diplome || '',
      universite_origine: initialProfile.universite_origine || '',
      poste_actuel: initialProfile.poste_actuel || '',
      employeur: initialProfile.employeur || '',
      secteur_activite: initialProfile.secteur_activite || '',
      expertises: initialProfile.expertises || '',
      notifications_email: initialProfile.notifications_email ?? true,
      profil_public: initialProfile.profil_public ?? false,
      avatar_url: initialProfile.avatar_url || '',
    },
  });

  const watchNotifications = watch('notifications_email');
  const watchPublic = watch('profil_public');
  const watchDomaine = watch('domaine_etudes');
  const watchAvatarUrl = watch('avatar_url');

  // Trouver la liste des programmes pour le domaine sélectionné
  const currentDomainObj = UQO_DOMAINS.find(d => d.name === watchDomaine);
  const availablePrograms = currentDomainObj ? currentDomainObj.programs : [];

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Convert annee_diplome to number if provided
    if (data.annee_diplome) {
      data.annee_diplome = parseInt(data.annee_diplome, 10);
    } else {
      data.annee_diplome = null;
    }

    try {
      const res = await updateProfile(data);
      if (res?.error) {
        if (typeof res.error === 'string') {
          setErrorMsg(res.error);
        } else {
          setErrorMsg("Veuillez vérifier les champs du formulaire.");
        }
      } else if (res?.success) {
        setSuccessMsg("Votre profil a été mis à jour avec succès !");
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Une erreur inattendue est survenue.");
    } finally {
      setIsLoading(false);
    }
  };

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'perso', label: 'Identité', icon: User },
    { id: 'academic', label: 'Études', icon: GraduationCap },
    { id: 'pro', label: 'Professionnel', icon: Briefcase },
    { id: 'preferences', label: 'Préférences', icon: Settings },
    { id: 'securite', label: 'Sécurité', icon: Lock },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/50">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex-1 sm:flex-initial justify-center
                ${isActive 
                  ? 'bg-white text-blue-950 shadow-md shadow-slate-200' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                }
              `}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-amber-500' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <Card className="shadow-xl border-0 rounded-2xl overflow-hidden bg-white">
        <div className="h-1.5 bg-gradient-to-r from-blue-900 via-blue-800 to-amber-500" />
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6 p-6 sm:p-8">
            
            {/* Status alerts */}
            {successMsg && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-sm rounded-xl flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* ─── TAB 1: PERSO ─── */}
            {activeTab === 'perso' && (
              <div className="space-y-5">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <User className="w-5 h-5 text-amber-500" />
                  <h3 className="text-base font-bold text-slate-800">Informations personnelles</h3>
                </div>

                <div className="flex items-center gap-4 py-2 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                  <div className="w-16 h-16 rounded-full bg-slate-200 border-2 border-white shadow-inner overflow-hidden flex items-center justify-center shrink-0">
                    {watchAvatarUrl ? (
                      <img src={watchAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="avatar-file" className="text-xs font-bold text-slate-700 cursor-pointer bg-white hover:bg-slate-50 border px-3 py-1.5 rounded-lg shadow-sm inline-block transition-colors">
                      Ajouter ou Modifier ma photo
                    </Label>
                    <input
                      id="avatar-file"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const compressedBase64 = await compressAvatarImage(file);
                            setValue('avatar_url', compressedBase64);
                          } catch (err: any) {
                            setErrorMsg(err.message || "Erreur lors du traitement de la photo");
                          }
                        }
                      }}
                    />
                    <p className="text-[10px] text-slate-400">Formats acceptés : PNG, JPG, WEBP. Compression automatique.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="prenom" className="text-slate-700">Prénom *</Label>
                    <Input id="prenom" className="h-10 bg-slate-50 border-slate-200 focus:bg-white rounded-lg" {...register('prenom', { required: "Ce champ est requis" })} />
                    {errors.prenom && <p className="text-xs text-red-500 font-semibold">{errors.prenom.message as string}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="nom" className="text-slate-700">Nom *</Label>
                    <Input id="nom" className="h-10 bg-slate-50 border-slate-200 focus:bg-white rounded-lg" {...register('nom', { required: "Ce champ est requis" })} />
                    {errors.nom && <p className="text-xs text-red-500 font-semibold">{errors.nom.message as string}</p>}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="telephone" className="text-slate-700">Téléphone</Label>
                  <Input id="telephone" placeholder="819-555-1234" className="h-10 bg-slate-50 border-slate-200 focus:bg-white rounded-lg" {...register('telephone')} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="ville" className="text-slate-700">Ville</Label>
                    <Input id="ville" className="h-10 bg-slate-50 border-slate-200 focus:bg-white rounded-lg" {...register('ville')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pays" className="text-slate-700">Pays</Label>
                    <Input id="pays" className="h-10 bg-slate-50 border-slate-200 focus:bg-white rounded-lg" {...register('pays')} />
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <Label htmlFor="bio" className="text-slate-700 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-slate-400" /> Biographie
                  </Label>
                  <textarea
                    id="bio"
                    rows={4}
                    placeholder="Présentez-vous brièvement à la communauté..."
                    className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50 text-sm focus:bg-white transition-colors"
                    {...register('bio')}
                  />
                </div>
              </div>
            )}

            {/* ─── TAB 2: ACADEMIC ─── */}
            {activeTab === 'academic' && (
              <div className="space-y-5">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <GraduationCap className="w-5 h-5 text-amber-500" />
                  <h3 className="text-base font-bold text-slate-800">Parcours académique</h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-slate-700">Domaine d&apos;études</Label>
                    <select
                      value={watchDomaine}
                      onChange={(e) => {
                        setValue('domaine_etudes', e.target.value);
                        // Reset programme et niveau
                        setValue('programme_etudes', '');
                        setValue('niveau_etudes', '');
                      }}
                      className="flex h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                    >
                      <option value="">Sélectionnez un domaine d&apos;études</option>
                      {UQO_DOMAINS.map(d => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-slate-700">Programme d&apos;études</Label>
                    <select
                      value={watch('programme_etudes')}
                      onChange={(e) => {
                        setValue('programme_etudes', e.target.value);
                        // Trouver et mettre à jour le niveau automatiquement
                        const pObj = availablePrograms.find(p => p.name === e.target.value);
                        if (pObj) {
                          setValue('niveau_etudes', pObj.level);
                        }
                      }}
                      disabled={!watchDomaine}
                      className="flex h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors disabled:opacity-50"
                    >
                      <option value="">
                        {watchDomaine ? "Sélectionnez votre programme" : "Choisissez d'abord un domaine d'études"}
                      </option>
                      {availablePrograms.map((p, idx) => (
                        <option key={idx} value={p.name}>
                          {p.name} ({p.level})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="annee_diplome" className="text-slate-700">Année d&apos;obtention du diplôme / fin d&apos;études</Label>
                      <Input id="annee_diplome" type="number" placeholder="Ex: 2024" className="h-10 bg-slate-50 border-slate-200 focus:bg-white rounded-lg" {...register('annee_diplome')} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="universite_origine" className="text-slate-700">Université d&apos;origine</Label>
                      <Input id="universite_origine" placeholder="Si différente de l'UQO" className="h-10 bg-slate-50 border-slate-200 focus:bg-white rounded-lg" {...register('universite_origine')} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── TAB 3: PRO ─── */}
            {activeTab === 'pro' && (
              <div className="space-y-5">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Briefcase className="w-5 h-5 text-amber-500" />
                  <h3 className="text-base font-bold text-slate-800">Parcours professionnel</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="poste_actuel" className="text-slate-700">Poste actuel</Label>
                    <Input id="poste_actuel" placeholder="Ex: Développeur Senior" className="h-10 bg-slate-50 border-slate-200 focus:bg-white rounded-lg" {...register('poste_actuel')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="employeur" className="text-slate-700">Employeur / Organisation</Label>
                    <Input id="employeur" placeholder="Ex: CGI" className="h-10 bg-slate-50 border-slate-200 focus:bg-white rounded-lg" {...register('employeur')} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="secteur_activite" className="text-slate-700">Secteur d&apos;activité</Label>
                  <select
                    id="secteur_activite"
                    {...register('secteur_activite')}
                    className="flex h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                  >
                    <option value="">Sélectionnez un secteur d&apos;activité</option>
                    {SECTEURS_ACTIVITE.map((sec, idx) => (
                      <option key={idx} value={sec}>{sec}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="expertises" className="text-slate-700 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-slate-400" /> Domaines d&apos;expertise
                  </Label>
                  <textarea
                    id="expertises"
                    rows={3}
                    placeholder="Séparez vos expertises par des virgules (ex: React, Gestion de projet, R&D...)"
                    className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50 text-sm focus:bg-white transition-colors"
                    {...register('expertises')}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="linkedin_url" className="text-slate-700">URL LinkedIn</Label>
                    <Input id="linkedin_url" placeholder="https://linkedin.com/in/username" className="h-10 bg-slate-50 border-slate-200 focus:bg-white rounded-lg" {...register('linkedin_url')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="site_web" className="text-slate-700">Site web / Portfolio</Label>
                    <Input id="site_web" placeholder="https://mywebsite.com" className="h-10 bg-slate-50 border-slate-200 focus:bg-white rounded-lg" {...register('site_web')} />
                  </div>
                </div>
              </div>
            )}

            {/* ─── TAB 4: PREFERENCES ─── */}
            {activeTab === 'preferences' && (
              <div className="space-y-5">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Settings className="w-5 h-5 text-amber-500" />
                  <h3 className="text-base font-bold text-slate-800">Préférences & Confidentialité</h3>
                </div>

                <div className="space-y-4 pt-2">
                  <div 
                    onClick={() => setValue('notifications_email', !watchNotifications)}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      watchNotifications 
                        ? 'bg-blue-50/50 border-blue-200 shadow-sm' 
                        : 'bg-slate-50/50 border-slate-200'
                    }`}
                  >
                    <Checkbox id="notifications_email" checked={watchNotifications} onCheckedChange={(c) => setValue('notifications_email', c === true)} className="mt-1" />
                    <div>
                      <Label htmlFor="notifications_email" className="font-semibold text-slate-850 cursor-pointer">
                        Notifications courriel
                      </Label>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        Recevoir les bulletins de nouvelles, convocations aux AG, rappels de cotisations et annonces importantes de Synergie UQO.
                      </p>
                    </div>
                  </div>

                  <div 
                    onClick={() => setValue('profil_public', !watchPublic)}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      watchPublic 
                        ? 'bg-blue-50/50 border-blue-200 shadow-sm' 
                        : 'bg-slate-50/50 border-slate-200'
                    }`}
                  >
                    <Checkbox id="profil_public" checked={watchPublic} onCheckedChange={(c) => setValue('profil_public', c === true)} className="mt-1" />
                    <div>
                      <Label htmlFor="profil_public" className="font-semibold text-slate-850 cursor-pointer">
                        Visibilité dans l&apos;annuaire public
                      </Label>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        Autoriser les autres membres authentifiés à voir mon nom, profil professionnel et expertises dans l&apos;annuaire de l&apos;association.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'securite' && (
              <div className="space-y-5">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Lock className="w-5 h-5 text-amber-500" />
                  <h3 className="text-base font-bold text-slate-800">Sécurité du Compte</h3>
                </div>
                <ChangePasswordForm />
              </div>
            )}

          </CardContent>
          {activeTab !== 'securite' && (
            <CardFooter className="flex justify-between border-t border-slate-100 px-6 sm:px-8 py-5 bg-slate-50/50">
              <span className="text-xs text-slate-400 font-medium">Catégorie actuelle : <strong className="capitalize text-slate-600">{initialProfile.categorie?.replace('_', ' ')}</strong></span>
              <Button 
                type="submit" 
                disabled={isLoading} 
                className="bg-blue-950 hover:bg-blue-900 text-white font-semibold rounded-lg px-6 shadow-md"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Enregistrement...
                  </span>
                ) : (
                  "Enregistrer les modifications"
                )}
              </Button>
            </CardFooter>
          )}
        </form>
      </Card>
    </div>
  );
}
