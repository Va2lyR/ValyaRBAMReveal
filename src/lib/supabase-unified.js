import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Database helper functions - النظام الموحد والمحسن
export const db = {
  // Groups
  async getGroups(userId) {
    if (!userId) {
      throw new Error('User ID is required')
    }
    
    try {
      const { data, error } = await supabase
        .from('groups')
        .select(`
          *,
          students(id, paid, payment_amount, last_payment_date, current_month)
        `)
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching groups:', error)
        return []
      }
      
      // حساب حالة الدفع لكل مجموعة
      const groupsWithStatus = (data || []).map(group => {
        const students = group.students || []
        const totalStudents = students.length
        const paidStudents = students.filter(s => s.paid).length
        
        let paymentStatus = 'unpaid'
        if (totalStudents > 0) {
          if (paidStudents === totalStudents) {
            paymentStatus = 'paid'
          } else if (paidStudents > 0) {
            paymentStatus = 'partial'
          }
        }
        
        return {
          ...group,
          payment_status: paymentStatus,
          student_count: totalStudents,
          paid_students: paidStudents,
          unpaid_students: totalStudents - paidStudents
        }
      })
      
      return groupsWithStatus
    } catch (error) {
      console.error('Error in getGroups:', error)
      return []
    }
  },

  async getGroupById(id, userId) {
    if (!id || !userId) {
      throw new Error('Group ID and User ID are required')
    }
    
    const groupId = parseInt(id)
    if (isNaN(groupId)) {
      throw new Error('Group ID must be a valid number')
    }
    
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .eq('created_by', userId)
        .single()
      
      if (error) {
        console.error('Error fetching group:', error)
        if (error.code === 'PGRST116') {
          throw new Error('المجموعة غير موجودة')
        }
        throw new Error('فشل في تحميل المجموعة')
      }
      return data
    } catch (error) {
      console.error('Error in getGroupById:', error)
      throw error
    }
  },

  async createGroup(groupData) {
    if (!groupData.created_by) {
      throw new Error('User ID is required')
    }
    
    // التحقق من البيانات المطلوبة
    if (!groupData.name?.trim()) {
      throw new Error('اسم المجموعة مطلوب')
    }
    if (!groupData.location?.trim()) {
      throw new Error('مكان المجموعة مطلوب')
    }
    if (!groupData.day) {
      throw new Error('يوم المجموعة مطلوب')
    }
    if (!groupData.time) {
      throw new Error('وقت المجموعة مطلوب')
    }
    
    try {
      const { data, error } = await supabase
        .from('groups')
        .insert([groupData])
        .select()
        .single()
      
      if (error) {
        console.error('Error creating group:', error)
        throw new Error('فشل في إنشاء المجموعة')
      }
      return data
    } catch (error) {
      console.error('Error in createGroup:', error)
      throw error
    }
  },

  async updateGroup(id, updates) {
    if (!id) {
      throw new Error('Group ID is required')
    }
    
    const groupId = parseInt(id)
    if (isNaN(groupId)) {
      throw new Error('Group ID must be a valid number')
    }
    
    try {
      const { data, error } = await supabase
        .from('groups')
        .update(updates)
        .eq('id', groupId)
        .select()
        .single()
      
      if (error) {
        console.error('Error updating group:', error)
        throw new Error('فشل في تحديث المجموعة')
      }
      return data
    } catch (error) {
      console.error('Error in updateGroup:', error)
      throw error
    }
  },

  async deleteGroup(id) {
    if (!id) {
      throw new Error('Group ID is required')
    }
    
    const groupId = parseInt(id)
    if (isNaN(groupId)) {
      throw new Error('Group ID must be a valid number')
    }
    
    try {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId)
      
      if (error) {
        console.error('Error deleting group:', error)
        throw new Error('فشل في حذف المجموعة')
      }
    } catch (error) {
      console.error('Error in deleteGroup:', error)
      throw error
    }
  },

  // Students
  async getStudents(groupId) {
    if (!groupId) {
      throw new Error('Group ID is required')
    }
    
    const id = parseInt(groupId)
    if (isNaN(id)) {
      throw new Error('Group ID must be a valid number')
    }
    
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('group_id', id)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching students:', error)
        return []
      }
      return data || []
    } catch (error) {
      console.error('Error in getStudents:', error)
      return []
    }
  },

  async getStudentById(id) {
    if (!id) {
      throw new Error('Student ID is required')
    }
    
    const studentId = parseInt(id)
    if (isNaN(studentId)) {
      throw new Error('Student ID must be a valid number')
    }
    
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          groups!inner(created_by)
        `)
        .eq('id', studentId)
        .single()
      
      if (error) {
        console.error('Error fetching student:', error)
        throw new Error('فشل في تحميل بيانات الطالب')
      }
      return data
    } catch (error) {
      console.error('Error in getStudentById:', error)
      throw error
    }
  },

  async createStudent(studentData) {
    if (!studentData.group_id) {
      throw new Error('Group ID is required')
    }
    
    if (!studentData.name?.trim()) {
      throw new Error('اسم الطالب مطلوب')
    }
    
    const groupId = parseInt(studentData.group_id)
    if (isNaN(groupId)) {
      throw new Error('Group ID must be a valid number')
    }
    
    try {
      const { data, error } = await supabase
        .from('students')
        .insert([{ ...studentData, group_id: groupId }])
        .select()
        .single()
      
      if (error) {
        console.error('Error creating student:', error)
        throw new Error('فشل في إضافة الطالب')
      }
      return data
    } catch (error) {
      console.error('Error in createStudent:', error)
      throw error
    }
  },

  async updateStudent(id, updates) {
    if (!id) {
      throw new Error('Student ID is required')
    }
    
    const studentId = parseInt(id)
    if (isNaN(studentId)) {
      throw new Error('Student ID must be a valid number')
    }
    
    try {
      const { data, error } = await supabase
        .from('students')
        .update(updates)
        .eq('id', studentId)
        .select()
        .single()
      
      if (error) {
        console.error('Error updating student:', error)
        throw new Error('فشل في تحديث بيانات الطالب')
      }
      return data
    } catch (error) {
      console.error('Error in updateStudent:', error)
      throw error
    }
  },

  async deleteStudent(id) {
    if (!id) {
      throw new Error('Student ID is required')
    }
    
    const studentId = parseInt(id)
    if (isNaN(studentId)) {
      throw new Error('Student ID must be a valid number')
    }
    
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId)
      
      if (error) {
        console.error('Error deleting student:', error)
        throw new Error('فشل في حذف الطالب')
      }
    } catch (error) {
      console.error('Error in deleteStudent:', error)
      throw error
    }
  },

  // Sessions
  async getSessions(groupId, month = null) {
    if (!groupId) {
      throw new Error('Group ID is required')
    }
    
    const id = parseInt(groupId)
    if (isNaN(id)) {
      throw new Error('Group ID must be a valid number')
    }
    
    try {
      let query = supabase
        .from('sessions')
        .select('*')
        .eq('group_id', id)
        .order('session_number', { ascending: true })
      
      if (month) {
        query = query.eq('month', month)
      }
      
      const { data, error } = await query
      
      if (error) {
        console.error('Error fetching sessions:', error)
        return []
      }
      return data || []
    } catch (error) {
      console.error('Error in getSessions:', error)
      return []
    }
  },

  async createSession(sessionData) {
    if (!sessionData.group_id) {
      throw new Error('Group ID is required')
    }
    
    if (!sessionData.session_date) {
      throw new Error('تاريخ الجلسة مطلوب')
    }
    
    if (!sessionData.session_number) {
      throw new Error('رقم الجلسة مطلوب')
    }
    
    try {
      const { data, error } = await supabase
        .from('sessions')
        .insert([sessionData])
        .select()
        .single()
      
      if (error) {
        console.error('Error creating session:', error)
        throw new Error('فشل في إنشاء الجلسة')
      }
      return data
    } catch (error) {
      console.error('Error in createSession:', error)
      throw error
    }
  },

  // Attendance
  async getAttendance(groupId, sessionId = null) {
    if (!groupId) {
      throw new Error('Group ID is required')
    }
    
    try {
      let query = supabase
        .from('student_attendance')
        .select(`
          *,
          students(name),
          sessions(session_number, session_date)
        `)
        .eq('group_id', groupId)
      
      if (sessionId) {
        query = query.eq('session_id', sessionId)
      }
      
      const { data, error } = await query
      
      if (error) {
        console.error('Error fetching attendance:', error)
        return []
      }
      return data || []
    } catch (error) {
      console.error('Error in getAttendance:', error)
      return []
    }
  },

  async updateAttendance(studentId, sessionId, groupId, attendanceStatus, paymentStatus = 'unpaid') {
    if (!studentId || !sessionId || !groupId || !attendanceStatus) {
      throw new Error('Student ID, Session ID, Group ID and Attendance Status are required')
    }
    
    try {
      // التحقق من وجود السجل
      const { data: existingRecord } = await supabase
        .from('student_attendance')
        .select('id')
        .eq('student_id', studentId)
        .eq('session_id', sessionId)
        .single()
      
      if (existingRecord) {
        // تحديث السجل الموجود
        const { data, error } = await supabase
          .from('student_attendance')
          .update({ 
            attendance_status: attendanceStatus,
            payment_status: paymentStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRecord.id)
          .select()
          .single()
        
        if (error) {
          console.error('Error updating attendance:', error)
          throw new Error('فشل في تحديث الحضور')
        }
        return data
      } else {
        // إنشاء سجل جديد
        const { data, error } = await supabase
          .from('student_attendance')
          .insert([{
            student_id: studentId,
            session_id: sessionId,
            group_id: groupId,
            attendance_status: attendanceStatus,
            payment_status: paymentStatus
          }])
          .select()
          .single()
        
        if (error) {
          console.error('Error creating attendance:', error)
          throw new Error('فشل في تسجيل الحضور')
        }
        return data
      }
    } catch (error) {
      console.error('Error in updateAttendance:', error)
      throw error
    }
  },

  async markAllAttendance(groupId, sessionId, attendanceStatus) {
    if (!groupId || !sessionId || !attendanceStatus) {
      throw new Error('Group ID, Session ID and Attendance Status are required')
    }
    
    try {
      // الحصول على جميع الطلاب في المجموعة
      const students = await this.getStudents(groupId)
      
      // تحديث حضور جميع الطلاب
      for (const student of students) {
        await this.updateAttendance(student.id, sessionId, groupId, attendanceStatus)
      }
      
      return { success: true, count: students.length }
    } catch (error) {
      console.error('Error in markAllAttendance:', error)
      throw error
    }
  },

  // Transactions
  async getTransactions(userId) {
    if (!userId) {
      throw new Error('User ID is required')
    }
    
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          groups(name),
          students(name)
        `)
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching transactions:', error)
        return []
      }
      return data || []
    } catch (error) {
      console.error('Error in getTransactions:', error)
      return []
    }
  },

  async createTransaction(transactionData) {
    if (!transactionData.created_by) {
      throw new Error('User ID is required')
    }
    
    if (!transactionData.amount || transactionData.amount <= 0) {
      throw new Error('المبلغ يجب أن يكون أكبر من صفر')
    }
    
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([transactionData])
        .select()
        .single()
      
      if (error) {
        console.error('Error creating transaction:', error)
        throw new Error('فشل في إنشاء العملية المالية')
      }
      return data
    } catch (error) {
      console.error('Error in createTransaction:', error)
      throw error
    }
  },

  // Statistics
  async getStatistics(userId) {
    if (!userId) {
      throw new Error('User ID is required')
    }
    
    try {
      // إحصائيات المجموعات
      const groupsData = await this.getGroups(userId)
      
      // إحصائيات العمليات المالية
      const transactionsData = await this.getTransactions(userId)
      
      const totalGroups = groupsData?.length || 0
      let totalStudents = 0
      let paidStudents = 0
      let totalRevenue = 0
      
      if (groupsData) {
        groupsData.forEach(group => {
          const students = group.students || []
          totalStudents += students.length
          paidStudents += students.filter(s => s.paid).length
          totalRevenue += students.reduce((sum, s) => sum + (s.payment_amount || 0), 0)
        })
      }
      
      const totalWithdrawn = (transactionsData || [])
        .filter(t => t.type === 'withdraw')
        .reduce((sum, t) => sum + (t.amount || 0), 0)
      
      const totalDeposits = (transactionsData || [])
        .filter(t => t.type === 'deposit')
        .reduce((sum, t) => sum + (t.amount || 0), 0)
      
      return {
        totalGroups,
        totalStudents,
        paidStudents,
        unpaidStudents: totalStudents - paidStudents,
        totalRevenue,
        totalWithdrawn,
        totalDeposits,
        netProfit: totalRevenue + totalDeposits - totalWithdrawn
      }
    } catch (error) {
      console.error('Error fetching statistics:', error)
      return {
        totalGroups: 0,
        totalStudents: 0,
        paidStudents: 0,
        unpaidStudents: 0,
        totalRevenue: 0,
        totalWithdrawn: 0,
        totalDeposits: 0,
        netProfit: 0
      }
    }
  }
}
