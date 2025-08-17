import React, { useState } from 'react';
import { Contract } from '../types/api';
import { spaceTraders } from '../services/api';

interface ContractCardProps {
  contract: Contract;
  onContractAccepted?: (contract: Contract) => void;
}

export function ContractCard({ contract, onContractAccepted }: ContractCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAcceptContract = async () => {
    if (!confirm(`Accept contract "${contract.type}" for ${contract.terms.payment.onAccepted + contract.terms.payment.onFulfilled} credits?`)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const acceptedContract = await spaceTraders.acceptContract(contract.id);
      onContractAccepted?.(acceptedContract);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to accept contract';
      setError(errorMessage);
      console.error('Contract acceptance error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isExpired = new Date(contract.expiration) < new Date();
  const isDeadlineSoon = contract.terms.deadline && 
    new Date(contract.terms.deadline).getTime() - new Date().getTime() < 24 * 60 * 60 * 1000; // 24 hours

  return (
    <div className={`contract-card ${contract.accepted ? 'accepted' : ''} ${isExpired ? 'expired' : ''}`}>
      <div className="contract-header">
        <div className="contract-title">
          <h3>{contract.type}</h3>
          <span className="contract-faction">{contract.factionSymbol}</span>
        </div>
        <div className="contract-status">
          {contract.accepted && <span className="status-accepted">✓ Accepted</span>}
          {contract.fulfilled && <span className="status-fulfilled">✓ Fulfilled</span>}
          {isExpired && <span className="status-expired">⚠ Expired</span>}
        </div>
      </div>

      <div className="contract-details">
        <div className="contract-payment">
          <div className="payment-item">
            <span className="payment-label">On Accept:</span>
            <span className="payment-value">{contract.terms.payment.onAccepted.toLocaleString()} credits</span>
          </div>
          <div className="payment-item">
            <span className="payment-label">On Complete:</span>
            <span className="payment-value">{contract.terms.payment.onFulfilled.toLocaleString()} credits</span>
          </div>
          <div className="payment-item total">
            <span className="payment-label">Total:</span>
            <span className="payment-value">
              {(contract.terms.payment.onAccepted + contract.terms.payment.onFulfilled).toLocaleString()} credits
            </span>
          </div>
        </div>

        {contract.terms.deliver && contract.terms.deliver.length > 0 && (
          <div className="contract-deliverables">
            <h4>Delivery Requirements:</h4>
            {contract.terms.deliver.map((delivery, index) => (
              <div key={index} className="delivery-item">
                <span className="delivery-good">{delivery.tradeSymbol}</span>
                <span className="delivery-amount">
                  {delivery.unitsFulfilled}/{delivery.unitsRequired} units
                </span>
                <span className="delivery-destination">to {delivery.destinationSymbol}</span>
                <div className="delivery-progress">
                  <div 
                    className="progress-bar"
                    style={{ width: `${(delivery.unitsFulfilled / delivery.unitsRequired) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="contract-dates">
          <div className="date-item">
            <span className="date-label">Expires:</span>
            <span className={`date-value ${isExpired ? 'expired' : ''}`}>
              {formatDate(contract.expiration)}
            </span>
          </div>
          {contract.terms.deadline && (
            <div className="date-item">
              <span className="date-label">Deadline:</span>
              <span className={`date-value ${isDeadlineSoon ? 'warning' : ''}`}>
                {formatDate(contract.terms.deadline)}
              </span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="contract-error">
          {error}
        </div>
      )}

      {!contract.accepted && !isExpired && (
        <div className="contract-actions">
          <button
            onClick={handleAcceptContract}
            disabled={loading}
            className="accept-button"
          >
            {loading ? 'Accepting...' : 'Accept Contract'}
          </button>
        </div>
      )}
    </div>
  );
}