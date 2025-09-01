// src/components/admin/ReceiptApiTester.tsx - Composant de test pour l'API send-receipt

'use client';

import { useState, useEffect } from 'react';
import { useSendReceipt } from '@/shared/hooks/useSendReceipt';

interface Transaction {
  id: string;
  amount: number;
  donator_name?: string;
  donator_email?: string;
  created_at: string;
  receipt_status?: string;
}

export default function ReceiptApiTester() {
  const {
    isLoading,
    lastResult,
    sendReceipt,
    generateTestPDF,
    resendReceipt,
    checkHealth,
    clearCache
  } = useSendReceipt();

  const [testTransactionId, setTestTransactionId] = useState('');
  const [testDonatorEmail, setTestDonatorEmail] = useState('');
  const [testDonatorName, setTestDonatorName] = useState('');
  const [quality, setQuality] = useState<'draft' | 'standard' | 'high'>('standard');
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [availableTransactions, setAvailableTransactions] = useState<Transaction[]>([]);

  // Charger quelques transactions pour les tests
  useEffect(() => {
    loadTestTransactions();
  }, []);

  const loadTestTransactions = async () => {
    try {
      // Simuler la récupération de transactions (vous pouvez adapter selon votre API)
      // Pour l'instant, on utilise des IDs de test
      setAvailableTransactions([
        {
          id: 'test-transaction-1',
          amount: 25,
          donator_name: 'Jean Dupont (Test)',
          donator_email: 'jean.test@example.com',
          created_at: new Date().toISOString()
        },
        {
          id: 'test-transaction-2', 
          amount: 50,
          donator_name: 'Marie Martin (Test)',
          donator_email: 'marie.test@example.com',
          created_at: new Date().toISOString()
        }
      ]);
    } catch (error) {
      console.error('Erreur chargement transactions test:', error);
    }
  };

  const handleSendReceipt = async () => {
    if (!testTransactionId) {
      alert('ID de transaction requis');
      return;
    }

    const result = await sendReceipt(testTransactionId, {
      donatorInfo: testDonatorEmail ? {
        email: testDonatorEmail,
        name: testDonatorName || undefined
      } : undefined,
      options: {
        quality,
        sendEmail: true
      }
    });

    if (result.success) {
      alert(`✅ Succès: ${result.message}\nReçu: ${result.receiptNumber}`);
    } else {
      alert(`❌ Erreur: ${result.error}\n${result.details || ''}`);
    }
  };

  const handleTestPDF = async () => {
    if (!testTransactionId) {
      alert('ID de transaction requis');
      return;
    }

    const result = await generateTestPDF(testTransactionId);
    
    if (result.success) {
      alert(`✅ PDF Test généré: ${result.receiptNumber}\nWorkflow: ${result.workflowId}`);
    } else {
      alert(`❌ Erreur PDF: ${result.error}`);
    }
  };

  const handleResend = async () => {
    if (!testTransactionId) {
      alert('ID de transaction requis');
      return;
    }

    const result = await resendReceipt(testTransactionId, {
      donatorInfo: testDonatorEmail ? {
        email: testDonatorEmail,
        name: testDonatorName || undefined
      } : undefined,
      options: { quality }
    });

    if (result.success) {
      alert(`✅ Renvoi réussi: ${result.message}`);
    } else {
      alert(`❌ Erreur renvoi: ${result.error}`);
    }
  };

  const handleHealthCheck = async () => {
    const health = await checkHealth();
    setHealthStatus(health);
  };

  const handleClearCache = async (force: boolean = false) => {
    const result = await clearCache(force);
    
    if (result.success) {
      alert(`✅ Cache vidé: ${result.itemsCleared} entrées supprimées`);
    } else {
      alert(`❌ Erreur: ${result.error}`);
    }
  };

  const selectTransaction = (transaction: Transaction) => {
    setTestTransactionId(transaction.id);
    setTestDonatorEmail(transaction.donator_email || '');
    setTestDonatorName(transaction.donator_name || '');
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">🧪 Test API Send-Receipt</h3>
      
      {/* Sélection rapide de transactions */}
      {availableTransactions.length > 0 && (
        <div className="mb-4 p-4 bg-gray-50 rounded">
          <h4 className="font-medium text-gray-700 mb-2">Transactions de test disponibles:</h4>
          <div className="space-y-2">
            {availableTransactions.map((transaction) => (
              <button
                key={transaction.id}
                onClick={() => selectTransaction(transaction)}
                className="block w-full text-left p-2 text-sm bg-white border rounded hover:bg-blue-50 hover:border-blue-300"
              >
                <div className="font-medium">{transaction.donator_name}</div>
                <div className="text-gray-600">{transaction.donator_email} • {transaction.amount}€</div>
                <div className="text-xs text-gray-500">{transaction.id}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Formulaire de test */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ID Transaction
          </label>
          <input
            type="text"
            value={testTransactionId}
            onChange={(e) => setTestTransactionId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="UUID de la transaction..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email donateur (optionnel)
            </label>
            <input
              type="email"
              value={testDonatorEmail}
              onChange={(e) => setTestDonatorEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="test@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom donateur (optionnel)
            </label>
            <input
              type="text"
              value={testDonatorName}
              onChange={(e) => setTestDonatorName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="Jean Dupont"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Qualité PDF
          </label>
          <select
            value={quality}
            onChange={(e) => setQuality(e.target.value as 'draft' | 'standard' | 'high')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="draft">Draft (rapide)</option>
            <option value="standard">Standard</option>
            <option value="high">Haute qualité</option>
          </select>
        </div>

        {/* Actions principales */}
        <div className="flex flex-wrap gap-2 pt-4 border-t">
          <button
            onClick={handleSendReceipt}
            disabled={isLoading || !testTransactionId}
            className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:opacity-50"
          >
            {isLoading ? '⏳' : '📧'} Envoyer Reçu
          </button>

          <button
            onClick={handleTestPDF}
            disabled={isLoading || !testTransactionId}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? '⏳' : '🧪'} Test PDF
          </button>

          <button
            onClick={handleResend}
            disabled={isLoading || !testTransactionId}
            className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm hover:bg-orange-700 disabled:opacity-50"
          >
            {isLoading ? '⏳' : '🔄'} Renvoyer
          </button>

          <button
            onClick={handleHealthCheck}
            disabled={isLoading}
            className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700 disabled:opacity-50"
          >
            {isLoading ? '⏳' : '🏥'} Health Check
          </button>

          <button
            onClick={() => handleClearCache(false)}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-600 text-white rounded-md text-sm hover:bg-gray-700 disabled:opacity-50"
          >
            🧹 Nettoyer Cache
          </button>

          <button
            onClick={() => handleClearCache(true)}
            disabled={isLoading}
            className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:opacity-50"
          >
            🗑️ Vider Cache
          </button>
        </div>
      </div>

      {/* Résultat du dernier test */}
      {lastResult && (
        <div className="mt-6 p-4 bg-gray-50 rounded">
          <h4 className="font-medium text-gray-700 mb-2">Dernier résultat:</h4>
          <div className={`p-3 rounded text-sm ${lastResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            <div className="font-medium mb-1">
              {lastResult.success ? '✅ Succès' : '❌ Erreur'}
              {lastResult.fromCache && ' (depuis cache)'}
              {lastResult.isExisting && ' (déjà existant)'}
            </div>
            
            {lastResult.success ? (
              <div className="space-y-1">
                <div><strong>Reçu:</strong> {lastResult.receiptNumber}</div>
                <div><strong>Email:</strong> {lastResult.emailTo}</div>
                {lastResult.workflowId && <div><strong>Workflow:</strong> {lastResult.workflowId}</div>}
                {lastResult.message && <div><strong>Message:</strong> {lastResult.message}</div>}
              </div>
            ) : (
              <div className="space-y-1">
                <div><strong>Erreur:</strong> {lastResult.error}</div>
                {lastResult.details && <div><strong>Détails:</strong> {lastResult.details}</div>}
                {lastResult.suggestion && <div><strong>Suggestion:</strong> {lastResult.suggestion}</div>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Health Status */}
      {healthStatus && (
        <div className="mt-6 p-4 bg-gray-50 rounded">
          <h4 className="font-medium text-gray-700 mb-2">État de santé API:</h4>
          <div className={`p-3 rounded text-sm ${
            healthStatus.status === 'healthy' ? 'bg-green-100 text-green-800' :
            healthStatus.status === 'degraded' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            <div className="font-medium mb-2">
              Status: {healthStatus.status} ({healthStatus.timestamp})
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <div className="font-medium">n8n</div>
                <div>{healthStatus.checks?.n8nConnection?.success ? '✅' : '❌'}</div>
              </div>
              <div>
                <div className="font-medium">Storage</div>
                <div>{healthStatus.checks?.storage?.healthy ? '✅' : '❌'}</div>
              </div>
              <div>
                <div className="font-medium">Database</div>
                <div>{healthStatus.checks?.database ? '✅' : '❌'}</div>
              </div>
              <div>
                <div className="font-medium">Cache</div>
                <div>{healthStatus.stats?.cache?.size || 0}/{healthStatus.stats?.cache?.maxSize || 1000}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}