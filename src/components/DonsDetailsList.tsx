// src/components/DonsDetailsList.tsx - Liste des dons détaillés pour clôture
'use client';

import { useState } from 'react';

interface DonDetaille {
  id: string;
  amount: number;
  calendars_given: number;
  payment_method: 'cheque' | 'carte';
  donator_name: string;
  donator_email?: string;
  notes?: string;
}

interface DonsDetailsListProps {
  dons: DonDetaille[];
  onUpdate: (dons: DonDetaille[]) => void;
}

export default function DonsDetailsList({ dons, onUpdate }: DonsDetailsListProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDon, setNewDon] = useState<Omit<DonDetaille, 'id'>>({
    amount: 10,
    calendars_given: 1,
    payment_method: 'cheque',
    donator_name: '',
    donator_email: '',
    notes: ''
  });

  const handleAddDon = () => {
    
    if (!newDon.donator_name.trim()) {
      alert('⚠️ Le nom du donateur est obligatoire');
      return;
    }

    const donWithId: DonDetaille = {
      ...newDon,
      id: Date.now().toString(),
      donator_name: newDon.donator_name.trim(),
      donator_email: newDon.donator_email?.trim() || undefined,
      notes: newDon.notes?.trim() || undefined
    };

    onUpdate([...dons, donWithId]);
    
    // Reset form
    setNewDon({
      amount: 10,
      calendars_given: 1,
      payment_method: 'cheque',
      donator_name: '',
      donator_email: '',
      notes: ''
    });
    
    setShowAddForm(false);
  };

  const handleRemoveDon = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce don ?')) {
      onUpdate(dons.filter(don => don.id !== id));
    }
  };

  const handleUpdateDon = (id: string, updatedDon: Partial<DonDetaille>) => {
    onUpdate(dons.map(don => 
      don.id === id ? { ...don, ...updatedDon } : don
    ));
  };

  return (
    <div className="space-y-4">
      {/* Liste des dons existants */}
      {dons.length > 0 && (
        <div className="space-y-3">
          {dons.map((don) => (
            <div key={don.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">
                    {don.payment_method === 'cheque' ? '📝' : '💳'}
                  </span>
                  <span className="font-semibold text-gray-900">
                    {don.donator_name}
                  </span>
                </div>
                <button
                  onClick={() => handleRemoveDon(don.id)}
                  className="text-red-500 hover:text-red-700 text-lg font-bold leading-none"
                  title="Supprimer ce don"
                >
                  ×
                </button>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Montant:</span> {don.amount}€
                </div>
                <div>
                  <span className="font-medium">Calendriers:</span> {don.calendars_given}
                </div>
                <div>
                  <span className="font-medium">Paiement:</span> {don.payment_method}
                </div>
                <div>
                  <span className="font-medium">Reçu:</span> {don.donator_email ? '📧 Oui' : '❌ Non'}
                </div>
              </div>
              
              {don.donator_email && (
                <div className="mt-2 text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  📧 {don.donator_email}
                </div>
              )}
              
              {don.notes && (
                <div className="mt-2 text-sm text-gray-600 italic">
                  💬 {don.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Bouton d'ajout / Formulaire d'ajout */}
      <button
        type="button"
        onClick={() => setShowAddForm(!showAddForm)}
        className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors flex items-center justify-center gap-2"
      >
        <span className="text-xl">+</span>
        <span className="font-medium">Ajouter un don détaillé</span>
      </button>

      {showAddForm && (
        <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
          <h5 className="font-semibold text-blue-800 mb-4 flex items-center gap-2">
            <span className="text-xl">💳</span>
            <span>Nouveau don détaillé</span>
          </h5>
          
          <div className="space-y-4">
            {/* Nom du donateur */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Nom du donateur *
              </label>
              <input
                type="text"
                value={newDon.donator_name}
                onChange={(e) => setNewDon({ ...newDon, donator_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="M. Dupont"
                required
              />
            </div>

            {/* Montant et calendriers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Montant (€) *
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={newDon.amount}
                  onChange={(e) => setNewDon({ ...newDon, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Calendriers
                </label>
                <select
                  value={newDon.calendars_given}
                  onChange={(e) => setNewDon({ ...newDon, calendars_given: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                  {[1, 2, 3, 4, 5].map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mode de paiement */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Mode de paiement
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setNewDon({ ...newDon, payment_method: 'cheque' })}
                  className={`py-2 px-3 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                    newDon.payment_method === 'cheque'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span>📝</span>
                  <span>Chèque</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setNewDon({ ...newDon, payment_method: 'carte' })}
                  className={`py-2 px-3 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                    newDon.payment_method === 'carte'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span>💳</span>
                  <span>Carte</span>
                </button>
              </div>
            </div>

            {/* Email pour reçu */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Email pour reçu (optionnel)
                <span className="text-xs font-normal text-blue-600 block mt-1">
                  📧 Reçu envoyé automatiquement si fourni
                </span>
              </label>
              <input
                type="email"
                value={newDon.donator_email}
                onChange={(e) => setNewDon({ ...newDon, donator_email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="donateur@exemple.com"
              />
              {newDon.donator_email && (
                <div className="mt-1 text-xs text-green-700 flex items-center gap-1">
                  <span>✓</span>
                  <span>Reçu sera envoyé à {newDon.donator_email}</span>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Notes (optionnel)
              </label>
              <textarea
                value={newDon.notes}
                onChange={(e) => setNewDon({ ...newDon, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={2}
                placeholder="Informations complémentaires..."
              />
            </div>

            {/* Boutons d'action */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleAddDon}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Récapitulatif des dons détaillés */}
      {dons.length > 0 && (
        <div className="bg-gray-100 rounded-lg p-3">
          <div className="text-sm text-gray-700 space-y-1">
            <div className="flex justify-between">
              <span>Nombre de dons:</span>
              <strong>{dons.length}</strong>
            </div>
            <div className="flex justify-between">
              <span>Total montant:</span>
              <strong>{dons.reduce((sum, don) => sum + don.amount, 0)}€</strong>
            </div>
            <div className="flex justify-between">
              <span>Total calendriers:</span>
              <strong>{dons.reduce((sum, don) => sum + don.calendars_given, 0)}</strong>
            </div>
            <div className="flex justify-between">
              <span>Avec reçu email:</span>
              <strong>{dons.filter(don => don.donator_email).length}/{dons.length}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}