import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
  AlertTriangle,
  Search,
  Filter
} from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'

const GroupsOverview = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [groups, setGroups] = useState([])
  const [filteredGroups, setFilteredGroups] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState(null)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (user) {
      loadGroups()
    }
  }, [user])

  useEffect(() => {
    filterGroups()
  }, [groups, searchTerm, categoryFilter])

  const loadGroups = async () => {
    try {
      setLoading(true)
      const groupsData = await db.getGroups(user.id)
      setGroups(groupsData || [])
    } catch (error) {
      console.error('Error loading groups:', error)
      setGroups([])
      toast.error('حدث خطأ في تحميل المجموعات')
    } finally {
      setLoading(false)
    }
  }

  const filterGroups = () => {
    let filtered = groups

    // فلترة حسب النص
    if (searchTerm) {
      filtered = filtered.filter(group =>
        group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.location.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // فلترة حسب الفئة
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(group => group.category === categoryFilter)
    }

    setFilteredGroups(filtered)
  }

  const handleDeleteGroup = async () => {
    if (!deletePassword) {
      toast.error('يرجى إدخال كلمة المرور')
      return
    }
    if (!groupToDelete) return

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

      await db.deleteGroup(groupToDelete.id)
      toast.success('تم حذف المجموعة بنجاح')
      loadGroups() // Reload groups
      setShowDeleteConfirm(false)
      setGroupToDelete(null)
      setDeletePassword('')
    } catch (error) {
      console.error('Error deleting group:', error)
      toast.error('حدث خطأ في حذف المجموعة')
    } finally {
      setDeleting(false)
    }
  }

  const openDeleteConfirm = (group) => {
    setGroupToDelete(group)
    setShowDeleteConfirm(true)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'partial':
        return 'bg-yellow-100 text-yellow-800'
      case 'unpaid':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة المجموعات</h1>
          <p className="text-gray-600 mt-1">عرض وإدارة جميع مجموعاتك</p>
        </div>
        <Link
          to="/groups/new"
          className="btn-primary flex items-center w-fit"
        >
          <Plus className="w-4 h-4 ml-2" />
          إضافة مجموعة جديدة
        </Link>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="البحث في المجموعات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pr-10"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input-field"
            >
              <option value="all">جميع الفئات</option>
              <option value="سناتر">سناتر</option>
              <option value="برايف">برايف</option>
            </select>
          </div>
        </div>
      </div>

      {/* Groups Grid */}
      {filteredGroups.length === 0 ? (
        <div className="card text-center py-12">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {groups.length === 0 ? 'لا توجد مجموعات' : 'لا توجد نتائج'}
          </h3>
          <p className="text-gray-600 mb-6">
            {groups.length === 0 
              ? 'ابدأ بإنشاء مجموعتك الأولى' 
              : 'جرب تغيير معايير البحث'
            }
          </p>
          {groups.length === 0 && (
            <Link
              to="/groups/new"
              className="btn-primary flex items-center mx-auto w-fit"
            >
              <Plus className="w-4 h-4 ml-2" />
              إضافة مجموعة جديدة
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map((group) => (
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
                <span className={`${getStatusColor(group.payment_status)} text-xs px-2 py-1 rounded-full`}>
                  {getStatusText(group.payment_status)}
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
                    to={`/groups/${group.id}/students`}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    title="إدارة الطلاب"
                  >
                    <Users className="w-4 h-4" />
                  </Link>
                  <Link
                    to={`/groups/${group.id}`}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="عرض التفاصيل"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                  <Link
                    to={`/groups/${group.id}/edit`}
                    className="p-2 text-gray-400 hover:text-primary-600 transition-colors"
                    title="تعديل"
                  >
                    <Edit className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => openDeleteConfirm(group)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Student Count */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">عدد الطلاب:</span>
                  <span className="font-medium">{group.student_count || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-gray-600">عدد المرات الدفع:</span>
                  <span className="font-medium text-green-600">{group.paid_students || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-gray-600">عدد مرات غير المدفوعين:</span>
                  <span className="font-medium text-red-600">{group.unpaid_students || 0}</span>
                </div>
              </div>
            </div>
          ))}
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
              هل أنت متأكد من حذف مجموعة "{groupToDelete?.name}"؟ 
              هذا الإجراء سيحذف جميع الطلاب المرتبطين بها ولا يمكن التراجع عنه.
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
                  setGroupToDelete(null)
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

export default GroupsOverview
