import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Snackbar, Alert } from '@mui/material';
import { useAppSelector, useAppDispatch } from './store/hooks';
import { hideNotification } from './store/uiSlice';
import Layout from './components/common/Layout';
import AuthGuard from './components/common/AuthGuard';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Campaigns from './pages/Campaigns';
import Customers from './pages/Customers';
import DefaultParameters from './pages/DefaultParameters';
import CustomerSegments from './pages/CustomerSegments';
import CampaignCustomerSegmentScores from './pages/CampaignCustomerSegmentScores';
import Results from './pages/Results';
import OptimizationScenarios from './pages/OptimizationScenarios';
import ScenarioCampaignResults from './pages/ScenarioCampaignResults';


/**
 * Main Application Component
 * Section 7 - Frontend Architecture
 * Section 7.6 - Navigation Flow: Login → Campaign List
 */
const App: React.FC = () => {
  const dispatch = useAppDispatch();
  const { notification } = useAppSelector((state) => state.ui);

  const handleCloseNotification = () => {
    dispatch(hideNotification());
  }; 
  return (
    <>
      <Routes>
        {/* Public route - Login */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <AuthGuard>
              <Layout>
                <Navigate to="/dashboard" replace />
              </Layout>
            </AuthGuard>
          }
        />

        <Route
          path="/dashboard"
          element={
            <AuthGuard>
              <Layout>
                <Dashboard />
              </Layout>
            </AuthGuard>
          }
        />

        <Route
          path="/campaigns"
          element={
            <AuthGuard>
              <Layout>
                <Campaigns />
              </Layout>
            </AuthGuard>
          }
        />

        <Route
          path="/customers"
          element={
            <AuthGuard allowedRoles={['ADMIN', 'USER']}>
              <Layout>
                <Customers />
              </Layout>
            </AuthGuard>
          }
        />

        <Route
          path="/customer-segments"
          element={
            <AuthGuard allowedRoles={['ADMIN']}>
              <Layout>
                <CustomerSegments />
              </Layout>
            </AuthGuard>
          }
        />

        <Route
          path="/campaign-segment-scores"
          element={
            <AuthGuard allowedRoles={['ADMIN']}>
              <Layout>
                <CampaignCustomerSegmentScores />
              </Layout>
            </AuthGuard>
          }
        />

        <Route
          path="/default-parameters"
          element={
            <AuthGuard allowedRoles={['ADMIN', 'USER']}>
              <Layout>
                <DefaultParameters />
              </Layout>
            </AuthGuard>
          }
        />

        <Route
          path="/results"
          element={
            <AuthGuard allowedRoles={['ADMIN']}>
              <Layout>
                <Results />
              </Layout>
            </AuthGuard>
          }
        />

        <Route
          path="/optimization-scenarios"
          element={
            <AuthGuard allowedRoles={['ADMIN', 'USER']}>
              <Layout>
                <OptimizationScenarios />
              </Layout>
            </AuthGuard>
          }
        />

        <Route
          path="/optimization-scenarios/:scenarioId/campaign-results"
          element={
            <AuthGuard allowedRoles={['ADMIN', 'USER']}>
              <Layout>
                <ScenarioCampaignResults />
              </Layout>
            </AuthGuard>
          }
        />

        {/* Unauthorized page */}
        <Route
          path="/unauthorized"
          element={
            <div style={{ padding: 20, textAlign: 'center' }}>
              <h1>Unauthorized</h1>
              <p>You don't have permission to access this page.</p>
            </div>
          }
        />

        {/* Catch all - redirect to dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>

      {/* Global Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default App;
