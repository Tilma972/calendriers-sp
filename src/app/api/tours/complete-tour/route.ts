// src/app/api/tours/complete-tour/route.ts - API de clôture de tournée
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/shared/lib/supabase';

interface DonDetaille {
  id: string;
  amount: number;
  calendars_given: number;
  payment_method: 'cheque' | 'carte';
  donator_name: string;
  donator_email?: string;
  notes?: string;
}

interface CompleteTourRequest {
  tournee_id: string;
  user_id: string;
  team_id: string;
  totalEspeces: number;
  calendarsVendus: number;
  donsDetailles: DonDetaille[];
}

export async function POST(request: NextRequest) {
  try {
    console.log('🏠 Clôture de tournée - début');
    
    const body: CompleteTourRequest = await request.json();
    const { 
      tournee_id, 
      user_id, 
      team_id, 
      totalEspeces, 
      calendarsVendus, 
      donsDetailles 
    } = body;

    // Validation des données
    if (!tournee_id || !user_id || !team_id) {
      return NextResponse.json({ 
        error: 'Données manquantes: tournee_id, user_id ou team_id' 
      }, { status: 400 });
    }

    if (totalEspeces <= 0 && donsDetailles.length === 0) {
      return NextResponse.json({ 
        error: 'Au moins un montant en espèces ou un don détaillé requis' 
      }, { status: 400 });
    }

    if (calendarsVendus <= 0) {
      return NextResponse.json({ 
        error: 'Le nombre de calendriers vendus doit être supérieur à 0' 
      }, { status: 400 });
    }

    console.log('📊 Données de clôture:', {
      tournee_id,
      totalEspeces,
      calendarsVendus,
      donsDetaillesCount: donsDetailles.length
    });

    const createdTransactions: string[] = [];
    const receiptResults: any[] = [];

    // 1. Créer la transaction pour les espèces si > 0
    if (totalEspeces > 0) {
      console.log('💵 Création transaction espèces:', totalEspeces);
      
      const { data: espècesTransaction, error: espècesError } = await supabase
        .from('transactions')
        .insert({
          user_id,
          team_id,
          tournee_id,
          amount: totalEspeces,
          calendars_given: calendarsVendus,
          payment_method: 'especes',
          donator_name: 'Clôture tournée - Espèces groupées',
          notes: 'Clôture de tournée - Total des dons en espèces',
          status: 'pending'
        })
        .select()
        .single();

      if (espècesError) {
        console.error('❌ Erreur création transaction espèces:', espècesError);
        throw espècesError;
      }

      createdTransactions.push(espècesTransaction.id);
      console.log('✅ Transaction espèces créée:', espècesTransaction.id);
    }

    // 2. Créer une transaction pour chaque don détaillé
    for (const don of donsDetailles) {
      console.log('💳 Création transaction détaillée:', don.donator_name);
      
      const { data: detailTransaction, error: detailError } = await supabase
        .from('transactions')
        .insert({
          user_id,
          team_id,
          tournee_id,
          amount: don.amount,
          calendars_given: don.calendars_given,
          payment_method: don.payment_method,
          donator_name: don.donator_name,
          donator_email: don.donator_email || null,
          notes: don.notes || null,
          status: 'pending'
        })
        .select()
        .single();

      if (detailError) {
        console.error('❌ Erreur création transaction détaillée:', detailError);
        throw detailError;
      }

      createdTransactions.push(detailTransaction.id);
      console.log('✅ Transaction détaillée créée:', detailTransaction.id);

      // 3. Envoyer reçu automatique si email fourni
      if (don.donator_email) {
        console.log('📧 Envoi reçu automatique pour:', don.donator_email);
        
        try {
          const receiptResponse = await fetch('/api/donations/send-receipt', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              transactionId: detailTransaction.id,
              options: {
                quality: 'standard',
                sendEmail: true
              }
            })
          });

          const receiptResult = await receiptResponse.json();
          
          if (receiptResponse.ok && receiptResult.success) {
            console.log('✅ Reçu envoyé avec succès:', receiptResult.receiptNumber);
            receiptResults.push({
              transactionId: detailTransaction.id,
              donatorEmail: don.donator_email,
              success: true,
              receiptNumber: receiptResult.receiptNumber
            });
          } else {
            console.warn('⚠️ Erreur envoi reçu:', receiptResult.error);
            receiptResults.push({
              transactionId: detailTransaction.id,
              donatorEmail: don.donator_email,
              success: false,
              error: receiptResult.error
            });
          }
        } catch (receiptError) {
          console.error('❌ Erreur process reçu:', receiptError);
          receiptResults.push({
            transactionId: detailTransaction.id,
            donatorEmail: don.donator_email,
            success: false,
            error: 'Erreur technique envoi reçu'
          });
        }
      }
    }

    // 4. Marquer la tournée comme terminée (optionnel)
    // Vous pouvez ajouter une colonne status dans la table tournees si nécessaire
    /*
    const { error: tourneeUpdateError } = await supabase
      .from('tournees')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', tournee_id);

    if (tourneeUpdateError) {
      console.warn('⚠️ Erreur mise à jour statut tournée:', tourneeUpdateError);
    }
    */

    console.log('🎉 Clôture de tournée terminée avec succès');

    // 5. Réponse de succès
    const totalAmount = totalEspeces + donsDetailles.reduce((sum, don) => sum + don.amount, 0);
    const successfulReceipts = receiptResults.filter(r => r.success).length;
    const failedReceipts = receiptResults.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      message: 'Tournée clôturée avec succès',
      summary: {
        transactionsCreated: createdTransactions.length,
        totalAmount,
        calendarsVendus,
        receipts: {
          sent: successfulReceipts,
          failed: failedReceipts,
          total: receiptResults.length
        }
      },
      details: {
        transactionIds: createdTransactions,
        receiptResults
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erreur API complete-tour:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la clôture de tournée',
      details: process.env.NODE_ENV === 'development' 
        ? (error instanceof Error ? error.message : 'Unknown error') 
        : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Route de test/health check
export async function GET() {
  try {
    // Test basique de connexion DB
    const { data, error } = await supabase
      .from('transactions')
      .select('id')
      .limit(1);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      status: 'healthy',
      message: 'API complete-tour opérationnelle',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Problème connexion base de données',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}