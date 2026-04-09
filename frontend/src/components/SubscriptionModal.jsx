import { useState, useEffect } from 'react';
import { useSubscription } from '../contexts/SubscriptionContext';
import './SubscriptionModal.css';

export default function SubscriptionModal() {
  const { showSubscriptionModal, setShowSubscriptionModal, getRemainingUsage, limits, usage, syncFromBackend } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [alreadySubInfo, setAlreadySubInfo] = useState(null);

  // Listen for payment result from the eSewa tab
  useEffect(() => {
    const handler = (e) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === 'ESEWA_SUCCESS') {
        syncFromBackend();
        setShowSubscriptionModal(false);
        window.dispatchEvent(new CustomEvent('soluna:subscriptionActivated'));
        window.location.href = `/home?subscribed=${e.data.plan}`;
      } else if (e.data?.type === 'ESEWA_FAILURE') {
        // silently ignore — user stays on current page
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const remaining = getRemainingUsage();

  const plans = {
    monthly: {
      name: 'Monthly',
      price: 500,
      duration: '1 Month',
      features: [
        'Unlimited Chatbot Access',
        'Unlimited Journal Entries',
        'Unlimited Library Access',
        'Unlimited Mood Tracking'
      ]
    },
    yearly: {
      name: 'Yearly',
      price: 5000,
      duration: '12 Months',
      savings: 'Save Rs. 1000',
      features: [
        'Unlimited Chatbot Access',
        'Unlimited Journal Entries',
        'Unlimited Library Access',
        'Unlimited Mood Tracking',
        'Priority Support'
      ]
    }
  };

  const handleEsewaPayment = async () => {
    if (usage.isPremium && usage.subscriptionExpiry) {
      const expiry = new Date(usage.subscriptionExpiry);
      const isYearly = (expiry - new Date()) > 32 * 24 * 60 * 60 * 1000;
      setAlreadySubInfo({ expiry, plan: isYearly ? 'yearly' : 'monthly' });
      return;
    }

    const plan = plans[selectedPlan];
    const transactionId = `SOLUNA-${selectedPlan.toUpperCase()}-${Date.now()}`;
    const totalAmount = plan.price;
    const productCode = 'EPAYTEST';

    // Open tab synchronously BEFORE any await to avoid popup blocker
    const esewaTab = window.open('about:blank', '_blank');
    if (!esewaTab) {
      alert('Please allow popups for this site to proceed with payment.');
      return;
    }

    try {
      const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
      const sigRes = await fetch('http://localhost:5001/api/subscription/esewa-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ total_amount: totalAmount, transaction_uuid: transactionId, product_code: productCode })
      });
      const { signature } = await sigRes.json();

      const form = esewaTab.document.createElement('form');
      form.method = 'POST';
      form.action = 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';

      const fields = {
        amount: totalAmount, tax_amount: 0, total_amount: totalAmount,
        transaction_uuid: transactionId, product_code: productCode,
        product_service_charge: 0, product_delivery_charge: 0,
        success_url: `${window.location.origin}/payment/success`,
        failure_url: `${window.location.origin}/payment/failure`,
        signed_field_names: 'total_amount,transaction_uuid,product_code',
        signature
      };

      Object.entries(fields).forEach(([key, value]) => {
        const input = esewaTab.document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        form.appendChild(input);
      });

      esewaTab.document.body.appendChild(form);
      form.submit();
    } catch (err) {
      console.error('Payment init failed:', err);
      esewaTab.close();
      alert('Could not initiate payment. Please try again.');
    }
  };

  if (alreadySubInfo) {
    const expiryStr = alreadySubInfo.expiry.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const planLabel = alreadySubInfo.plan === 'yearly' ? 'Yearly' : 'Monthly';
    return (
      <div className="sub-overlay">
        <div className="sub-success-modal">
          <div className="sub-success-header">
            <h3>Already Subscribed</h3>
          </div>
          <div className="sub-success-body">
            <p>You already have an active <strong>{planLabel} Plan</strong>.</p>
            <div className="sub-success-details">
              <div className="sub-success-detail-row">
                <span>Current Plan</span>
                <strong>{planLabel}</strong>
              </div>
              <div className="sub-success-detail-row">
                <span>Expires On</span>
                <strong>{expiryStr}</strong>
              </div>
            </div>
            <p className="sub-success-perks">Your subscription is still active. You can renew once it expires.</p>
          </div>
          <div className="sub-success-actions">
            <button className="sub-success-btn" onClick={() => { setAlreadySubInfo(null); setShowSubscriptionModal(false); }}>Got it</button>
          </div>
        </div>
      </div>
    );
  }

  if (!showSubscriptionModal) return null;

  return (
    <div className="sub-overlay">
      <div className="sub-modal">
        <button className="sub-close" onClick={() => setShowSubscriptionModal(false)}>×</button>

        <div className="sub-header">
          <h2>Unlock Full Access</h2>
          <p>Continue your wellness journey without limits</p>
        </div>

        <div className="sub-usage">
          <h3>Your Current Usage:</h3>
          <div className="sub-usage-grid">
            <div className="sub-usage-item">
              <span className="sub-usage-label">Chatbot</span>
              <span className="sub-usage-value">{remaining.chatbot} / {limits.CHATBOT}</span>
              <span className="sub-usage-sub">remaining</span>
            </div>
            <div className="sub-usage-item">
              <span className="sub-usage-label">Journal</span>
              <span className="sub-usage-value">{remaining.journal} / {limits.JOURNAL}</span>
              <span className="sub-usage-sub">remaining</span>
            </div>
            <div className="sub-usage-item">
              <span className="sub-usage-label">Library</span>
              <span className="sub-usage-value">{remaining.library} / {limits.LIBRARY}</span>
              <span className="sub-usage-sub">remaining</span>
            </div>
            <div className="sub-usage-item">
              <span className="sub-usage-label">Mood Tracking</span>
              <span className="sub-usage-value">{remaining.moodTrackingDays} / {limits.MOOD_TRACKING_DAYS}</span>
              <span className="sub-usage-sub">remaining</span>
            </div>
          </div>
        </div>

        <div className="sub-plans">
          <div
            className={`sub-plan ${selectedPlan === 'monthly' ? 'selected' : ''}`}
            onClick={() => setSelectedPlan('monthly')}
          >
            <h3>{plans.monthly.name}</h3>
            <div className="sub-price">
              <span className="sub-amount">Rs. {plans.monthly.price}</span>
              <span className="sub-period">/month</span>
            </div>
            <ul className="sub-features">
              {plans.monthly.features.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>

          <div
            className={`sub-plan ${selectedPlan === 'yearly' ? 'selected' : ''}`}
            onClick={() => setSelectedPlan('yearly')}
          >
            <div className="sub-badge">Best Value</div>
            <h3>{plans.yearly.name}</h3>
            <div className="sub-price">
              <span className="sub-amount">Rs. {plans.yearly.price}</span>
              <span className="sub-period">/year</span>
            </div>
            <div className="sub-savings">{plans.yearly.savings}</div>
            <ul className="sub-features">
              {plans.yearly.features.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>
        </div>

        <button className="sub-btn" onClick={handleEsewaPayment}>
          Continue with eSewa
        </button>

        <div className="sub-esewa">
          <img src="https://www.cogenthealth.com.np/images/esewa.png" alt="eSewa" />
          <span>Secure payment</span>
        </div>
      </div>
    </div>
  );
}