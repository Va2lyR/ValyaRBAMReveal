import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  LayoutDashboard, 
  Users, 
  DollarSign, 
  Settings, 
  LogOut,
  Menu,
  X,
  BookOpen,
  Calendar,
  UserCheck,
  Plus
} from 'lucide-react'
import toast from 'react-hot-toast'

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const navigation = [
    { name: 'لوحة التحكم', href: '/dashboard', icon: LayoutDashboard },
    { name: 'المجموعات', href: '/groups', icon: Users },
    { name: 'الحضور', href: '/attendance', icon: UserCheck },
    { name: 'الحسابات', href: '/finance', icon: DollarSign },
    { name: 'الإعدادات', href: '/settings', icon: Settings },
  ]

  const mobileNavigation = [
    { name: 'الرئيسية', href: '/dashboard', icon: LayoutDashboard },
    { name: 'المجموعات', href: '/groups', icon: Users },
    { name: 'الحضور', href: '/attendance', icon: UserCheck },
    { name: 'الحسابات', href: '/finance', icon: DollarSign },
    { name: 'الإعدادات', href: '/settings', icon: Settings },
  ]

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success('تم تسجيل الخروج بنجاح')
      navigate('/login')
    } catch (error) {
      toast.error('حدث خطأ في تسجيل الخروج')
    }
  }

  const isActive = (path) => location.pathname === path

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 right-0 w-64 bg-white shadow-xl">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center">
              <BookOpen className="w-8 h-8 text-gray-900" />
              <span className="mr-2 text-lg font-semibold text-gray-900">Amr Mohamed</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <nav className="mt-4">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`nav-link ${
                    isActive(item.href)
                      ? 'nav-link-active'
                      : 'nav-link-inactive'
                  }`}
                >
                  <Icon className="w-5 h-5 ml-3" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
          <div className="absolute bottom-0 w-full p-4 border-t">
            <button
              onClick={handleSignOut}
              className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <LogOut className="w-5 h-5 ml-3" />
              تسجيل الخروج
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-l border-gray-200">
          <div className="flex items-center p-4 border-b">
            <BookOpen className="w-8 h-8 text-gray-900" />
            <span className="mr-2 text-lg font-semibold text-gray-900">Amr Mohamed</span>
          </div>
          <nav className="flex-1 mt-4">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`nav-link ${
                    isActive(item.href)
                      ? 'nav-link-active'
                      : 'nav-link-inactive'
                  }`}
                >
                  <Icon className="w-5 h-5 ml-3" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
          <div className="p-4 border-t">
            <button
              onClick={handleSignOut}
              className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <LogOut className="w-5 h-5 ml-3" />
              تسجيل الخروج
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pr-64">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center">
              <span className="text-sm text-gray-600">
                مرحباً، {user?.email}
              </span>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-4 lg:p-6 min-h-screen pb-20 lg:pb-6">
          {children}
        </main>
        
        {/* Mobile Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 lg:hidden z-40">
          <div className="flex items-center justify-around py-2">
            {mobileNavigation.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
                    active
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-gray-600'}`} />
                  <span className={`text-xs mt-1 font-medium ${active ? 'text-blue-600' : 'text-gray-600'}`}>
                    {item.name}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
        
        {/* Footer - Desktop only */}
        <footer className="hidden lg:block bg-white border-t border-gray-200 py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center text-sm text-gray-400">
              <p>© Mr Amr Mohamed.</p>
              <p className="mt-1 text-xs">Made by TaHa M</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default Layout