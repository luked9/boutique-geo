import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

const POS_OPTIONS = [
  { value: 'SHOPIFY', label: 'Shopify' },
  { value: 'SQUARE', label: 'Square' },
  { value: 'LIGHTSPEED', label: 'Lightspeed' },
];

interface CreateStoreResponse {
  publicId: string;
  posProvider: string;
  shopDomain: string | null;
}

export default function AddStorePage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [posProvider, setPosProvider] = useState('SHOPIFY');
  const [shopDomain, setShopDomain] = useState('');
  const [placeId, setPlaceId] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const trimmedPlaceId = placeId.trim();
      if (!trimmedPlaceId) {
        setError('Google Place ID is required');
        setSubmitting(false);
        return;
      }

      const googleMapsUrl = `https://search.google.com/local/writereview?placeid=${trimmedPlaceId}`;

      const body: Record<string, string> = {
        name,
        posProvider,
        googleMapsUrl,
      };
      if (posProvider === 'SHOPIFY') {
        if (!shopDomain.trim()) {
          setError('Shopify store domain is required');
          setSubmitting(false);
          return;
        }
        body.shopDomain = shopDomain.trim();
      }

      const res = await api.post<CreateStoreResponse>('/onboarding/stores', body);

      // Navigate to the connect POS page, passing provider + shopDomain via state
      navigate(`/onboarding/${res.publicId}/connect`, {
        state: { posProvider: res.posProvider, shopDomain: res.shopDomain, storeName: name },
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create store');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Add New Store</h1>
        <p className="text-gray-500 mt-1">Step 1 of 3 - Enter store details</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="mb-5">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Store Name
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="e.g. Joe's Coffee Shop"
          />
        </div>

        <div className="mb-5">
          <label htmlFor="posProvider" className="block text-sm font-medium text-gray-700 mb-1">
            POS System
          </label>
          <select
            id="posProvider"
            value={posProvider}
            onChange={(e) => setPosProvider(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
          >
            {POS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {posProvider === 'SHOPIFY' && (
          <div className="mb-5">
            <label htmlFor="shopDomain" className="block text-sm font-medium text-gray-700 mb-1">
              Shopify Store Domain
            </label>
            <div className="flex items-center">
              <input
                id="shopDomain"
                type="text"
                value={shopDomain}
                onChange={(e) => setShopDomain(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="mystore"
              />
              <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md text-sm text-gray-500">
                .myshopify.com
              </span>
            </div>
          </div>
        )}

        <div className="mb-6">
          <label htmlFor="placeId" className="block text-sm font-medium text-gray-700 mb-1">
            Google Place ID
          </label>
          <input
            id="placeId"
            type="text"
            required
            value={placeId}
            onChange={(e) => setPlaceId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="e.g. ChIJFXXURdBv3IARniv-_6B99I8"
          />
          <p className="mt-1 text-xs text-gray-400">
            Find it at Google Maps &gt; search the store &gt; copy the Place ID
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 px-4 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Creating...' : 'Continue to POS Connection'}
        </button>
      </form>
    </div>
  );
}
