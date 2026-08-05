'use client';


import { TubeBender } from '../../lib/validators';

interface PriceBreakdownModalProps {
  item: TubeBender;
  isOpen: boolean;
  onClose: () => void;
}

export function PriceBreakdownModal({ item, isOpen, onClose }: PriceBreakdownModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{item.brand}</h2>
              <p className="text-lg text-gray-600 dark:text-gray-400">{item.model}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* Price Summary */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Price Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Base Price:</span>
                  <span className="ml-2 font-semibold">{item.price}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Die Cost:</span>
                  <span className="ml-2 font-semibold">{item.dieCost}</span>
                </div>
              </div>
            </div>

            {/* Specifications */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Specifications</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Max Capacity:</span>
                  <span className="ml-2 font-medium">{item.maxCapacity}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">CLR Range:</span>
                  <span className="ml-2 font-medium">{item.clrRange}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Cycle Time:</span>
                  <span className="ml-2 font-medium">{item.cycleTime}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Weight:</span>
                  <span className="ml-2 font-medium">{item.weight}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Mandrel:</span>
                  <span className="ml-2 font-medium">{item.mandrel}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Total Score:</span>
                  <span className="ml-2 font-medium">{item.totalScore}/10</span>
                </div>
              </div>
            </div>

            {/* Description */}
            {item.description && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Description</h3>
                <p className="text-gray-600 dark:text-gray-400">{item.description}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors">
                View on Amazon
              </button>
              <button className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md font-medium transition-colors">
                Read Full Review
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
