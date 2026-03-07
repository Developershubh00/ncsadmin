import React, { useState } from 'react';
import { Key, AlertCircle, CreditCard, CheckCircle2 } from 'lucide-react';

const LicensePage: React.FC = () => {
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [renewalPeriod, setRenewalPeriod] = useState('1-year');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [licenseData, setLicenseData] = useState({
    status: 'Active',
    expiryDate: '2025-04-30',
    licenseKey: 'NCS-2024-XXXX-XXXX-XXXX',
    maxUsers: 100,
    maxWards: 20
  });

  const renewalOptions = {
    '1-year': { price: 999, period: '1 Year', days: 365 },
    '2-year': { price: 1799, period: '2 Years', days: 730 },
    '3-year': { price: 2499, period: '3 Years', days: 1095 }
  };

  const today = new Date();
  const expiry = new Date(licenseData.expiryDate);
  const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const getLicenseStatusColor = () => {
    return 'bg-green-100 text-green-800';
  };

  const handleRenewalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);
      setPaymentSuccess(true);

      // Update license expiry date based on selected renewal period
      const currentExpiry = new Date(licenseData.expiryDate);
      const daysToAdd = renewalOptions[renewalPeriod].days;
      const newExpiry = new Date(currentExpiry.setDate(currentExpiry.getDate() + daysToAdd));
      
      setLicenseData(prev => ({
        ...prev,
        expiryDate: newExpiry.toISOString().split('T')[0]
      }));

      setTimeout(() => {
        setShowRenewalModal(false);
        setPaymentSuccess(false);
      }, 2000);
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">License Management</h1>
          <p className="text-gray-600">View and manage your Nurse Call System license</p>
        </div>
        <button
          onClick={() => setShowRenewalModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Renew License
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Key className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-800">License Status</h2>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getLicenseStatusColor()}`}>
            {licenseData.status}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">License Key</p>
              <p className="text-lg font-mono font-medium">{licenseData.licenseKey}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Expiry Date</p>
              <p className="text-lg font-medium">{new Date(licenseData.expiryDate).toLocaleDateString()}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Days Remaining</p>
              <p className="text-lg font-medium">{daysUntilExpiry} days</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Maximum Users</p>
              <p className="text-lg font-medium">{licenseData.maxUsers}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Maximum Wards</p>
              <p className="text-lg font-medium">{licenseData.maxWards}</p>
            </div>
          </div>
        </div>
      </div>

      {daysUntilExpiry <= 30 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">License Expiring Soon</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Your license will expire in {daysUntilExpiry} days. Please renew your license to ensure uninterrupted service.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* License Renewal Modal */}
      {showRenewalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            {paymentSuccess ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Payment Successful!</h3>
                <p className="text-gray-600">Your license has been renewed successfully.</p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-gray-800">Renew License</h3>
                  <button
                    onClick={() => setShowRenewalModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleRenewalSubmit}>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Renewal Period
                    </label>
                    <div className="space-y-2">
                      {Object.entries(renewalOptions).map(([key, { price, period }]) => (
                        <label
                          key={key}
                          className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${
                            renewalPeriod === key
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-blue-200'
                          }`}
                        >
                          <div className="flex items-center">
                            <input
                              type="radio"
                              name="renewalPeriod"
                              value={key}
                              checked={renewalPeriod === key}
                              onChange={(e) => setRenewalPeriod(e.target.value)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-3">{period}</span>
                          </div>
                          <span className="font-semibold">${price}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Card Information
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Card number"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                      <CreditCard className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <input
                        type="text"
                        placeholder="MM/YY"
                        className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="CVC"
                        className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className={`w-full py-2 px-4 rounded-md text-white font-medium ${
                      isProcessing
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {isProcessing ? 'Processing...' : `Pay $${renewalOptions[renewalPeriod].price}`}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LicensePage;