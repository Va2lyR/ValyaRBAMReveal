import React, { useState, useEffect } from 'react'
import { db } from '../lib/supabase-unified-fixed'
import { Check, X, CheckCheck, Calendar, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

const SessionTracker = ({ student, group, onUpdate }) => {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)
  const [showAllPaid, setShowAllPaid] = useState(false)

  useEffect(() => {
    if (student?.id) {
      loadSessions()
    }
  }, [student?.id])

  const loadSessions = async () => {
    try {
      setLoading(true)
      const sessionsData = await db.getStudentSessions(student.id)
      
      // إنشاء جلسات افتراضية إذا لم تكن موجودة
      if (sessionsData.length === 0) {
        await createDefaultSessions()
      } else {
        setSessions(sessionsData)
      }
    } catch (error) {
      console.error('Error loading sessions:', error)
      toast.error('فشل في تحميل الجلسات')
    } finally {
      setLoading(false)
    }
  }

  const createDefaultSessions = async () => {
    try {
      const totalSessions = group?.sessions_per_month || 4
      const currentMonth = group?.month || 'يناير'
      const currentDate = new Date()
      
      // التحقق من وجود جلسات موجودة أولاً
      const existingSessions = await db.getStudentSessions(student.id)
      if (existingSessions.length > 0) {
        setSessions(existingSessions)
        return
      }
      
      const newSessions = []
      
      for (let i = 1; i <= totalSessions; i++) {
        const sessionDate = new Date(currentDate)
        sessionDate.setDate(currentDate.getDate() + (i - 1) * 7) // كل أسبوع جلسة
        
        const sessionData = {
          student_id: student.id,
          group_id: group.id,
          session_date: sessionDate.toISOString().split('T')[0],
          session_number: i,
          is_present: false,
          is_paid: false
        }
        
        try {
          const newSession = await db.createStudentSession(sessionData)
          newSessions.push(newSession)
        } catch (error) {
          console.error(`Error creating session ${i}:`, error)
        }
      }
      
      setSessions(newSessions)
    } catch (error) {
      console.error('Error creating default sessions:', error)
      toast.error('فشل في إنشاء الجلسات الافتراضية')
    }
  }

  const toggleSessionPaid = async (sessionId, isPaid) => {
    try {
      // تحديث حالة الدفع فقط، وليس الحضور
      await db.updateStudentSession(sessionId, { is_paid: !isPaid })
      
      // تحديث الجلسات محلياً
      setSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? { ...session, is_paid: !isPaid }
          : session
      ))
      
      toast.success('تم تحديث حالة الدفع')
      
      // إشعار الوالد المكون
      if (onUpdate) {
        onUpdate()
      }
    } catch (error) {
      console.error('Error updating session payment:', error)
      toast.error('فشل في تحديث حالة الدفع')
    }
  }

  const markAllSessionsPaid = async () => {
    try {
      await db.markAllSessionsPaid(student.id, group.id)
      
      // تحديث الجلسات محلياً
      setSessions(prev => prev.map(session => ({ ...session, is_paid: true })))
      
      toast.success('تم تحديد جميع الجلسات كمدفوعة')
      
      // إشعار الوالد المكون
      if (onUpdate) {
        onUpdate()
      }
    } catch (error) {
      console.error('Error marking all sessions paid:', error)
      toast.error('فشل في تحديد جميع الجلسات')
    }
  }

  const paidSessions = sessions.filter(s => s.is_paid).length
  const totalSessions = sessions.length
  const isFullyPaid = paidSessions === totalSessions && totalSessions > 0

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2 space-x-reverse">
          <Calendar className="w-4 h-4 text-gray-600" />
          <h3 className="text-sm font-medium text-gray-900">تتبع الجلسات</h3>
        </div>
        
        <div className="flex items-center space-x-2 space-x-reverse">
          <span className={`text-xs px-2 py-1 rounded-full ${
            isFullyPaid 
              ? 'bg-green-100 text-green-800' 
              : paidSessions > 0 
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
          }`}>
            {paidSessions}/{totalSessions} جلسة
          </span>
          
          {!isFullyPaid && (
            <button
              onClick={markAllSessionsPaid}
              className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full hover:bg-blue-200 transition-colors"
            >
              <CheckCheck className="w-3 h-3 inline ml-1" />
              دفع الكل
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {sessions.map((session, index) => (
          <div key={session.id} className="relative">
            <button
              onClick={() => toggleSessionPaid(session.id, session.is_paid)}
              className={`w-full h-12 border-2 rounded-lg flex items-center justify-center transition-all duration-200 ${
                session.is_paid
                  ? 'bg-green-100 border-green-500 text-green-700 hover:bg-green-200'
                  : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {session.is_paid ? (
                <Check className="w-5 h-5" />
              ) : (
                <X className="w-5 h-5" />
              )}
            </button>
            
            <div className="text-center mt-1">
              <div className="text-xs text-gray-600">جلسة {session.session_number}</div>
              <div className="text-xs text-gray-500">
                {new Date(session.session_date).toLocaleDateString('ar-SA', {
                  month: 'short',
                  day: 'numeric'
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isFullyPaid && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <Check className="w-5 h-5 text-green-600 ml-2" />
            <div>
              <p className="text-sm font-medium text-green-800">
                تم دفع الشهر بالكامل! 🎉
              </p>
              <p className="text-xs text-green-600">
                جميع الجلسات مدفوعة ({paidSessions}/{totalSessions})
              </p>
            </div>
          </div>
        </div>
      )}

      {paidSessions > 0 && !isFullyPaid && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <Clock className="w-5 h-5 text-yellow-600 ml-2" />
            <div>
              <p className="text-sm font-medium text-yellow-800">
                دفع جزئي
              </p>
              <p className="text-xs text-yellow-600">
                {paidSessions} من {totalSessions} جلسة مدفوعة
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SessionTracker
