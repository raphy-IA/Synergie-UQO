'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AdhesionSchema, type AdhesionInput } from '@/lib/validations/adhesion';
import { submitAdhesion } from '@/app/actions/adhesion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, ArrowLeft, ArrowRight, Briefcase, CheckCircle2, GraduationCap, ShieldCheck, User } from 'lucide-react';
import Link from 'next/link';
import { UQO_DOMAINS } from '@/lib/constants/uqo';

export default function AdhesionPage() {
  const [step, setStep] = useState(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(AdhesionSchema),
    defaultValues: {
      email: '',
      password: '',
      prenom: '',
      nom: '',
      telephone: '',
      categorie: 'etudiant' as const,
      programme_etudes: '',
      matricule_uqo: '',
      consentement_loi_25: false,
      niveau_etudes: '',
      domaine_etudes: '',
      annee_diplome: undefined as number | undefined,
      poste_actuel: '',
      employeur: '',
      secteur_activite: '',
    },
  });

  const selectedCategorie = watch('categorie');
  const consentementLoi25 = watch('consentement_loi_25');
  const selectedDomaine = watch('domaine_etudes');

  // Trouver la liste des programmes pour le domaine sélectionné
  const currentDomainObj = UQO_DOMAINS.find(d => d.name === selectedDomaine);
  const availablePrograms = currentDomainObj ? currentDomainObj.programs : [];

  const handleNext = async () => {
    let fieldsToValidate: Array<keyof AdhesionInput> = [];
    if (step === 1) {
      fieldsToValidate = ['prenom', 'nom', 'email', 'password', 'telephone'];
    } else if (step === 2) {
      fieldsToValidate = ['categorie', 'programme_etudes', 'matricule_uqo'];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setStep((prev) => prev - 1);
  };

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const response = await submitAdhesion(data);
      if (response?.error) {
        if (typeof response.error === 'string') {
          setErrorMsg(response.error);
        } else {
          setErrorMsg("Veuillez vérifier les champs du formulaire.");
        }
      } else if (response?.redirectUrl) {
        window.location.href = response.redirectUrl;
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Une erreur inattendue est survenue.");
    } finally {
      setIsLoading(false);
    }
  };

  const isProfessional = selectedCategorie === 'professionnel_diplome' || selectedCategorie === 'professionnel_etudiant';
  const isStudent = selectedCategorie === 'etudiant' || selectedCategorie === 'professionnel_etudiant';
  const isDiplome = selectedCategorie === 'diplome' || selectedCategorie === 'professionnel_diplome' || selectedCategorie === 'ancien';
  const isUQOLinked = selectedCategorie !== 'associe';

  const steps = [
    { num: 1, label: 'Identité', icon: User },
    { num: 2, label: 'Statut & Parcours', icon: GraduationCap },
    { num: 3, label: 'Consentement', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto w-full">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-extrabold tracking-tight text-blue-950">
              Synergie <span className="text-amber-500">UQO</span>
            </h1>
          </Link>
          <p className="mt-2 text-sm text-slate-500">
            Formulaire d&apos;adhésion officielle
          </p>
        </div>

        {/* Step Indicator — modern pill style */}
        <div className="flex items-center justify-center gap-1 mb-8">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const isActive = step === s.num;
            const isCompleted = step > s.num;
            return (
              <React.Fragment key={s.num}>
                {i > 0 && (
                  <div className={`w-8 sm:w-12 h-0.5 transition-colors duration-300 ${isCompleted ? 'bg-blue-600' : 'bg-slate-200'}`} />
                )}
                <div className="flex items-center gap-2">
                  <div className={`
                    flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold transition-all duration-300
                    ${isActive ? 'bg-blue-950 text-white ring-4 ring-blue-200 scale-110' : ''}
                    ${isCompleted ? 'bg-blue-600 text-white' : ''}
                    ${!isActive && !isCompleted ? 'bg-slate-100 text-slate-400 border border-slate-200' : ''}
                  `}>
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block transition-colors ${isActive ? 'text-blue-950' : 'text-slate-400'}`}>
                    {s.label}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Form Card */}
        <Card className="bg-white shadow-xl shadow-slate-200/50 border-0 rounded-2xl overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-600 via-blue-800 to-amber-500" />
          <form onSubmit={handleSubmit(onSubmit)}>

            {/* ─── STEP 1: PERSONAL INFO ─── */}
            {step === 1 && (
              <>
                <CardHeader className="px-6 sm:px-8 pt-8 pb-2">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-700" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900">Informations personnelles</CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        Créez vos identifiants et saisissez vos coordonnées
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 px-6 sm:px-8 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="prenom" className="text-sm font-medium text-slate-700">Prénom *</Label>
                      <Input id="prenom" placeholder="Jean" className="h-10 bg-slate-50 border-slate-200 focus:bg-white rounded-lg" {...register('prenom')} />
                      {errors.prenom && <p className="text-xs text-red-500 mt-0.5">{errors.prenom.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="nom" className="text-sm font-medium text-slate-700">Nom *</Label>
                      <Input id="nom" placeholder="Tremblay" className="h-10 bg-slate-50 border-slate-200 focus:bg-white rounded-lg" {...register('nom')} />
                      {errors.nom && <p className="text-xs text-red-500 mt-0.5">{errors.nom.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm font-medium text-slate-700">Adresse courriel *</Label>
                    <Input id="email" type="email" placeholder="jean.tremblay@uqo.ca" className="h-10 bg-slate-50 border-slate-200 focus:bg-white rounded-lg" {...register('email')} />
                    {errors.email && <p className="text-xs text-red-500 mt-0.5">{errors.email.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-sm font-medium text-slate-700">Mot de passe *</Label>
                    <Input id="password" type="password" placeholder="Minimum 6 caractères" className="h-10 bg-slate-50 border-slate-200 focus:bg-white rounded-lg" {...register('password')} />
                    {errors.password && <p className="text-xs text-red-500 mt-0.5">{errors.password.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="telephone" className="text-sm font-medium text-slate-700">
                      Téléphone <span className="text-slate-400 font-normal">(optionnel)</span>
                    </Label>
                    <Input id="telephone" placeholder="819-555-1234" className="h-10 bg-slate-50 border-slate-200 focus:bg-white rounded-lg" {...register('telephone')} />
                    {errors.telephone && <p className="text-xs text-red-500 mt-0.5">{errors.telephone.message}</p>}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between px-6 sm:px-8 py-5 bg-slate-50/50 border-t border-slate-100">
                  <Link href="/" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
                    ← Retour au site
                  </Link>
                  <Button type="button" onClick={handleNext} className="bg-blue-950 hover:bg-blue-900 text-white font-semibold rounded-lg px-6 shadow-lg shadow-blue-950/20">
                    Continuer <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </CardFooter>
              </>
            )}

            {/* ─── STEP 2: CATEGORY & ACADEMIC/PROFESSIONAL ─── */}
            {step === 2 && (
              <>
                <CardHeader className="px-6 sm:px-8 pt-8 pb-2">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-blue-700" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900">Statut & Parcours</CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        Votre lien avec l&apos;Université du Québec en Outaouais
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5 px-6 sm:px-8 pt-4">
                  {/* Category selector */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">Catégorie de membre *</Label>
                    <Select
                      defaultValue={selectedCategorie}
                      onValueChange={(val: any) => setValue('categorie', val, { shouldValidate: true })}
                    >
                      <SelectTrigger className="w-full h-10 bg-slate-50 border-slate-200 rounded-lg">
                        <SelectValue placeholder="Sélectionnez une catégorie" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="etudiant">🎓 Étudiant actuel UQO</SelectItem>
                        <SelectItem value="diplome">🎓 Diplômé de l&apos;UQO</SelectItem>
                        <SelectItem value="ancien">📚 Ancien étudiant UQO (sans diplôme)</SelectItem>
                        <SelectItem value="professionnel_diplome">💼 Professionnel diplômé UQO</SelectItem>
                        <SelectItem value="professionnel_etudiant">💼 Professionnel en études UQO</SelectItem>
                        <SelectItem value="associe">🤝 Partenaire / Externe</SelectItem>
                        <SelectItem value="honneur">⭐ Membre d&apos;Honneur</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.categorie && <p className="text-xs text-red-500">{errors.categorie.message}</p>}
                    <p className="text-xs text-slate-400 mt-1">
                      {selectedCategorie === 'associe'
                        ? 'Sans droit de vote aux assemblées générales'
                        : selectedCategorie === 'honneur'
                        ? 'Exempté de cotisation annuelle'
                        : 'Droit de vote aux assemblées générales (Art. 9 des Statuts)'}
                    </p>
                  </div>

                  {/* UQO Academic fields */}
                  {isUQOLinked && (
                    <div className="bg-blue-50/50 rounded-xl p-4 sm:p-5 border border-blue-100 space-y-4">
                      <h4 className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                        <GraduationCap className="w-4 h-4" /> Parcours académique
                      </h4>

                      <div className="space-y-1.5">
                        <Label className="text-sm text-slate-700">Domaine d&apos;études *</Label>
                        <Select
                          onValueChange={(val: any) => {
                            setValue('domaine_etudes', val, { shouldValidate: true });
                            // Reset programme et niveau quand le domaine change
                            setValue('programme_etudes', '');
                            setValue('niveau_etudes', '');
                          }}
                          defaultValue={watch('domaine_etudes')}
                        >
                          <SelectTrigger className="w-full h-10 bg-white border-slate-200 rounded-lg">
                            <SelectValue placeholder="Sélectionnez un domaine d'études" />
                          </SelectTrigger>
                          <SelectContent>
                            {UQO_DOMAINS.map(d => (
                              <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-sm text-slate-700">Programme d&apos;études *</Label>
                        <Select
                          onValueChange={(val: any) => {
                            setValue('programme_etudes', val, { shouldValidate: true });
                            // Trouver le niveau correspondant au programme sélectionné
                            const pObj = availablePrograms.find(p => p.name === val);
                            if (pObj) {
                              setValue('niveau_etudes', pObj.level, { shouldValidate: true });
                            }
                          }}
                          disabled={!selectedDomaine}
                          value={watch('programme_etudes')}
                        >
                          <SelectTrigger className="w-full h-10 bg-white border-slate-200 rounded-lg">
                            <SelectValue placeholder={selectedDomaine ? "Sélectionnez votre programme" : "Choisissez d'abord un domaine d'études"} />
                          </SelectTrigger>
                          <SelectContent>
                            {availablePrograms.map((p, idx) => (
                              <SelectItem key={idx} value={p.name}>
                                {p.name} ({p.level})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-sm text-slate-700">Matricule UQO <span className="text-slate-400 font-normal">(optionnel)</span></Label>
                          <Input placeholder="100234567" className="h-10 bg-white border-slate-200 rounded-lg" {...register('matricule_uqo')} />
                        </div>
                        {isDiplome && (
                          <div className="space-y-1.5">
                            <Label className="text-sm text-slate-700">Année de diplôme / fin d&apos;études</Label>
                            <Input type="number" placeholder="Ex: 2024" className="h-10 bg-white border-slate-200 rounded-lg" {...register('annee_diplome')} />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Professional fields */}
                  {isProfessional && (
                    <div className="bg-amber-50/50 rounded-xl p-4 sm:p-5 border border-amber-100 space-y-4">
                      <h4 className="text-sm font-semibold text-amber-900 flex items-center gap-2">
                        <Briefcase className="w-4 h-4" /> Parcours professionnel
                      </h4>
                      <div className="space-y-1.5">
                        <Label className="text-sm text-slate-700">Poste actuel</Label>
                        <Input placeholder="Développeur Senior" className="h-10 bg-white border-slate-200 rounded-lg" {...register('poste_actuel')} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-sm text-slate-700">Employeur</Label>
                          <Input placeholder="CGI, Gouvernement du Canada" className="h-10 bg-white border-slate-200 rounded-lg" {...register('employeur')} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm text-slate-700">Secteur d&apos;activité</Label>
                          <Input placeholder="Technologies de l'information" className="h-10 bg-white border-slate-200 rounded-lg" {...register('secteur_activite')} />
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between px-6 sm:px-8 py-5 bg-slate-50/50 border-t border-slate-100">
                  <Button type="button" variant="ghost" onClick={handleBack} className="text-slate-600 hover:text-slate-900">
                    <ArrowLeft className="mr-2 w-4 h-4" /> Retour
                  </Button>
                  <Button type="button" onClick={handleNext} className="bg-blue-950 hover:bg-blue-900 text-white font-semibold rounded-lg px-6 shadow-lg shadow-blue-950/20">
                    Continuer <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </CardFooter>
              </>
            )}

            {/* ─── STEP 3: CONSENT & SUBMIT ─── */}
            {step === 3 && (
              <>
                <CardHeader className="px-6 sm:px-8 pt-8 pb-2">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 text-emerald-700" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900">Consentement & Soumission</CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        Dernière étape avant l&apos;envoi de votre dossier au CA
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 px-6 sm:px-8 pt-4">
                  {errorMsg && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Loi 25 Consent */}
                  <div className="space-y-3">
                    <div
                      className={`flex items-start space-x-3 p-5 rounded-xl border-2 transition-all cursor-pointer ${
                        consentementLoi25
                          ? 'bg-emerald-50 border-emerald-300 shadow-sm shadow-emerald-100'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                      onClick={() => setValue('consentement_loi_25', !consentementLoi25, { shouldValidate: true })}
                    >
                      <Checkbox
                        id="consentement_loi_25"
                        checked={consentementLoi25}
                        onCheckedChange={(checked) => setValue('consentement_loi_25', checked === true, { shouldValidate: true })}
                        className="mt-0.5 border-emerald-400"
                      />
                      <div className="space-y-1.5">
                        <Label htmlFor="consentement_loi_25" className="font-semibold text-slate-900 text-sm cursor-pointer leading-tight">
                          Consentement Loi 25 — Protection des renseignements personnels
                        </Label>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          J&apos;accepte que l&apos;association Synergie UQO collecte et traite mes données personnelles (nom, courriel, matricule, statut) aux seules fins de gestion administrative, d&apos;accès à l&apos;espace membre et de convocation aux assemblées générales. Vos informations ne seront jamais partagées à des tiers.
                        </p>
                      </div>
                    </div>
                    {errors.consentement_loi_25 && (
                      <p className="text-xs text-red-500 font-semibold">{errors.consentement_loi_25.message}</p>
                    )}
                  </div>

                  {/* Info box */}
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <p className="text-xs text-blue-800 leading-relaxed">
                      <strong>📋 Que se passe-t-il ensuite ?</strong> Votre dossier sera examiné par le Conseil d&apos;Administration sous 24 à 48 heures. Vous recevrez un courriel de confirmation immédiatement, puis un second courriel lors de l&apos;approbation de votre candidature.
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between px-6 sm:px-8 py-5 bg-slate-50/50 border-t border-slate-100">
                  <Button type="button" variant="ghost" onClick={handleBack} disabled={isLoading} className="text-slate-600 hover:text-slate-900">
                    <ArrowLeft className="mr-2 w-4 h-4" /> Retour
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading || !consentementLoi25}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 rounded-lg shadow-lg shadow-emerald-600/25 disabled:opacity-50 disabled:shadow-none"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Envoi en cours...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Soumettre ma candidature <CheckCircle2 className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </CardFooter>
              </>
            )}
          </form>
        </Card>

        {/* Bottom link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500">
            Déjà membre ?{' '}
            <Link href="/login" className="text-blue-700 hover:text-blue-900 font-semibold hover:underline transition-colors">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
