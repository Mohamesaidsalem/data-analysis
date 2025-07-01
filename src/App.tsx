import React, { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, Clock, Plane, BarChart3, Calendar, MapPin, TrendingUp, Download, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';

interface FlightRecord {
  ser: string;
  date: string;
  from: string;
  to: string;
  takeoffHours: number;
  takeoffMinutes: number;
  landingHours: number;
  landingMinutes: number;
  flightHours: number;
  flightMinutes: number;
  cycles: number;
  totalFlightHours: number;
  totalFlightMinutes: number;
  totalCycles: number;
  tlbNumber: string;
  lastDate: string;
  totalHours: number;
  totalMinutes: number;
  totalCyclesSum: number;
  hoursPerMonth: number;
  cyclesPerMonth: number;
}

interface FlightStats {
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

function App() {
  const [flightData, setFlightData] = useState<FlightRecord[]>([]);
  const [stats, setStats] = useState<FlightStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const parseTimeToMinutes = (hours: number, minutes: number): number => {
    return Math.max((hours || 0) * 60 + (minutes || 0), 0); // منع القيم السلبية
  };

  const formatMinutesToTime = (totalMinutes: number): string => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  const parseTimeString = (timeStr: string): { hours: number; minutes: number } => {
    if (!timeStr) return { hours: 0, minutes: 0 };
    const [hours, minutes] = timeStr.split(':').map(Number) || [0, 0];
    return { hours: isNaN(hours) ? 0 : hours, minutes: isNaN(minutes) ? 0 : minutes };
  };

  const processFlightData = (data: any[]): FlightRecord[] => {
    return data.map((row, index) => {
      let totalFlightHours = 0;
      let totalFlightMinutes = 0;
      const totalTimeStr = row['Total F\\H']?.toString() || '';
      if (totalTimeStr.includes(':')) {
        const { hours, minutes } = parseTimeString(totalTimeStr);
        totalFlightHours = hours;
        totalFlightMinutes = minutes;
      } else {
        totalFlightHours = parseInt((row['TOTAL HRS'] || '0').toString()) || 0;
      }
      return {
        ser: row['Ser'] || `${index + 1}`,
        date: row['Date'] || '',
        from: row['From'] || '',
        to: row['To'] || '',
        takeoffHours: parseInt((row['T\\O hrs'] || '0').toString()) || 0,
        takeoffMinutes: parseInt((row['T\\O min'] || '0').toString()) || 0,
        landingHours: parseInt((row['Landing hrs'] || '0').toString()) || 0,
        landingMinutes: parseInt((row['Landing min'] || '0').toString()) || 0,
        flightHours: parseInt((row['F\\H hrs'] || '0').toString()) || 0,
        flightMinutes: parseInt((row['F\\H min'] || '0').toString()) || 0,
        cycles: parseInt((row['Cyc.'] || '0').toString()) || 0,
        totalFlightHours,
        totalFlightMinutes,
        totalCycles: parseInt((row['Total Cyc'] || '0').toString()) || 0,
        tlbNumber: row['TLB #'] || '',
        lastDate: row['Last Date'] || '',
        totalHours: parseInt((row['TOTAL HRS'] || '0').toString()) || 0,
        totalMinutes: parseInt((row['TOTAL MIN'] || '0').toString()) || 0,
        totalCyclesSum: parseInt((row['TOTAL CYC'] || '0').toString()) || 0,
        hoursPerMonth: parseInt((row['HRS/MOUNTH'] || '0').toString()) || 0,
        cyclesPerMonth: parseInt((row['CYC/MOUNTH'] || '0').toString()) || 0,
      };
    }).filter(r => r.ser && r.date); // فلترة السجلات الفارغة
  };

  const calculateStats = (data: FlightRecord[]): FlightStats => {
    if (data.length === 0) {
      return {
        totalFlightTime: '0:00',
        totalCycles: 0,
        totalFlights: 0,
        averageFlightTime: '0:00',
        mostFrequentRoute: 'N/A',
        totalDays: 0,
        averageFlightsPerDay: 0,
        monthlyStats: {},
        routeStats: {}
      };
    }

    const totalMinutes = data.reduce((sum, record) => {
      return sum + parseTimeToMinutes(record.totalFlightHours, record.totalFlightMinutes);
    }, 0);

    const totalCycles = data.reduce((sum, record) => sum + record.totalCycles, 0);

    const routeStats: { [key: string]: { count: number; totalTime: number } } = {};
    data.forEach(record => {
      const route = `${record.from}-${record.to}`;
      if (!routeStats[route]) {
        routeStats[route] = { count: 0, totalTime: 0 };
      }
      routeStats[route].count++;
      routeStats[route].totalTime += parseTimeToMinutes(record.totalFlightHours, record.totalFlightMinutes);
    });

    const mostFrequentRoute = Object.entries(routeStats)
      .sort(([,a], [,b]) => b.count - a.count)[0]?.[0] || 'N/A';

    const monthlyStats: { [key: string]: { hours: number; flights: number; cycles: number } } = {};
    data.forEach(record => {
      if (record.date) {
        const month = new Date(record.date).toISOString().substring(0, 7);
        if (!monthlyStats[month]) {
          monthlyStats[month] = { hours: 0, flights: 0, cycles: 0 };
        }
        monthlyStats[month].hours += parseTimeToMinutes(record.totalFlightHours, record.totalFlightMinutes);
        monthlyStats[month].flights++;
        monthlyStats[month].cycles += record.totalCycles;
      }
    });

    const dates = data.map(r => new Date(r.date)).filter(d => !isNaN(d.getTime()));
    const totalDays = dates.length > 0 ? 
      Math.ceil((Math.max(...dates.map(d => d.getTime())) - Math.min(...dates.map(d => d.getTime()))) / (1000 * 60 * 60 * 24)) + 1 : 0;

    return {
      totalFlightTime: formatMinutesToTime(totalMinutes),
      totalCycles,
      totalFlights: data.length,
      averageFlightTime: formatMinutesToTime(Math.round(totalMinutes / data.length)),
      mostFrequentRoute,
      totalDays,
      averageFlightsPerDay: totalDays > 0 ? parseFloat((data.length / totalDays).toFixed(2)) : 0,
      monthlyStats,
      routeStats
    };
  };

  const handleFileUpload = useCallback((file: File) => {
    setIsLoading(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0]; // استخدام الشيت "SU-BVA"
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
        
        const headers = jsonData[0] as string[];
        if (!headers.includes('Date') || !headers.includes('From') || !headers.includes('To') || !headers.includes('Total F\\H') || !headers.includes('Total Cyc')) {
          throw new Error('Missing required headers (e.g., Date, From, To, Total F\\H, Total Cyc)');
        }
        const rows = jsonData.slice(1) as any[];
        const processedData = rows.map(row => {
          const record: any = {};
          headers.forEach((header, index) => {
            record[header.trim().replace(/\\|[\s\n]+/g, '')] = row[index];
          });
          return processFlightData([record])[0];
        }).filter(r => r);
        
        if (processedData.length === 0) {
          throw new Error('No valid flight data found in the file');
        }
        
        const calculatedStats = calculateStats(processedData);
        setFlightData(processedData);
        setStats(calculatedStats);
      } catch (error: any) {
        console.error('Error processing file:', error);
        alert(`Error processing file: ${error.message}. Please ensure the file is a valid Excel file, headers match (e.g., Date, From, To, Total F\\H, Total Cyc), and time values are valid (e.g., HH:MM or numeric).`);
      } finally {
        setIsLoading(false);
      }
    };
    
    reader.readAsArrayBuffer(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const excelFile = files.find(file => 
      file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
    );
    
    if (excelFile) {
      handleFileUpload(excelFile);
    } else {
      alert('Please upload an Excel file (.xlsx or .xls)');
    }
  }, [handleFileUpload]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const exportStats = () => {
    if (!stats) return;
    
    const exportData = {
      summary: {
        'Total Flight Hours': stats.totalFlightTime,
        'Total Cycles': stats.totalCycles,
        'Total Flights': stats.totalFlights,
        'Average Flight Time': stats.averageFlightTime,
        'Most Frequent Route': stats.mostFrequentRoute,
        'Average Flights Per Day': stats.averageFlightsPerDay
      },
      monthlyStats: stats.monthlyStats,
      routeStats: stats.routeStats
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `flight-statistics-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Plane className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Flight Analytics Pro
                </h1>
                <p className="text-sm text-gray-600">Advanced Flight Data Analyzer</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {stats && (
                <button
                  onClick={exportStats}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Report</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div
            className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
              isDragOver
                ? 'border-blue-400 bg-blue-50/50 scale-105'
                : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/30'
            } ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
          >
            {isLoading ? (
              <div className="flex flex-col items-center space-y-4">
                <RefreshCw className="w-12 h-12 text-blue-600 animate-spin" />
                <p className="text-lg font-medium text-gray-700">Processing data...</p>
              </div>
            ) : (
              <>
                <FileSpreadsheet className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Drag Excel file here or click to select
                </h3>
                <p className="text-gray-600 mb-6">
                  Supports .xlsx and .xls files - Data will be analyzed automatically
                </p>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileInput}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg cursor-pointer hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 shadow-lg inline-flex items-center space-x-2"
                >
                  <Upload className="w-5 h-5" />
                  <span>Select Excel File</span>
                </label>
              </>
            )}
          </div>
        </div>

        {stats && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Flight Hours</p>
                    <p className="text-3xl font-bold text-blue-600 mt-1">{stats.totalFlightTime}</p>
                    <p className="text-xs text-gray-500 mt-1">hours:minutes</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Clock className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Cycles</p>
                    <p className="text-3xl font-bold text-emerald-600 mt-1">{stats.totalCycles.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-1">complete cycles</p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Flights</p>
                    <p className="text-3xl font-bold text-purple-600 mt-1">{stats.totalFlights.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-1">completed flights</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Plane className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Average Flight Time</p>
                    <p className="text-3xl font-bold text-orange-600 mt-1">{stats.averageFlightTime}</p>
                    <p className="text-xs text-gray-500 mt-1">hours:minutes</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Route Analysis</h3>
                  <MapPin className="w-5 h-5 text-gray-400" />
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="font-medium text-gray-700">Most Frequent Route</span>
                    <span className="font-bold text-blue-600">{stats.mostFrequentRoute}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
                    <span className="font-medium text-gray-700">Average Flights Per Day</span>
                    <span className="font-bold text-emerald-600">{stats.averageFlightsPerDay}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <span className="font-medium text-gray-700">Total Operating Days</span>
                    <span className="font-bold text-purple-600">{stats.totalDays}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Monthly Statistics</h3>
                  <Calendar className="w-5 h-5 text-gray-400" />
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {Object.entries(stats.monthlyStats)
                    .sort(([a], [b]) => b.localeCompare(a))
                    .slice(0, 6)
                    .map(([month, data]) => (
                      <div key={month} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div>
                          <span className="font-medium text-gray-700">{month}</span>
                          <p className="text-xs text-gray-500">{data.flights} flights</p>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-blue-600">{formatMinutesToTime(data.hours)}</span>
                          <p className="text-xs text-gray-500">{data.cycles} cycles</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Top Routes</h3>
                <TrendingUp className="w-5 h-5 text-gray-400" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(stats.routeStats)
                  .sort(([,a], [,b]) => b.count - a.count)
                  .slice(0, 6)
                  .map(([route, data]) => (
                    <div key={route} className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200/50">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold text-gray-900">{route}</span>
                        <span className="text-sm font-medium text-blue-600">{data.count} flights</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Total Time: <span className="font-medium">{formatMinutesToTime(data.totalTime)}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Average Flight: {formatMinutesToTime(Math.round(data.totalTime / data.count))}
                      </p>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Data Preview</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">From</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">To</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Flight Hours</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cycles</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {flightData.slice(0, 10).map((record, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{record.date}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{record.from}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{record.to}</td>
                        <td className="px-4 py-3 text-sm font-medium text-blue-600">
                          {formatMinutesToTime(parseTimeToMinutes(record.totalFlightHours, record.totalFlightMinutes))}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{record.cycles}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {flightData.length > 10 && (
                  <p className="text-center text-gray-500 text-sm mt-4">
                    Showing 10 of {flightData.length} records
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {!stats && !isLoading && (
          <div className="text-center py-16">
            <FileSpreadsheet className="w-24 h-24 text-gray-300 mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No file uploaded yet
            </h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Upload an Excel file containing flight data and all statistics will be analyzed automatically
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;