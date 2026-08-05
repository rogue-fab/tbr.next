interface Specs {
  maxCapacity: string;
  clrRange: string;
  dieCost: string;
  cycleTime: string;
  weight: string;
  power: string;
  pressure: string;
  dimensions: string;
  warranty: string;
}

interface SpecsProps {
  specs: Specs;
}

export function Specs({ specs }: SpecsProps) {
  const specItems = [
    { label: 'Max Capacity', value: specs.maxCapacity },
    { label: 'CLR Range', value: specs.clrRange },
    { label: 'Die Cost', value: specs.dieCost },
    { label: 'Cycle Time', value: specs.cycleTime },
    { label: 'Weight', value: specs.weight },
    { label: 'Power', value: specs.power },
    { label: 'Pressure', value: specs.pressure },
    { label: 'Dimensions', value: specs.dimensions },
    { label: 'Warranty', value: specs.warranty }
  ];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Specifications</h2>
      
      <div className="grid md:grid-cols-2 gap-6">
        {specItems.map((item) => (
          <div key={item.label} className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-800 last:border-b-0">
            <span className="text-gray-600 dark:text-gray-400 font-medium">{item.label}</span>
            <span className="text-gray-900 dark:text-gray-100 font-semibold">{item.value}</span>
          </div>
        ))}
      </div>
      
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">About These Specifications</h3>
        <p className="text-sm text-blue-800">
          These specifications are based on manufacturer data and our independent testing. 
          Actual performance may vary depending on material type, wall thickness, and operating conditions.
        </p>
      </div>
    </div>
  );
}

