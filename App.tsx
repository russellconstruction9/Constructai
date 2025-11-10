import React from 'react';
import { HashRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { UserProvider, useCurrentUser } from './hooks/useCurrentUser';
import { ApiKeyProvider } from './hooks/useApiKey';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Projects from './components/Projects';
import EstimateBuilder from './components/EstimateBuilder';
import JobCosting from './components/JobCosting';
import KnowledgeBase from './components/KnowledgeBase';
import Analytics from './components/Analytics';
import UserManagement from './components/UserManagement';
import ProjectDetail from './components/ProjectDetail';

const ProtectedAdminRoute: React.FC = () => {
  const { user } = useCurrentUser();
  if (user?.role !== 'Admin') {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
};

const App: React.FC = () => {
  return (
    <ApiKeyProvider>
      <UserProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="projects" element={<Projects />} />
              <Route path="projects/:projectId" element={<ProjectDetail />} />
              <Route path="estimate-builder" element={<EstimateBuilder />} />
              <Route path="job-costing" element={<JobCosting />} />
              <Route path="knowledge-base" element={<KnowledgeBase />} />
              <Route path="analytics" element={<Analytics />} />
              <Route element={<ProtectedAdminRoute />}>
                <Route path="user-management" element={<UserManagement />} />
              </Route>
              <Route path="*" element={<Navigate to="/" />} />
            </Route>
          </Routes>
        </HashRouter>
      </UserProvider>
    </ApiKeyProvider>
  );
};

export default App;