import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import StoreCard from '../components/StoreCard';

interface Store {
  publicId: string;
  name: string;
  googleMapsUrl: string | null;
  posConnections: Array<{
    provider: string;
    merchantId: string | null;
  }>;
  createdAt: string;
}

export default function DashboardPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStores = useCallback(() => {
    api
      .get<{ stores: Store[] }>('/onboarding/stores')
      .then((data) => setStores(data.stores))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  // Re-fetch when user returns to this tab (e.g., after OAuth redirect)
  useEffect(() => {
    const onFocus = () => fetchStores();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchStores]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stores</h1>
          <p className="text-gray-500 mt-1">Manage your onboarded store locations</p>
        </div>
        <Link
          to="/onboarding/new"
          className="inline-flex items-center px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
        >
          + Add New Store
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {stores.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No stores yet</h3>
          <p className="text-gray-500 mb-6">Get started by adding your first store.</p>
          <Link
            to="/onboarding/new"
            className="inline-flex items-center px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
          >
            + Add New Store
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {stores.map((store) => (
            <StoreCard key={store.publicId} {...store} />
          ))}
        </div>
      )}
    </div>
  );
}
