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
  posConnections: Array<{ provider: string; merchantId: string | null; locationId: string | null }>;
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
  const [selectedProvider, setSelectedProvider] = useState(state?.posProvider || '');
  const [shopDomain, setShopDomain] = useState(state?.shopDomain || '');

  // Check if we're returning from OAuth
  const oauthStatus = searchParams.get('status');
  const oauthMessage = searchParams.get('message');

  useEffect(() => {
    if (oauthStatus === 'success') {
      navigate(`/onboarding/${publicId}/location`, {
        state: { storeName: state?.storeName || storeStatus?.name, posProvider: selectedProvider || state?.posProvider },
        replace: true,
      });
      return;
    }
    if (oauthStatus === 'error' && oauthMessage) {
      setError(oauthMessage);
    }
  }, [oauthStatus, oauthMessage, publicId, navigate, state, storeStatus, selectedProvider]);

  // Always fetch store status
  useEffect(() => {
    api
      .get<StoreStatus>(`/onboarding/stores/${publicId}/status`)
      .then((data) => {
        setStoreStatus(data);
        // If there's a connection, pre-select its provider
        if (data.posConnections.length > 0 && !selectedProvider) {
          setSelectedProvider(data.posConnections[0]!.provider);
        }
      })
      .catch((err) => setError(err.message));
  }, [publicId]);

  const provider = selectedProvider || storeStatus?.posConnections[0]?.provider || '';
  const storeName = state?.storeName || storeStatus?.name || '';

  // If already connected, go to location picker (or success if location already set)
  useEffect(() => {
    if (storeStatus && storeStatus.posConnections.length > 0 && !oauthStatus) {
      const conn = storeStatus.posConnections[0];
      if (conn && !conn.locationId) {
        navigate(`/onboarding/${publicId}/location`, {
          state: { storeName: storeStatus.name, posProvider: conn.provider },
        });
      } else {
        navigate(`/onboarding/${publicId}/success`, {
          state: { storeName: storeStatus.name },
        });
      }
    }
  }, [storeStatus, publicId, navigate, oauthStatus]);

  const handleConnect = async () => {
    if (!provider) return;
    setLoading(true);
    setError('');

    try {
      const shopParam = provider === 'SHOPIFY' && shopDomain
        ? `?shop=${encodeURIComponent(shopDomain)}`
        : '';
      const res = await api.get<{ url: string }>(
        `/onboarding/stores/${publicId}/oauth-url/${provider}${shopParam}`
      );
      window.location.href = res.url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start connection');
      setLoading(false);
    }
  };

  // Show provider picker if we don't know which provider to use
  const needsProviderSelection = !state?.posProvider && (!storeStatus || storeStatus.posConnections.length === 0);

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Connect POS</h1>
        <p className="text-gray-500 mt-1">Step 2 of 4 - Connect the store's POS system</p>
      </div>

      <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
        {storeName && (
          <p className="text-sm text-gray-500 mb-2">Store: <span className="font-medium text-gray-900">{storeName}</span></p>
        )}

        {needsProviderSelection && (
          <div className="my-6 text-left">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select POS Provider
            </label>
            <div className="space-y-2">
              {Object.entries(providerLabels).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSelectedProvider(key)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                    selectedProvider === key
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="font-medium text-gray-900">{label}</span>
                </button>
              ))}
            </div>

            {selectedProvider === 'SHOPIFY' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shopify Store Domain
                </label>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={shopDomain}
                    onChange={(e) => setShopDomain(e.target.value)}
                    placeholder="your-store"
                    className="flex-1 rounded-l-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <span className="inline-flex items-center px-3 py-2 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                    .myshopify.com
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {!needsProviderSelection && (
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
        )}

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleConnect}
          disabled={loading || !provider || (selectedProvider === 'SHOPIFY' && !shopDomain)}
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
