// App.tsx (Updated with API Integration)
import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Phone,
  ClipboardList,
  Building2,
  BarChart3,
  CheckCircle,
  Bed
} from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import RealTimeMonitoring from './pages/RealTimeMonitoring';
import PatientReports from './pages/PatientReports';
import FloorPanelStatus from './pages/FloorPanelStatus';
import Analytics from './pages/Analytics';
import BedSimulation from './pages/BedSimulation';
import CentralCallMonitoring from './pages/CentralCallMonitoring';
import CustomPreloader from './components/CustomPreloader';
import WardView from './pages/WardView';
import Acknowledge from './pages/Acknowledge';
import NurseCallLanding from './components/NurseCallLanding';
import * as authService from './services/authService';
import * as hospitalService from './services/hospitalService';

const HOSPITAL_ID = Number(import.meta.env.VITE_HOSPITAL_ID) || 1;

function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [hospitalValid, setHospitalValid] = useState<boolean | null>(null);
  const [hospitalMessage, setHospitalMessage] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'realtime', label: 'Real-Time Call Monitoring', icon: <Phone size={20} /> },
    { id: 'central', label: 'Central Call Monitoring', icon: <Phone size={20} /> },
    { id: 'acknowledge', label: 'Acknowledge', icon: <CheckCircle size={20} /> },
    // { id: 'bed-simulation', label: 'Bed Call Simulation', icon: <Bed size={20} /> },
    { id: 'patients', label: 'Patient Reports', icon: <ClipboardList size={20} /> },
    { id: 'floors', label: 'Floor Panel Status', icon: <Building2 size={20} /> },
    { id: 'analytics', label: 'Analytics & Reports', icon: <BarChart3 size={20} /> },
  ];

  // Initialize app: Check stored token and restore user session
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check if user has stored authentication token
        if (authService.isAuthenticated()) {
          // Token exists, restore user as logged in
          const storedProfile = authService.getStoredProfile();
          console.log('✅ Session restored:', storedProfile?.username);
          setIsLoggedIn(true);
        } else {
          console.log('ℹ️ No stored token found - user needs to login');
          setIsLoggedIn(false);
        }
      } catch (error) {
        console.error('Error during app initialization:', error);
        setIsLoggedIn(false);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeApp();
  }, []);

  // Check hospital validity on app load
  useEffect(() => {
    hospitalService.checkValidity(HOSPITAL_ID)
      .then(data => {
        if (data.status === 'valid') {
          setHospitalValid(true);
        } else {
          setHospitalValid(false);
          setHospitalMessage(data.message || `Hospital subscription is ${data.status}`);
        }
      })
      .catch(() => {
        // If API is unreachable, allow access (intranet mode / demo)
        setHospitalValid(true);
      });
  }, []);

  const handleFloorSelect = (floorNumber: number) => {
    setSelectedFloor(floorNumber);
  };

  const handleCloseWardView = () => {
    setSelectedFloor(null);
  };

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    console.log('✅ Login successful - user profile:', authService.getStoredProfile()?.username);
  };

  const handleLogout = () => {
    authService.logout();
    setIsLoggedIn(false);
    console.log('✅ Logout successful');
  };

  // Handle admin route
  useEffect(() => {
    const handleRouteChange = () => {
      if (window.location.pathname === '/admin') {
        setActivePage('realtime');
      }
    };

    handleRouteChange();
    window.addEventListener('popstate', handleRouteChange);

    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  const renderPage = () => {
    if (selectedFloor !== null) {
      return <WardView floorNumber={selectedFloor} onClose={handleCloseWardView} />;
    }

    switch (activePage) {
      case 'dashboard':
        return <Dashboard />;
      case 'realtime':
        return <RealTimeMonitoring />;
      case 'central':
        return <CentralCallMonitoring />;
      case 'acknowledge':
        return <Acknowledge />;
      // case 'bed-simulation':
      //   return <BedSimulation />;
      case 'patients':
        return <PatientReports />;
      case 'floors':
        return <FloorPanelStatus onFloorSelect={handleFloorSelect} />;
      case 'analytics':
        return <Analytics />;
      default:
        return <Dashboard />;
    }
  };

  const handleLoadingComplete = () => {
    setIsLoading(false);
  };

  // Show loading screen first (during initial app load)
  if (isLoading || isInitializing) {
    return (
      <CustomPreloader
        onLoadingComplete={handleLoadingComplete}
        logoUrl="/logo system tek.png"
      />
    );
  }

  // Show hospital expired/inactive screen
  if (hospitalValid === false) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Subscription Expired</h2>
          <p className="text-gray-600 mb-4">{hospitalMessage}</p>
          <p className="text-sm text-gray-500">Please contact your hospital administrator to renew the subscription.</p>
          <button
            onClick={() => { setHospitalValid(true); }}
            className="mt-4 px-4 py-2 text-sm text-blue-600 hover:underline"
          >
            Continue in demo mode →
          </button>
        </div>
      </div>
    );
  }

  // Show landing screen if not logged in
  if (!isLoggedIn) {
    return <NurseCallLanding onLoginSuccess={handleLoginSuccess} />;
  }

  // Show main application after login
  return (
    <div className="flex h-screen bg-gray-50">
      {selectedFloor === null && (
        <Sidebar
          navItems={navItems}
          activePage={activePage}
          setActivePage={setActivePage}
          onLogout={handleLogout}
        />
      )}
      <div className="flex-1 overflow-auto">
        <div className={selectedFloor !== null ? '' : 'p-6'}>
          {renderPage()}
        </div>
      </div>
    </div>
  );
}

export default App;