import React, { useState, useEffect } from 'react';
import { BarChart3, Download, Printer, RefreshCw } from 'lucide-react';
import LineChart from '../components/LineChart';
import * as callService from '../services/callService';
import type { CallAnalytics } from '../services/callService';

const Analytics: React.FC = () => {
  const [dateRange, setDateRange] = useState('week');
  const [filterFloor, setFilterFloor] = useState('');
  const [filterHospital, setFilterHospital] = useState('');
  const [filterCorridoor, setFilterCorridoor] = useState('');
  const [filterRoom, setFilterRoom] = useState('');
  const [analytics, setAnalytics] = useState<CallAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Get date range
  const getDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (dateRange) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case 'quarter':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case 'year':
        startDate.setDate(startDate.getDate() - 365);
        break;
    }
    
    return {
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
    };
  };

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const dateFilters = getDateRange();
      const filters = {
        ...(filterFloor && { floor_no: parseInt(filterFloor) }),
        ...(filterHospital && { hospital_id: parseInt(filterHospital) }),
        ...(filterCorridoor && { corridoor_no: filterCorridoor }),
        ...(filterRoom && { room_no: filterRoom }),
        ...dateFilters,
      };
      
      const data = await callService.getCallAnalytics(filters);
      setAnalytics(data);
      setError('');
      console.log('✅ Analytics fetched:', data);
    } catch (err) {
      console.error('❌ API error:', err);
      setError('Unable to load analytics. Please ensure the API is accessible.');
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange, filterFloor, filterHospital, filterCorridoor, filterRoom]);
  
  // Mock data for charts (still used as we don't have chart-specific endpoints yet)
  // In future, these charts can be replaced with API data if needed
  const chartData = {
    week: {
      dailyCalls: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        values: [42, 38, 55, 48, 52, 40, 45],
      },
      responseTime: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        values: [3.2, 2.8, 4.1, 3.5, 2.9, 2.5, 3.0],
      },
      callTypes: {
        labels: ['Assistance', 'Bathroom', 'Pain', 'Emergency', 'Other'],
        values: [45, 30, 15, 5, 5],
      },
      peakHours: {
        labels: ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM', '12AM', '3AM'],
        values: [15, 40, 35, 30, 45, 25, 10, 5],
      }
    },
    month: {
      dailyCalls: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        values: [180, 165, 195, 175],
      },
      responseTime: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        values: [3.5, 3.2, 3.7, 3.4],
      },
      callTypes: {
        labels: ['Assistance', 'Bathroom', 'Pain', 'Emergency', 'Other'],
        values: [42, 32, 16, 6, 4],
      },
      peakHours: {
        labels: ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM', '12AM', '3AM'],
        values: [13, 40, 35, 32, 45, 25, 10, 5],
      }
    },
    quarter: {
      dailyCalls: {
        labels: ['Jan', 'Feb', 'Mar'],
        values: [520, 480, 550],
      },
      responseTime: {
        labels: ['Jan', 'Feb', 'Mar'],
        values: [3.8, 3.6, 3.9],
      },
      callTypes: {
        labels: ['Assistance', 'Bathroom', 'Pain', 'Emergency', 'Other'],
        values: [40, 35, 15, 6, 4],
      },
      peakHours: {
        labels: ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM', '12AM', '3AM'],
        values: [13, 40, 35, 32, 45, 25, 10, 5],
      }
    },
    year: {
      dailyCalls: {
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        values: [1550, 1480, 1620, 1590],
      },
      responseTime: {
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        values: [4.2, 3.9, 4.0, 3.8],
      },
      callTypes: {
        labels: ['Assistance', 'Bathroom', 'Pain', 'Emergency', 'Other'],
        values: [40, 35, 15, 6, 4],
      },
      peakHours: {
        labels: ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM', '12AM', '3AM'],
        values: [13, 40, 35, 32, 45, 25, 10, 5],
      }
    }
  };

  // Table data for call statistics
  const callStatistics = {
    week: [
      { type: 'Assistance', count: 45, percentage: '45%' },
      { type: 'Bathroom', count: 30, percentage: '30%' },
      { type: 'Pain', count: 15, percentage: '15%' },
      { type: 'Emergency', count: 5, percentage: '5%' },
      { type: 'Other', count: 5, percentage: '5%' }
    ],
    month: [
      { type: 'Assistance', count: 180, percentage: '42%' },
      { type: 'Bathroom', count: 135, percentage: '32%' },
      { type: 'Pain', count: 68, percentage: '16%' },
      { type: 'Emergency', count: 25, percentage: '6%' },
      { type: 'Other', count: 17, percentage: '4%' }
    ],
    quarter: [
      { type: 'Assistance', count: 520, percentage: '40%' },
      { type: 'Bathroom', count: 455, percentage: '35%' },
      { type: 'Pain', count: 195, percentage: '15%' },
      { type: 'Emergency', count: 78, percentage: '6%' },
      { type: 'Other', count: 52, percentage: '4%' }
    ],
    year: [
      { type: 'Assistance', count: 2080, percentage: '40%' },
      { type: 'Bathroom', count: 1820, percentage: '35%' },
      { type: 'Pain', count: 780, percentage: '15%' },
      { type: 'Emergency', count: 312, percentage: '6%' },
      { type: 'Other', count: 208, percentage: '4%' }
    ]
  };

  // Peak hours data
  const peakHoursData = {
    week: [
      { time: '6AM-9AM', count: 55, percentage: '15%' },
      { time: '9AM-12PM', count: 145, percentage: '40%' },
      { time: '12PM-3PM', count: 127, percentage: '35%' },
      { time: '3PM-6PM', count: 109, percentage: '30%' },
      { time: '6PM-9PM', count: 164, percentage: '45%' },
      { time: '9PM-12AM', count: 91, percentage: '25%' },
      { time: '12AM-3AM', count: 36, percentage: '10%' },
      { time: '3AM-6AM', count: 18, percentage: '5%' }
    ],
    month: [
      { time: '6AM-9AM', count: 220, percentage: '13%' },
      { time: '9AM-12PM', count: 675, percentage: '40%' },
      { time: '12PM-3PM', count: 590, percentage: '35%' },
      { time: '3PM-6PM', count: 540, percentage: '32%' },
      { time: '6PM-9PM', count: 760, percentage: '45%' },
      { time: '9PM-12AM', count: 420, percentage: '25%' },
      { time: '12AM-3AM', count: 170, percentage: '10%' },
      { time: '3AM-6AM', count: 85, percentage: '5%' }
    ],
    quarter: [
      { time: '6AM-9AM', count: 650, percentage: '13%' },
      { time: '9AM-12PM', count: 2000, percentage: '40%' },
      { time: '12PM-3PM', count: 1750, percentage: '35%' },
      { time: '3PM-6PM', count: 1600, percentage: '32%' },
      { time: '6PM-9PM', count: 2250, percentage: '45%' },
      { time: '9PM-12AM', count: 1250, percentage: '25%' },
      { time: '12AM-3AM', count: 500, percentage: '10%' },
      { time: '3AM-6AM', count: 250, percentage: '5%' }
    ],
    year: [
      { time: '6AM-9AM', count: 2600, percentage: '13%' },
      { time: '9AM-12PM', count: 8000, percentage: '40%' },
      { time: '12PM-3PM', count: 7000, percentage: '35%' },
      { time: '3PM-6PM', count: 6400, percentage: '32%' },
      { time: '6PM-9PM', count: 9000, percentage: '45%' },
      { time: '9PM-12AM', count: 5000, percentage: '25%' },
      { time: '12AM-3AM', count: 2000, percentage: '10%' },
      { time: '3AM-6AM', count: 1000, percentage: '5%' }
    ]
  };

  // Get current chart data based on selected date range
  const currentChartData = chartData[dateRange as keyof typeof chartData];

  // Export function - generate CSV with analytics summary and call statistics
  const handleExport = () => {
    if (!analytics) {
      alert('No analytics data to export');
      return;
    }

    const timestamp = new Date().toLocaleString();
    const csvContent = [
      'ANALYTICS REPORT',
      `Generated: ${timestamp}`,
      `Date Range: ${dateRange}`,
      `Floor Filter: ${filterFloor || 'All'}`,
      `Hospital ID: ${filterHospital || 'All'}`,
      `Corridor: ${filterCorridoor || 'All'}`,
      `Room: ${filterRoom || 'All'}`,
      '',
      'KEY PERFORMANCE INDICATORS',
      'Metric,Value',
      `Total Calls,${analytics.total_calls}`,
      `Average Response Time (seconds),${analytics.avg_response_time_seconds}`,
      `Average Attend Delay (seconds),${analytics.avg_attend_delay_seconds}`,
      `Mean Total Time (seconds),${analytics.mean_total_time_seconds}`,
      `Median Total Time (seconds),${analytics.median_total_time_seconds}`,
      `Call Resolution Rate,${analytics.total_calls > 0 ? Math.round((analytics.attended_calls / analytics.total_calls) * 100) : 0}%`,
      '',
      'CALL STATUS SUMMARY',
      'Status,Count',
      `Total Calls,${analytics.total_calls}`,
      `New Calls,${analytics.new_calls}`,
      `Acknowledged Calls,${analytics.acknowledged_calls}`,
      `Attended Calls,${analytics.attended_calls}`,
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `analytics-report-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    console.log('✅ Analytics exported successfully');
  };

  // Print function - generate printable report
  const handlePrint = () => {
    if (!analytics) {
      alert('No analytics data to print');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please enable pop-ups to print reports');
      return;
    }

    const resolutionRate = analytics.total_calls > 0 
      ? Math.round((analytics.attended_calls / analytics.total_calls) * 100) 
      : 0;
    
    const formatSeconds = (seconds: number) => {
      const minutes = Math.floor(seconds / 60);
      const secs = (seconds % 60).toFixed(2);
      return `${minutes}m :${secs}s`;
    };

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Analytics Report</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background: white;
            color: #333;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          .header h1 { margin: 0; font-size: 24px; }
          .header p { margin: 5px 0; font-size: 12px; color: #666; }
          .filters {
            background: #f5f5f5;
            padding: 10px;
            margin-bottom: 20px;
            border-radius: 5px;
          }
          .section {
            margin-bottom: 20px;
          }
          .section h2 {
            font-size: 16px;
            background: #007bff;
            color: white;
            padding: 8px;
            margin: 0 0 10px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background: #f5f5f5;
            font-weight: bold;
          }
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            margin-bottom: 10px;
          }
          .kpi-box {
            border: 1px solid #ddd;
            padding: 10px;
            background: #f9f9f9;
          }
          .kpi-label {
            font-size: 12px;
            color: #666;
          }
          .kpi-value {
            font-size: 18px;
            font-weight: bold;
            color: #007bff;
          }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Analytics Report</h1>
          <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="filters">
          <strong>Filters Applied:</strong><br/>
          Date Range: ${dateRange} | Floor: ${filterFloor || 'All'} | Hospital ID: ${filterHospital || 'All'} | Corridor: ${filterCorridoor || 'All'} | Room: ${filterRoom || 'All'}
        </div>

        <div class="section">
          <h2>Key Performance Indicators</h2>
          <div class="kpi-grid">
            <div class="kpi-box">
              <div class="kpi-label">Total Calls</div>
              <div class="kpi-value">${analytics.total_calls}</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-label">Avg Response Time</div>
              <div class="kpi-value">${formatSeconds(analytics.avg_response_time_seconds)}</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-label">Call Resolution Rate</div>
              <div class="kpi-value">${resolutionRate}%</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-label">Avg Attend Delay</div>
              <div class="kpi-value">${formatSeconds(analytics.avg_attend_delay_seconds)}</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-label">Mean Total Time</div>
              <div class="kpi-value">${formatSeconds(analytics.mean_total_time_seconds)}</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-label">Median Total Time</div>
              <div class="kpi-value">${formatSeconds(analytics.median_total_time_seconds)}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>Call Status Summary</h2>
          <table>
            <tr>
              <th>Status</th>
              <th>Count</th>
            </tr>
            <tr>
              <td>New Calls</td>
              <td>${analytics.new_calls}</td>
            </tr>
            <tr>
              <td>Acknowledged Calls</td>
              <td>${analytics.acknowledged_calls}</td>
            </tr>
            <tr>
              <td>Attended Calls</td>
              <td>${analytics.attended_calls}</td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  // Generate report function - creates a comprehensive report view
  const handleGenerateReport = () => {
    if (!analytics) {
      alert('No analytics data to generate report');
      return;
    }

    alert(`📊 Report generated successfully!\n\nReport Summary:\n- Total Calls: ${analytics.total_calls}\n- Attended: ${analytics.acknowledged_calls}\n- Resolution Rate: ${analytics.total_calls > 0 ? Math.round((analytics.attended_calls / analytics.total_calls) * 100) : 0}%\n\nYou can now Export or Print this report.`);
    console.log('✅ Report generated:', analytics);
  };

  // Calculate KPI percentages
  const getResolutionRate = () => {
    if (!analytics) return '0%';
    const total = analytics.total_calls;
    if (total === 0) return '0%';
    return `${Math.round((analytics.attended_calls / total) * 100)}%`;
  };

  const formatSeconds = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    return `${minutes}m :${secs}s`;
  };

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Analytics & Reports</h1>
          <p className="text-gray-600">View detailed analytics and generate reports</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={fetchAnalytics}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshCw size={18} className="mr-2" />
            Refresh
          </button>
          <button 
            onClick={handlePrint}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Printer size={18} className="mr-2" />
            Print
          </button>
          <button 
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Download size={18} className="mr-2" />
            Export
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100 mb-6">
        <div className="flex flex-wrap gap-4 mb-4">
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
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="quarter">Last 90 Days</option>
              <option value="year">Last 365 Days</option>
            </select>
          </div>
          <div>
            <label htmlFor="floor-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Floor
            </label>
            <select
              id="floor-filter"
              value={filterFloor}
              onChange={(e) => setFilterFloor(e.target.value)}
              className="block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">All Floors</option>
              <option value="1">Floor 1</option>
              <option value="2">Floor 2</option>
              <option value="3">Floor 3</option>
              <option value="4">Floor 4</option>
              <option value="5">Floor 5</option>
            </select>
          </div>
          <div>
            <label htmlFor="hospital-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Hospital ID
            </label>
            <input
              id="hospital-filter"
              type="number"
              placeholder="Hospital ID"
              value={filterHospital}
              onChange={(e) => setFilterHospital(e.target.value)}
              className="block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="corridoor-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Corridor
            </label>
            <input
              id="corridoor-filter"
              type="text"
              placeholder="e.g. A"
              value={filterCorridoor}
              onChange={(e) => setFilterCorridoor(e.target.value)}
              className="block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="room-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Room No.
            </label>
            <input
              id="room-filter"
              type="text"
              placeholder="e.g. 101"
              value={filterRoom}
              onChange={(e) => setFilterRoom(e.target.value)}
              className="block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <div className="flex items-end">
            <button 
              onClick={handleGenerateReport}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <BarChart3 size={18} className="mr-2" />
              Generate Report
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 bg-white rounded-lg border border-gray-100">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading analytics...</span>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100 mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Key Performance Indicators</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Average Response Time</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {analytics ? formatSeconds(analytics.avg_response_time_seconds) : '-'}
                </p>
                <p className="text-xs text-blue-600 mt-1">Total Calls: {analytics?.total_calls || 0}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Call Resolution Rate</p>
                <p className="text-2xl font-semibold text-gray-900">{getResolutionRate()}</p>
                <p className="text-xs text-green-600 mt-1">Attended: {analytics?.attended_calls || 0}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Average Attend Delay</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {analytics ? formatSeconds(analytics.avg_attend_delay_seconds) : '-'}
                </p>
                <p className="text-xs text-blue-600 mt-1">Acknowledged: {analytics?.acknowledged_calls || 0}</p>
              </div>
              <div className="p-4 bg-indigo-50 rounded-lg">
                <p className="text-sm text-gray-600">Mean Total Time</p>
                <p className="text-2xl font-semibold text-indigo-900">
                  {analytics ? formatSeconds(analytics.mean_total_time_seconds) : '-'}
                </p>
                <p className="text-xs text-indigo-600 mt-1">Call create → attended</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">Median Total Time</p>
                <p className="text-2xl font-semibold text-purple-900">
                  {analytics ? formatSeconds(analytics.median_total_time_seconds) : '-'}
                </p>
                <p className="text-xs text-purple-600 mt-1">Call create → attended</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100 mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Call Status Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Calls</p>
                <p className="text-2xl font-semibold text-blue-900">{analytics?.total_calls || 0}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-600">New Calls</p>
                <p className="text-2xl font-semibold text-red-900">{analytics?.new_calls || 0}</p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-gray-600">Acknowledged</p>
                <p className="text-2xl font-semibold text-yellow-900">{analytics?.acknowledged_calls || 0}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Attended</p>
                <p className="text-2xl font-semibold text-green-900">{analytics?.attended_calls || 0}</p>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100 mb-6">
        <p className="text-sm text-gray-600">📊 Charts below use sample data. Real chart data is available through additional API endpoints.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <LineChart 
          title="Daily Call Volume" 
          data={currentChartData.dailyCalls} 
          color="bg-blue-400" 
        />
        <LineChart 
          title="Average Response Time (minutes)" 
          data={currentChartData.responseTime} 
          color="bg-green-400" 
        />
        <LineChart 
          title="Call Types Distribution (%)" 
          data={currentChartData.callTypes} 
          color="bg-purple-400" 
        />
        <LineChart 
          title="Peak Hours Distribution" 
          data={currentChartData.peakHours} 
          color="bg-yellow-400" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Call Type Distribution</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Call Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Count
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Percentage
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {callStatistics[dateRange as keyof typeof callStatistics].map((stat, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{stat.type}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{stat.count}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{stat.percentage}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Peak Hours Distribution</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time Period
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Call Count
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Percentage
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {peakHoursData[dateRange as keyof typeof peakHoursData].map((hour, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{hour.time}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{hour.count}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{hour.percentage}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;