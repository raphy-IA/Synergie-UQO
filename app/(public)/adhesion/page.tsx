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
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, CreditCard, ShieldCheck, User } from 'lucide-react';
import Link from 'next/link';

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
  } = useForm<AdhesionInput>({
    resolver: zodResolver(AdhesionSchema),
    defaultValues: {
      email: '',
      password: '',
      prenom: '',
      nom: '',
      telephone: '',
      categorie: 'etudiant',
      programme_etudes: '',
      matricule_uqo: '',
      consentement_loi_25: false,
    },
  });

  const selectedCategorie = watch('categorie');
  const consentementLoi25 = watch('consentement_loi_25');

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

  const onSubmit = async (data: AdhesionInput) => {
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

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
      <div className="max-w-2xl mx-auto w-full">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block text-3xl font-extrabold text-blue-900 tracking-tight">
            Synergie <span className="text-amber-500">UQO</span>
          </Link>
          <p className="mt-2 text-sm text-gray-600">
            Formulaire d'adhésion officielle des étudiants, diplômés et jeunes professionnels
          </p>
        </div>

        {/* Etape Indicateur */}
        <div className="flex items-center justify-between mb-6 px-4">
          <div className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${step >= 1 ? 'bg-blue-950 text-white' : 'bg-gray-200 text-gray-600'}`}>
              1
            </div>
            <div className="ml-2 text-xs font-semibold text-gray-700 hidden sm:block">Profil personnel</div>
          </div>
          <div className={`flex-1 h-1 mx-2 ${step >= 2 ? 'bg-blue-950' : 'bg-gray-200'}`} />
          <div className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${step >= 2 ? 'bg-blue-950 text-white' : 'bg-gray-200 text-gray-600'}`}>
              2
            </div>
            <div className="ml-2 text-xs font-semibold text-gray-700 hidden sm:block">Statut & Études</div>
          </div>
          <div className={`flex-1 h-1 mx-2 ${step >= 3 ? 'bg-blue-950' : 'bg-gray-200'}`} />
          <div className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${step >= 3 ? 'bg-blue-950 text-white' : 'bg-gray-200 text-gray-600'}`}>
              3
            </div>
            <div className="ml-2 text-xs font-semibold text-gray-700 hidden sm:block">Règlement & Consentement</div>
          </div>
        </div>

        <Card className="border-t-4 border-t-blue-900 shadow-lg">
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* ETAPE 1: INFORMATIONS PERSONNELLES */}
            {step === 1 && (
              <>
                <CardHeader>
                  <CardTitle className="text-xl text-blue-950 flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-900" /> Informations Personnelles
                  </CardTitle>
                  <CardDescription>
                    Créez vos identifiants de connexion et saisissez vos coordonnées.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="prenom">Prénom</Label>
                      <Input id="prenom" placeholder="Ex: Jean" {...register('prenom')} />
                      {errors.prenom && <p className="text-xs text-red-500">{errors.prenom.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nom">Nom</Label>
                      <Input id="nom" placeholder="Ex: Tremblay" {...register('nom')} />
                      {errors.nom && <p className="text-xs text-red-500">{errors.nom.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Adresse courriel</Label>
                    <Input id="email" type="email" placeholder="Ex: jean.tremblay@uqo.ca" {...register('email')} />
                    {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Mot de passe</Label>
                    <Input id="password" type="password" placeholder="••••••••" {...register('password')} />
                    {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telephone">Téléphone (Optionnel)</Label>
                    <Input id="telephone" placeholder="Ex: 8195551234" {...register('telephone')} />
                    {errors.telephone && <p className="text-xs text-red-500">{errors.telephone.message}</p>}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end border-t pt-4">
                  <Button type="button" onClick={handleNext} className="bg-blue-900 hover:bg-blue-950 text-white">
                    Continuer <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </CardFooter>
              </>
            )}

            {/* ETAPE 2: CATEGORIE DE MEMBRE */}
            {step === 2 && (
              <>
                <CardHeader>
                  <CardTitle className="text-xl text-blue-950 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-blue-900" /> Catégorie statutaire & UQO
                  </CardTitle>
                  <CardDescription>
                    Sélectionnez votre profil avec l'Université du Québec en Outaouais.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="categorie">Votre catégorie statutaire (Selon Art. 9 des Statuts)</Label>
                    <Select
                      defaultValue={selectedCategorie}
                      onValueChange={(val: any) => setValue('categorie', val, { shouldValidate: true })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sélectionnez une catégorie" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="etudiant">Étudiant actuel UQO (Droit de vote AG)</SelectItem>
                        <SelectItem value="diplome">Diplômé de l'UQO (Droit de vote AG)</SelectItem>
                        <SelectItem value="ancien">Ancien étudiant UQO sans diplôme (Droit de vote AG)</SelectItem>
                        <SelectItem value="associe">Partenaire / Externe (Sans droit de vote)</SelectItem>
                        <SelectItem value="honneur">Membre d'Honneur (Exempté de cotisation)</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.categorie && <p className="text-xs text-red-500">{errors.categorie.message}</p>}
                  </div>

                  {/* UQO specific fields if not partner/associe */}
                  {selectedCategorie !== 'associe' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
                        <Label htmlFor="programme_etudes">Programme d'études</Label>
                        <Input id="programme_etudes" placeholder="Ex: Baccalauréat en Informatique" {...register('programme_etudes')} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="matricule_uqo">Matricule UQO (Optionnel)</Label>
                        <Input id="matricule_uqo" placeholder="Ex: 100234567" {...register('matricule_uqo')} />
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between border-t pt-4">
                  <Button type="button" variant="outline" onClick={handleBack}>
                    <ArrowLeft className="mr-2 w-4 h-4" /> Retour
                  </Button>
                  <Button type="button" onClick={handleNext} className="bg-blue-900 hover:bg-blue-950 text-white">
                    Continuer <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </CardFooter>
              </>
            )}

            {/* ETAPE 3: CONSENTEMENT & STRIPE PAIEMENT */}
            {step === 3 && (
              <>
                <CardHeader>
                  <CardTitle className="text-xl text-blue-950 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-blue-900" /> Règlement & Finalisation
                  </CardTitle>
                  <CardDescription>
                    Paiement sécurisé et respect de la vie privée (Loi 25).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {errorMsg && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Recap tarifaire */}
                  <div className="bg-slate-100 p-4 rounded-md border border-slate-200 space-y-2">
                    <h4 className="font-semibold text-blue-950">Récapitulatif de votre adhésion :</h4>
                    <div className="flex justify-between text-sm text-gray-700">
                      <span>Catégorie sélectionnée :</span>
                      <span className="font-medium capitalize">{selectedCategorie}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-700">
                      <span>Période :</span>
                      <span>1 an d'accès</span>
                    </div>
                    <hr className="my-2" />
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-900">Montant de la cotisation :</span>
                      <span className="text-lg font-extrabold text-blue-900">
                        {selectedCategorie === 'honneur' ? 'Exempté (0 CAD)' : selectedCategorie === 'associe' ? '50.00 CAD' : '30.00 CAD'}
                      </span>
                    </div>
                  </div>

                  {/* Loi 25 */}
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3 p-4 bg-emerald-50 rounded border border-emerald-100">
                      <Checkbox
                        id="consentement_loi_25"
                        checked={consentementLoi25}
                        onCheckedChange={(checked) => setValue('consentement_loi_25', checked === true, { shouldValidate: true })}
                        className="mt-1 border-emerald-400 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="space-y-1">
                        <Label htmlFor="consentement_loi_25" className="font-medium text-emerald-950 text-sm cursor-pointer">
                          Consentement Loi 25 (Protection des renseignements personnels)
                        </Label>
                        <p className="text-xs text-emerald-800 leading-relaxed">
                          J'accepte que l'association Synergie UQO collecte et traite mes données personnelles (nom, courriel, matricule, statut) aux seules fins de gestion administrative, d'accès à l'espace membre et de convocation aux assemblées générales. Vos informations ne seront jamais partagées à des tiers.
                        </p>
                      </div>
                    </div>
                    {errors.consentement_loi_25 && (
                      <p className="text-xs text-red-500 font-semibold">{errors.consentement_loi_25.message}</p>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between border-t pt-4">
                  <Button type="button" variant="outline" onClick={handleBack} disabled={isLoading}>
                    <ArrowLeft className="mr-2 w-4 h-4" /> Retour
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading || !consentementLoi25}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6"
                  >
                    {isLoading ? (
                      "Traitement..."
                    ) : selectedCategorie === 'honneur' ? (
                      <span className="flex items-center gap-2">
                        Créer mon compte <CheckCircle2 className="w-4 h-4" />
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Procéder au paiement <CreditCard className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </CardFooter>
              </>
            )}
          </form>
        </Card>
      </div>
    </div>
  );
}
