import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../lib/supabase-unified-fixed'
import { 
  Save, 
  Trash2, 
  Plus, 
  ArrowRight,
  AlertTriangle,
  Users,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  Eye,
  Edit
} from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import SessionTracker from '../components/SessionTracker'
import toast from 'react-hot-toast'

const GroupManagement = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [group, setGroup] = useState({
    name: '',
    category: 'سناتر',
    location: '',
    day: 'السبت',
    time: '09:00',
    month: 'يناير',
    session_price: 0,
    payment_frequency: 'شهري',
    sessions_per_month: 4,
    education_level: 'اعدادية',
    grade_level: 'اولى'
  })
  const [students, setStudents] = useState([])
  const [newStudent, setNewStudent] = useState({
    name: '',
    paid: false,
    payment_frequency: 'شهري',
    note: '',
    payment_amount: 0,
    total_sessions: 4,
    completed_sessions: 0
  })
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [isNewGroup, setIsNewGroup] = useState(false)

  const months = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ]

  const days = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']

  const times = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
    '20:00', '20:30', '21:00', '21:30', '22:00'
  ]

  const paymentFrequencies = ['حصه', 'أسبوعي', 'شهري', 'فصلي', 'سنوي']

  const educationLevels = ['اعدادية', 'ثانوية']
  
  const gradeLevels = {
    'اعدادية': ['اولى', 'ثانية', 'ثالثة'],
    'ثانوية': ['اولى', 'ثانية', 'ثالثة']
  }

  useEffect(() => {
    if (user) {
      if (id === 'new') {
        setIsNewGroup(true)
        setLoading(false)
      } else {
        loadGroup()
      }
    }
  }, [user, id])

  const loadGroup = async () => {
    try {
      setLoading(true)
      
      if (!id || id === 'new') {
        setIsNewGroup(true)
        setLoading(false)
        return
      }

      const groupId = parseInt(id)
      if (isNaN(groupId)) {
        toast.error('معرف المجموعة غير صحيح')
        navigate('/groups')
        return
      }

      const groupData = await db.getGroupById(groupId, user.id)
      setGroup(groupData)
      
      // Load students for this group
      const studentsData = await db.getStudents(groupId)
      setStudents(studentsData || [])
      
    } catch (error) {
      console.error('Error loading group:', error)
      toast.error('حدث خطأ في تحميل المجموعة')
      navigate('/groups')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveGroup = async () => {
    try {
      setSaving(true)
      
      // التحقق من البيانات المطلوبة
      if (!group.name?.trim()) {
        toast.error('اسم المجموعة مطلوب')
        return
      }
      if (!group.location?.trim()) {
        toast.error('مكان المجموعة مطلوب')
        return
      }
      if (!group.day) {
        toast.error('يوم المجموعة مطلوب')
        return
      }
      if (!group.time) {
        toast.error('وقت المجموعة مطلوب')
        return
      }
      if (!group.month) {
        toast.error('شهر المجموعة مطلوب')
        return
      }

      if (isNewGroup) {
        // إنشاء مجموعة جديدة
        const newGroup = await db.createGroup({
          ...group,
          created_by: user.id
        })
        toast.success('تم إنشاء المجموعة بنجاح')
        navigate(`/groups/${newGroup.id}`)
      } else {
        // تحديث مجموعة موجودة
        const groupId = parseInt(id)
        if (isNaN(groupId)) {
          toast.error('معرف المجموعة غير صحيح')
          return
        }
        
        await db.updateGroup(groupId, group)
        toast.success('تم حفظ المجموعة بنجاح')
      }
    } catch (error) {
      console.error('Error saving group:', error)
      toast.error('حدث خطأ في حفظ المجموعة')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteGroup = async () => {
    if (deletePassword !== 'حذف') {
      toast.error('يرجى كتابة "حذف" للتأكيد')
      return
    }

    try {
      setSaving(true)
      
      const groupId = parseInt(id)
      if (isNaN(groupId)) {
        toast.error('معرف المجموعة غير صحيح')
        return
      }
      
      await db.deleteGroup(groupId)
      toast.success('تم حذف المجموعة بنجاح')
      navigate('/groups')
    } catch (error) {
      console.error('Error deleting group:', error)
      toast.error('حدث خطأ في حذف المجموعة')
    } finally {
      setSaving(false)
      setShowDeleteModal(false)
      setDeletePassword('')
    }
  }

  const handleAddStudent = async () => {
    try {
      if (!newStudent.name?.trim()) {
        toast.error('اسم الطالب مطلوب')
        return
      }

      if (isNewGroup) {
        toast.error('يرجى حفظ المجموعة أولاً قبل إضافة الطلاب')
        return
      }

      const groupId = parseInt(id)
      if (isNaN(groupId)) {
        toast.error('معرف المجموعة غير صحيح')
        return
      }

      await db.createStudent({
        ...newStudent,
        group_id: groupId,
        month: group.month, // استخدام شهر المجموعة
        payment_amount: parseFloat(newStudent.payment_amount) || 0
      })
      
      toast.success('تم إضافة الطالب بنجاح')
      setNewStudent({
        name: '',
        paid: false,
        payment_frequency: 'شهري',
        note: '',
        payment_amount: 0,
        total_sessions: 4,
        completed_sessions: 0
      })
      
      // إعادة تحميل الطلاب
      const studentsData = await db.getStudents(groupId)
      setStudents(studentsData || [])
    } catch (error) {
      console.error('Error adding student:', error)
      toast.error('حدث خطأ في إضافة الطالب')
    }
  }

  const handleUpdateStudent = async (studentId, updates) => {
    try {
      const studentIdNum = parseInt(studentId)
      if (isNaN(studentIdNum)) {
        toast.error('معرف الطالب غير صحيح')
        return
      }
      
      await db.updateStudent(studentIdNum, updates)
      toast.success('تم تحديث بيانات الطالب')
      
      // إعادة تحميل الطلاب
      const groupId = parseInt(id)
      if (!isNaN(groupId)) {
        const studentsData = await db.getStudents(groupId)
        setStudents(studentsData || [])
      }
    } catch (error) {
      console.error('Error updating student:', error)
      toast.error('حدث خطأ في تحديث بيانات الطالب')
    }
  }

  const handleDeleteStudent = async (studentId) => {
    if (!confirm('هل أنت متأكد من حذف هذا الطالب؟')) {
      return
    }

    try {
      const studentIdNum = parseInt(studentId)
      if (isNaN(studentIdNum)) {
        toast.error('معرف الطالب غير صحيح')
        return
      }
      
      await db.deleteStudent(studentIdNum)
      toast.success('تم حذف الطالب بنجاح')
      
      // إعادة تحميل الطلاب
      const groupId = parseInt(id)
      if (!isNaN(groupId)) {
        const studentsData = await db.getStudents(groupId)
        setStudents(studentsData || [])
      }
    } catch (error) {
      console.error('Error deleting student:', error)
      toast.error('حدث خطأ في حذف الطالب')
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
          <h1 className="text-2xl font-bold text-gray-900">
            {isNewGroup ? 'إضافة مجموعة جديدة' : 'إدارة المجموعة'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isNewGroup ? 'إنشاء مجموعة جديدة وإدارة طلابها' : 'تعديل بيانات المجموعة وإدارة طلابها'}
          </p>
        </div>
        <div className="flex items-center space-x-3 space-x-reverse">
          {!isNewGroup && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="btn-danger flex items-center"
            >
              <Trash2 className="w-4 h-4 ml-2" />
              حذف المجموعة
            </button>
          )}
          <button
            onClick={handleSaveGroup}
            disabled={saving}
            className="btn-primary flex items-center"
          >
            <Save className="w-4 h-4 ml-2" />
            {saving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </div>
      </div>

      {/* Group Details */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">بيانات المجموعة</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              اسم المجموعة *
            </label>
            <input
              type="text"
              value={group.name}
              onChange={(e) => setGroup({ ...group, name: e.target.value })}
              className="input-field"
              placeholder="أدخل اسم المجموعة"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              نوع المجموعة *
            </label>
            <select
              value={group.category}
              onChange={(e) => setGroup({ ...group, category: e.target.value })}
              className="input-field"
            >
              <option value="سناتر">سناتر</option>
              <option value="برايف">برايف</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              المرحلة التعليمية *
            </label>
            <select
              value={group.education_level}
              onChange={(e) => setGroup({ 
                ...group, 
                education_level: e.target.value,
                grade_level: 'اولى' // إعادة تعيين الصف عند تغيير المرحلة
              })}
              className="input-field"
            >
              {educationLevels.map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الصف الدراسي *
            </label>
            <select
              value={group.grade_level}
              onChange={(e) => setGroup({ ...group, grade_level: e.target.value })}
              className="input-field"
            >
              {gradeLevels[group.education_level]?.map((grade) => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              المكان *
            </label>
            <input
              type="text"
              value={group.location}
              onChange={(e) => setGroup({ ...group, location: e.target.value })}
              className="input-field"
              placeholder="أدخل مكان المجموعة"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              اليوم *
            </label>
            <select
              value={group.day}
              onChange={(e) => setGroup({ ...group, day: e.target.value })}
              className="input-field"
            >
              {days.map(day => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الوقت *
            </label>
            <select
              value={group.time}
              onChange={(e) => setGroup({ ...group, time: e.target.value })}
              className="input-field"
            >
              {times.map(time => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الشهر *
            </label>
            <select
              value={group.month}
              onChange={(e) => setGroup({ ...group, month: e.target.value })}
              className="input-field"
            >
              {months.map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              سعر الحصة (جنيه)
            </label>
            <input
              type="number"
              value={group.session_price}
              onChange={(e) => setGroup({ ...group, session_price: e.target.value })}
              className="input-field"
              min="0"
              step="0.01"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              تكرار الدفع
            </label>
            <select
              value={group.payment_frequency}
              onChange={(e) => setGroup({ ...group, payment_frequency: e.target.value })}
              className="input-field"
            >
              {paymentFrequencies.map(freq => (
                <option key={freq} value={freq}>{freq}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              عدد الجلسات شهرياً
            </label>
            <input
              type="number"
              value={group.sessions_per_month}
              onChange={(e) => setGroup({ ...group, sessions_per_month: parseInt(e.target.value) || 4 })}
              className="input-field"
              min="1"
              max="31"
            />
          </div>
        </div>
      </div>

      {/* Students Section */}
      {!isNewGroup && (
        <>
          {/* Add Student Form */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">إضافة طالب جديد</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  اسم الطالب *
                </label>
                <input
                  type="text"
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
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
                  onChange={(e) => setNewStudent({ ...newStudent, payment_frequency: e.target.value })}
                  className="input-field"
                >
                  {paymentFrequencies.map(freq => (
                    <option key={freq} value={freq}>{freq}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  مبلغ الدفع
                </label>
                <input
                  type="number"
                  value={newStudent.payment_amount}
                  onChange={(e) => setNewStudent({ ...newStudent, payment_amount: e.target.value })}
                  className="input-field"
                  placeholder="0.00"
                  step="0.01"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleAddStudent}
                  className="btn-success w-full flex items-center justify-center"
                >
                  <Plus className="w-4 h-4 ml-2" />
                  إضافة طالب
                </button>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ملاحظات (اختياري)
              </label>
              <textarea
                value={newStudent.note}
                onChange={(e) => setNewStudent({ ...newStudent, note: e.target.value })}
                className="input-field"
                rows={2}
                placeholder="أي ملاحظات إضافية"
              />
            </div>
          </div>

          {/* Students List */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">قائمة الطلاب</h2>
            {students.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        اسم الطالب
                      </th>
                      
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        الجلسات
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        تكرار الدفع
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        مبلغ الدفع
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        آخر دفع
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ملاحظات
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        إجراءات
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {students.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {student.name}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center space-x-1 space-x-reverse">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              student.completed_sessions >= student.total_sessions
                                ? 'bg-green-100 text-green-800'
                                : student.completed_sessions > 0
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                            }`}>
                              {student.completed_sessions || 0}/{student.total_sessions || 4}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {student.payment_frequency}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {(student.payment_amount || 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {student.last_payment_date ? 
                            new Date(student.last_payment_date).toLocaleDateString('ar-SA') : 
                            '-'
                          }
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {student.note || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <button
                              onClick={() => navigate(`/groups/${group.id}/students/${student.id}/sessions`)}
                              className="text-blue-600 hover:text-blue-900 flex items-center"
                            >
                              <Eye className="w-4 h-4 ml-1" />
                              جلسات
                            </button>
                            <button
                              onClick={() => handleDeleteStudent(student.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              حذف
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                لا يوجد طلاب مسجلين في هذه المجموعة
              </div>
            )}
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600 ml-3" />
              <h3 className="text-lg font-medium text-gray-900">تأكيد الحذف</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              هل أنت متأكد من حذف هذه المجموعة؟ سيتم حذف جميع الطلاب المرتبطين بها أيضاً.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اكتب "حذف" للتأكيد
              </label>
              <input
                type="text"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="input-field"
                placeholder="حذف"
              />
            </div>
            <div className="flex justify-end space-x-3 space-x-reverse">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeletePassword('')
                }}
                className="btn-secondary"
              >
                إلغاء
              </button>
              <button
                onClick={handleDeleteGroup}
                disabled={saving || deletePassword !== 'حذف'}
                className="btn-danger"
              >
                {saving ? 'جاري الحذف...' : 'حذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GroupManagement