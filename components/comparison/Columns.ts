import { TubeBender } from '../../lib/validators';

export interface Column {
  key: keyof TubeBender;
  label: string;
  sortable: boolean;
  filterable: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export const columns: Column[] = [
  {
    key: 'brand',
    label: 'Brand/Model',
    sortable: true,
    filterable: true,
    width: 'w-48',
    align: 'left'
  },
  {
    key: 'maxCapacity',
    label: 'Max Capacity',
    sortable: true,
    filterable: false,
    width: 'w-32',
    align: 'center'
  },
  {
    key: 'clrRange',
    label: 'CLR Range',
    sortable: true,
    filterable: false,
    width: 'w-32',
    align: 'center'
  },
  {
    key: 'dieCost',
    label: 'Die Cost ($)',
    sortable: true,
    filterable: false,
    width: 'w-32',
    align: 'center'
  },
  {
    key: 'cycleTime',
    label: 'Cycle Time',
    sortable: true,
    filterable: false,
    width: 'w-32',
    align: 'center'
  },
  {
    key: 'weight',
    label: 'Weight',
    sortable: true,
    filterable: false,
    width: 'w-32',
    align: 'center'
  },
  {
    key: 'price',
    label: 'Price',
    sortable: true,
    filterable: false,
    width: 'w-32',
    align: 'center'
  },
  {
    key: 'mandrel',
    label: 'Mandrel',
    sortable: true,
    filterable: true,
    width: 'w-32',
    align: 'center',
    // NOTE: mandrel is canonical: "none" | "economy" | "bronze"
  },
  {
    key: 'totalScore',
    label: 'Total Score',
    sortable: true,
    filterable: false,
    width: 'w-32',
    align: 'center'
  }
];

export type SortDirection = 'asc' | 'desc' | null;

export interface SortState {
  key: keyof TubeBender;
  direction: SortDirection;
}
