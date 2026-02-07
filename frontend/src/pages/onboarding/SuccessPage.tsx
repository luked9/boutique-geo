import { Link, useLocation } from 'react-router-dom';

export default function SuccessPage() {
  const location = useLocation();
  const state = location.state as { storeName?: string } | null;

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">All Done</h1>
        <p className="text-gray-500 mt-1">Step 3 of 3 - Store setup complete</p>
      </div>

      <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-2">Store is Set Up!</h2>
        {state?.storeName && (
          <p className="text-gray-600 mb-6">
            <span className="font-medium">{state.storeName}</span> has been successfully connected.
          </p>
        )}
        {!state?.storeName && (
          <p className="text-gray-600 mb-6">
            The store has been successfully connected and is ready to go.
          </p>
        )}

        <div className="flex gap-3">
          <Link
            to="/dashboard"
            className="flex-1 py-2.5 px-4 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 text-center transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            to="/onboarding/new"
            className="flex-1 py-2.5 px-4 bg-white text-indigo-600 font-medium rounded-md border border-indigo-600 hover:bg-indigo-50 text-center transition-colors"
          >
            Add Another Store
          </Link>
        </div>
      </div>
    </div>
  );
}
