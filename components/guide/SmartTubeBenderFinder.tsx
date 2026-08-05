'use client';
import * as React from 'react';
import { readIds, toggle, subscribe } from '../../lib/compare';

// … existing imports and wizard UI …

/**
 * CompareCTA
 * 
 * Renders a button that toggles the model id in the compare list.
 * 
 * IMPORTANT: never writes during render; only inside the click handler.
 */
const CompareCTA: React.FC<{ id: string }> = ({ id }) => {
  const [ids, setIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    // initial read + subscribe to changes from any source
    setIds(readIds());
    const off = subscribe(() => setIds(readIds()));
    return off;
  }, []);

  const selected = ids.includes(id);

  const onClick = React.useCallback(() => {
    const next = toggle(id);
    setIds(next);
  }, [id, selected]);

  return (
    <button type="button" className="btn btn-secondary" onClick={onClick} aria-pressed={selected}>
      {selected ? 'Added' : 'Compare'}
    </button>
  );
};

import { useState } from 'react';
import type { MandrelTier } from '../../lib/validators';
import { useRouter } from 'next/navigation';
import { TubeBender } from '../../lib/validators';
import { ScoreBadge } from '../comparison/ScoreBadge';


interface FinderData {
  tubeDiameter: number;
  tubeMaterial: string;
  bendRadius: number;
  productionVolume: string;
  budget: string;
}

interface Recommendation {
  item: TubeBender;
  matchScore: number;
  reasons: string[];
}

export function SmartTubeBenderFinder() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [finderData, setFinderData] = useState<FinderData>({
    tubeDiameter: 1,
    tubeMaterial: 'steel',
    bendRadius: 2,
    productionVolume: 'low',
    budget: 'medium'
  });
  const [showResults, setShowResults] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  const formatMandrel = (t: MandrelTier) => {
    switch (t) {
      case "bronze": return "Bronze";
      case "economy": return "Economy";
      case "none": return "None";
    }
  };

  const viewDetails = (id: string) => {
    if (!id) return;
    router.push(`/reviews/${encodeURIComponent(id)}`);
  };



  const tubeMaterials = [
    { value: 'steel', label: 'Steel' },
    { value: 'aluminum', label: 'Aluminum' },
    { value: 'copper', label: 'Copper' },
    { value: 'stainless', label: 'Stainless Steel' }
  ];

  const productionVolumes = [
    { value: 'low', label: 'Low (1-10 pieces/day)', description: 'Hobby or small projects' },
    { value: 'medium', label: 'Medium (10-100 pieces/day)', description: 'Small business or workshop' },
    { value: 'high', label: 'High (100+ pieces/day)', description: 'Production environment' }
  ];

  const budgetOptions = [
    { value: 'low', label: 'Budget ($500-$2,000)', description: 'Basic manual options' },
    { value: 'medium', label: 'Mid-range ($2,000-$8,000)', description: 'Good quality hydraulic' },
    { value: 'high', label: 'Premium ($8,000+)', description: 'Professional grade' }
  ];

  const updateFinderData = (field: keyof FinderData, value: string | number) => {
    setFinderData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const generateRecommendations = () => {
    // Mock recommendations based on finder data
    const mockRecommendations: Recommendation[] = [
      {
        item: {
          id: '1',
          brand: 'Baileigh',
          model: 'RDB-250',
          maxCapacity: '2.5" OD',
          clrRange: '2.5-8"',
          dieCost: '$800-1,200',
          cycleTime: '15-20 sec',
          weight: '850 lbs',
          price: '$4,995',
          mandrel: 'bronze',
          totalScore: 9.2,
          description: 'Professional hydraulic tube bender with excellent precision and durability.'
        },
        matchScore: 95,
        reasons: ['Perfect capacity for your tube diameter', 'Excellent precision for your material', 'Good value for your budget']
      },
      {
        item: {
          id: '2',
          brand: 'JD2',
          model: 'Model 32',
          maxCapacity: '3.25" OD',
          clrRange: '3.25-10"',
          dieCost: '$600-900',
          cycleTime: '20-25 sec',
          weight: '650 lbs',
          price: '$3,295',
          mandrel: 'economy',
          totalScore: 8.7,
          description: 'Reliable hydraulic bender with good performance and reasonable price.'
        },
        matchScore: 88,
        reasons: ['Suitable capacity range', 'Good for medium production', 'Fits your budget']
      },
      {
        item: {
          id: '3',
          brand: 'Pro-Tools',
          model: '105HD',
          maxCapacity: '1.75" OD',
          clrRange: '1.75-5.5"',
          dieCost: '$400-700',
          cycleTime: '30-40 sec',
          weight: '450 lbs',
          price: '$2,195',
          mandrel: 'none',
          totalScore: 7.9,
          description: 'Entry-level hydraulic bender with basic features and manual operation.'
        },
        matchScore: 75,
        reasons: ['Adequate for your needs', 'Budget-friendly option', 'Simple operation']
      }
    ];

    setRecommendations(mockRecommendations);
    setShowResults(true);
  };

  const resetFinder = () => {
    setCurrentStep(1);
    setFinderData({
      tubeDiameter: 1,
      tubeMaterial: 'steel',
      bendRadius: 2,
      productionVolume: 'low',
      budget: 'medium'
    });
    setShowResults(false);
    setRecommendations([]);
  };

  if (showResults) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-8">
        <div className="text-center mb-8">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Your Personalized Recommendations
            </h2>
            <span className="text-sm text-slate-500">{recommendations.length} results</span>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Based on your requirements, here are the best tube benders for your needs
          </p>
        </div>

        <div className="space-y-6">
          {recommendations.map((rec) => (
            <div key={rec.item.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      {rec.item.brand} {rec.item.model}
                    </h3>
                    <div className="flex items-center gap-2">
                      <ScoreBadge score={rec.item.totalScore} />
                      <span className="text-sm text-green-600 font-medium">
                        {rec.matchScore}% Match
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-3">{rec.item.description}</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Max Capacity:</span>
                      <span className="ml-1 font-medium">{rec.item.maxCapacity}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Price:</span>
                      <span className="ml-1 font-medium">{rec.item.price}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Weight:</span>
                      <span className="ml-1 font-medium">{rec.item.weight}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Mandrel:</span>
                      <span className="ml-1 font-medium">
                        {formatMandrel(rec.item.mandrel as MandrelTier)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Why this matches your needs:</h4>
                <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  {rec.reasons.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => viewDetails(rec.item.id)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
                >
                  View Details
                </button>
                <CompareCTA id={rec.item.id} />
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <button
            onClick={resetFinder}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-md font-medium transition-colors"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Smart Tube Bender Finder
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Step {currentStep} of 5
        </p>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / 5) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                What is the diameter of your tubes?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                This helps us determine the capacity requirements for your tube bender.
              </p>
              
              <div className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Tube Diameter (inches)
                  </span>
                  <input
                    type="range"
                    min="0.5"
                    max="4"
                    step="0.25"
                    value={finderData.tubeDiameter}
                    onChange={(e) => updateFinderData('tubeDiameter', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                                     <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mt-1">
                     <span>0.5&quot;</span>
                     <span className="font-medium text-blue-600">{finderData.tubeDiameter}&quot;</span>
                     <span>4&quot;</span>
                   </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                What material are you working with?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Different materials require different bending forces and techniques.
              </p>
              
              <div className="space-y-3">
                {tubeMaterials.map((material) => (
                  <label key={material.value} className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                    <input
                      type="radio"
                      name="tubeMaterial"
                      value={material.value}
                      checked={finderData.tubeMaterial === material.value}
                      onChange={(e) => updateFinderData('tubeMaterial', e.target.value)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {material.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                What bend radius do you need?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                The bend radius affects the minimum centerline radius (CLR) your bender needs.
              </p>
              
              <div className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Bend Radius (inches)
                  </span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="0.5"
                    value={finderData.bendRadius}
                    onChange={(e) => updateFinderData('bendRadius', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                                     <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mt-1">
                     <span>1&quot;</span>
                     <span className="font-medium text-blue-600">{finderData.bendRadius}&quot;</span>
                     <span>10&quot;</span>
                   </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                What&apos;s your production volume?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                This helps determine whether you need a manual or hydraulic bender.
              </p>
              
              <div className="space-y-3">
                {productionVolumes.map((volume) => (
                  <label key={volume.value} className="flex items-start p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                    <input
                      type="radio"
                      name="productionVolume"
                      value={volume.value}
                      checked={finderData.productionVolume === volume.value}
                      onChange={(e) => updateFinderData('productionVolume', e.target.value)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 mt-0.5"
                    />
                    <div className="ml-3">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 block">
                        {volume.label}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {volume.description}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentStep === 5 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                What&apos;s your budget range?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                This helps us recommend options that fit your financial constraints.
              </p>
              
              <div className="space-y-3">
                {budgetOptions.map((budget) => (
                  <label key={budget.value} className="flex items-start p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                    <input
                      type="radio"
                      name="budget"
                      value={budget.value}
                      checked={finderData.budget === budget.value}
                      onChange={(e) => updateFinderData('budget', e.target.value)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 mt-0.5"
                    />
                    <div className="ml-3">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 block">
                        {budget.label}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {budget.description}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-8">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className="px-6 py-2 border border-gray-300 text-gray-700 dark:text-gray-300 rounded-md font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          
          {currentStep < 5 ? (
            <button
              onClick={nextStep}
              className="px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              onClick={generateRecommendations}
              className="px-6 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 transition-colors"
            >
              Get Recommendations
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
