import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';

const providerLabels: Record<string, string> = {
  SHOPIFY: 'Shopify',
  SQUARE: 'Square',
  LIGHTSPEED: 'Lightspeed',
};

const providerColors: Record<string, string> = {
  SHOPIFY: 'bg-green-600 hover:bg-green-700',
  SQUARE: 'bg-black hover:bg-gray-800',
  LIGHTSPEED: 'bg-red-600 hover:bg-red-700',
};

interface StoreStatus {
  publicId: string;
  name: string;
  posConnections: Array<{ provider: string; merchantId: string | null }>;
}

export default function ConnectPOSPage() {
  const { publicId } = useParams<{ publicId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const state = location.state as {
    posProvider?: string;
    shopDomain?: string | null;
    storeName?: string;
  } | null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [storeStatus, setStoreStatus] = useState<StoreStatus | null>(null);

  // Check if we're returning from OAuth
  const oauthStatus = searchParams.get('status');
  const oauthMessage = searchParams.get('message');

  useEffect(() => {
    if (oauthStatus === 'success') {
      navigate(`/onboarding/${publicId}/success`, {
        state: { storeName: state?.storeName || storeStatus?.name },
      });
      return;
    }
    if (oauthStatus === 'error' && oauthMessage) {
      setError(oauthMessage);
    }
  }, [oauthStatus, oauthMessage, publicId, navigate, state, storeStatus]);

  // Fetch store status to get provider info if not passed via state
  useEffect(() => {
    if (!state?.posProvider) {
      api
        .get<StoreStatus>(`/onboarding/stores/${publicId}/status`)
        .then(setStoreStatus)
        .catch((err) => setError(err.message));
    }
  }, [publicId, state]);

  const provider = state?.posProvider || storeStatus?.posConnections[0]?.provider || '';
  const storeName = state?.storeName || storeStatus?.name || '';

  // If already connected, go to success
  useEffect(() => {
    if (storeStatus && storeStatus.posConnections.length > 0 && !oauthStatus) {
      navigate(`/onboarding/${publicId}/success`, {
        state: { storeName: storeStatus.name },
      });
    }
  }, [storeStatus, publicId, navigate, oauthStatus]);

  const handleConnect = async () => {
    setLoading(true);
    setError('');

    try {
      const shopParam = state?.shopDomain ? `?shop=${encodeURIComponent(state.shopDomain)}` : '';
      const res = await api.get<{ url: string }>(
        `/onboarding/stores/${publicId}/oauth-url/${provider}${shopParam}`
      );
      // Redirect the whole page to the OAuth provider
      window.location.href = res.url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start connection');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Connect POS</h1>
        <p className="text-gray-500 mt-1">Step 2 of 3 - Connect the store's POS system</p>
      </div>

      <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
        {storeName && (
          <p className="text-sm text-gray-500 mb-2">Store: <span className="font-medium text-gray-900">{storeName}</span></p>
        )}

        <div className="my-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <p className="text-gray-600 mb-6">
            Have the store owner sign in to their {providerLabels[provider] || 'POS'} account to
            authorize the connection.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleConnect}
          disabled={loading || !provider}
          className={`w-full py-3 px-4 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
            providerColors[provider] || 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {loading ? 'Redirecting...' : `Connect ${providerLabels[provider] || 'POS'}`}
        </button>

        <p className="mt-4 text-xs text-gray-400">
          You'll be redirected to {providerLabels[provider] || 'the POS provider'} to authorize access
        </p>
      </div>
    </div>
  );
}
