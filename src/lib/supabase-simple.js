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

// Database helper functions - نسخة مبسطة تعمل مع الجداول الأساسية
export const db = {
  // Groups
  async getGroups(userId) {
    if (!userId) {
      console.error('User ID is required for getGroups')
      return []
    }
    
    try {
      console.log('Fetching groups for user:', userId)
      
      const { data, error } = await supabase
        .from('groups')
        .select(`
          *,
          students(id, name, paid, payment_amount, last_payment_date, payment_frequency)
        `)
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Supabase error fetching groups:', error)
        console.error('Error code:', error.code)
        console.error('Error message:', error.message)
        return []
      }
      
      console.log('Raw groups data:', data)
      
      if (!data || data.length === 0) {
        console.log('No groups found for user')
        return []
      }
      
      // حساب حالة الدفع لكل مجموعة
      const groupsWithStatus = data.map(group => {
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
      
      console.log('Processed groups:', groupsWithStatus)
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
    if (!groupData.month) {
      throw new Error('شهر المجموعة مطلوب')
    }
    // تطبيع سعر الحصة
    if (groupData.session_price === undefined || groupData.session_price === null) {
      groupData.session_price = 0
    } else {
      groupData.session_price = parseFloat(groupData.session_price) || 0
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
      // التحقق من وجود المجموعة أولاً
      const { data: groupExists, error: groupError } = await supabase
        .from('groups')
        .select('id')
        .eq('id', groupId)
        .single()
      
      if (groupError || !groupExists) {
        throw new Error('المجموعة غير موجودة')
      }
      
      // إعداد البيانات المطلوبة فقط
      const studentToInsert = {
        group_id: groupId,
        name: studentData.name.trim(),
        paid: Boolean(studentData.paid),
        month: studentData.month || 'يناير',
        payment_frequency: studentData.payment_frequency || 'شهري',
        note: studentData.note || null,
        payment_amount: parseFloat(studentData.payment_amount) || 0,
        total_sessions: parseInt(studentData.total_sessions) || 4,
        completed_sessions: parseInt(studentData.completed_sessions) || 0
      }
      
      console.log('Inserting student:', studentToInsert)
      
      const { data, error } = await supabase
        .from('students')
        .insert([studentToInsert])
        .select()
        .single()
      
      if (error) {
        console.error('Supabase error:', error)
        console.error('Error code:', error.code)
        console.error('Error details:', error.details)
        console.error('Error hint:', error.hint)
        console.error('Error message:', error.message)
        
        // رسائل خطأ أكثر وضوحاً
        if (error.code === '23503') {
          throw new Error('المجموعة غير موجودة أو لا يمكن الوصول إليها')
        } else if (error.code === '23505') {
          throw new Error('الطالب موجود بالفعل في هذه المجموعة')
        } else if (error.code === '42501') {
          throw new Error('ليس لديك صلاحية لإضافة طلاب لهذه المجموعة')
        } else {
          throw new Error(`فشل في إضافة الطالب: ${error.message}`)
        }
      }
      
      console.log('Student created successfully:', data)
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

  // Attendance System
  async getAttendance(groupId, date) {
    if (!groupId || !date) {
      throw new Error('Group ID and Date are required')
    }
    
    try {
      console.log('Getting attendance for:', { groupId, date })
      
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('group_id', groupId)
        .eq('attendance_date', date)
      
      if (error) {
        console.error('Error fetching attendance:', error)
        return []
      }
      
      console.log('Attendance data:', data)
      return data || []
    } catch (error) {
      console.error('Error in getAttendance:', error)
      return []
    }
  },

  async updateAttendance(studentId, groupId, date, status, note = null) {
    if (!studentId || !groupId || !date || !status) {
      throw new Error('Student ID, Group ID, Date and Status are required')
    }
    
    try {
      console.log('Updating attendance:', { studentId, groupId, date, status, note })
      
      // التحقق من وجود السجل
      const { data: existingRecord } = await supabase
        .from('attendance')
        .select('id')
        .eq('student_id', studentId)
        .eq('group_id', groupId)
        .eq('attendance_date', date)
        .single()
      
      const updateData = { 
        status: status,
        updated_at: new Date().toISOString()
      }
      
      if (note !== null) {
        updateData.note = note
      }
      
      if (existingRecord) {
        // تحديث السجل الموجود
        const { data, error } = await supabase
          .from('attendance')
          .update(updateData)
          .eq('id', existingRecord.id)
          .select()
          .single()
        
        if (error) {
          console.error('Error updating attendance:', error)
          throw new Error('فشل في تحديث الحضور')
        }
        console.log('Attendance updated:', data)
        return data
      } else {
        // إنشاء سجل جديد
        const insertData = {
          student_id: studentId,
          group_id: groupId,
          attendance_date: date,
          status: status
        }
        
        if (note !== null) {
          insertData.note = note
        }
        
        const { data, error } = await supabase
          .from('attendance')
          .insert([insertData])
          .select()
          .single()
        
        if (error) {
          console.error('Error creating attendance:', error)
          throw new Error('فشل في تسجيل الحضور')
        }
        console.log('Attendance created:', data)
        return data
      }
    } catch (error) {
      console.error('Error in updateAttendance:', error)
      throw error
    }
  },

  async getAttendanceStats(groupId, startDate, endDate) {
    if (!groupId) {
      throw new Error('Group ID is required')
    }
    
    try {
      let query = supabase
        .from('attendance')
        .select('*')
        .eq('group_id', groupId)
      
      if (startDate) {
        query = query.gte('attendance_date', startDate)
      }
      if (endDate) {
        query = query.lte('attendance_date', endDate)
      }
      
      const { data, error } = await query
      
      if (error) {
        console.error('Error fetching attendance stats:', error)
        return {
          totalRecords: 0,
          present: 0,
          absent: 0,
          late: 0
        }
      }
      
      const stats = {
        totalRecords: data.length,
        present: data.filter(r => r.status === 'present').length,
        absent: data.filter(r => r.status === 'absent').length,
        late: data.filter(r => r.status === 'late').length
      }
      
      return stats
    } catch (error) {
      console.error('Error in getAttendanceStats:', error)
      return {
        totalRecords: 0,
        present: 0,
        absent: 0,
        late: 0
      }
    }
  },

  // إنشاء مجموعة تجريبية
  async createSampleGroup(userId) {
    if (!userId) {
      throw new Error('User ID is required')
    }
    
    try {
      const sampleGroup = {
        name: 'مجموعة تجريبية',
        category: 'سناتر',
        location: 'القاهرة',
        day: 'السبت',
        time: '09:00',
        month: 'يناير',
        payment_frequency: 'شهري',
        sessions_per_month: 4,
        created_by: userId
      }
      
      const { data, error } = await supabase
        .from('groups')
        .insert([sampleGroup])
        .select()
        .single()
      
      if (error) {
        console.error('Error creating sample group:', error)
        throw new Error('فشل في إنشاء المجموعة التجريبية')
      }
      
      // إضافة طالب تجريبي
      const sampleStudent = {
        group_id: data.id,
        name: 'طالب تجريبي',
        paid: false,
        month: 'يناير',
        payment_frequency: 'شهري',
        payment_amount: 100,
        total_sessions: 4,
        completed_sessions: 0
      }
      
      await supabase
        .from('students')
        .insert([sampleStudent])
      
      return data
    } catch (error) {
      console.error('Error in createSampleGroup:', error)
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
      const transactionsData = await this.getTransactions(userId)
      const totalGroups = groupsData?.length || 0
      let totalStudents = 0
      let paidStudents = 0
      if (groupsData) {
        groupsData.forEach(group => {
          const students = group.students || []
          totalStudents += students.length
          paidStudents += students.filter(s => s.paid).length
        })
      }
      const totalDeposits = (transactionsData || [])
        .filter(t => t.type === 'deposit')
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0)
      const totalWithdrawn = (transactionsData || [])
        .filter(t => t.type === 'withdraw')
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0)
      return {
        totalGroups,
        totalStudents,
        paidStudents,
        unpaidStudents: totalStudents - paidStudents,
        totalRevenue: totalDeposits,
        totalWithdrawn,
        totalDeposits,
        netProfit: totalDeposits - totalWithdrawn
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
