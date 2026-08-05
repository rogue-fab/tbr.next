import { Metadata } from 'next';

/* eslint-disable react/no-unescaped-entities */


export const metadata: Metadata = {
  title: 'Mandrel Tube Bending - Complete Guide',
  description: 'Learn about mandrel tube bending technology, its advantages, applications, and how it compares to other bending methods. Expert guide for professionals.',
  keywords: 'mandrel tube bending, mandrel bender, tube bending technology, precision tube bending, mandrel vs ram bending',
  openGraph: {
    title: 'Mandrel Tube Bending - Complete Guide',
    description: 'Learn about mandrel tube bending technology, its advantages, and applications.',
  },
};

export default function MandrelPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Mandrel Tube Bending
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              The ultimate guide to mandrel tube bending technology, its advantages, 
              applications, and how it revolutionizes precision tube fabrication.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-12">
          {/* What is Mandrel Bending */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">What is Mandrel Tube Bending?</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Mandrel tube bending is an advanced tube bending technique that uses a flexible mandrel 
              (support rod) inserted inside the tube during the bending process. This technology 
              prevents the tube from collapsing, wrinkling, or deforming, resulting in precise, 
              high-quality bends with minimal wall thinning.
            </p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">Key Components</h3>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li>• Flexible mandrel rod</li>
                  <li>• Bending die</li>
                  <li>• Clamp die</li>
                  <li>• Pressure die</li>
                  <li>• Wiper die (optional)</li>
                </ul>
              </div>
              
              <div className="bg-green-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-green-900 mb-3">Primary Benefits</h3>
                <ul className="space-y-2 text-sm text-green-800">
                  <li>• Prevents tube collapse</li>
                  <li>• Maintains roundness</li>
                  <li>• Reduces wall thinning</li>
                  <li>• Enables tight radius bends</li>
                  <li>• Superior surface finish</li>
                </ul>
              </div>
            </div>
          </div>

          {/* How It Works */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">How Mandrel Bending Works</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              The mandrel bending process involves several coordinated steps that work together 
              to create precise, high-quality bends while maintaining the tube's structural integrity.
            </p>
            
            <div className="space-y-6">
              <div className="border-l-4 border-blue-500 pl-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">1. Tube Preparation</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  The tube is cut to length and the mandrel is inserted into the tube. 
                  The mandrel is positioned at the exact point where the bend will occur.
                </p>
              </div>
              
              <div className="border-l-4 border-blue-500 pl-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">2. Clamping</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  The tube is securely clamped between the clamp die and pressure die, 
                  ensuring it doesn&apos;t move during the bending process.
                </p>
              </div>
              
              <div className="border-l-4 border-blue-500 pl-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">3. Bending Process</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  The bending die rotates around the tube, while the mandrel provides internal 
                  support to prevent collapse and maintain the tube's roundness.
                </p>
              </div>
              
              <div className="border-l-4 border-blue-500 pl-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">4. Mandrel Withdrawal</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  After the bend is complete, the mandrel is carefully withdrawn from the tube, 
                  leaving behind a perfectly formed bend.
                </p>
              </div>
            </div>
          </div>

          {/* Applications */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Applications & Industries</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Mandrel bending is used across various industries where precision, quality, 
              and reliability are critical requirements.
            </p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Automotive Industry</h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>• Exhaust systems</li>
                  <li>• Fuel lines</li>
                  <li>• Brake lines</li>
                  <li>• Air conditioning systems</li>
                  <li>• Power steering lines</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Aerospace</h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>• Hydraulic systems</li>
                  <li>• Fuel delivery systems</li>
                  <li>• Environmental control systems</li>
                  <li>• Landing gear components</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Medical Equipment</h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>• Surgical instruments</li>
                  <li>• Medical gas delivery</li>
                  <li>• Diagnostic equipment</li>
                  <li>• Patient monitoring systems</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Industrial Manufacturing</h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>• Process piping</li>
                  <li>• Heat exchangers</li>
                  <li>• Chemical processing equipment</li>
                  <li>• Power generation systems</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Advantages vs Disadvantages */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Advantages vs Disadvantages</h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold text-green-700 mb-4">Advantages</h3>
                <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Superior bend quality and consistency</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Prevents tube collapse and wrinkling</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Enables tight radius bends</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Maintains tube roundness</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Reduces wall thinning</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Excellent surface finish</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>High repeatability</span>
                  </li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-red-700 mb-4">Disadvantages</h3>
                <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-start">
                    <span className="text-red-500 mr-2">✗</span>
                    <span>Higher initial equipment cost</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-500 mr-2">✗</span>
                    <span>More complex setup and operation</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-500 mr-2">✗</span>
                    <span>Requires skilled operators</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-500 mr-2">✗</span>
                    <span>Slower production rates</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-500 mr-2">✗</span>
                    <span>Higher maintenance requirements</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-500 mr-2">✗</span>
                    <span>Limited to certain tube sizes</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Best Practices */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Best Practices for Mandrel Bending</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Follow these best practices to achieve optimal results with mandrel tube bending.
            </p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Setup & Preparation</h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>• Clean tubes thoroughly before bending</li>
                  <li>• Use appropriate mandrel size and type</li>
                  <li>• Ensure proper die alignment</li>
                  <li>• Check mandrel lubrication</li>
                  <li>• Verify tube specifications</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Operation</h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>• Monitor bend progression carefully</li>
                  <li>• Maintain consistent pressure</li>
                  <li>• Check for mandrel wear regularly</li>
                  <li>• Use appropriate bending speeds</li>
                  <li>• Inspect bends for quality</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
