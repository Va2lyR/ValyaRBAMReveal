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
          *
        `)
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching groups:', error)
        return []
      }
      
      // حساب حالة الدفع لكل مجموعة من student_attendance
      const groupsWithStatus = []
      for (const group of (data || [])) {
        // إجمالي الطلاب = عدد الطلاب المميزين الذين لديهم سجلات حضور ضمن المجموعة
        const { data: attendanceRows } = await supabase
          .from('student_attendance')
          .select('student_id, payment_status')
          .eq('group_id', group.id)
        const uniqueStudentIds = new Set((attendanceRows || []).map(r => r.student_id))
        const totalStudents = uniqueStudentIds.size
        const paidCount = (attendanceRows || []).filter(r => r.payment_status === 'paid').length
        const unpaidCount = (attendanceRows || []).filter(r => r.payment_status === 'unpaid').length

        let paymentStatus = 'unpaid'
        if (totalStudents > 0) {
          if (paidCount > 0 && unpaidCount === 0) paymentStatus = 'paid'
          else if (paidCount > 0 && unpaidCount > 0) paymentStatus = 'partial'
          else paymentStatus = 'unpaid'
        }

        groupsWithStatus.push({
          ...group,
          payment_status: paymentStatus,
          student_count: totalStudents,
          paid_students: paidCount,
          unpaid_students: unpaidCount
        })
      }
      
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
      if (groupData.session_price === undefined || groupData.session_price === null) {
        groupData.session_price = 0
      } else {
        groupData.session_price = parseFloat(groupData.session_price) || 0
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
      if (updates.session_price !== undefined) {
        updates.session_price = parseFloat(updates.session_price) || 0
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
        .insert([{ 
          ...studentData, 
          group_id: groupId,
          phone_student: studentData.phone_student || null,
          phone_father: studentData.phone_father || null,
          phone_mother: studentData.phone_mother || null
        }])
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

  async updateSession(id, updates) {
    if (!id) {
      throw new Error('Session ID is required')
    }
    
    const sessionId = parseInt(id)
    if (isNaN(sessionId)) {
      throw new Error('Session ID must be a valid number')
    }
    
    try {
      const { data, error } = await supabase
        .from('sessions')
        .update(updates)
        .eq('id', sessionId)
        .select()
        .single()
      
      if (error) {
        console.error('Error updating session:', error)
        throw new Error('فشل في تحديث الجلسة')
      }
      return data
    } catch (error) {
      console.error('Error in updateSession:', error)
      throw error
    }
  },

  async deleteSession(id) {
    if (!id) {
      throw new Error('Session ID is required')
    }
    
    const sessionId = parseInt(id)
    if (isNaN(sessionId)) {
      throw new Error('Session ID must be a valid number')
    }
    
    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId)
      
      if (error) {
        console.error('Error deleting session:', error)
        throw new Error('فشل في حذف الجلسة')
      }
    } catch (error) {
      console.error('Error in deleteSession:', error)
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

  async getAttendanceStats(groupId, month = null) {
    if (!groupId) {
      throw new Error('Group ID is required')
    }
    
    try {
      const targetMonth = month || new Date().toISOString().slice(0, 7)
      
      const { data, error } = await supabase
        .rpc('get_group_attendance_stats', {
          group_id_param: parseInt(groupId),
          month_param: targetMonth
        })
      
      if (error) {
        console.error('Error fetching attendance stats:', error)
        return {
          total_records: 0,
          present: 0,
          absent: 0,
          late: 0,
          attendance_rate: 0
        }
      }
      
      return data || {
        total_records: 0,
        present: 0,
        absent: 0,
        late: 0,
        attendance_rate: 0
      }
    } catch (error) {
      console.error('Error in getAttendanceStats:', error)
      return {
        total_records: 0,
        present: 0,
        absent: 0,
        late: 0,
        attendance_rate: 0
      }
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

  async markStudentPaid(groupId, studentId, amount, createdBy) {
    if (!groupId || !studentId || !createdBy) {
      throw new Error('Group ID, Student ID and User ID are required')
    }
    const parsedAmount = parseFloat(amount) || 0
    if (parsedAmount <= 0) {
      throw new Error('سعر الحصة غير صالح')
    }
    try {
      // تحديث الطالب كمدفوع
      const { data: updatedStudent, error: studentError } = await supabase
        .from('students')
        .update({
          paid: true,
          last_payment_date: new Date().toISOString(),
          payment_amount: parsedAmount
        })
        .eq('id', parseInt(studentId))
        .select()
        .single()
      if (studentError) {
        console.error('Error updating student paid:', studentError)
        throw new Error('فشل تحديث حالة الدفع للطالب')
      }
      // إنشاء عملية مالية إيداع
      const { data: tx, error: txError } = await supabase
        .from('transactions')
        .insert([{
          type: 'deposit',
          amount: parsedAmount,
          description: `سداد حصة للطالب ${updatedStudent?.name || ''}`.trim(),
          group_id: parseInt(groupId),
          student_id: parseInt(studentId),
          created_by: createdBy
        }])
        .select()
        .single()
      if (txError) {
        console.error('Error creating transaction:', txError)
        throw new Error('فشل تسجيل العملية المالية')
      }
      return { student: updatedStudent, transaction: tx }
    } catch (error) {
      console.error('Error in markStudentPaid:', error)
      throw error
    }
  },

  // Statistics
  async getStatistics(userId) {
    if (!userId) {
      throw new Error('User ID is required')
    }
    
    try {
      // إجمالي المجموعات
      const groupsData = await this.getGroups(userId)
      const totalGroups = groupsData?.length || 0

      // احصائيات الدفع من جدول الحضور الموحد student_attendance
      // ننضم مع groups لجلب session_price ونقيد بالمالك
      const { data: attendanceRows, error: attendanceError } = await supabase
        .from('student_attendance')
        .select(`
          id,
          student_id,
          group_id,
          payment_status,
          groups!inner(created_by, session_price)
        `)
        .eq('groups.created_by', userId)

      if (attendanceError) {
        console.error('Error fetching attendance aggregates:', attendanceError)
        return {
          totalGroups,
          totalStudents: 0,
          paidStudents: 0,
          unpaidStudents: 0,
          totalRevenue: 0,
          totalWithdrawn: 0,
          totalDeposits: 0,
          netProfit: 0
        }
      }

      // حساب عدد المدفوع/غير المدفوع من سجلات الحضور
      const paidRecords = (attendanceRows || []).filter(r => r.payment_status === 'paid')
      const unpaidRecords = (attendanceRows || []).filter(r => r.payment_status === 'unpaid')

      // حساب عدد الطلاب الإجمالي بطريقة فريدة عبر student_id في الحضور
      const uniqueStudentIds = new Set((attendanceRows || []).map(r => r.student_id))
      const totalStudents = uniqueStudentIds.size

      // الإيرادات = مجموع (سعر الحصة للمجموعة × عدد سجلات الحضور المدفوعة)
      const totalRevenue = paidRecords.reduce((sum, r) => sum + (parseFloat(r.groups?.session_price) || 0), 0)

      // يمكن الإبقاء على المعاملات للعرض فقط، لكن الإحصاءات تعتمد على الحضور
      return {
        totalGroups,
        totalStudents,
        paidStudents: paidRecords.length,
        unpaidStudents: unpaidRecords.length,
        totalRevenue,
        totalWithdrawn: 0,
        totalDeposits: totalRevenue,
        netProfit: totalRevenue
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
  ,
  // Monthly stats per group from student_attendance
  async getMonthlyGroupStats(groupId, monthIso = null) {
    if (!groupId) throw new Error('Group ID is required')
    const id = parseInt(groupId)
    const monthPrefix = monthIso || new Date().toISOString().slice(0, 7) // YYYY-MM
    
    try {
      // جلب سجلات الشهر فقط بالاعتماد على created_at للجلسة
      const { data, error } = await supabase
        .from('student_attendance')
        .select(`
          id, 
          attendance_status, 
          payment_status, 
          group_id, 
          created_at, 
          students(id), 
          groups(id, session_price)
        `) 
        .eq('group_id', id)
      
      if (error) {
        console.error('Error fetching monthly stats:', error)
        return { money: 0, paidCount: 0, unpaidCount: 0, present: 0, absent: 0, late: 0 }
      }
      
      // فلترة البيانات حسب الشهر المطلوب
      const rows = (data || []).filter(r => {
        const recordDate = new Date(r.created_at)
        const recordMonth = recordDate.toISOString().slice(0, 7)
        return recordMonth === monthPrefix
      })
      
      const paidCount = rows.filter(r => r.payment_status === 'paid').length
      const unpaidCount = rows.filter(r => r.payment_status === 'unpaid').length
      const present = rows.filter(r => r.attendance_status === 'present').length
      const absent = rows.filter(r => r.attendance_status === 'absent').length
      const late = rows.filter(r => r.attendance_status === 'late').length
      const money = rows.reduce((sum, r) => {
        if (r.payment_status === 'paid') {
          return sum + (parseFloat(r.groups?.session_price) || 0)
        }
        return sum
      }, 0)
      
      return { money, paidCount, unpaidCount, present, absent, late }
    } catch (error) {
      console.error('Error in getMonthlyGroupStats:', error)
      return { money: 0, paidCount: 0, unpaidCount: 0, present: 0, absent: 0, late: 0 }
    }
  }
  ,
  // Per-student stats inside a group
  async getStudentStats(groupId) {
    if (!groupId) throw new Error('Group ID is required')
    const id = parseInt(groupId)
    const { data, error } = await supabase
      .from('student_attendance')
      .select(`student_id, attendance_status, payment_status, groups(session_price)`) 
      .eq('group_id', id)
    if (error) {
      console.error('Error fetching student stats:', error)
      return {}
    }
    const statsByStudent = {}
    for (const row of (data || [])) {
      const sId = row.student_id
      if (!statsByStudent[sId]) {
        statsByStudent[sId] = { present: 0, absent: 0, late: 0, paidTimes: 0, unpaidTimes: 0, money: 0 }
      }
      if (row.attendance_status === 'present') statsByStudent[sId].present++
      else if (row.attendance_status === 'absent') statsByStudent[sId].absent++
      else if (row.attendance_status === 'late') statsByStudent[sId].late++
      if (row.payment_status === 'paid') {
        statsByStudent[sId].paidTimes++
        statsByStudent[sId].money += (parseFloat(row.groups?.session_price) || 0)
      } else if (row.payment_status === 'unpaid') {
        statsByStudent[sId].unpaidTimes++
      }
    }
    return statsByStudent
  },

  // Student Sessions (for StudentSessions page)
  async getStudentSessions(studentId) {
    if (!studentId) {
      throw new Error('Student ID is required')
    }
    
    const id = parseInt(studentId)
    if (isNaN(id)) {
      throw new Error('Student ID must be a valid number')
    }
    
    try {
      const { data, error } = await supabase
        .from('student_attendance')
        .select(`
          id,
          attendance_status,
          payment_status,
          created_at,
          sessions!inner(
            id,
            session_number,
            session_date
          )
        `)
        .eq('student_id', id)
        .order('sessions.session_number', { ascending: true })
      
      if (error) {
        console.error('Error fetching student sessions:', error)
        return []
      }
      
      // تحويل البيانات إلى الشكل المطلوب
      return (data || []).map(record => ({
        id: record.id,
        session_id: record.sessions.id,
        session_number: record.sessions.session_number,
        session_date: record.sessions.session_date,
        is_present: record.attendance_status === 'present',
        is_paid: record.payment_status === 'paid',
        notes: null // يمكن إضافة ملاحظات لاحقاً
      }))
    } catch (error) {
      console.error('Error in getStudentSessions:', error)
      return []
    }
  },

  async createStudentSession(sessionData) {
    if (!sessionData.student_id || !sessionData.group_id) {
      throw new Error('Student ID and Group ID are required')
    }
    
    try {
      // التحقق من وجود جلسة بنفس الرقم للطالب نفسه
      const { data: existingSession } = await supabase
        .from('student_attendance')
        .select(`
          id,
          sessions!inner(session_number)
        `)
        .eq('student_id', sessionData.student_id)
        .eq('group_id', sessionData.group_id)
        .eq('sessions.session_number', sessionData.session_number)
        .single()
      
      if (existingSession) {
        // إرجاع الجلسة الموجودة بدلاً من إنشاء جديدة
        return {
          id: existingSession.id,
          session_id: existingSession.sessions.id,
          session_number: sessionData.session_number,
          session_date: sessionData.session_date,
          is_present: false,
          is_paid: false,
          notes: null
        }
      }
      
      // إنشاء جلسة أولاً
      const sessionRecord = {
        group_id: sessionData.group_id,
        session_number: sessionData.session_number,
        session_date: sessionData.session_date,
        month: new Date(sessionData.session_date).toISOString().slice(0, 7)
      }
      
      const { data: newSession, error: sessionError } = await supabase
        .from('sessions')
        .insert([sessionRecord])
        .select()
        .single()
      
      if (sessionError) {
        console.error('Error creating session:', sessionError)
        throw new Error('فشل في إنشاء الجلسة')
      }
      
      // إنشاء سجل حضور للطالب
      const attendanceRecord = {
        student_id: sessionData.student_id,
        session_id: newSession.id,
        group_id: sessionData.group_id,
        attendance_status: sessionData.is_present ? 'present' : 'absent',
        payment_status: sessionData.is_paid ? 'paid' : 'unpaid'
      }
      
      const { data: newAttendance, error: attendanceError } = await supabase
        .from('student_attendance')
        .insert([attendanceRecord])
        .select()
        .single()
      
      if (attendanceError) {
        console.error('Error creating attendance:', attendanceError)
        throw new Error('فشل في إنشاء سجل الحضور')
      }
      
      return {
        id: newAttendance.id,
        session_id: newSession.id,
        session_number: newSession.session_number,
        session_date: newSession.session_date,
        is_present: attendanceRecord.attendance_status === 'present',
        is_paid: attendanceRecord.payment_status === 'paid',
        notes: null
      }
    } catch (error) {
      console.error('Error in createStudentSession:', error)
      throw error
    }
  },

  async updateStudentSession(sessionId, updates) {
    if (!sessionId) {
      throw new Error('Session ID is required')
    }
    
    try {
      const updateData = {}
      
      // تحديث حالة الحضور فقط إذا تم تمريرها صراحة
      if (updates.is_present !== undefined) {
        updateData.attendance_status = updates.is_present ? 'present' : 'absent'
      }
      
      // تحديث حالة الدفع فقط إذا تم تمريرها صراحة
      if (updates.is_paid !== undefined) {
        updateData.payment_status = updates.is_paid ? 'paid' : 'unpaid'
      }
      
      // إذا لم يتم تمرير أي تحديثات، لا نفعل شيئاً
      if (Object.keys(updateData).length === 0) {
        return { id: sessionId }
      }
      
      updateData.updated_at = new Date().toISOString()
      
      const { data, error } = await supabase
        .from('student_attendance')
        .update(updateData)
        .eq('id', sessionId)
        .select()
        .single()
      
      if (error) {
        console.error('Error updating student session:', error)
        throw new Error('فشل في تحديث الجلسة')
      }
      
      return data
    } catch (error) {
      console.error('Error in updateStudentSession:', error)
      throw error
    }
  },

  async markAllSessionsPaid(studentId, groupId) {
    if (!studentId || !groupId) {
      throw new Error('Student ID and Group ID are required')
    }
    
    try {
      const { data, error } = await supabase
        .from('student_attendance')
        .update({ 
          payment_status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('student_id', studentId)
        .eq('group_id', groupId)
        .select()
      
      if (error) {
        console.error('Error marking all sessions paid:', error)
        throw new Error('فشل في تحديد جميع الجلسات كمدفوعة')
      }
      
      return data
    } catch (error) {
      console.error('Error in markAllSessionsPaid:', error)
      throw error
    }
  }
}
