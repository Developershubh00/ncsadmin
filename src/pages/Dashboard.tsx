import React, { useState, useEffect } from 'react';
import { Phone, Clock, CheckCircle, AlertCircle, ChevronRight, RefreshCw } from 'lucide-react';
import StatCard from '../components/StatCard';
import LineChart from '../components/LineChart';
import * as callService from '../services/callService';
import type { CallRecord } from '../types/types';

const Dashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState('week');
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiConnected, setApiConnected] = useState(false);

  // Fetch calls from API
  const fetchCalls = async () => {
    try {
      const data = await callService.listCallEvents();
      setCalls(data);
      setApiConnected(true);
    } catch {
      setApiConnected(false);
      // Fallback to demo data
      setCalls([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
    const interval = setInterval(fetchCalls, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  // Compute real stats from API data
  const computeStats = () => {
    const activeCalls = calls.filter(c => !c.acknowledged_at && !c.attended_at).length;
    const acknowledgedCalls = calls.filter(c => c.acknowledged_at && !c.attended_at).length;
    const attendedCalls = calls.filter(c => c.attended_at).length;
    const emergencyAlerts = calls.filter(c => !c.acknowledged_at && c.created_at).length;

    return [
      { title: 'Active Calls', value: activeCalls, icon: <Phone size={20} className="text-white" />, color: 'bg-blue-500', change: '-', isPositive: false },
      { title: 'Acknowledged', value: acknowledgedCalls, icon: <Clock size={20} className="text-white" />, color: 'bg-yellow-500', change: '-', isPositive: true },
      { title: 'Attended', value: attendedCalls, icon: <CheckCircle size={20} className="text-white" />, color: 'bg-green-500', change: '-', isPositive: true },
      { title: 'Total Calls', value: calls.length, icon: <AlertCircle size={20} className="text-white" />, color: 'bg-red-500', change: '-', isPositive: false },
    ];
  };

  // Compute recent alerts from real data
  const getRecentAlerts = () => {
    return calls
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map(call => ({
        id: String(call.id),
        bedCode: `Room ${call.room_no}`,
        wardNo: call.room_no,
        time: new Date(call.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        status: call.attended_at ? 'attended' : call.acknowledged_at ? 'acknowledged' : 'unacknowledged',
      }));
  };

  // Compute response time data
  const getResponseTimeData = () => {
    // Calculate response time from timestamps (new API doesn't provide response_time_seconds)
    const callsWithResponseTime = calls
      .filter(c => c.acknowledged_at && c.created_at)
      .map(c => ({
        ...c,
        calculatedResponseTime: (new Date(c.acknowledged_at!).getTime() - new Date(c.created_at).getTime()) / 1000, // in seconds
      }));

    if (callsWithResponseTime.length === 0) {
      return { labels: ['No Data'], values: [0] };
    }

    // Group by day
    const grouped: Record<string, number[]> = {};
    callsWithResponseTime.forEach(c => {
      const day = new Date(c.created_at).toLocaleDateString('en-US', { weekday: 'short' });
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(c.calculatedResponseTime / 60); // Convert to minutes
    });

    const labels = Object.keys(grouped);
    const values = labels.map(day => {
      const times = grouped[day];
      return Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 10) / 10;
    });

    return { labels, values };
  };

  // Fallback demo data when API not connected - COMMENTED OUT FOR PRODUCTION
  /*
  const demoStats = [
    { title: 'Active Calls', value: 12, icon: <Phone size={20} className="text-white" />, color: 'bg-blue-500', change: '8%', isPositive: false },
    { title: 'Acknowledged', value: 5, icon: <Clock size={20} className="text-white" />, color: 'bg-yellow-500', change: '12%', isPositive: true },
    { title: 'Attended', value: 28, icon: <CheckCircle size={20} className="text-white" />, color: 'bg-green-500', change: '10%', isPositive: true },
    { title: 'Total Calls', value: 45, icon: <AlertCircle size={20} className="text-white" />, color: 'bg-red-500', change: '5%', isPositive: false },
  ];

  const demoAlerts = [
    { id: '1', bedCode: 'Bed A01 CC', wardNo: '101', time: '10:15 AM', status: 'unacknowledged' },
    { id: '2', bedCode: 'Bed C01 CC', wardNo: '203', time: '10:20 AM', status: 'acknowledged' },
    { id: '3', bedCode: 'Bed B01 CC', wardNo: '302', time: '10:30 AM', status: 'attended' },
    { id: '4', bedCode: 'Bed E01 CC', wardNo: '505', time: '10:45 AM', status: 'unacknowledged' },
  ];

  const demoResponseTime = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    values: [3.2, 2.8, 4.1, 3.5, 2.9, 2.5, 3.0],
  };

  const demoCallVolume = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    values: [42, 38, 55, 48, 52, 40, 45],
  };
  */

  const stats = apiConnected ? computeStats() : computeStats(); // Always use computed stats from API or empty
  const recentAlerts = apiConnected ? getRecentAlerts() : getRecentAlerts(); // Always use API data
  const responseTimeData = apiConnected ? getResponseTimeData() : getResponseTimeData(); // Always use API data

  const handleDateRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDateRange(e.target.value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'unacknowledged': return 'bg-red-100 text-red-800';
      case 'acknowledged': return 'bg-yellow-100 text-yellow-800';
      case 'attended': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'unacknowledged': return <AlertCircle size={16} className="text-red-600" />;
      case 'acknowledged': return <Clock size={16} className="text-yellow-600" />;
      case 'attended': return <CheckCircle size={16} className="text-green-600" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-600">
            Overview of the Nurse Call System
            {!apiConnected && <span className="ml-2 text-xs text-yellow-600">(Demo Mode)</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchCalls} className="p-2 hover:bg-gray-100 rounded-lg" title="Refresh">
            <RefreshCw size={18} className="text-gray-600" />
          </button>
          <div>
            <select
              id="dashboard-date-range"
              value={dateRange}
              onChange={handleDateRangeChange}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="quarter">Last 90 Days</option>
              <option value="year">Last 365 Days</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, index) => (
          <StatCard
            key={index}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
            change={stat.change}
            isPositive={stat.isPositive}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <LineChart title="Average Response Time (minutes)" data={responseTimeData} color="bg-blue-400" />
        <LineChart title="Call Volume by Period" data={apiConnected ? { labels: ['Today'], values: [calls.length] } : demoCallVolume} color="bg-purple-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Call Volume Summary</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium">Total Calls</span>
              <span className="text-lg font-semibold">{apiConnected ? calls.length : 45}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium">Unacknowledged</span>
              <span className="text-lg font-semibold text-red-600">
                {apiConnected ? calls.filter(c => !c.acknowledged_at).length : 12}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium">Avg Response Time</span>
              <span className="text-lg font-semibold">
                {apiConnected
                  ? (() => {
                    const withResponse = calls.filter(c => c.acknowledged_at && c.created_at);
                    if (withResponse.length === 0) return 'N/A';
                    const avgSeconds = withResponse.reduce((a, c) => a + (new Date(c.acknowledged_at!).getTime() - new Date(c.created_at).getTime()) / 1000, 0) / withResponse.length;
                    const minutes = avgSeconds / 60;
                    return `${Math.round(minutes * 10) / 10} min`;
                  })()
                  : '3.2 min'
                }
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Response Time Analysis</h3>
          <div className="space-y-4">
            {apiConnected && calls.filter(c => c.acknowledged_at && c.created_at).length > 0 ? (
              <>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Fastest Response</span>
                  <span className="text-lg font-semibold">
                    {(() => {
                      const withResponse = calls.filter(c => c.acknowledged_at && c.created_at);
                      const responseTimes = withResponse.map(c => (new Date(c.acknowledged_at!).getTime() - new Date(c.created_at).getTime()) / 1000 / 60);
                      const minTime = Math.min(...responseTimes);
                      return `${Math.round(minTime * 10) / 10} min`;
                    })()}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Slowest Response</span>
                  <span className="text-lg font-semibold">
                    {(() => {
                      const withResponse = calls.filter(c => c.acknowledged_at && c.created_at);
                      const responseTimes = withResponse.map(c => (new Date(c.acknowledged_at!).getTime() - new Date(c.created_at).getTime()) / 1000 / 60);
                      const maxTime = Math.max(...responseTimes);
                      return `${Math.round(maxTime * 10) / 10} min`;
                    })()}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Fastest Response</span>
                  <span className="text-lg font-semibold">0.8 min</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Slowest Response</span>
                  <span className="text-lg font-semibold">8.5 min</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-800">Recent Alerts</h3>
          <button className="text-blue-600 text-sm font-medium flex items-center">
            View All <ChevronRight size={16} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ward No.</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentAlerts.map((alert) => (
                <tr key={alert.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{alert.bedCode}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{alert.wardNo}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{alert.time}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(alert.status)}`}>
                      <span className="flex items-center">
                        {getStatusIcon(alert.status)}
                        <span className="ml-1">{alert.status}</span>
                      </span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;