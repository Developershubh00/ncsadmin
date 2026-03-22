import React, { useState, useEffect } from 'react';
import { Download, Search, RefreshCw } from 'lucide-react';
import * as callService from '../services/callService';
import type { CallReportRecord, CallReportStatistics } from '../services/callService';

const PatientReports: React.FC = () => {
  const [reportData, setReportData] = useState<CallReportRecord[]>([]);
  const [statistics, setStatistics] = useState<CallReportStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter state
  const [searchRoom, setSearchRoom] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [filterFloor, setFilterFloor] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterBedNo, setFilterBedNo] = useState('');
  const [filterHospital, setFilterHospital] = useState('');
  const [minResponseTime, setMinResponseTime] = useState('');
  const [maxResponseTime, setMaxResponseTime] = useState('');
  const [minAttendDelay, setMinAttendDelay] = useState('');
  const [maxAttendDelay, setMaxAttendDelay] = useState('');

  // Get date range
  const getDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (dateRange) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'yesterday':
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(endDate.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'month':
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        return {};
    }
    
    return {
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
    };
  };

  // Fetch report data
  const fetchReports = async () => {
    try {
      setLoading(true);
      const dateFilters = getDateRange();
      const filters = {
        ...(searchRoom && { room_no: searchRoom }),
        ...(filterFloor && { floor_no: parseInt(filterFloor) }),
        ...(filterStatus && { status: filterStatus as 'new' | 'acknowledged' | 'attended' }),
        ...(filterBedNo && { bed_no: filterBedNo }),
        ...(filterHospital && { hospital_name: filterHospital }),
        ...(minResponseTime && { min_response_time: parseInt(minResponseTime) }),
        ...(maxResponseTime && { max_response_time: parseInt(maxResponseTime) }),
        ...(minAttendDelay && { min_attend_delay: parseInt(minAttendDelay) }),
        ...(maxAttendDelay && { max_attend_delay: parseInt(maxAttendDelay) }),
        ...dateFilters,
      };
      
      const { statistics: stats, calls } = await callService.getCallReport(filters);
      setReportData(calls);
      setStatistics(stats ?? null);
      setError('');
      console.log('✅ Reports fetched:', calls.length, 'records', '| stats:', stats);
    } catch (err) {
      console.error('❌ API error:', err);
      setError('Unable to load reports. Please ensure the API is accessible.');
      setReportData([]);
      setStatistics(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [searchRoom, dateRange, filterFloor, filterStatus, filterBedNo, filterHospital, minResponseTime, maxResponseTime, minAttendDelay, maxAttendDelay]);

  // Format response time
  const formatResponseTime = (seconds?: number) => {
    if (!seconds) return '-';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  // Get unique floors for filter
  const getUniqueFloors = (): number[] => {
    const values = reportData
      .map(r => r.floor_no)
      .filter((v): v is number => v !== null && v !== undefined);
    return [...new Set(values)].sort((a, b) => a - b);
  };

  // Export function - generate CSV
  const handleExport = () => {
    if (reportData.length === 0) {
      alert('No data to export');
      return;
    }

    // Create CSV header
    const headers = ['Room', 'Floor', 'Bed', 'Status', 'Created', 'Response Time (sec)', 'Attend Delay (sec)'];
    
    // Create CSV rows
    const rows = reportData.map(report => [
      report.room_no,
      report.floor_no,
      report.bed_no || '-',
      report.status,
      new Date(report.created_at).toLocaleString(),
      report.response_time_seconds || '-',
      report.attend_delay_seconds || '-'
    ]);

    // Include statistics in export
    const statsRows = statistics
      ? [
          '',
          'STATISTICS',
          `"Mean Total Time","${formatResponseTime(statistics.mean_total_time_seconds)}"`,
          `"Median Total Time","${formatResponseTime(statistics.median_total_time_seconds)}"`
        ]
      : [];

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ...statsRows,
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `patient-reports-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Patient Reports</h1>
          <p className="text-gray-600">View detailed logs and statistics for patients</p>
        </div>
        <button
          onClick={fetchReports}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors gap-2"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100 mb-6">
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Room</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Enter room number"
                value={searchRoom}
                onChange={(e) => setSearchRoom(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
          <div>
            <label htmlFor="filter-floor" className="block text-sm font-medium text-gray-700 mb-1">
              Floor
            </label>
            <select
              id="filter-floor"
              value={filterFloor}
              onChange={(e) => setFilterFloor(e.target.value)}
              className="block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">All Floors</option>
              {getUniqueFloors().map((floor) => (
                <option key={floor} value={floor}>
                  Floor {floor}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="filter-status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">All Status</option>
              <option value="new">New</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="attended">Attended</option>
            </select>
          </div>
          <div>
            <label htmlFor="date-range" className="block text-sm font-medium text-gray-700 mb-1">
              Date Range
            </label>
            <select
              id="date-range"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">Last 7 Days</option>
              <option value="month">This Month</option>
            </select>
          </div>
          <div>
            <label htmlFor="filter-hospital" className="block text-sm font-medium text-gray-700 mb-1">
              Hospital
            </label>
            <input
              id="filter-hospital"
              type="text"
              placeholder="Hospital name"
              value={filterHospital}
              onChange={(e) => setFilterHospital(e.target.value)}
              className="block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="filter-bed" className="block text-sm font-medium text-gray-700 mb-1">
              Bed No.
            </label>
            <input
              id="filter-bed"
              type="text"
              placeholder="Bed number"
              value={filterBedNo}
              onChange={(e) => setFilterBedNo(e.target.value)}
              className="block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="min-response" className="block text-sm font-medium text-gray-700 mb-1">
              Min Response (sec)
            </label>
            <input
              id="min-response"
              type="number"
              placeholder="Min seconds"
              value={minResponseTime}
              onChange={(e) => setMinResponseTime(e.target.value)}
              className="block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="max-response" className="block text-sm font-medium text-gray-700 mb-1">
              Max Response (sec)
            </label>
            <input
              id="max-response"
              type="number"
              placeholder="Max seconds"
              value={maxResponseTime}
              onChange={(e) => setMaxResponseTime(e.target.value)}
              className="block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="min-attend" className="block text-sm font-medium text-gray-700 mb-1">
              Min Attend Delay (sec)
            </label>
            <input
              id="min-attend"
              type="number"
              placeholder="Min seconds"
              value={minAttendDelay}
              onChange={(e) => setMinAttendDelay(e.target.value)}
              className="block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="max-attend" className="block text-sm font-medium text-gray-700 mb-1">
              Max Attend Delay (sec)
            </label>
            <input
              id="max-attend"
              type="number"
              placeholder="Max seconds"
              value={maxAttendDelay}
              onChange={(e) => setMaxAttendDelay(e.target.value)}
              className="block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleExport}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Download size={18} className="mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 bg-white rounded-lg border border-gray-100">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading reports...</span>
        </div>
      ) : (
        <>
          {/* Statistics summary cards */}
          {statistics && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex items-center gap-4">
                <div className="flex-shrink-0 bg-blue-50 rounded-full p-3">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Mean Total Time</p>
                  <p className="text-2xl font-bold text-gray-900 mt-0.5">
                    {formatResponseTime(statistics.mean_total_time_seconds)}
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex items-center gap-4">
                <div className="flex-shrink-0 bg-purple-50 rounded-full p-3">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Median Total Time</p>
                  <p className="text-2xl font-bold text-gray-900 mt-0.5">
                    {formatResponseTime(statistics.median_total_time_seconds)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Room
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Floor
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bed
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Response Time
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Attend Delay
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.map((report) => (
                  <tr key={report.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{report.room_no}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">Floor {report.floor_no}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{report.bed_no || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        report.status === 'attended' ? 'bg-green-100 text-green-800' :
                        report.status === 'acknowledged' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {report.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(report.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatResponseTime(report.response_time_seconds)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatResponseTime(report.attend_delay_seconds)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {reportData.length === 0 && !loading && (
              <div className="px-6 py-12 text-center text-gray-500">
                No reports found matching your filters
              </div>
            )}
          </div>
          {/* Statistics footer row */}
          {statistics && reportData.length > 0 && (
            <div className="flex flex-wrap items-center gap-6 px-6 py-3 bg-gray-50 border-t border-gray-100 text-sm text-gray-600 rounded-b-lg">
              <span>Total records: <strong>{reportData.length}</strong></span>
              <span>Mean total time: <strong>{formatResponseTime(statistics.mean_total_time_seconds)}</strong></span>
              <span>Median total time: <strong>{formatResponseTime(statistics.median_total_time_seconds)}</strong></span>
            </div>
          )}
        </div>
        </>
      )}
    </div>
  );
};

export default PatientReports;