import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

interface Location {
  id: string;
  name: string;
}

interface StoreStatus {
  publicId: string;
  name: string;
  posConnections: Array<{
    provider: string;
    merchantId: string | null;
    locationId: string | null;
    providerMetadata: { businessName?: string; locations?: Location[] };
  }>;
}

const providerLabels: Record<string, string> = {
  SHOPIFY: 'Shopify',
  SQUARE: 'Square',
  LIGHTSPEED: 'Lightspeed',
};

export default function SelectLocationPage() {
  const { publicId } = useParams<{ publicId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state as { storeName?: string; posProvider?: string } | null;

  const [storeStatus, setStoreStatus] = useState<StoreStatus | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<StoreStatus>(`/onboarding/stores/${publicId}/status`)
      .then((data) => {
        setStoreStatus(data);
        // Pre-select if there's only one location or one is already set
        const conn = data.posConnections[0];
        if (conn?.locationId) {
          setSelectedLocationId(conn.locationId);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [publicId]);

  const connection = storeStatus?.posConnections[0];
  const locations: Location[] =
    (connection?.providerMetadata as { locations?: Location[] })?.locations || [];
  const provider = connection?.provider || state?.posProvider || '';
  const storeName = state?.storeName || storeStatus?.name || '';
  const businessName =
    (connection?.providerMetadata as { businessName?: string })?.businessName || '';

  // If no locations found (single-location provider like Shopify), skip to success
  useEffect(() => {
    if (!loading && connection && locations.length === 0) {
      navigate(`/onboarding/${publicId}/success`, {
        state: { storeName },
        replace: true,
      });
    }
  }, [loading, connection, locations, publicId, navigate, storeName]);

  // If only one location, auto-select it
  useEffect(() => {
    if (locations.length === 1 && !selectedLocationId) {
      setSelectedLocationId(locations[0]!.id);
    }
  }, [locations, selectedLocationId]);

  const handleConfirm = async () => {
    if (!selectedLocationId || !provider) return;

    setSaving(true);
    setError('');

    try {
      await api.patch(`/pos/connections/${publicId}/${provider.toLowerCase()}/location`, {
        locationId: selectedLocationId,
      });
      navigate(`/onboarding/${publicId}/success`, {
        state: { storeName },
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to set location');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto" />
        <p className="text-gray-500 mt-4">Loading locations...</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Select Location</h1>
        <p className="text-gray-500 mt-1">
          Step 3 of 4 - Choose which {providerLabels[provider] || 'POS'} location to connect
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        {storeName && (
          <p className="text-sm text-gray-500 mb-1">
            Store: <span className="font-medium text-gray-900">{storeName}</span>
          </p>
        )}
        {businessName && (
          <p className="text-sm text-gray-500 mb-4">
            {providerLabels[provider] || 'POS'} account:{' '}
            <span className="font-medium text-gray-900">{businessName}</span>
          </p>
        )}

        <p className="text-gray-700 font-medium mb-3">
          Which location should receive review prompts?
        </p>

        <div className="space-y-2 mb-6">
          {locations.map((loc) => (
            <button
              key={loc.id}
              onClick={() => setSelectedLocationId(loc.id)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                selectedLocationId === loc.id
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">{loc.name}</span>
                {selectedLocationId === loc.id && (
                  <svg
                    className="w-5 h-5 text-indigo-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleConfirm}
          disabled={!selectedLocationId || saving}
          className="w-full py-3 px-4 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving...' : 'Confirm Location'}
        </button>
      </div>
    </div>
  );
}
