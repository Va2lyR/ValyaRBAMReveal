import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { db, supabase } from '../lib/supabase-unified-fixed'
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
  Play,
  Pause,
  Trash2,
  AlertTriangle
} from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'

const AttendanceUnified = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [groups, setGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [students, setStudents] = useState([])
  const [sessions, setSessions] = useState([])
  const [selectedSession, setSelectedSession] = useState(null)
  const [attendance, setAttendance] = useState({})
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7))
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState(null)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, late: 0, paid: 0 })

  useEffect(() => {
    if (user) {
      loadGroups()
    }
  }, [user])

  useEffect(() => {
    if (selectedGroup) {
      loadStudents()
      loadSessions()
    }
  }, [selectedGroup, currentMonth])

  useEffect(() => {
    if (selectedSession) {
      loadAttendance()
    }
  }, [selectedSession])

  useEffect(() => {
    // تحديث الإحصائيات عند تغيير البيانات
    if (selectedGroup && selectedSession) {
      updateStats()
    }
  }, [selectedGroup, selectedSession, attendance])

  const updateStats = async () => {
    const newStats = await getAttendanceStats()
    setStats(newStats)
  }

  const loadGroups = async () => {
    try {
      setLoading(true)
      const groupsData = await db.getGroups(user.id)
      const sortedGroups = sortGroupsByNextSession(groupsData || [])
      setGroups(sortedGroups)
    } catch (error) {
      console.error('Error loading groups:', error)
      toast.error('حدث خطأ في تحميل المجموعات')
    } finally {
      setLoading(false)
    }
  }

  const sortGroupsByNextSession = (groups) => {
    const now = new Date()
    const currentDay = now.getDay() // 0 = الأحد, 1 = الاثنين, ...
    const currentTime = now.getHours() * 60 + now.getMinutes() // الوقت بالدقائق

    // خريطة الأيام العربية إلى الأرقام
    const dayMap = {
      'الأحد': 0,
      'الاثنين': 1,
      'الثلاثاء': 2,
      'الأربعاء': 3,
      'الخميس': 4,
      'الجمعة': 5,
      'السبت': 6
    }

    return groups.sort((a, b) => {
      const aDay = dayMap[a.day] || 0
      const bDay = dayMap[b.day] || 0
      
      // تحويل الوقت إلى دقائق
      const aTime = parseTimeToMinutes(a.time)
      const bTime = parseTimeToMinutes(b.time)
      
      // حساب الوقت المتبقي لكل مجموعة
      const aTimeUntil = calculateTimeUntil(aDay, aTime, currentDay, currentTime)
      const bTimeUntil = calculateTimeUntil(bDay, bTime, currentDay, currentTime)
      
      return aTimeUntil - bTimeUntil
    })
  }

  const parseTimeToMinutes = (timeString) => {
    if (!timeString) return 0
    const [hours, minutes] = timeString.split(':').map(Number)
    return (hours || 0) * 60 + (minutes || 0)
  }

  const calculateTimeUntil = (groupDay, groupTime, currentDay, currentTime) => {
    let daysUntil = groupDay - currentDay
    
    // إذا كان اليوم نفسه والوقت لم يأت بعد
    if (daysUntil === 0 && groupTime > currentTime) {
      return groupTime - currentTime
    }
    
    // إذا كان اليوم نفسه والوقت مضى، أو يوم آخر
    if (daysUntil <= 0) {
      daysUntil += 7 // الأسبوع القادم
    }
    
    return daysUntil * 24 * 60 + groupTime - currentTime
  }

  const getNextSessionInfo = (group) => {
    const now = new Date()
    const currentDay = now.getDay()
    const currentTime = now.getHours() * 60 + now.getMinutes()

    const dayMap = {
      'الأحد': 0,
      'الاثنين': 1,
      'الثلاثاء': 2,
      'الأربعاء': 3,
      'الخميس': 4,
      'الجمعة': 5,
      'السبت': 6
    }

    const groupDay = dayMap[group.day] || 0
    const groupTime = parseTimeToMinutes(group.time)
    const timeUntil = calculateTimeUntil(groupDay, groupTime, currentDay, currentTime)

    if (timeUntil < 60) {
      return { text: 'قريباً', color: 'text-red-600', bgColor: 'bg-red-100' }
    } else if (timeUntil < 24 * 60) {
      return { text: 'اليوم', color: 'text-orange-600', bgColor: 'bg-orange-100' }
    } else if (timeUntil < 2 * 24 * 60) {
      return { text: 'غداً', color: 'text-yellow-600', bgColor: 'bg-yellow-100' }
    } else {
      const days = Math.ceil(timeUntil / (24 * 60))
      return { text: `خلال ${days} أيام`, color: 'text-blue-600', bgColor: 'bg-blue-100' }
    }
  }

  const loadStudents = async () => {
    if (!selectedGroup) return
    
    try {
      const studentsData = await db.getStudents(selectedGroup.id)
      setStudents(studentsData || [])
    } catch (error) {
      console.error('Error loading students:', error)
      toast.error('حدث خطأ في تحميل الطلاب')
    }
  }

  const loadSessions = async () => {
    if (!selectedGroup) return
    
    try {
      const sessionsData = await db.getSessions(selectedGroup.id, currentMonth)
      
      // إذا لم تكن هناك جلسات، قم بإنشاء جلسات تلقائياً حسب عدد الجلسات المحدد
      if (!sessionsData || sessionsData.length === 0) {
        await createSessionsForMonth()
      } else {
        setSessions(sessionsData)
      }
    } catch (error) {
      console.error('Error loading sessions:', error)
      toast.error('حدث خطأ في تحميل الجلسات')
      setSessions([])
    }
  }

  const createSessionsForMonth = async () => {
    if (!selectedGroup) return
    
    try {
      const sessionsPerMonth = selectedGroup.sessions_per_month || 4
      const sessions = []
      
      for (let i = 1; i <= sessionsPerMonth; i++) {
        const sessionDate = new Date()
        sessionDate.setDate(sessionDate.getDate() + (i - 1) * 7) // جلسة كل أسبوع
        
        const sessionData = {
          group_id: selectedGroup.id,
          session_number: i,
          session_date: sessionDate.toISOString().split('T')[0],
          month: currentMonth,
          status: 'active'
        }
        
        try {
          const newSession = await db.createSession(sessionData)
          sessions.push(newSession)
        } catch (createError) {
          console.error(`Error creating session ${i}:`, createError)
        }
      }
      
      setSessions(sessions)
      if (sessions.length > 0) {
        toast.success(`تم إنشاء ${sessions.length} جلسة للشهر`)
      }
    } catch (error) {
      console.error('Error creating sessions:', error)
      toast.error('حدث خطأ في إنشاء الجلسات')
    }
  }

  const addNewSession = async () => {
    if (!selectedGroup) return
    
    try {
      // التحقق من الحد الأقصى للجلسات
      const maxSessions = selectedGroup.sessions_per_month || 4
      if (sessions.length >= maxSessions) {
        toast.error(`لا يمكن إضافة أكثر من ${maxSessions} حصة في الشهر`)
        return
      }
      
      const nextSessionNumber = sessions.length + 1
      const today = new Date()
      
      const sessionData = {
        group_id: selectedGroup.id,
        session_number: nextSessionNumber,
        session_date: today.toISOString().split('T')[0],
        month: currentMonth,
        status: 'active'
      }
      
      const newSession = await db.createSession(sessionData)
      setSessions(prev => [...prev, newSession])
      toast.success('تم إضافة حصة جديدة')
    } catch (error) {
      console.error('Error adding new session:', error)
      toast.error('حدث خطأ في إضافة الحصة')
    }
  }

  const handleDeleteSession = (session) => {
    setSessionToDelete(session)
    setShowDeleteConfirm(true)
    setDeletePassword('')
  }

  const confirmDeleteSession = async () => {
    if (!sessionToDelete || !deletePassword.trim()) {
      toast.error('يرجى إدخال كلمة المرور')
      return
    }

    try {
      setDeleting(true)
      
      // التحقق من كلمة المرور
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: deletePassword
      })

      if (authError) {
        toast.error('كلمة المرور غير صحيحة')
        return
      }

      await db.deleteSession(sessionToDelete.id)
      setSessions(prev => prev.filter(session => session.id !== sessionToDelete.id))
      
      // إذا كانت الحصة المحذوفة هي المحددة، قم بإلغاء تحديدها
      if (selectedSession?.id === sessionToDelete.id) {
        setSelectedSession(null)
      }
      
      toast.success('تم حذف الحصة بنجاح')
      setShowDeleteConfirm(false)
      setSessionToDelete(null)
      setDeletePassword('')
    } catch (error) {
      console.error('Error deleting session:', error)
      toast.error('حدث خطأ في حذف الحصة')
    } finally {
      setDeleting(false)
    }
  }

  const loadAttendance = async () => {
    if (!selectedSession) return
    
    try {
      const attendanceData = await db.getAttendance(selectedGroup.id, selectedSession.id)
      const attendanceMap = {}
      attendanceData.forEach(record => {
        attendanceMap[record.student_id] = {
          status: record.attendance_status,
          payment: record.payment_status
        }
      })
      setAttendance(attendanceMap)
    } catch (error) {
      console.error('Error loading attendance:', error)
      setAttendance({})
    }
  }

  const handleAttendanceChange = async (studentId, status) => {
    try {
      await db.updateAttendance(studentId, selectedSession.id, selectedGroup.id, status)
      setAttendance(prev => ({
        ...prev,
        [studentId]: { ...prev[studentId], status }
      }))
      toast.success('تم تحديث حالة الحضور')
    } catch (error) {
      console.error('Error updating attendance:', error)
      toast.error('حدث خطأ في تحديث الحضور')
    }
  }

  const handlePaymentChange = async (studentId, paymentStatus) => {
    try {
      const currentAttendance = attendance[studentId]?.status || 'absent'
      await db.updateAttendance(studentId, selectedSession.id, selectedGroup.id, currentAttendance, paymentStatus)
      setAttendance(prev => ({
        ...prev,
        [studentId]: { ...prev[studentId], payment: paymentStatus }
      }))
      toast.success('تم تحديث حالة الدفع')
    } catch (error) {
      console.error('Error updating payment:', error)
      toast.error('حدث خطأ في تحديث الدفع')
    }
  }

  const markAllPresent = async () => {
    try {
      await db.markAllAttendance(selectedGroup.id, selectedSession.id, 'present')
      const allPresent = {}
      students.forEach(student => {
        allPresent[student.id] = { status: 'present', payment: 'unpaid' }
      })
      setAttendance(allPresent)
      toast.success('تم تحديد جميع الطلاب كحاضرين')
    } catch (error) {
      console.error('Error marking all present:', error)
      toast.error('حدث خطأ في تحديث الحضور')
    }
  }

  const markAllAbsent = async () => {
    try {
      await db.markAllAttendance(selectedGroup.id, selectedSession.id, 'absent')
      const allAbsent = {}
      students.forEach(student => {
        allAbsent[student.id] = { status: 'absent', payment: 'unpaid' }
      })
      setAttendance(allAbsent)
      toast.success('تم تحديد جميع الطلاب كغائبين')
    } catch (error) {
      console.error('Error marking all absent:', error)
      toast.error('حدث خطأ في تحديث الحضور')
    }
  }

  const getAttendanceStats = async () => {
    if (!selectedGroup || !selectedSession) {
      return { total: 0, present: 0, absent: 0, late: 0, paid: 0 }
    }
    
    try {
      // جلب الإحصائيات من قاعدة البيانات مباشرة
      const groupStats = await db.getMonthlyGroupStats(selectedGroup.id)
      return {
        total: groupStats.present + groupStats.absent + groupStats.late,
        present: groupStats.present,
        absent: groupStats.absent,
        late: groupStats.late,
        paid: groupStats.paidCount
      }
    } catch (error) {
      console.error('Error loading attendance stats:', error)
      return { total: 0, present: 0, absent: 0, late: 0, paid: 0 }
    }
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

  if (loading) {
    return <LoadingSpinner size="lg" className="min-h-96" />
  }

  // stats يتم تحديثها عبر useEffect

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">نظام الحضور والغياب الموحد</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">تتبع حضور الطلاب في الحصص</p>
        </div>
        <div className="flex items-center space-x-3 space-x-reverse w-full sm:w-auto">
          <input
            type="month"
            value={currentMonth}
            onChange={(e) => setCurrentMonth(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
          />
        </div>
      </div>

      {/* Next Group Alert */}
      {groups.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="w-5 h-5 text-green-600" />
            </div>
            <div className="mr-3">
              <h3 className="text-sm font-medium text-green-800">
                المجموعة القادمة: {groups[0]?.name}
              </h3>
              <p className="text-sm text-green-700">
                {groups[0]?.day} في {groups[0]?.time} - {groups[0]?.location}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Group Selection */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">اختر المجموعة</h2>
        {groups.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group, index) => {
              const nextSessionInfo = getNextSessionInfo(group)
              const isNextGroup = index === 0 // المجموعة الأولى هي القادمة
              
              return (
                <div
                  key={group.id}
                  onClick={() => setSelectedGroup(group)}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors relative ${
                    selectedGroup?.id === group.id
                      ? 'border-blue-500 bg-blue-50'
                      : isNextGroup
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {isNextGroup && (
                    <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                      القادمة
                    </div>
                  )}
                  
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{group.name}</h3>
                    <div className="flex flex-col items-end space-y-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        group.category === 'سناتر' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {group.category}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${nextSessionInfo.bgColor} ${nextSessionInfo.color}`}>
                        {nextSessionInfo.text}
                      </span>
                    </div>
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
                      {group.student_count} طالب
                    </div>
                    <div className="flex items-center">
                      <span className="text-xs">
                        نظام الدفع: {group.payment_frequency}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد مجموعات</h3>
            <p className="text-gray-600 mb-4">ابدأ بإنشاء مجموعة جديدة</p>
            <button
              onClick={() => navigate('/groups/new')}
              className="btn-primary flex items-center mx-auto"
            >
              <Plus className="w-4 h-4 ml-2" />
              إضافة مجموعة جديدة
            </button>
          </div>
        )}
      </div>

      {/* Session Selection */}
      {selectedGroup && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">حصص الشهر الحالي</h2>
              <p className="text-sm text-gray-600">
                {sessions.length} من {selectedGroup.sessions_per_month || 4} حصة متاحة
              </p>
            </div>
            <button
              onClick={addNewSession}
              disabled={sessions.length >= (selectedGroup.sessions_per_month || 4)}
              className={`flex items-center text-sm ${
                sessions.length >= (selectedGroup.sessions_per_month || 4)
                  ? 'btn-secondary opacity-50 cursor-not-allowed'
                  : 'btn-primary'
              }`}
            >
              <Plus className="w-4 h-4 ml-2" />
              إضافة حصة جديدة
            </button>
          </div>
          {sessions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => setSelectedSession(session)}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedSession?.id === session.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">الحصة {session.session_number}</h3>
                  <div className="flex items-center space-x-2 space-x-reverse">
                  <Play className="w-4 h-4 text-gray-600" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteSession(session)
                      }}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="حذف الحصة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 ml-2" />
                    {new Date(session.session_date).toLocaleDateString('en-GB')}
                  </div>
                </div>
              </div>
            ))}
          </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد حصص</h3>
              <p className="text-gray-600 mb-4">اضغط على "إضافة حصة جديدة" لبدء تسجيل الحضور</p>
            </div>
          )}
          
          {/* رسالة الحد الأقصى */}
          {sessions.length >= (selectedGroup.sessions_per_month || 4) && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-yellow-600 ml-2" />
                <p className="text-sm text-yellow-800">
                  تم الوصول للحد الأقصى من الحصص ({selectedGroup.sessions_per_month || 4} حصة شهرياً)
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Attendance Management */}
      {selectedGroup && selectedSession && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
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
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="mr-3">
                  <p className="text-sm font-medium text-gray-600">متأخر</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.late}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <UserCheck className="w-6 h-6 text-purple-600" />
                </div>
                <div className="mr-3">
                  <p className="text-sm font-medium text-gray-600">مدفوع</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.paid}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                إدارة الحضور - الحصة {selectedSession.session_number}
              </h2>
              <div className="flex items-center space-x-2 space-x-reverse">
                <button
                  onClick={markAllAbsent}
                  className="btn-danger text-sm flex items-center"
                >
                  <UserX className="w-4 h-4 ml-1" />
                  تحديد الكل غائب
                </button>
                <button
                  onClick={markAllPresent}
                  className="btn-success text-sm flex items-center"
                >
                  <UserCheck className="w-4 h-4 ml-1" />
                  تحديد الكل حاضر
                </button>
              </div>
            </div>

            {/* Students List */}
            <div className="space-y-3">
              {students.map((student) => {
                const currentAttendance = attendance[student.id] || { status: 'not_marked', payment: 'unpaid' }
                return (
                  <div key={student.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 rounded-lg gap-4">
                    <div className="flex items-center flex-1">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                        <Users className="w-5 h-5 text-gray-600" />
                      </div>
                      <div className="mr-3 flex-1">
                        <h3 className="font-medium text-gray-900 text-sm sm:text-base">{student.name}</h3>
                        <p className="text-xs sm:text-sm text-gray-600">
                          {student.payment_frequency} - {student.month}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 sm:space-x-reverse">
                      {/* Attendance Status */}
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(currentAttendance.status)}`}>
                          {getStatusText(currentAttendance.status)}
                        </span>
                        
                        <div className="flex items-center space-x-1 space-x-reverse">
                          <button
                            onClick={() => handleAttendanceChange(student.id, 'present')}
                            className={`p-2 sm:p-2 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${
                              currentAttendance.status === 'present'
                                ? 'bg-green-100 text-green-600'
                                : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                            }`}
                            title="حاضر"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          
                          <button
                            onClick={() => handleAttendanceChange(student.id, 'late')}
                            className={`p-2 sm:p-2 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${
                              currentAttendance.status === 'late'
                                ? 'bg-yellow-100 text-yellow-600'
                                : 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50'
                            }`}
                            title="متأخر"
                          >
                            <AlertCircle className="w-5 h-5" />
                          </button>
                          
                          <button
                            onClick={() => handleAttendanceChange(student.id, 'absent')}
                            className={`p-2 sm:p-2 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${
                              currentAttendance.status === 'absent'
                                ? 'bg-red-100 text-red-600'
                                : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                            }`}
                            title="غائب"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Payment Status */}
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
                          currentAttendance.payment === 'paid' 
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : 'bg-red-100 text-red-800 border-red-200'
                        }`}>
                          {currentAttendance.payment === 'paid' ? 'مدفوع' : 'غير مدفوع'}
                        </span>
                        
                        <div className="flex items-center space-x-1 space-x-reverse">
                          <button
                            onClick={() => handlePaymentChange(student.id, 'paid')}
                            className={`p-2 sm:p-2 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${
                              currentAttendance.payment === 'paid'
                                ? 'bg-green-100 text-green-600'
                                : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                            }`}
                            title="تحديد كمدفوع"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          
                          <button
                            onClick={() => handlePaymentChange(student.id, 'unpaid')}
                            className={`p-2 sm:p-2 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${
                              currentAttendance.payment === 'unpaid'
                                ? 'bg-red-100 text-red-600'
                                : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                            }`}
                            title="تحديد كغير مدفوع"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600 ml-2" />
              <h3 className="text-lg font-medium text-gray-900">تأكيد حذف الحصة</h3>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-600 mb-2">
                هل أنت متأكد من حذف الحصة رقم {sessionToDelete?.session_number}؟
              </p>
              <p className="text-sm text-gray-500">
                سيتم حذف جميع بيانات الحضور المرتبطة بهذه الحصة نهائياً.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                كلمة المرور للتأكيد:
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="أدخل كلمة المرور"
                autoComplete="current-password"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end space-y-2 sm:space-y-0 sm:space-x-3 sm:space-x-reverse">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setSessionToDelete(null)
                  setDeletePassword('')
                }}
                className="px-4 py-3 sm:py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors min-h-[44px] flex items-center justify-center"
                disabled={deleting}
              >
                إلغاء
              </button>
              <button
                onClick={confirmDeleteSession}
                disabled={deleting || !deletePassword.trim()}
                className="px-4 py-3 sm:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-h-[44px]"
              >
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                    جاري الحذف...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 ml-2" />
                    حذف الحصة
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AttendanceUnified
