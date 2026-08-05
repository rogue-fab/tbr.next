import { ScoreBadge } from '../comparison/ScoreBadge';

interface Review {
  id: string;
  slug: string;
  brand: string;
  model: string;
  title: string;
  description: string;
  imageUrl: string;
  price: string;
  rating: number;
  maxCapacity: string;
  clrRange: string;
  dieCost: string;
  cycleTime: string;
  weight: string;
  mandrel: string;
}

interface BuyBoxProps {
  review: Review;
}

export function BuyBox({ review }: BuyBoxProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 sticky top-8">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Buy This Product</h2>
      
      {/* Product Summary */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <ScoreBadge score={review.rating} />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {review.rating}/10 Expert Rating
          </span>
        </div>
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {review.brand} {review.model}
        </h3>
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {review.price}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Free shipping • 30-day returns
        </p>
      </div>

      {/* Key Features */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Key Features</h4>
        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <li className="flex items-center">
            <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Max Capacity: {review.maxCapacity}
          </li>
          <li className="flex items-center">
            <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            CLR Range: {review.clrRange}
          </li>
          <li className="flex items-center">
            <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Mandrel: {review.mandrel}
          </li>
          <li className="flex items-center">
            <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Weight: {review.weight}
          </li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors">
          Buy on Amazon
        </button>
        <button className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 py-3 px-4 rounded-lg font-semibold transition-colors">
          Check Other Retailers
        </button>
        <button className="w-full border border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 py-3 px-4 rounded-lg font-semibold transition-colors">
          Add to Compare
        </button>
      </div>

      {/* Trust Indicators */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Secure
          </div>
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Verified
          </div>
        </div>
      </div>
    </div>
  );
}

