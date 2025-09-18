"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/shared/stores/auth";
import { LogOut, Clock } from "lucide-react";

export default function PendingPage() {
  const { profile, signOut } = useAuthStore();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-lg mx-4 text-center border-0 shadow-lg sm:border">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-yellow-100 rounded-full dark:bg-yellow-900/50">
              <Clock className="w-8 h-8 text-yellow-500 dark:text-yellow-400" />
            </div>
          </div>
          <CardTitle className="text-2xl">Compte en attente de validation</CardTitle>
          <CardDescription className="pt-2">
            {/* On lit le nom depuis le profil qui est maintenant correctement créé */}
            Bonjour {profile?.display_name || "cher utilisateur"}, merci pour votre inscription !
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Votre compte a bien été créé, mais il doit être validé par un administrateur avant que vous puissiez accéder à l'application.
            <br /><br />
            Cette opération est généralement rapide. Vous n'avez aucune autre action à faire.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button variant="outline" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Se déconnecter
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
