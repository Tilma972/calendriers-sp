// src/components/ClotureModal.tsx - Modal simplifié pour clôture de tournée
'use client';

import { useState } from 'react';
import { useAuthStore } from '@/shared/stores/auth';
import { useOfflineStore } from '@/shared/stores/offline';
import { Button, Card, CardHeader, CardBody, Input, Badge } from '@/components/ui';
import { 
  Home, 
  X, 
  BarChart3, 
  CreditCard, 
  ClipboardList, 
  Banknote, 
  Calendar, 
  Trophy,
  Smartphone,
  Check,
  ChevronDown
} from 'lucide-react';
import DonsDetailsList from './DonsDetailsList';

interface TourneeActive {
  tournee_id?: string;
}

interface DonDetaille {
  id: string;
  amount: number;
  calendars_given: number;
  payment_method: 'cheque' | 'carte';
  donator_name: string;
  donator_email?: string;
  notes?: string;
}

interface FormData {
  totalEspeces: string;
  calendarsVendus: string;
  donsAvecRecus: DonDetaille[];
}

interface ClotureModalProps {
  tourneeActive: TourneeActive | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ClotureModal({ tourneeActive, onClose, onSuccess }: ClotureModalProps) {
  const { user, profile } = useAuthStore();
  const { isOnline, addPendingTransaction } = useOfflineStore();
  const [submitInProgress, setSubmitInProgress] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    totalEspeces: '',
    calendarsVendus: '',
    donsAvecRecus: []
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !profile?.team_id || !tourneeActive) return;

    // Validation basique
    if (!formData.totalEspeces || parseFloat(formData.totalEspeces) <= 0) {
      alert('Veuillez saisir un montant en espèces');
      return;
    }

    if (!formData.calendarsVendus || parseInt(formData.calendarsVendus) <= 0) {
      alert('Veuillez indiquer le nombre de calendriers vendus');
      return;
    }

    setSubmitInProgress(true);

    try {
  const tourneeId = String((tourneeActive as TourneeActive)?.tournee_id ?? '');
      if (isOnline) {
        const response = await fetch('/api/tours/complete-tour', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tournee_id: tourneeId,
            user_id: user.id,
            team_id: profile.team_id,
            totalEspeces: parseFloat(formData.totalEspeces),
            calendarsVendus: parseInt(formData.calendarsVendus),
            donsDetailles: formData.donsAvecRecus
          })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Erreur lors de la clôture');
        }

        showSuccessToast('Tournée clôturée avec succès !');
        onSuccess();

      } else {
        // Mode offline - transaction principale
        addPendingTransaction({
          user_id: user.id,
          team_id: profile.team_id,
          tournee_id: tourneeId,
          amount: parseFloat(formData.totalEspeces),
          calendars_given: parseInt(formData.calendarsVendus),
          payment_method: 'especes',
          donator_name: 'Clôture tournée - Espèces',
          notes: 'Clôture de tournée groupée'
        });

        // Dons détaillés avec reçus en mode offline
        formData.donsAvecRecus.forEach(don => {
          addPendingTransaction({
            user_id: user.id,
            team_id: profile.team_id,
            tournee_id: tourneeId,
            amount: don.amount,
            calendars_given: don.calendars_given,
            payment_method: don.payment_method,
            donator_name: don.donator_name,
            donator_email: don.donator_email,
            notes: don.notes
          });
        });

        showSuccessToast('Tournée sauvegardée hors-ligne !');
        onSuccess();
      }

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Erreur clôture tournée:', message);
      alert('Erreur lors de la clôture: ' + message);
    } finally {
      setSubmitInProgress(false);
    }
  };

  const updateDonsAvecRecus = (dons: DonDetaille[]) => {
    setFormData({ ...formData, donsAvecRecus: dons });
  };

  const showSuccessToast = (message: string) => {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-40 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200">
        
        {/* Header professionnel */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
              <Home className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Clôture de tournée
              </h2>
              <p className="text-sm text-gray-600">
                Finaliser les collectes de la journée
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Section obligatoire */}
          <Card className="bg-red-50 border-2 border-red-200 mb-6">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-red-600" />
                <h3 className="text-lg font-semibold text-red-800">
                  Totaux (obligatoire)
                </h3>
              </div>
            </CardHeader>
            
            <CardBody>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Total espèces collectées (€) *"
                    type="number"
                    step="1"
                    min="0"
                    placeholder="0"
                    value={formData.totalEspeces}
                    onChange={(e) => setFormData({...formData, totalEspeces: e.target.value})}
                    required
                  />
                </div>
                
                <div>
                  <Input
                    label="Nombre de calendriers vendus *"
                    type="number"
                    min="1"
                    placeholder="0"
                    value={formData.calendarsVendus}
                    onChange={(e) => setFormData({...formData, calendarsVendus: e.target.value})}
                    required
                  />
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Section optionnelle */}
          <Card className="border-2 border-gray-200 mb-6">
            <details>
              <summary className="p-4 cursor-pointer hover:bg-gray-50 transition-colors font-semibold text-gray-800 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <span>+ Dons détaillés avec reçus (chèques/cartes)</span>
                <Badge variant="secondary" size="sm" className="ml-auto">
                  {formData.donsAvecRecus.length}
                </Badge>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </summary>
              
              <CardBody className="border-t border-gray-200">
                <div className="flex items-start gap-2 mb-4 p-3 bg-blue-50 rounded-lg">
                  <CreditCard className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-800">
                    Ajoutez ici les dons par chèque ou carte bancaire pour lesquels vous souhaitez envoyer un reçu automatique par email.
                  </p>
                </div>
                <DonsDetailsList 
                  dons={formData.donsAvecRecus}
                  onUpdate={updateDonsAvecRecus}
                />
              </CardBody>
            </details>
          </Card>

          {/* Récapitulatif */}
          {(formData.totalEspeces || formData.donsAvecRecus.length > 0) && (
            <Card className="bg-blue-50 border-2 border-blue-200 mb-6">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-blue-800">
                    Récapitulatif
                  </h4>
                </div>
              </CardHeader>
              
              <CardBody>
                <div className="space-y-2 text-sm text-blue-800">
                  {formData.totalEspeces && (
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Banknote className="w-4 h-4" />
                        <span>Total espèces:</span>
                      </div>
                      <strong>{formData.totalEspeces}€</strong>
                    </div>
                  )}
                  
                  {formData.calendarsVendus && (
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Calendriers vendus:</span>
                      </div>
                      <strong>{formData.calendarsVendus}</strong>
                    </div>
                  )}
                  
                  {formData.donsAvecRecus.length > 0 && (
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        <span>Dons détaillés:</span>
                      </div>
                      <strong>
                        {formData.donsAvecRecus.length} don{formData.donsAvecRecus.length > 1 ? 's' : ''} 
                        ({formData.donsAvecRecus.reduce((sum, don) => sum + don.amount, 0)}€)
                      </strong>
                    </div>
                  )}
                  
                  <div className="border-t border-blue-300 pt-2 mt-2">
                    <div className="flex justify-between items-center text-base font-bold">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4" />
                        <span>Total général:</span>
                      </div>
                      <span>
                        {(parseFloat(formData.totalEspeces) || 0) + formData.donsAvecRecus.reduce((sum, don) => sum + don.amount, 0)}€
                      </span>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Offline Notice */}
          {!isOnline && (
            <Card className="bg-orange-50 border-2 border-orange-200 mb-6">
              <CardBody>
                <div className="flex items-start gap-3">
                  <Smartphone className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-orange-800 mb-1">
                      Mode hors-ligne
                    </div>
                    <p className="text-sm text-orange-800">
                      La clôture sera sauvegardée localement et synchronisée dès le retour du réseau.
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Boutons d'action */}
          <div className="modal-actions flex gap-3">
            <Button 
              type="button" 
              onClick={onClose}
              variant="secondary"
              size="lg"
              className="flex-1"
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={submitInProgress}
              variant="primary"
              size="lg"
              className="flex-1 gap-2"
            >
              {submitInProgress && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              <Check className="w-4 h-4" />
              {isOnline ? 'Clôturer' : 'Sauver offline'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}