import { useEffect, useRef } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { API_URL } from "./api";

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const { pathname } = useLocation();
  const isSuccess = pathname.includes('success');
  const activated = useRef(false);

  useEffect(() => {
    document.documentElement.style.cssText = 'margin:0;padding:0;height:100%;';
    document.body.style.cssText = 'margin:0;padding:0;height:100%;';

    if (activated.current) return;
    activated.current = true;

    const run = async () => {
      if (isSuccess) {
        let plan = 'monthly';
        const dataParam = searchParams.get('data');
        if (dataParam) {
          try {
            const decoded = JSON.parse(atob(dataParam));
            const uuid = (decoded.transaction_uuid || '').toLowerCase();
            if (uuid.includes('yearly')) plan = 'yearly';
          } catch {}
        } else {
          const uuid = (searchParams.get('transaction_uuid') || '').toLowerCase();
          if (uuid.includes('yearly')) plan = 'yearly';
        }
        try {
          const token = (localStorage.getItem('token') || sessionStorage.getItem('token'));
          await fetch(`${API_URL}/api/subscription/activate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ plan })
          });
          if (window.opener) {
            window.opener.postMessage({ type: 'ESEWA_SUCCESS', plan }, window.location.origin);
          }
        } catch (err) {
          console.error('Activation error:', err);
        }
      } else {
        if (window.opener) {
          window.opener.postMessage({ type: 'ESEWA_FAILURE' }, window.location.origin);
        }
      }
      window.close();
    };

    run();
  }, []);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'linear-gradient(135deg, #b7c6fa, #b5d1fc, #c1a9fb, #e1bdff)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Segoe UI', Arial, sans-serif",
    }}>
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(27, 27, 27, 0.5)',
        backdropFilter: 'blur(4px)',
      }} />
      <div style={{
        position: 'relative',
        zIndex: 1,
        background: 'rgba(255, 252, 248, 0.98)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.6)',
        borderRadius: '16px',
        width: '420px',
        maxWidth: '90vw',
        boxShadow: '0 8px 24px rgba(149, 101, 184, 0.15)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid rgba(149, 101, 184, 0.2)',
        }}>
          <h3 style={{ margin: 0, color: '#1b1b1b', fontSize: '18px', fontWeight: 600 }}>
            Activating Subscription
          </h3>
        </div>
        <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p style={{ margin: 0, color: '#1b1b1b', fontSize: '15px', lineHeight: 1.6 }}>
            Your payment was successful. Your subscription is being activated.
          </p>
          <p style={{ margin: 0, color: '#888', fontSize: '13px' }}>
            Please wait, this window will close automatically...
          </p>
        </div>
      </div>
    </div>
  );
}
