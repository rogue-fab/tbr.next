import Link from 'next/link';
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

interface HeroProps {
  review: Review;
}

export function Hero({ review }: HeroProps) {
  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Product Image */}
          <div className="relative">
            <div className="aspect-w-4 aspect-h-3 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
              <div className="w-full h-64 bg-gradient-to-br from-blue-100 to-gray-200 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl font-bold text-gray-300 mb-2">{review.brand}</div>
                  <div className="text-2xl text-gray-400 dark:text-gray-500">{review.model}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Breadcrumb */}
            <nav className="flex text-sm text-gray-500 dark:text-gray-400 mb-4">
              <Link href="/" className="hover:text-gray-700">Home</Link>
              <span className="mx-2">/</span>
              <Link href="/reviews" className="hover:text-gray-700">Reviews</Link>
              <span className="mx-2">/</span>
              <span className="text-gray-900 dark:text-gray-100">{review.brand} {review.model}</span>
            </nav>

            {/* Title and Rating */}
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                {review.title}
              </h1>
              <div className="flex items-center gap-4 mb-4">
                <ScoreBadge score={review.rating} />
                <span className="text-lg text-gray-600 dark:text-gray-400">
                  Expert Rating: {review.rating}/10
                </span>
              </div>
              <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                {review.description}
              </p>
            </div>

            {/* Key Specs */}
            <div className="grid grid-cols-2 gap-4 py-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Max Capacity</span>
                <div className="font-semibold text-gray-900 dark:text-gray-100">{review.maxCapacity}</div>
              </div>
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">CLR Range</span>
                <div className="font-semibold text-gray-900 dark:text-gray-100">{review.clrRange}</div>
              </div>
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Die Cost</span>
                <div className="font-semibold text-gray-900 dark:text-gray-100">{review.dieCost}</div>
              </div>
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Cycle Time</span>
                <div className="font-semibold text-gray-900 dark:text-gray-100">{review.cycleTime}</div>
              </div>
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Weight</span>
                <div className="font-semibold text-gray-900 dark:text-gray-100">{review.weight}</div>
              </div>
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Mandrel</span>
                <div className="font-semibold text-gray-900 dark:text-gray-100">{review.mandrel}</div>
              </div>
            </div>

            {/* Price */}
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {review.price}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
