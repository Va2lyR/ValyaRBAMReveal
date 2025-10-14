import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../lib/supabase-unified-fixed'
import { 
  Plus, 
  Edit, 
  Trash2, 
  ArrowRight, 
  Users, 
  DollarSign,
  Calendar,
  AlertTriangle,
  Search,
  CheckCircle,
  XCircle
} from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'

const GroupStudents = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [group, setGroup] = useState(null)
  const [students, setStudents] = useState([])
  const [studentStats, setStudentStats] = useState({})
  const [filteredStudents, setFilteredStudents] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [newStudent, setNewStudent] = useState({
    name: '',
    note: '',
    payment_frequency: 'شهري',
    phone_student: '',
    phone_father: '',
    phone_mother: ''
  })
  const [editingStudent, setEditingStudent] = useState(null)
  const [editStudent, setEditStudent] = useState({
    name: '',
    note: '',
    payment_frequency: 'شهري'
  })

  const paymentFrequencies = [
    'حصه', 'أسبوعي', 'شهري', 'فصلي', 'سنوي'
  ]

  const [stats, setStats] = useState({ total: 0, paid: 0, unpaid: 0 })

  useEffect(() => {
    if (user && id) {
      loadGroupAndStudents()
    }
  }, [user, id])

  useEffect(() => {
    filterStudents()
  }, [students, searchTerm, paymentFilter])

  useEffect(() => {
    // تحديث الإحصائيات عند تغيير البيانات
    if (group) {
      updateStats()
    }
  }, [group, students, studentStats])

  const updateStats = async () => {
    const newStats = await getPaymentStats()
    setStats(newStats)
  }

  const loadGroupAndStudents = async () => {
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
      
      const studentsData = await db.getStudents(parseInt(id))
      setStudents(studentsData || [])
      // تحميل إحصائيات كل طالب من جدول الحضور
      try {
        const statsMap = await db.getStudentStats(parseInt(id))
        setStudentStats(statsMap || {})
      } catch (e) {
        console.error('Error loading student stats:', e)
        setStudentStats({})
      }
    } catch (error) {
      console.error('Error loading group and students:', error)
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

  const filterStudents = () => {
    let filtered = students

    // فلترة حسب النص
    if (searchTerm) {
      filtered = filtered.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.note && student.note.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // فلترة حسب حالة الدفع
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(student => {
        const st = studentStats[student.id] || {}
        if (paymentFilter === 'paid') return (st.paidTimes || 0) > 0
        if (paymentFilter === 'unpaid') return (st.paidTimes || 0) === 0
        return true
      })
    }

    setFilteredStudents(filtered)
  }

  const handleAddStudent = async () => {
    if (!newStudent.name.trim()) {
      toast.error('يرجى إدخال اسم الطالب')
      return
    }

    try {
      const studentData = await db.createStudent({
        ...newStudent,
        group_id: parseInt(id),
        month: group.month
      })
      
      setStudents(prev => [...prev, studentData])
      setNewStudent({
        name: '',
        note: '',
        payment_frequency: 'شهري',
        phone_student: '',
        phone_father: '',
        phone_mother: ''
      })
      setShowAddStudent(false)
      toast.success('تم إضافة الطالب بنجاح')
    } catch (error) {
      console.error('Error adding student:', error)
      toast.error('حدث خطأ في إضافة الطالب')
    }
  }

  const handleUpdateStudent = async (studentId, updates) => {
    try {
      await db.updateStudent(studentId, updates)
      setStudents(prev => 
        prev.map(s => s.id === studentId ? { ...s, ...updates } : s)
      )
      toast.success('تم تحديث بيانات الطالب')
    } catch (error) {
      console.error('Error updating student:', error)
      toast.error('حدث خطأ في تحديث بيانات الطالب')
    }
  }

  const handleDeleteStudent = async (studentId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الطالب؟')) {
      return
    }
    
    try {
      await db.deleteStudent(studentId)
      setStudents(prev => prev.filter(s => s.id !== studentId))
      toast.success('تم حذف الطالب بنجاح')
    } catch (error) {
      console.error('Error deleting student:', error)
      toast.error('حدث خطأ في حذف الطالب')
    }
  }

  const startEditStudent = (student) => {
    setEditingStudent(student.id)
    setEditStudent({
      name: student.name,
      paid: student.paid,
      note: student.note || '',
      payment_frequency: student.payment_frequency || 'شهري'
    })
  }

  const saveEditStudent = async () => {
    if (!editStudent.name.trim()) {
      toast.error('يرجى إدخال اسم الطالب')
      return
    }

    try {
      await handleUpdateStudent(editingStudent, editStudent)
      setEditingStudent(null)
      setEditStudent({
        name: '',
        paid: false,
        note: '',
        payment_frequency: 'شهري'
      })
    } catch (error) {
      console.error('Error saving student edit:', error)
    }
  }

  const cancelEditStudent = () => {
    setEditingStudent(null)
    setEditStudent({
      name: '',
      paid: false,
      note: '',
      payment_frequency: 'شهري'
    })
  }

  const togglePaymentStatus = async (studentId, currentStatus) => {
    try {
      const newStatus = !currentStatus
      await handleUpdateStudent(studentId, { 
        paid: newStatus,
        last_payment_date: newStatus ? new Date().toISOString() : null
      })
      
      // تحديث الإحصائيات
      const statsMap = await db.getStudentStats(parseInt(id))
      setStudentStats(statsMap || {})
      
      toast.success(newStatus ? 'تم تحديد الطالب كمدفوع' : 'تم تحديد الطالب كغير مدفوع')
    } catch (error) {
      console.error('Error toggling payment status:', error)
      toast.error('فشل في تحديث حالة الدفع')
    }
  }

  const getPaymentStats = async () => {
    try {
      // جلب الإحصائيات من قاعدة البيانات مباشرة
      const groupStats = await db.getMonthlyGroupStats(parseInt(id))
      return {
        total: groupStats.present + groupStats.absent + groupStats.late,
        paid: groupStats.paidCount,
        unpaid: groupStats.unpaidCount
      }
    } catch (error) {
      console.error('Error loading payment stats:', error)
      return { total: 0, paid: 0, unpaid: 0 }
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
        <p className="text-gray-600 mb-6">المجموعة التي تحاول الوصول إليها غير موجودة</p>
        <Link to="/groups" className="btn-primary">
          العودة للمجموعات
        </Link>
      </div>
    )
  }

  // stats يتم تحديثها عبر useEffect

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/groups')}
            className="text-gray-500 hover:text-gray-700 mr-4"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">إدارة طلاب المجموعة</h1>
            <p className="text-gray-600 mt-1">{group.name}</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddStudent(true)}
          className="btn-primary flex items-center w-fit"
        >
          <Plus className="w-4 h-4 ml-2" />
          إضافة طالب جديد
        </button>
      </div>

      {/* Group Info */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">معلومات المجموعة</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 ml-2" />
                {group.day} - {group.month}
              </div>
              <div className="flex items-center">
                <DollarSign className="w-4 h-4 ml-2" />
                {group.time}
              </div>
              <div className="flex items-center">
                <Users className="w-4 h-4 ml-2" />
                {group.location}
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">المرحلة التعليمية</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">المرحلة:</span>
                <span className="font-medium text-blue-600">{group.education_level || 'اعدادية'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">الصف:</span>
                <span className="font-medium text-green-600">{group.grade_level || 'اولى'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">عدد الحصص:</span>
                <span className="font-medium text-purple-600">{group.sessions_per_month || 4}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">حالة الدفع</h3>
            <div className="flex items-center">
              {stats.paid === stats.total && stats.total > 0 ? (
                <CheckCircle className="w-6 h-6 text-green-600 ml-2" />
              ) : stats.paid === 0 ? (
                <XCircle className="w-6 h-6 text-red-600 ml-2" />
              ) : (
                <div className="w-6 h-6 bg-yellow-400 rounded-full ml-2" />
              )}
              <span className="text-sm font-medium">
                {stats.paid === stats.total && stats.total > 0 ? 'الكل دفع' :
                 stats.paid === 0 ? 'لم يدفع أحد' : 'الدفع غير مكتمل'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="البحث في الطلاب..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pr-10"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="input-field"
            >
              <option value="all">جميع الطلاب</option>
              <option value="paid">المدفوعين</option>
              <option value="unpaid">غير المدفوعين</option>
            </select>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  اسم الطالب
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ملاحظات
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  حالة الدفع
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  التفاصيل
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  إجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingStudent === student.id ? (
                      <input
                        type="text"
                        value={editStudent.name}
                        onChange={(e) => setEditStudent(prev => ({ ...prev, name: e.target.value }))}
                        className="input-field text-sm"
                      />
                    ) : (
                      <div className="text-sm font-medium text-gray-900">
                        {student.name}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingStudent === student.id ? (
                      <input
                        type="text"
                        value={editStudent.note}
                        onChange={(e) => setEditStudent(prev => ({ ...prev, note: e.target.value }))}
                        className="input-field text-sm"
                        placeholder="ملاحظات"
                      />
                    ) : (
                      <div className="text-sm text-gray-500">
                        {student.note || '-'}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => togglePaymentStatus(student.id, student.paid)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        student.paid
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                    >
                      {student.paid ? 'مدفوع' : 'غير مدفوع'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {editingStudent === student.id ? (
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <button
                          onClick={saveEditStudent}
                          className="text-green-600 hover:text-green-900"
                        >
                          حفظ
                        </button>
                        <button
                          onClick={cancelEditStudent}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          إلغاء
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <button
                          onClick={() => navigate(`/groups/${group.id}/students/${student.id}/sessions`)}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          معلومات الطالب
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(student.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          حذف
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredStudents.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {students.length === 0 ? 'لا توجد طلاب في هذه المجموعة' : 'لا توجد نتائج'}
            </div>
          )}
        </div>
      </div>

      {/* Add Student Modal */}
      {showAddStudent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">إضافة طالب جديد</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  اسم الطالب
                </label>
                <input
                  type="text"
                  value={newStudent.name}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, name: e.target.value }))}
                  className="input-field"
                  placeholder="أدخل اسم الطالب"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تكرار الدفع
                </label>
                <select
                  value={newStudent.payment_frequency}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, payment_frequency: e.target.value }))}
                  className="input-field"
                >
                  {paymentFrequencies.map((frequency) => (
                    <option key={frequency} value={frequency}>{frequency}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">رقم الطالب (اختياري)</label>
                  <input
                    type="tel"
                    value={newStudent.phone_student}
                    onChange={(e) => setNewStudent(prev => ({ ...prev, phone_student: e.target.value }))}
                    className="input-field"
                    placeholder="مثال: 01000000000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">رقم الأب (اختياري)</label>
                  <input
                    type="tel"
                    value={newStudent.phone_father}
                    onChange={(e) => setNewStudent(prev => ({ ...prev, phone_father: e.target.value }))}
                    className="input-field"
                    placeholder="مثال: 01000000001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">رقم الأم (اختياري)</label>
                  <input
                    type="tel"
                    value={newStudent.phone_mother}
                    onChange={(e) => setNewStudent(prev => ({ ...prev, phone_mother: e.target.value }))}
                    className="input-field"
                    placeholder="مثال: 01000000002"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ملاحظات
                </label>
                <input
                  type="text"
                  value={newStudent.note}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, note: e.target.value }))}
                  className="input-field"
                  placeholder="ملاحظات (اختياري)"
                />
              </div>
              
            </div>
            <div className="flex justify-end space-x-3 space-x-reverse mt-6">
              <button
                onClick={() => setShowAddStudent(false)}
                className="btn-secondary"
              >
                إلغاء
              </button>
              <button
                onClick={handleAddStudent}
                className="btn-primary"
              >
                إضافة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GroupStudents
