import { useState } from 'react';
import { Link } from 'react-router-dom';

interface POSConnection {
  provider: string;
  merchantId: string | null;
}

interface StoreCardProps {
  publicId: string;
  name: string;
  googleMapsUrl: string | null;
  posConnections: POSConnection[];
  createdAt: string;
  onDelete?: (publicId: string) => void;
}

const providerLabels: Record<string, string> = {
  SHOPIFY: 'Shopify',
  SQUARE: 'Square',
  LIGHTSPEED: 'Lightspeed',
};

export default function StoreCard({
  publicId,
  name,
  posConnections,
  createdAt,
  onDelete,
}: StoreCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const isConnected = posConnections.length > 0;
  const provider = posConnections[0]?.provider;

  const card = (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
          <p className="text-xs text-gray-400 font-mono mt-0.5">{publicId}</p>
        </div>
        <div className="flex items-center gap-2 ml-2">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isConnected
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {isConnected ? 'Connected' : 'Pending'}
          </span>
          {onDelete && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowConfirm(true);
              }}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded"
              title="Remove store"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>
      {provider && (
        <p className="text-sm text-gray-600 mb-2">
          POS: {providerLabels[provider] || provider}
        </p>
      )}
      {!isConnected && (
        <p className="text-sm text-indigo-600 font-medium mb-2">Click to connect POS</p>
      )}
      <p className="text-xs text-gray-400">
        Added {new Date(createdAt).toLocaleDateString()}
      </p>
    </div>
  );

  return (
    <div className="relative">
      <Link
        to={`/onboarding/${publicId}/connect`}
        state={{ storeName: name, posProvider: provider }}
      >
        {card}
      </Link>

      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4 w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Remove store?</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to remove <strong>{name}</strong>? This will permanently
              delete all associated data including orders and review sessions.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  onDelete?.(publicId);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
              >
                Delete Store
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
