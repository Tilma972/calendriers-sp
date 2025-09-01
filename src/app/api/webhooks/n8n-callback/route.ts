// src/app/api/webhooks/n8n-callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/shared/lib/supabase';

// Interface pour les callbacks n8n
interface N8nCallbackPayload {
  workflowId: string;
  executionId: string;
  status: 'success' | 'failed' | 'running';
  result?: {
    pdfUrl?: string;
    emailSent?: boolean;
    processingTime?: number;
    error?: string;
  };
  transactionId?: string;
  timestamp: string;
  data?: any; // Données supplémentaires de n8n
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Callback reçu de n8n...');
    
    // Vérification du Content-Type
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      console.warn('⚠️ Content-Type invalide:', contentType);
      return NextResponse.json(
        { error: 'Content-Type must be application/json' }, 
        { status: 400 }
      );
    }

    // Parse du body
    let payload: N8nCallbackPayload;
    try {
      payload = await request.json();
    } catch (parseError) {
      console.error('❌ Erreur parsing JSON:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON payload' }, 
        { status: 400 }
      );
    }

    // Validation des champs obligatoires
    if (!payload.workflowId || !payload.executionId || !payload.status) {
      console.error('❌ Champs manquants:', payload);
      return NextResponse.json(
        { error: 'Missing required fields: workflowId, executionId, status' }, 
        { status: 400 }
      );
    }

    console.log('📨 Processing n8n callback:', {
      workflowId: payload.workflowId,
      executionId: payload.executionId,
      status: payload.status,
      transactionId: payload.transactionId
    });

    // 1. Mettre à jour les logs n8n_workflow_logs
    await updateWorkflowLog(payload);

    // 2. Mettre à jour les logs email si applicable
    if (payload.result?.emailSent !== undefined && payload.transactionId) {
      await updateEmailLog(payload);
    }

    // 3. Mettre à jour le statut de la transaction si applicable
    if (payload.transactionId) {
      await updateTransactionReceiptStatus(payload);
    }

    console.log('✅ Callback n8n traité avec succès');

    return NextResponse.json({
      success: true,
      message: 'Callback processed successfully',
      workflowId: payload.workflowId,
      executionId: payload.executionId
    });

  } catch (error: any) {
    console.error('❌ Erreur callback n8n:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message 
      }, 
      { status: 500 }
    );
  }
}

// GET pour health check
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    endpoint: '/api/webhooks/n8n-callback',
    methods: ['POST'],
    timestamp: new Date().toISOString()
  });
}

/**
 * Met à jour le log du workflow n8n
 */
async function updateWorkflowLog(payload: N8nCallbackPayload): Promise<void> {
  try {
    const updateData = {
      success: payload.status === 'success',
      response_data: {
        status: payload.status,
        executionId: payload.executionId,
        result: payload.result,
        timestamp: payload.timestamp,
        data: payload.data
      },
      processing_time_ms: payload.result?.processingTime,
      error_message: payload.result?.error,
      updated_at: new Date().toISOString()
    };

    // Mise à jour par workflow_id OU execution_id
    const { error } = await supabase
      .from('n8n_workflow_logs')
      .update(updateData)
      .or(`workflow_id.eq.${payload.workflowId},workflow_id.eq.${payload.executionId}`);

    if (error) {
      console.error('❌ Erreur mise à jour n8n_workflow_logs:', error);
    } else {
      console.log('✅ n8n_workflow_logs mis à jour');
    }
  } catch (error) {
    console.error('❌ Erreur updateWorkflowLog:', error);
  }
}

/**
 * Met à jour le log de l'email si envoi email
 */
async function updateEmailLog(payload: N8nCallbackPayload): Promise<void> {
  try {
    if (!payload.transactionId) return;

    const emailStatus = payload.status === 'success' && payload.result?.emailSent 
      ? 'sent' 
      : 'failed';

    const updateData = {
      status: emailStatus,
      error_message: payload.result?.error,
      sent_at: payload.status === 'success' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    };

    // Chercher le log email par transaction_id
    const { error } = await supabase
      .from('email_logs')
      .update(updateData)
      .eq('transaction_id', payload.transactionId);

    if (error) {
      console.warn('⚠️ Email log non trouvé ou erreur mise à jour:', error);
    } else {
      console.log('✅ Email log mis à jour:', emailStatus);
    }
  } catch (error) {
    console.error('❌ Erreur updateEmailLog:', error);
  }
}

/**
 * Met à jour le statut du reçu dans la transaction
 */
async function updateTransactionReceiptStatus(payload: N8nCallbackPayload): Promise<void> {
  try {
    if (!payload.transactionId) return;

    const receiptStatus = payload.status === 'success' 
      ? 'generated' 
      : 'failed';

    // Chercher si la table transactions a un champ receipt_status
    const { error } = await supabase
      .from('transactions')
      .update({ 
        receipt_status: receiptStatus,
        receipt_generated_at: payload.status === 'success' ? new Date().toISOString() : null,
        receipt_pdf_url: payload.result?.pdfUrl || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', payload.transactionId);

    if (error) {
      // Si la colonne n'existe pas encore, on ignore silencieusement
      console.warn('⚠️ Transaction non trouvée ou champ receipt_status inexistant:', error);
    } else {
      console.log('✅ Transaction receipt_status mis à jour:', receiptStatus);
    }
  } catch (error) {
    console.error('❌ Erreur updateTransactionReceiptStatus:', error);
  }
}

// Options pour CORS si nécessaire
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}