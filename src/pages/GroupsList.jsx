import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { db, supabase } from '../lib/supabase-unified-fixed'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  MapPin, 
  Clock, 
  Calendar,
  Eye,
  AlertTriangle
} from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'

const GroupsList = () => {
  const { user } = useAuth()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteGroupId, setDeleteGroupId] = useState(null)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [groupPaymentStatus, setGroupPaymentStatus] = useState({})

  useEffect(() => {
    if (user) {
      loadGroups()
    }
  }, [user])

  const loadGroups = async () => {
    try {
      setLoading(true)
      const groupsData = await db.getGroups(user.id)
      setGroups(groupsData || [])

      // Calculate payment status for each group
      const statusMap = {}
      if (groupsData && groupsData.length > 0) {
        for (const group of groupsData) {
          try {
            const students = await db.getStudents(group.id)
            const paidCount = students.filter(s => s.paid).length
            if (paidCount === students.length && students.length > 0) {
              statusMap[group.id] = 'paid'
            } else if (paidCount === 0) {
              statusMap[group.id] = 'unpaid'
            } else {
              statusMap[group.id] = 'partial'
            }
          } catch (error) {
            console.error(`Error calculating status for group ${group.id}:`, error)
            statusMap[group.id] = 'partial'
          }
        }
      }
      setGroupPaymentStatus(statusMap)
    } catch (error) {
      console.error('Error loading groups:', error)
      setGroups([])
      setGroupPaymentStatus({})
      // لا نعرض رسالة خطأ إذا لم تكن هناك مجموعات
      if (error.message && !error.message.includes('فشل في تحميل المجموعات')) {
        toast.error('حدث خطأ في تحميل المجموعات')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteGroup = async () => {
    if (!deletePassword) {
      toast.error('يرجى إدخال كلمة المرور')
      return
    }

    try {
      setDeleting(true)
      // Re-authenticate user
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: deletePassword
      })

      if (authError) {
        toast.error('كلمة المرور غير صحيحة')
        return
      }

      if (!deleteGroupId || isNaN(parseInt(deleteGroupId))) {
        toast.error('معرف المجموعة غير صحيح')
        return
      }
      
      await db.deleteGroup(parseInt(deleteGroupId))
      setGroups(prev => prev.filter(g => g.id !== deleteGroupId))
      toast.success('تم حذف المجموعة بنجاح')
      setShowDeleteConfirm(false)
      setDeleteGroupId(null)
      setDeletePassword('')
    } catch (error) {
      console.error('Error deleting group:', error)
      toast.error('حدث خطأ في حذف المجموعة')
    } finally {
      setDeleting(false)
    }
  }

  const getPaymentStatus = (group) => {
    // This would need to be calculated based on students
    // For now, returning a mock status
    return 'partial' // 'paid', 'partial', 'unpaid'
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'status-paid'
      case 'partial':
        return 'status-partial'
      case 'unpaid':
        return 'status-unpaid'
      default:
        return 'status-partial'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'paid':
        return 'الكل دفع'
      case 'partial':
        return 'بعضهم لم يدفع'
      case 'unpaid':
        return 'لم يدفع أحد'
      default:
        return 'غير محدد'
    }
  }

  if (loading) {
    return <LoadingSpinner size="lg" className="min-h-96" />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة المجموعات</h1>
          <p className="text-gray-600 mt-1">عرض وإدارة جميع مجموعاتك</p>
        </div>
        <Link
          to="/groups/new"
          className="btn-primary flex items-center"
        >
          <Plus className="w-4 h-4 ml-2" />
          إضافة مجموعة جديدة
        </Link>
      </div>

      {/* Groups Grid */}
      {groups.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد مجموعات</h3>
          <p className="text-gray-600 mb-6">ابدأ بإنشاء مجموعتك الأولى</p>
          <Link
            to="/groups/new"
            className="btn-primary flex items-center mx-auto w-fit"
          >
            <Plus className="w-4 h-4 ml-2" />
            إضافة مجموعة جديدة
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => {
            const status = groupPaymentStatus[group.id] || 'partial'
            return (
              <div key={group.id} className="card hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {group.name}
                    </h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 ml-2" />
                        {group.location}
                      </div>
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 ml-2" />
                        {group.day} - {group.month}
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 ml-2" />
                        {group.time}
                      </div>
                    </div>
                  </div>
                  <span className={`${getStatusColor(status)} text-xs`}>
                    {getStatusText(status)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center text-sm text-gray-500">
                    <span className="bg-gray-100 px-2 py-1 rounded-full">
                      {group.category}
                    </span>
                    <span className="mr-2 bg-gray-100 px-2 py-1 rounded-full">
                      {group.payment_frequency || 'شهري'}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Link
                      to={`/groups/${group.id}`}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="عرض التفاصيل"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                    <Link
                      to={`/groups/${group.id}`}
                      className="p-2 text-gray-400 hover:text-primary-600 transition-colors"
                      title="تعديل"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => {
                        setDeleteGroupId(group.id)
                        setShowDeleteConfirm(true)
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600 ml-2" />
              <h3 className="text-lg font-medium text-gray-900">تأكيد الحذف</h3>
            </div>
            <p className="text-gray-600 mb-4">
              هل أنت متأكد من حذف هذه المجموعة؟ هذا الإجراء لا يمكن التراجع عنه.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                كلمة المرور للتأكيد
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="input-field"
                placeholder="أدخل كلمة المرور"
              />
            </div>
            <div className="flex justify-end space-x-3 space-x-reverse">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeleteGroupId(null)
                  setDeletePassword('')
                }}
                className="btn-secondary"
                disabled={deleting}
              >
                إلغاء
              </button>
              <button
                onClick={handleDeleteGroup}
                disabled={deleting}
                className="btn-danger"
              >
                {deleting ? 'جاري الحذف...' : 'حذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GroupsList
