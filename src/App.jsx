import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import GroupsOverview from './pages/GroupsOverview'
import GroupManagement from './pages/GroupManagement'
import GroupEdit from './pages/GroupEdit'
import GroupStudents from './pages/GroupStudents'
import AttendanceUnified from './pages/AttendanceUnified'
import StudentSessions from './pages/StudentSessions'
import Finance from './pages/Finance'
import Settings from './pages/Settings'

// Main App Routes
const AppRoutes = () => {
  const { user } = useAuth()

  return (
    <Routes>
      <Route 
        path="/login" 
        element={user ? <Navigate to="/dashboard" replace /> : <Login />} 
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/groups" element={<GroupsOverview />} />
                <Route path="/groups/new" element={<GroupManagement />} />
                <Route path="/groups/:id" element={<GroupManagement />} />
                <Route path="/groups/:id/edit" element={<GroupEdit />} />
        <Route path="/groups/:id/students" element={<GroupStudents />} />
        <Route path="/groups/:groupId/students/:studentId/sessions" element={<StudentSessions />} />
        <Route path="/attendance" element={<AttendanceUnified />} />
        <Route path="/finance" element={<Finance />} />
        <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <AppRoutes />
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
                fontFamily: 'Cairo, Tajawal, system-ui, sans-serif',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#22c55e',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App

