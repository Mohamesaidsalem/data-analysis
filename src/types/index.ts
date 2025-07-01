export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  avatar?: string;
  lastLogin: Date;
  createdAt: Date;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  uploadedBy: User;
  uploadedAt: Date;
  recordsCount: number;
  status: 'processing' | 'completed' | 'error';
  stats?: FlightStats;
}

export interface FlightRecord {
  ser: string;
  date: string;
  from: string;
  to: string;
  blockHours: number;
  blockMinutes: number;
  landingHours: number;
  landingMinutes: number;
  flightHours: number;
  flightMinutes: number;
  totalFlightHours: number;
  totalFlightMinutes: number;
  cycles: number;
  totalCycles: number;
  tlbNumber: string;
  lastDate: string;
  totalHours: number;
  totalMinutes: number;
  totalCyclesSum: number;
  hoursPerMonth: number;
  cyclesPerMonth: number;
}

export interface FlightStats {
  totalFlightTime: string;
  totalCycles: number;
  totalFlights: number;
  averageFlightTime: string;
  mostFrequentRoute: string;
  totalDays: number;
  averageFlightsPerDay: number;
  monthlyStats: { [key: string]: { hours: number; flights: number; cycles: number } };
  routeStats: { [key: string]: { count: number; totalTime: number } };
}

export interface Report {
  id: string;
  title: string;
  type: 'monthly' | 'quarterly' | 'annual' | 'custom';
  dateRange: {
    start: Date;
    end: Date;
  };
  generatedBy: User;
  generatedAt: Date;
  data: FlightStats;
  fileId?: string;
}