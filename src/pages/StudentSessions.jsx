import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../lib/supabase-unified-fixed'
import { 
  ArrowRight,
  Calendar,
  Clock,
  Check,
  X,
  CheckCheck,
  Users,
  DollarSign,
  Phone,
  PhoneCall,
  User
} from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'

const StudentSessions = () => {
  const { groupId, studentId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [student, setStudent] = useState(null)
  const [group, setGroup] = useState(null)
  const [sessions, setSessions] = useState([])
  const [stats, setStats] = useState({
    paidSessions: 0,
    totalSessions: 0,
    presentSessions: 0,
    absentSessions: 0
  })

  useEffect(() => {
    if (user && groupId && studentId) {
      loadData()
    }
  }, [user, groupId, studentId])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // تحميل بيانات الطالب
      const studentData = await db.getStudentById(studentId)
      setStudent(studentData)
      
      // تحميل بيانات المجموعة
      const groupData = await db.getGroupById(groupId, user.id)
      setGroup(groupData)
      
      // تحميل الجلسات
      const sessionsData = await db.getStudentSessions(studentId)
      setSessions(sessionsData)
      
      // حساب الإحصائيات من قاعدة البيانات
      const paidSessions = sessionsData.filter(s => s.is_paid).length
      const totalSessions = sessionsData.length
      const presentSessions = sessionsData.filter(s => s.is_present).length
      const absentSessions = totalSessions - presentSessions
      
      setStats({
        paidSessions,
        totalSessions,
        presentSessions,
        absentSessions
      })
      
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('فشل في تحميل البيانات')
      navigate('/groups')
    } finally {
      setLoading(false)
    }
  }

  const handleSessionUpdate = () => {
    // إعادة تحميل البيانات بعد تحديث الجلسات
    loadData()
  }

  const markAllSessionsPaid = async () => {
    try {
      await db.markAllSessionsPaid(studentId, groupId)
      toast.success('تم تحديد جميع الجلسات كمدفوعة')
      loadData()
    } catch (error) {
      console.error('Error marking all sessions paid:', error)
      toast.error('فشل في تحديد جميع الجلسات')
    }
  }

  if (loading) {
    return <LoadingSpinner size="lg" className="min-h-96" />
  }

  if (!student || !group) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">لم يتم العثور على بيانات الطالب أو المجموعة</p>
        <button
          onClick={() => navigate('/groups')}
          className="btn-primary mt-4"
        >
          العودة للمجموعات
        </button>
      </div>
    )
  }

  const isFullyPaid = stats.paidSessions === stats.totalSessions && stats.totalSessions > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 space-x-reverse mb-2">
            <button
              onClick={() => navigate(`/groups/${groupId}`)}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">جلسات الطالب</h1>
          </div>
          <p className="text-gray-600">
            {student.name} - {group.name}
          </p>
        </div>
        
        <div className="flex items-center space-x-3 space-x-reverse">
          {!isFullyPaid && (
            <button
              onClick={markAllSessionsPaid}
              className="btn-success flex items-center"
            >
              <CheckCheck className="w-4 h-4 ml-2" />
              دفع جميع الجلسات
            </button>
          )}
          <button
            onClick={() => navigate(`/groups/${groupId}`)}
            className="btn-secondary"
          >
            العودة للمجموعة
          </button>
        </div>
      </div>

      {/* Student Info Card */}
      <div className="card">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* معلومات الطالب الأساسية */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">معلومات الطالب</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 space-x-reverse">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">{student.name}</h4>
                  <p className="text-sm text-gray-600">{group.name}</p>
                </div>
              </div>
              
              {/* أرقام الهواتف */}
              <div className="space-y-3">
                {student.phone_student && (
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">رقم الطالب:</span>
                    <span className="text-sm font-medium text-gray-900">{student.phone_student}</span>
                  </div>
                )}
                
                {student.phone_father && (
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <PhoneCall className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">رقم الأب:</span>
                    <span className="text-sm font-medium text-gray-900">{student.phone_father}</span>
                  </div>
                )}
                
                {student.phone_mother && (
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <PhoneCall className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">رقم الأم:</span>
                    <span className="text-sm font-medium text-gray-900">{student.phone_mother}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* إحصائيات الطالب */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">إحصائيات الطالب</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.presentSessions}</div>
                <div className="text-sm text-green-800">عدد مرات الحضور</div>
              </div>
              
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{stats.absentSessions}</div>
                <div className="text-sm text-red-800">عدد مرات الغياب</div>
              </div>
              
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{group.name}</div>
                <div className="text-sm text-blue-800">المجموعة</div>
              </div>
              
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{(student.payment_amount || 0).toFixed(2)}</div>
                <div className="text-sm text-yellow-800">المبلغ المدفوع</div>
              </div>
            </div>
            
            {/* حالة الدفع */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">حالة الدفع:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  isFullyPaid 
                    ? 'bg-green-100 text-green-800' 
                    : stats.paidSessions > 0 
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                }`}>
                  {isFullyPaid ? 'مدفوع بالكامل' : stats.paidSessions > 0 ? 'دفع جزئي' : 'غير مدفوع'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sessions Details */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">تفاصيل الجلسات</h2>
        
        {sessions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    رقم الجلسة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    تاريخ الجلسة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الحضور
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    الدفع
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ملاحظات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      جلسة {session.session_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(session.session_date).toLocaleDateString('ar-SA', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        session.is_present 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {session.is_present ? 'حاضر' : 'غائب'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        session.is_paid 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {session.is_paid ? 'مدفوع' : 'غير مدفوع'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {session.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            لا توجد جلسات مسجلة
          </div>
        )}
      </div>

      {/* Payment Summary */}
      {isFullyPaid && (
        <div className="card bg-green-50 border-green-200">
          <div className="flex items-center">
            <Check className="w-8 h-8 text-green-600 ml-4" />
            <div>
              <h3 className="text-lg font-semibold text-green-800">
                تم دفع الشهر بالكامل! 🎉
              </h3>
              <p className="text-green-600">
                جميع الجلسات مدفوعة ({stats.paidSessions}/{stats.totalSessions})
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentSessions
