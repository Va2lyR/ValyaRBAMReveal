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

// Database helper functions
export const db = {
  // Groups
  async getGroups(userId) {
    if (!userId) {
      throw new Error('User ID is required')
    }
    
    const { data, error } = await supabase
      .from('groups')
      .select(`
        *,
        students(id, paid, payment_amount, last_payment_date, completed_sessions, total_sessions)
      `)
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching groups:', error)
      throw new Error('فشل في تحميل المجموعات')
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
  },

  async getGroupById(id, userId) {
    if (!id || !userId) {
      throw new Error('Group ID and User ID are required')
    }
    
    const groupId = parseInt(id)
    if (isNaN(groupId)) {
      throw new Error('Group ID must be a valid number')
    }
    
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
    if (!groupData.month) {
      throw new Error('شهر المجموعة مطلوب')
    }
    
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
  },

  async updateGroup(id, updates) {
    if (!id) {
      throw new Error('Group ID is required')
    }
    
    const groupId = parseInt(id)
    if (isNaN(groupId)) {
      throw new Error('Group ID must be a valid number')
    }
    
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
  },

  async deleteGroup(id) {
    if (!id) {
      throw new Error('Group ID is required')
    }
    
    const groupId = parseInt(id)
    if (isNaN(groupId)) {
      throw new Error('Group ID must be a valid number')
    }
    
    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', groupId)
    
    if (error) {
      console.error('Error deleting group:', error)
      throw new Error('فشل في حذف المجموعة')
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
    
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('group_id', id)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching students:', error)
      throw new Error('فشل في تحميل الطلاب')
    }
    return data || []
  },

  async getStudentById(id) {
    if (!id) {
      throw new Error('Student ID is required')
    }
    
    const studentId = parseInt(id)
    if (isNaN(studentId)) {
      throw new Error('Student ID must be a valid number')
    }
    
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
  },

  async updateStudent(id, updates) {
    if (!id) {
      throw new Error('Student ID is required')
    }
    
    const studentId = parseInt(id)
    if (isNaN(studentId)) {
      throw new Error('Student ID must be a valid number')
    }
    
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
  },

  async deleteStudent(id) {
    if (!id) {
      throw new Error('Student ID is required')
    }
    
    const studentId = parseInt(id)
    if (isNaN(studentId)) {
      throw new Error('Student ID must be a valid number')
    }
    
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', studentId)
    
    if (error) {
      console.error('Error deleting student:', error)
      throw new Error('فشل في حذف الطالب')
    }
  },

  // Transactions
  async getTransactions(userId) {
    if (!userId) {
      throw new Error('User ID is required')
    }
    
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
      throw new Error('فشل في تحميل العمليات المالية')
    }
    return data || []
  },

  async createTransaction(transactionData) {
    if (!transactionData.created_by) {
      throw new Error('User ID is required')
    }
    
    if (!transactionData.amount || transactionData.amount <= 0) {
      throw new Error('المبلغ يجب أن يكون أكبر من صفر')
    }
    
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
  },

  // Payment Management
  async recordPayment(studentId, amount, description = 'دفع رسوم') {
    if (!studentId || !amount) {
      throw new Error('Student ID and amount are required')
    }
    
    const studentIdNum = parseInt(studentId)
    if (isNaN(studentIdNum)) {
      throw new Error('Student ID must be a valid number')
    }
    
    // تحديث حالة الطالب
    const { data: student, error: studentError } = await supabase
      .from('students')
      .update({
        paid: true,
        last_payment_date: new Date().toISOString(),
        payment_amount: amount
      })
      .eq('id', studentIdNum)
      .select(`
        *,
        groups!inner(created_by)
      `)
      .single()
    
    if (studentError) {
      console.error('Error updating student:', studentError)
      throw new Error('فشل في تحديث حالة الطالب')
    }
    
    // تسجيل العملية المالية
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert([{
        student_id: studentIdNum,
        group_id: student.group_id,
        amount: amount,
        type: 'payment',
        description: description,
        created_by: student.groups.created_by
      }])
      .select()
      .single()
    
    if (transactionError) {
      console.error('Error creating transaction:', transactionError)
      throw new Error('فشل في تسجيل العملية المالية')
    }
    
    return { student, transaction }
  },

  // Audit Logs
  async createAuditLog(logData) {
    if (!logData.user_id) {
      throw new Error('User ID is required')
    }
    
    const { data, error } = await supabase
      .from('audit_logs')
      .insert([logData])
      .select()
      .single()
    
    if (error) {
      console.error('Error creating audit log:', error)
      throw new Error('فشل في إنشاء سجل التدقيق')
    }
    return data
  },

  // Student Sessions
  async getStudentSessions(studentId) {
    if (!studentId) {
      throw new Error('Student ID is required')
    }
    
    const id = parseInt(studentId)
    if (isNaN(id)) {
      throw new Error('Student ID must be a valid number')
    }
    
    const { data, error } = await supabase
      .from('student_sessions')
      .select('*')
      .eq('student_id', id)
      .order('session_date', { ascending: true })
    
    if (error) {
      console.error('Error fetching student sessions:', error)
      throw new Error('فشل في تحميل جلسات الطالب')
    }
    return data || []
  },

  async createStudentSession(sessionData) {
    if (!sessionData.student_id || !sessionData.group_id) {
      throw new Error('Student ID and Group ID are required')
    }
    
    const { data, error } = await supabase
      .from('student_sessions')
      .insert([sessionData])
      .select()
      .single()
    
    if (error) {
      console.error('Error creating student session:', error)
      throw new Error('فشل في إنشاء جلسة الطالب')
    }
    return data
  },

  async updateStudentSession(id, updates) {
    if (!id) {
      throw new Error('Session ID is required')
    }
    
    const sessionId = parseInt(id)
    if (isNaN(sessionId)) {
      throw new Error('Session ID must be a valid number')
    }
    
    const { data, error } = await supabase
      .from('student_sessions')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating student session:', error)
      throw new Error('فشل في تحديث جلسة الطالب')
    }
    return data
  },

  async markAllSessionsPaid(studentId, groupId) {
    if (!studentId || !groupId) {
      throw new Error('Student ID and Group ID are required')
    }
    
    const studentIdNum = parseInt(studentId)
    const groupIdNum = parseInt(groupId)
    
    if (isNaN(studentIdNum) || isNaN(groupIdNum)) {
      throw new Error('IDs must be valid numbers')
    }
    
    const { data, error } = await supabase
      .from('student_sessions')
      .update({ is_paid: true })
      .eq('student_id', studentIdNum)
      .eq('group_id', groupIdNum)
      .select()
    
    if (error) {
      console.error('Error marking all sessions paid:', error)
      throw new Error('فشل في تحديد جميع الجلسات كمدفوعة')
    }
    return data
  },

  // Statistics
  async getStatistics(userId) {
    if (!userId) {
      throw new Error('User ID is required')
    }
    
    try {
      // إحصائيات المجموعات
      const { data: groups } = await supabase
        .from('groups')
        .select(`
          *,
          students(id, paid, payment_amount, completed_sessions, total_sessions)
        `)
        .eq('created_by', userId)
      
      // إحصائيات العمليات المالية
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('created_by', userId)
      
      const totalGroups = groups?.length || 0
      let totalStudents = 0
      let paidStudents = 0
      let totalRevenue = 0
      let totalSessions = 0
      let completedSessions = 0
      
      if (groups) {
        groups.forEach(group => {
          const students = group.students || []
          totalStudents += students.length
          paidStudents += students.filter(s => s.paid).length
          totalRevenue += students.reduce((sum, s) => sum + (s.payment_amount || 0), 0)
          totalSessions += students.reduce((sum, s) => sum + (s.total_sessions || 0), 0)
          completedSessions += students.reduce((sum, s) => sum + (s.completed_sessions || 0), 0)
        })
      }
      
      const totalWithdrawn = (transactions || [])
        .filter(t => t.type === 'withdraw')
        .reduce((sum, t) => sum + (t.amount || 0), 0)
      
      const totalDeposits = (transactions || [])
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
        netProfit: totalRevenue + totalDeposits - totalWithdrawn,
        totalSessions,
        completedSessions,
        pendingSessions: totalSessions - completedSessions
      }
    } catch (error) {
      console.error('Error fetching statistics:', error)
      throw new Error('فشل في تحميل الإحصائيات')
    }
  }
}