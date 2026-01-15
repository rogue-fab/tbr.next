'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { TubeBender, MandrelTier } from '../../lib/validators';
import { columns, SortState } from './Columns';
import { ScoreBadge } from './ScoreBadge';
import { FilterBar } from './FilterBar';
import { EmptyState } from './EmptyState';
import { PriceBreakdownModal } from './PriceBreakdownModal';

function mandrelLabel(m: unknown): string {
  const s = String(m ?? "").trim().toLowerCase() as MandrelTier | "";
  if (s === "bronze") return "Bronze";
  if (s === "economy") return "Economy";
  if (s === "none") return "None";
  return String(m ?? "—");
}

function getMandrelClass(m: unknown): string {
  const s = String(m ?? "").trim().toLowerCase();
  if (s === "bronze") return "bg-green-100 text-green-800";
  if (s === "economy") return "bg-blue-100 text-blue-800";
  if (s === "none") return "bg-gray-100 text-gray-800";
  return "bg-gray-100 text-gray-800";
}

interface ComparisonTableProps {
  data: TubeBender[];
  className?: string;
}

export function ComparisonTable({ data, className = '' }: ComparisonTableProps) {
  const searchParams = useSearchParams();
  const [sortState, setSortState] = useState<SortState>({ key: 'totalScore', direction: 'desc' });
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(columns.map(c => c.key)));
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TubeBender | null>(null);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const columnMenuRef = useRef<HTMLDivElement>(null);
  
  const textFilter = searchParams.get('search') || '';
  const mandrelFilter = (searchParams.get("mandrel") as MandrelTier | "all") || "all";

  // Close column menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) {
        setShowColumnMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleColumn = (columnKey: string) => {
    setVisibleColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnKey)) {
        newSet.delete(columnKey);
      } else {
        newSet.add(columnKey);
      }
      return newSet;
    });
  };

  const visibleColumnsList = columns.filter(col => visibleColumns.has(col.key));

  // Filter data
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchesText = textFilter === '' || 
        item.brand.toLowerCase().includes(textFilter.toLowerCase()) ||
        item.model.toLowerCase().includes(textFilter.toLowerCase());
      
      const matchesMandrel = mandrelFilter === "all" || String(item.mandrel) === mandrelFilter;
      
      return matchesText && matchesMandrel;
    });
  }, [data, textFilter, mandrelFilter]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortState.direction) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortState.key];
      const bValue = b[sortState.key];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortState.direction === 'asc' ? comparison : -comparison;
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        const comparison = aValue - bValue;
        return sortState.direction === 'asc' ? comparison : -comparison;
      }

      return 0;
    });
  }, [filteredData, sortState]);

  const handleSort = (key: keyof TubeBender) => {
    setSortState((prev) => {
      if (prev.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        if (prev.direction === 'desc') return { key, direction: null };
        return { key, direction: 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const getSortIcon = (key: keyof TubeBender) => {
    if (sortState.key !== key) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }

    if (sortState.direction === 'asc') {
      return (
        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      );
    }

    if (sortState.direction === 'desc') {
      return (
        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      );
    }

    return (
      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    );
  };

  const renderCellValue = (item: TubeBender, key: keyof TubeBender) => {
    const value = item[key];
    
    if (key === 'brand') {
      return (
        <div>
          <div className="font-medium">{item.brand}</div>
          <div className="text-sm text-gray-500">{item.model}</div>
        </div>
      );
    }
    
    if (key === "mandrel") {
      return (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getMandrelClass(value)}`}>
          {mandrelLabel(value)}
        </span>
      );
    }
    
    if (key === 'totalScore') {
      return <ScoreBadge score={value as number} />;
    }
    
    return <span>{value as string}</span>;
  };

  if (sortedData.length === 0) {
    return (
      <div className={className}>
        <FilterBar className="mb-6" />
        <EmptyState />
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-6">
        <FilterBar className="flex-1" />
        
        {/* Column Visibility Dropdown */}
        <div className="relative ml-4" ref={columnMenuRef}>
          <button
            onClick={() => setShowColumnMenu(!showColumnMenu)}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-expanded={showColumnMenu}
            aria-haspopup="true"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            Columns
          </button>
          
          {showColumnMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-md shadow-lg z-20">
              <div className="py-1">
                {columns.map((column) => (
                  <label key={column.key} className="flex items-center px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleColumns.has(column.key)}
                      onChange={() => toggleColumn(column.key)}
                      className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    {column.label}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {visibleColumnsList.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  } ${column.width || ''} ${column.align === 'center' ? 'text-center' : ''}`}
                  onClick={() => column.sortable && handleSort(column.key)}
                  tabIndex={column.sortable ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (column.sortable && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      handleSort(column.key);
                    }
                  }}
                  aria-sort={
                    sortState.key === column.key
                      ? sortState.direction === 'asc'
                        ? 'ascending'
                        : sortState.direction === 'desc'
                        ? 'descending'
                        : 'none'
                      : undefined
                  }
                >
                  <div className={`flex items-center gap-2 ${column.align === 'center' ? 'justify-center' : ''}`}>
                    {column.label}
                    {column.sortable && getSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                {visibleColumnsList.map((column) => (
                  <td
                    key={column.key}
                    className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${
                      column.align === 'center' ? 'text-center' : ''
                    }`}
                  >
                    {renderCellValue(item, column.key)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {sortedData.map((item) => (
          <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">{item.brand}</h3>
                <p className="text-sm text-gray-500">{item.model}</p>
              </div>
              <ScoreBadge score={item.totalScore} />
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Max Capacity:</span>
                <span className="ml-1 font-medium">{item.maxCapacity}</span>
              </div>
              <div>
                <span className="text-gray-500">CLR Range:</span>
                <span className="ml-1 font-medium">{item.clrRange}</span>
              </div>
              <div>
                <span className="text-gray-500">Die Cost:</span>
                <span className="ml-1 font-medium">{item.dieCost}</span>
              </div>
              <div>
                <span className="text-gray-500">Cycle Time:</span>
                <span className="ml-1 font-medium">{item.cycleTime}</span>
              </div>
              <div>
                <span className="text-gray-500">Weight:</span>
                <span className="ml-1 font-medium">{item.weight}</span>
              </div>
              <div>
                <span className="text-gray-500">Price:</span>
                <span className="ml-1 font-medium">{item.price}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">Mandrel:</span>
                <span className="ml-1">{renderCellValue(item, 'mandrel')}</span>
              </div>
            </div>
            
                         <div className="mt-4 flex gap-2">
               <button 
                 onClick={() => {
                   setSelectedItem(item);
                   setShowPriceModal(true);
                 }}
                 className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
               >
                 Price Breakdown
               </button>
               <button className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2">
                 Compare
               </button>
             </div>
          </div>
                 ))}
       </div>

       {/* Price Breakdown Modal */}
       {selectedItem && (
         <PriceBreakdownModal
           item={selectedItem}
           isOpen={showPriceModal}
           onClose={() => {
             setShowPriceModal(false);
             setSelectedItem(null);
           }}
         />
       )}
     </div>
   );
 }
