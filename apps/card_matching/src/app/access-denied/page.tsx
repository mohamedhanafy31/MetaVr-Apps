'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL || 'http://localhost:3000';

function AccessDeniedContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');

  const getReasonMessage = () => {
    switch (reason) {
      case 'no-session':
        return 'No session token found. Please log in to access this page.';
      case 'validation-failed':
        return 'Session validation failed. Please log in again.';
      case 'not-authorized':
        return 'You do not have permission to access this configuration page.';
      case 'error':
        return 'An error occurred while verifying your access. Please try again.';
      default:
        return 'You do not have permission to access this page.';
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        flexDirection: 'column',
        gap: '20px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '20px',
        textAlign: 'center',
        backgroundColor: '#fef2f2',
      }}
    >
      <div
        style={{
          fontSize: '64px',
          marginBottom: '10px',
        }}
      >
        🔒
      </div>
      <h1
        style={{
          fontSize: '32px',
          fontWeight: 'bold',
          color: '#dc2626',
          margin: 0,
        }}
      >
        Access Denied
      </h1>
      <p
        style={{
          fontSize: '18px',
          color: '#7f1d1d',
          maxWidth: '500px',
          margin: 0,
        }}
      >
        {getReasonMessage()}
      </p>
      <div
        style={{
          marginTop: '20px',
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          maxWidth: '500px',
        }}
      >
        <p style={{ color: '#666', fontSize: '14px', margin: '0 0 10px 0' }}>
          This page requires admin or supervisor access.
        </p>
        <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
          Supervisors can only access apps assigned to them.
        </p>
      </div>
      <Link
        href={`${DASHBOARD_URL}/admin/login`}
        style={{
          marginTop: '20px',
          padding: '12px 24px',
          backgroundColor: '#2563eb',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '6px',
          fontWeight: '500',
        }}
      >
        Go to Login Page
      </Link>
    </div>
  );
}

export default function AccessDeniedPage() {
  return (
    <Suspense fallback={
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          flexDirection: 'column',
          gap: '20px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '20px',
          textAlign: 'center',
          backgroundColor: '#fef2f2',
        }}
      >
        <div style={{ fontSize: '64px', marginBottom: '10px' }}>🔒</div>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#dc2626', margin: 0 }}>
          Access Denied
        </h1>
        <p style={{ fontSize: '18px', color: '#7f1d1d' }}>Loading...</p>
      </div>
    }>
      <AccessDeniedContent />
    </Suspense>
  );
}

