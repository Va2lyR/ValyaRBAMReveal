import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../lib/supabase-unified-fixed'
import { 
  Save, 
  ArrowRight, 
  AlertTriangle
} from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'

const GroupEdit = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [group, setGroup] = useState({
    name: '',
    category: 'برايف',
    location: '',
    day: '',
    time: '',
    month: '',
    payment_frequency: 'شهري'
  })

  const months = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ]

  const timeSlots = [
    '8:00 صباحاً', '8:30 صباحاً', '9:00 صباحاً', '9:30 صباحاً',
    '10:00 صباحاً', '10:30 صباحاً', '11:00 صباحاً', '11:30 صباحاً',
    '12:00 ظهراً', '12:30 ظهراً', '1:00 ظهراً', '1:30 ظهراً',
    '2:00 ظهراً', '2:30 ظهراً', '3:00 عصراً', '3:30 عصراً',
    '4:00 عصراً', '4:30 عصراً', '5:00 عصراً', '5:30 عصراً',
    '6:00 مساءً', '6:30 مساءً', '7:00 مساءً', '7:30 مساءً',
    '8:00 مساءً', '8:30 مساءً', '9:00 مساءً', '9:30 مساءً',
    '10:00 مساءً'
  ]

  const paymentFrequencies = [
    'حصه', 'أسبوعي', 'شهري', 'فصلي', 'سنوي'
  ]

  useEffect(() => {
    if (user && id) {
      loadGroup()
    }
  }, [user, id])

  const loadGroup = async () => {
    try {
      setLoading(true)
      
      // التحقق من وجود ID صحيح
      if (!id || isNaN(parseInt(id))) {
        toast.error('معرف المجموعة غير صحيح')
        navigate('/groups')
        return
      }

      const groupData = await db.getGroupById(parseInt(id), user.id)
      setGroup(groupData)
    } catch (error) {
      console.error('Error loading group:', error)
      if (error.message.includes('المجموعة غير موجودة')) {
        toast.error('المجموعة غير موجودة أو لا تملك صلاحية للوصول إليها')
        navigate('/groups')
      } else {
        toast.error('حدث خطأ في تحميل البيانات')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGroupChange = (field, value) => {
    setGroup(prev => ({ ...prev, [field]: value }))
  }

  const handleSaveGroup = async () => {
    // التحقق من صحة البيانات
    if (!group.name.trim()) {
      toast.error('يرجى إدخال اسم المجموعة')
      return
    }
    if (!group.location.trim()) {
      toast.error('يرجى إدخال مكان المجموعة')
      return
    }
    if (!group.day) {
      toast.error('يرجى اختيار يوم المجموعة')
      return
    }
    if (!group.time) {
      toast.error('يرجى اختيار وقت المجموعة')
      return
    }
    if (!group.month) {
      toast.error('يرجى اختيار شهر المجموعة')
      return
    }

    try {
      setSaving(true)
      
      if (!id || isNaN(parseInt(id))) {
        toast.error('معرف المجموعة غير صحيح')
        return
      }
      
      await db.updateGroup(parseInt(id), group)
      toast.success('تم حفظ التغييرات بنجاح')
      navigate('/groups')
    } catch (error) {
      console.error('Error saving group:', error)
      if (error.message) {
        toast.error(`خطأ: ${error.message}`)
      } else {
        toast.error('حدث خطأ في حفظ البيانات. تأكد من الاتصال بالإنترنت')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <LoadingSpinner size="lg" className="min-h-96" />
  }

  if (!group) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">المجموعة غير موجودة</h3>
        <p className="text-gray-600 mb-6">المجموعة التي تحاول تعديلها غير موجودة</p>
        <button onClick={() => navigate('/groups')} className="btn-primary">
          العودة للمجموعات
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/groups')}
            className="text-gray-500 hover:text-gray-700 mr-4"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">تعديل المجموعة</h1>
            <p className="text-gray-600 mt-1">تعديل بيانات المجموعة</p>
          </div>
        </div>
        <button
          onClick={handleSaveGroup}
          disabled={saving}
          className="btn-primary flex items-center"
        >
          <Save className="w-4 h-4 ml-2" />
          {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </button>
      </div>

      {/* Group Form */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">بيانات المجموعة</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              اسم المجموعة
            </label>
            <input
              type="text"
              value={group.name}
              onChange={(e) => handleGroupChange('name', e.target.value)}
              className="input-field"
              placeholder="أدخل اسم المجموعة"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              نوع المجموعة
            </label>
            <select
              value={group.category}
              onChange={(e) => handleGroupChange('category', e.target.value)}
              className="input-field"
            >
              <option value="برايف">برايف</option>
              <option value="سناتر">سناتر</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              المكان
            </label>
            <input
              type="text"
              value={group.location}
              onChange={(e) => handleGroupChange('location', e.target.value)}
              className="input-field"
              placeholder="أدخل مكان المجموعة"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              اليوم
            </label>
            <select
              value={group.day}
              onChange={(e) => handleGroupChange('day', e.target.value)}
              className="input-field"
            >
              <option value="">اختر اليوم</option>
              <option value="السبت">السبت</option>
              <option value="الأحد">الأحد</option>
              <option value="الاثنين">الاثنين</option>
              <option value="الثلاثاء">الثلاثاء</option>
              <option value="الأربعاء">الأربعاء</option>
              <option value="الخميس">الخميس</option>
              <option value="الجمعة">الجمعة</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الوقت
            </label>
            <select
              value={group.time}
              onChange={(e) => handleGroupChange('time', e.target.value)}
              className="input-field"
            >
              <option value="">اختر الوقت</option>
              {timeSlots.map((time) => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الشهر
            </label>
            <select
              value={group.month}
              onChange={(e) => handleGroupChange('month', e.target.value)}
              className="input-field"
            >
              <option value="">اختر الشهر</option>
              {months.map((month) => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              تكرار الدفع
            </label>
            <select
              value={group.payment_frequency}
              onChange={(e) => handleGroupChange('payment_frequency', e.target.value)}
              className="input-field"
            >
              {paymentFrequencies.map((frequency) => (
                <option key={frequency} value={frequency}>{frequency}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GroupEdit
