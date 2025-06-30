'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { login, type LoginState } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { AlertCircle, LogIn, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function LoginButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connexion...
        </>
      ) : (
        <>
          <LogIn className="mr-2 h-4 w-4" />
          Se connecter
        </>
      )}
    </Button>
  );
}

const initialState: LoginState = {
  success: false,
};

export default function LoginPage() {
  const router = useRouter();
  const [state, formAction] = useActionState(login, initialState);

  useEffect(() => {
    if (state.success) {
      router.refresh();
      // The middleware will catch the refresh and redirect to the dashboard
      // if the session is valid. No need to router.push() here.
    }
  }, [state.success, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center">
            <Image
                src="https://cdn-transverse.azureedge.net/phlogos/BC548191.jpg"
                alt="Trapel Football Club Logo"
                width={64}
                height={64}
                className="rounded-full mx-auto mb-4"
            />
          <CardTitle className="text-2xl font-headline">Connexion</CardTitle>
          <CardDescription>Entrez vos identifiants pour accéder au panneau de gestion.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Nom d'utilisateur</Label>
              <Input id="username" name="username" placeholder="admin" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            {state?.error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erreur de connexion</AlertTitle>
                    <AlertDescription>
                        {state.error}
                    </AlertDescription>
                </Alert>
            )}
            <LoginButton />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
