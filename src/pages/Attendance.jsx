import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../lib/supabase-unified-fixed'
import { 
  Users, 
  Calendar, 
  Clock, 
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Eye,
  Edit,
  UserCheck,
  UserX,
  DollarSign,
  FileText,
  Save
} from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'

const Attendance = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [groups, setGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [students, setStudents] = useState([])
  const [attendance, setAttendance] = useState({})
  const [notes, setNotes] = useState({})
  const [paying, setPaying] = useState(false)
  // إزالة حقل التاريخ
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      loadGroups()
    }
  }, [user])

  useEffect(() => {
    if (selectedGroup) {
      loadStudents()
      loadAttendance()
    }
  }, [selectedGroup])

  const loadGroups = async () => {
    try {
      setLoading(true)
      console.log('Loading groups for user:', user?.id)
      
      if (!user?.id) {
        console.error('No user ID available')
        toast.error('يجب تسجيل الدخول أولاً')
        return
      }
      
      const groupsData = await db.getGroups(user.id)
      console.log('Groups loaded for attendance:', groupsData)
      
      if (groupsData && groupsData.length > 0) {
        setGroups(groupsData)
        console.log('Groups set successfully:', groupsData.length, 'groups')
      } else {
        setGroups([])
        console.log('No groups found')
      }
    } catch (error) {
      console.error('Error loading groups:', error)
      toast.error('حدث خطأ في تحميل المجموعات')
      setGroups([])
    } finally {
      setLoading(false)
    }
  }

  const loadStudents = async () => {
    if (!selectedGroup) return
    
    try {
      console.log('Loading students for group:', selectedGroup.id)
      const studentsData = await db.getStudents(selectedGroup.id)
      console.log('Students loaded for attendance:', studentsData)
      setStudents(studentsData || [])
    } catch (error) {
      console.error('Error loading students:', error)
      toast.error('حدث خطأ في تحميل الطلاب')
    }
  }

  const loadAttendance = async () => {
    if (!selectedGroup) return
    
    try {
      console.log('Loading attendance for group:', selectedGroup.id)
      // استخدام تاريخ اليوم الحالي
      const today = new Date().toISOString().split('T')[0]
      const attendanceData = await db.getAttendance(selectedGroup.id, today)
      console.log('Attendance data loaded:', attendanceData)
      const attendanceMap = {}
      const notesMap = {}
      
      if (attendanceData && attendanceData.length > 0) {
        attendanceData.forEach(record => {
          attendanceMap[record.student_id] = record.attendance_status || record.status
          if (record.note) {
            notesMap[record.student_id] = record.note
          }
        })
      }
      
      setAttendance(attendanceMap)
      setNotes(notesMap)
    } catch (error) {
      console.error('Error loading attendance:', error)
      setAttendance({})
      setNotes({})
    }
  }

  const handleAttendanceChange = async (studentId, status) => {
    try {
      setSaving(true)
      const today = new Date().toISOString().split('T')[0]
      // إنشاء جلسة مؤقتة للحضور اليومي
      const sessionId = `daily_${selectedGroup.id}_${today.replace(/-/g, '')}`
      await db.updateAttendance(studentId, sessionId, selectedGroup.id, status)
      setAttendance(prev => ({
        ...prev,
        [studentId]: status
      }))
      toast.success('تم تحديث حالة الحضور')
    } catch (error) {
      console.error('Error updating attendance:', error)
      toast.error('حدث خطأ في تحديث الحضور')
    } finally {
      setSaving(false)
    }
  }

  const handleMarkPaid = async (student) => {
    if (!selectedGroup) return
    try {
      setPaying(true)
      const amount = parseFloat(selectedGroup.session_price) || 0
      if (amount <= 0) {
        toast.error('يرجى ضبط سعر الحصة في بيانات المجموعة')
        return
      }
      // سجل الدفع من خلال المعاملات وحدّث الطالب كمدفوع
      await db.markStudentPaid(selectedGroup.id, student.id, amount, user.id)
      // حدّث حالة الدفع في سجل الحضور لليوم الحالي أيضاً ليكون الحضور هو مصدر التعديل
      const today = new Date().toISOString().split('T')[0]
      const sessionId = `daily_${selectedGroup.id}_${today.replace(/-/g, '')}`
      const currentStatus = attendance[student.id] || 'not_marked'
      await db.updateAttendance(student.id, sessionId, selectedGroup.id, currentStatus, 'paid')
      // تحديث العنصر محلياً
      setStudents(prev => prev.map(s => s.id === student.id ? { ...s, paid: true, payment_amount: amount, last_payment_date: new Date().toISOString() } : s))
      toast.success('تم تسجيل الدفع وتحديث الإيرادات')
    } catch (error) {
      console.error('Error marking paid:', error)
      toast.error('فشل تسجيل الدفع')
    } finally {
      setPaying(false)
    }
  }

  const handleNoteChange = (studentId, note) => {
    setNotes(prev => ({
      ...prev,
      [studentId]: note
    }))
  }

  const saveNote = async (studentId) => {
    try {
      setSaving(true)
      const today = new Date().toISOString().split('T')[0]
      const sessionId = `daily_${selectedGroup.id}_${today.replace(/-/g, '')}`
      await db.updateAttendance(studentId, sessionId, selectedGroup.id, attendance[studentId] || 'not_marked', 'unpaid', notes[studentId])
      toast.success('تم حفظ الملاحظة')
    } catch (error) {
      console.error('Error saving note:', error)
      toast.error('حدث خطأ في حفظ الملاحظة')
    } finally {
      setSaving(false)
    }
  }

  const markAllPresent = async () => {
    try {
      setSaving(true)
      const today = new Date().toISOString().split('T')[0]
      const sessionId = `daily_${selectedGroup.id}_${today.replace(/-/g, '')}`
      for (const student of students) {
        await db.updateAttendance(student.id, sessionId, selectedGroup.id, 'present')
      }
      const allPresent = {}
      students.forEach(student => {
        allPresent[student.id] = 'present'
      })
      setAttendance(allPresent)
      toast.success('تم تحديد جميع الطلاب كحاضرين')
    } catch (error) {
      console.error('Error marking all present:', error)
      toast.error('حدث خطأ في تحديث الحضور')
    } finally {
      setSaving(false)
    }
  }

  const markAllAbsent = async () => {
    try {
      setSaving(true)
      const today = new Date().toISOString().split('T')[0]
      const sessionId = `daily_${selectedGroup.id}_${today.replace(/-/g, '')}`
      for (const student of students) {
        await db.updateAttendance(student.id, sessionId, selectedGroup.id, 'absent')
      }
      const allAbsent = {}
      students.forEach(student => {
        allAbsent[student.id] = 'absent'
      })
      setAttendance(allAbsent)
      toast.success('تم تحديد جميع الطلاب كغائبين')
    } catch (error) {
      console.error('Error marking all absent:', error)
      toast.error('حدث خطأ في تحديث الحضور')
    } finally {
      setSaving(false)
    }
  }

  const getAttendanceStats = () => {
    const total = students.length
    const present = Object.values(attendance).filter(status => status === 'present').length
    const absent = Object.values(attendance).filter(status => status === 'absent').length
    const notMarked = total - present - absent
    
    return { total, present, absent, notMarked }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'absent':
        return <XCircle className="w-5 h-5 text-red-600" />
      case 'late':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'present':
        return 'حاضر'
      case 'absent':
        return 'غائب'
      case 'late':
        return 'متأخر'
      default:
        return 'لم يتم التحديد'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'absent':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'late':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPaymentStatus = (student) => {
    if (student.paid) {
      return { text: 'مدفوع', color: 'text-green-600', icon: <CheckCircle className="w-4 h-4" /> }
    } else {
      return { text: 'غير مدفوع', color: 'text-red-600', icon: <XCircle className="w-4 h-4" /> }
    }
  }

  if (loading) {
    return <LoadingSpinner size="lg" className="min-h-96" />
  }

  const stats = getAttendanceStats()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">نظام الحضور والغياب</h1>
          <p className="text-gray-600 mt-1">تتبع حضور الطلاب في المجموعات</p>
        </div>
        <div className="flex items-center space-x-3 space-x-reverse">
          <button
            onClick={loadGroups}
            disabled={loading}
            className="btn-secondary flex items-center"
          >
            <Eye className="w-4 h-4 ml-2" />
            {loading ? 'جاري التحميل...' : 'إعادة تحميل'}
          </button>
        </div>
      </div>

      {/* Group Selection */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">اختر المجموعة</h2>
          <div className="text-sm text-gray-500">
            {groups.length > 0 ? `${groups.length} مجموعة متاحة` : 'لا توجد مجموعات'}
          </div>
        </div>
        {groups.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group) => (
              <div
                key={group.id}
                onClick={() => setSelectedGroup(group)}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedGroup?.id === group.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{group.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    group.category === 'سناتر' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {group.category}
                  </span>
                </div>
                <div className="space-y-1 text-sm text-gray-600">
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
                  <div className="flex items-center">
                    <Users className="w-4 h-4 ml-2" />
                    {group.student_count || 0} طالب
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد مجموعات</h3>
            <p className="text-gray-600 mb-4">ابدأ بإنشاء مجموعة جديدة</p>
            <div className="space-y-2 mb-4">
              <p className="text-sm text-gray-500">تأكد من:</p>
              <ul className="text-sm text-gray-500 text-right">
                <li>• تسجيل الدخول بشكل صحيح</li>
                <li>• إنشاء مجموعة جديدة أولاً</li>
                <li>• إضافة طلاب للمجموعة</li>
              </ul>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/groups/new')}
                className="btn-primary flex items-center mx-auto"
              >
                <Plus className="w-4 h-4 ml-2" />
                إضافة مجموعة جديدة
              </button>
              <button
                onClick={async () => {
                  try {
                    // إنشاء مجموعة تجريبية باستخدام البيانات المطلوبة
                    const sampleGroup = {
                      name: 'مجموعة تجريبية',
                      category: 'سناتر',
                      location: 'القاهرة',
                      day: 'السبت',
                      time: '09:00',
                      month: 'يناير',
                      payment_frequency: 'شهري',
                      sessions_per_month: 4,
                      created_by: user.id
                    }
                    
                    const group = await db.createGroup(sampleGroup)
                    
                    // إضافة طالب تجريبي
                    const sampleStudent = {
                      group_id: group.id,
                      name: 'طالب تجريبي',
                      paid: false,
                      month: 'يناير',
                      payment_frequency: 'شهري',
                      payment_amount: 100,
                      total_sessions: 4,
                      completed_sessions: 0
                    }
                    
                    await db.createStudent(sampleStudent)
                    toast.success('تم إنشاء مجموعة تجريبية')
                    loadGroups()
                  } catch (error) {
                    console.error('Error creating sample group:', error)
                    toast.error('حدث خطأ في إنشاء المجموعة التجريبية')
                  }
                }}
                className="btn-secondary flex items-center mx-auto"
              >
                <Plus className="w-4 h-4 ml-2" />
                إنشاء مجموعة تجريبية
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Attendance Management */}
      {selectedGroup && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div className="mr-3">
                  <p className="text-sm font-medium text-gray-600">إجمالي الطلاب</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="mr-3">
                  <p className="text-sm font-medium text-gray-600">حاضر</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.present}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="p-3 bg-red-100 rounded-lg">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <div className="mr-3">
                  <p className="text-sm font-medium text-gray-600">غائب</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.absent}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="p-3 bg-gray-100 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-gray-600" />
                </div>
                <div className="mr-3">
                  <p className="text-sm font-medium text-gray-600">لم يتم التحديد</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.notMarked}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                إدارة الحضور - {selectedGroup.name}
              </h2>
              <div className="flex items-center space-x-2 space-x-reverse">
                <button
                  onClick={markAllAbsent}
                  disabled={saving}
                  className="btn-danger text-sm flex items-center"
                >
                  <UserX className="w-4 h-4 ml-1" />
                  تحديد الكل غائب
                </button>
                <button
                  onClick={markAllPresent}
                  disabled={saving}
                  className="btn-success text-sm flex items-center"
                >
                  <UserCheck className="w-4 h-4 ml-1" />
                  تحديد الكل حاضر
                </button>
              </div>
            </div>

            {/* Students List */}
            <div className="space-y-4">
              {students.map((student) => {
                const currentStatus = attendance[student.id] || 'not_marked'
                const paymentStatus = getPaymentStatus(student)
                return (
                  <div key={student.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center flex-1">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6 text-gray-600" />
                      </div>
                      <div className="mr-4 flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-gray-900">{student.name}</h3>
                            <div className="flex items-center space-x-2 space-x-reverse">
                            <div className={`flex items-center ${paymentStatus.color}`}>
                              {paymentStatus.icon}
                              <span className="mr-1 text-sm">{paymentStatus.text}</span>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(currentStatus)}`}>
                              {getStatusText(currentStatus)}
                            </span>
                              {!student.paid && (
                                <button
                                  onClick={() => handleMarkPaid(student)}
                                  disabled={paying}
                                  className="ml-2 text-xs btn-success px-2 py-1"
                                >
                                  دفع
                                </button>
                              )}
                          </div>
                        </div>
                        
                        {/* Payment Info */}
                        <div className="flex items-center space-x-4 space-x-reverse text-sm text-gray-600 mb-2">
                          <div className="flex items-center">
                            <DollarSign className="w-4 h-4 ml-1" />
                            <span>المبلغ: {student.payment_amount || 0} جنيه</span>
                          </div>
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 ml-1" />
                            <span>التكرار: {student.payment_frequency}</span>
                          </div>
                          {student.last_payment_date && (
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 ml-1" />
                              <span>آخر دفع: {new Date(student.last_payment_date).toLocaleDateString('en-GB')}</span>
                            </div>
                          )}
                        </div>

                        {/* Note Section */}
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <input
                            type="text"
                            value={notes[student.id] || ''}
                            onChange={(e) => handleNoteChange(student.id, e.target.value)}
                            placeholder="أضف ملاحظة..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <button
                            onClick={() => saveNote(student.id)}
                            disabled={saving}
                            className="btn-secondary text-sm flex items-center"
                          >
                            <Save className="w-4 h-4 ml-1" />
                            حفظ
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 space-x-reverse">
                      <button
                        onClick={() => handleAttendanceChange(student.id, 'present')}
                        disabled={saving}
                        className={`p-2 rounded-lg transition-colors ${
                          currentStatus === 'present'
                            ? 'bg-green-100 text-green-600'
                            : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                        }`}
                        title="حاضر"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                      
                      <button
                        onClick={() => handleAttendanceChange(student.id, 'late')}
                        disabled={saving}
                        className={`p-2 rounded-lg transition-colors ${
                          currentStatus === 'late'
                            ? 'bg-yellow-100 text-yellow-600'
                            : 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50'
                        }`}
                        title="متأخر"
                      >
                        <AlertCircle className="w-5 h-5" />
                      </button>
                      
                      <button
                        onClick={() => handleAttendanceChange(student.id, 'absent')}
                        disabled={saving}
                        className={`p-2 rounded-lg transition-colors ${
                          currentStatus === 'absent'
                            ? 'bg-red-100 text-red-600'
                            : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                        }`}
                        title="غائب"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Attendance