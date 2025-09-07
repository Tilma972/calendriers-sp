'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/shared/lib/supabase';
import { BarChart3, TrendingUp, Users, CreditCard } from 'lucide-react';

interface QRStats {
  total_interactions: number;
  successful_payments: number;
  total_amount: number;
  teams_active: number;
  conversion_rate: number;
}

export default function QRLivePage() {
  const [stats, setStats] = useState<QRStats>({
    total_interactions: 0,
    successful_payments: 0,
    total_amount: 0,
    teams_active: 0,
    conversion_rate: 0
  });

  const loadQRStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_qr_live_stats');
      
      if (error) {
        console.error('Error loading QR stats:', error);
        return;
      }
      
      if (data && data.length > 0) {
        setStats(data[0]);
      }
    } catch (error) {
      console.error('Error in loadQRStats:', error);
    }
  };

  useEffect(() => {
    loadQRStats();

    const channel = supabase
      .channel('qr-stats')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'transactions',
        filter: 'payment_method=eq.carte_qr'
      }, () => {
        loadQRStats();
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'qr_interactions'
      }, () => {
        loadQRStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics QR Code - Temps Réel</h1>
          <p className="text-gray-600">Suivi des interactions et paiements QR en direct</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Interactions Totales</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total_interactions}</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Paiements Réussis</p>
              <p className="text-3xl font-bold text-green-600">{stats.successful_payments}</p>
            </div>
            <CreditCard className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Montant Total</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total_amount.toFixed(2)}€</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Taux de Conversion</p>
              <p className="text-3xl font-bold text-blue-600">{stats.conversion_rate.toFixed(1)}%</p>
            </div>
            <BarChart3 className="h-8 w-8 text-blue-500" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <h3 className="text-lg font-semibold text-gray-900">État du Système</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600">Équipes Actives</span>
            <span className="font-semibold text-gray-900">{stats.teams_active}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600">Mise à jour</span>
            <span className="text-green-600 font-medium">Temps réel</span>
          </div>
        </div>
      </div>
    </div>
  );
}