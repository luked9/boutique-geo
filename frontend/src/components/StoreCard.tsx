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
}: StoreCardProps) {
  const isConnected = posConnections.length > 0;
  const provider = posConnections[0]?.provider;

  const card = (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            isConnected
              ? 'bg-green-100 text-green-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {isConnected ? 'Connected' : 'Pending'}
        </span>
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

  if (!isConnected) {
    return (
      <Link to={`/onboarding/${publicId}/connect`} state={{ storeName: name }}>
        {card}
      </Link>
    );
  }

  return card;
}
