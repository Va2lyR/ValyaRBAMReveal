import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { 
  Lock, 
  Bell, 
  Download, 
  LogOut, 
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

const Settings = () => {
  const { user, updatePassword, signOut } = useAuth()
  const [loading, setLoading] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })
  const [settings, setSettings] = useState({
    notifications: true,
    autoBackup: true,
    reminderTime: '30' // minutes before class
  })

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('كلمة المرور الجديدة غير متطابقة')
      return
    }
    
    if (passwordForm.newPassword.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      return
    }

    try {
      setLoading(true)
      await updatePassword(passwordForm.newPassword)
      toast.success('تم تغيير كلمة المرور بنجاح')
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    } catch (error) {
      toast.error('حدث خطأ في تغيير كلمة المرور')
      console.error('Error updating password:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSettingsChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    // Save to localStorage
    localStorage.setItem('appSettings', JSON.stringify({ ...settings, [key]: value }))
    toast.success('تم حفظ الإعدادات')
  }

  const handleBackup = async () => {
    try {
      // Create backup data
      const backupData = {
        timestamp: new Date().toISOString(),
        user: user.email,
        settings: settings,
        version: '1.0.0'
      }
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `backup-${new Date().toISOString().split('T')[0]}.json`
      link.click()
      
      toast.success('تم إنشاء النسخة الاحتياطية بنجاح')
    } catch (error) {
      toast.error('حدث خطأ في إنشاء النسخة الاحتياطية')
      console.error('Error creating backup:', error)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success('تم تسجيل الخروج بنجاح')
    } catch (error) {
      toast.error('حدث خطأ في تسجيل الخروج')
    }
  }

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">الإعدادات</h1>
        <p className="text-gray-600 mt-1">إدارة إعدادات حسابك والتطبيق</p>
      </div>

      {/* Account Information */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">معلومات الحساب</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="input-field bg-gray-50"
            />
            <p className="text-sm text-gray-500 mt-1">
              لا يمكن تغيير البريد الإلكتروني
            </p>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">تغيير كلمة المرور</h2>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              كلمة المرور الحالية
            </label>
            <div className="relative">
              <input
                type={showPasswords.current ? 'text' : 'password'}
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                className="input-field pr-10"
                placeholder="أدخل كلمة المرور الحالية"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('current')}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              كلمة المرور الجديدة
            </label>
            <div className="relative">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                className="input-field pr-10"
                placeholder="أدخل كلمة المرور الجديدة"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('new')}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              تأكيد كلمة المرور الجديدة
            </label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="input-field pr-10"
                placeholder="أعد إدخال كلمة المرور الجديدة"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('confirm')}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !passwordForm.newPassword || !passwordForm.confirmPassword}
            className="btn-primary flex items-center"
          >
            <Save className="w-4 h-4 ml-2" />
            {loading ? 'جاري الحفظ...' : 'حفظ كلمة المرور'}
          </button>
        </form>
      </div>

      {/* App Settings */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">إعدادات التطبيق</h2>
        <div className="space-y-6">
          {/* Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Bell className="w-5 h-5 text-gray-400 ml-3" />
              <div>
                <h3 className="text-sm font-medium text-gray-900">تذكيرات المواعيد</h3>
                <p className="text-sm text-gray-500">تلقي تنبيهات قبل مواعيد المجموعات</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications}
                onChange={(e) => handleSettingsChange('notifications', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          {/* Reminder Time */}
          {settings.notifications && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                وقت التذكير (بالدقائق)
              </label>
              <select
                value={settings.reminderTime}
                onChange={(e) => handleSettingsChange('reminderTime', e.target.value)}
                className="input-field"
              >
                <option value="15">15 دقيقة</option>
                <option value="30">30 دقيقة</option>
                <option value="60">ساعة واحدة</option>
                <option value="120">ساعتين</option>
              </select>
            </div>
          )}

          {/* Auto Backup */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Download className="w-5 h-5 text-gray-400 ml-3" />
              <div>
                <h3 className="text-sm font-medium text-gray-900">النسخ الاحتياطي التلقائي</h3>
                <p className="text-sm text-gray-500">إنشاء نسخة احتياطية أسبوعياً</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoBackup}
                onChange={(e) => handleSettingsChange('autoBackup', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Backup & Export */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">النسخ الاحتياطي والتصدير</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <Download className="w-5 h-5 text-gray-400 ml-3" />
              <div>
                <h3 className="text-sm font-medium text-gray-900">إنشاء نسخة احتياطية</h3>
                <p className="text-sm text-gray-500">تصدير جميع بياناتك إلى ملف</p>
              </div>
            </div>
            <button
              onClick={handleBackup}
              className="btn-secondary flex items-center"
            >
              <Download className="w-4 h-4 ml-2" />
              إنشاء نسخة احتياطية
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card border-danger-200">
        <h2 className="text-lg font-semibold text-danger-600 mb-4">منطقة الخطر</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-danger-50 rounded-lg">
            <div className="flex items-center">
              <LogOut className="w-5 h-5 text-danger-400 ml-3" />
              <div>
                <h3 className="text-sm font-medium text-danger-900">تسجيل الخروج</h3>
                <p className="text-sm text-danger-600">تسجيل الخروج من جميع الأجهزة</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="btn-danger flex items-center"
            >
              <LogOut className="w-4 h-4 ml-2" />
              تسجيل الخروج
            </button>
          </div>
        </div>
      </div>

      {/* App Info */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">معلومات التطبيق</h2>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>الإصدار:</span>
            <span>1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span>تاريخ الإنشاء:</span>
            <span>2024</span>
          </div>
          <div className="flex justify-between">
            <span>المطور:</span>
            <span>TaHa M</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings

