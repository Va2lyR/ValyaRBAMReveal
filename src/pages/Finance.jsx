import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../lib/supabase-unified-fixed'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Download,
  Plus,
  Minus,
  Calendar,
  FileText,
  Users,
  Wallet
} from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'

const Finance = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState([])
  const [groups, setGroups] = useState([])
  const [students, setStudents] = useState([])
  const [stats, setStats] = useState({
    totalGroups: 0,
    totalStudents: 0,
    paidStudents: 0,
    unpaidStudents: 0,
    totalRevenue: 0,
    totalWithdrawn: 0,
    totalDeposits: 0,
    netProfit: 0
  })
  const [showAddMoney, setShowAddMoney] = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (user) {
      loadFinanceData()
    }
  }, [user])

  const loadFinanceData = async () => {
    try {
      setLoading(true)
      
      // Load statistics
      const statistics = await db.getStatistics(user.id)
      setStats(statistics)
      
      // Load groups and students
      const groupsData = await db.getGroups(user.id)
      setGroups(groupsData || [])
      
      let allStudents = []
      if (groupsData && groupsData.length > 0) {
        for (const group of groupsData) {
          try {
            const groupStudents = await db.getStudents(group.id)
            allStudents = [...allStudents, ...(groupStudents || []).map(s => ({ ...s, group_name: group.name }))]
          } catch (error) {
            console.error(`Error loading students for group ${group.id}:`, error)
          }
        }
      }
      setStudents(allStudents)
      
      // Load transactions
      try {
        const transactionsData = await db.getTransactions(user.id)
        setTransactions(transactionsData || [])
      } catch (error) {
        console.error('Error loading transactions:', error)
        setTransactions([])
      }
      
    } catch (error) {
      console.error('Error loading finance data:', error)
      setGroups([])
      setStudents([])
      setTransactions([])
      setStats({
        totalGroups: 0,
        totalStudents: 0,
        paidStudents: 0,
        unpaidStudents: 0,
        totalRevenue: 0,
        totalWithdrawn: 0,
        totalDeposits: 0,
        netProfit: 0
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddMoney = async () => {
    if (!amount || isNaN(amount) || amount <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح')
      return
    }

    try {
      await db.createTransaction({
        group_id: null,
        student_id: null,
        amount: parseFloat(amount),
        type: 'deposit',
        description: description || 'إضافة أموال',
        created_by: user.id
      })
      
      toast.success('تم إضافة الأموال بنجاح')
      setShowAddMoney(false)
      setAmount('')
      setDescription('')
      loadFinanceData()
    } catch (error) {
      console.error('Error adding money:', error)
      toast.error('حدث خطأ في إضافة الأموال')
    }
  }

  const handleWithdraw = async () => {
    if (!amount || isNaN(amount) || amount <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح')
      return
    }

    if (parseFloat(amount) > stats.netProfit) {
      toast.error('المبلغ المراد سحبه أكبر من الأرباح المتاحة')
      return
    }

    try {
      await db.createTransaction({
        group_id: null,
        student_id: null,
        amount: parseFloat(amount),
        type: 'withdraw',
        description: description || 'سحب أرباح',
        created_by: user.id
      })
      
      toast.success('تم سحب الأرباح بنجاح')
      setShowWithdraw(false)
      setAmount('')
      setDescription('')
      loadFinanceData()
    } catch (error) {
      console.error('Error withdrawing:', error)
      toast.error('حدث خطأ في سحب الأرباح')
    }
  }

  const exportToCSV = () => {
    const csvData = [
      ['اسم المجموعة', 'اسم الطالب', 'حالة الدفع', 'آخر دفع', 'المبلغ', 'الشهر', 'التاريخ'],
      ...students.map(student => [
        student.group_name,
        student.name,
        student.paid ? 'مدفوع' : 'غير مدفوع',
        student.last_payment_date ? new Date(student.last_payment_date).toLocaleDateString('ar-SA') : '-',
        student.payment_amount || 0,
        student.month,
        new Date(student.created_at).toLocaleDateString('ar-SA')
      ])
    ]
    
    const csvContent = csvData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `finance-report-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    
    toast.success('تم تصدير البيانات بنجاح')
  }

  const exportToJSON = () => {
    const jsonData = {
      exportDate: new Date().toISOString(),
      stats,
      students: students.map(student => ({
        groupName: student.group_name,
        studentName: student.name,
        paid: student.paid,
        lastPaymentDate: student.last_payment_date,
        paymentAmount: student.payment_amount,
        month: student.month,
        date: student.created_at
      })),
      transactions: transactions.map(transaction => ({
        groupName: transaction.groups?.name || 'عام',
        studentName: transaction.students?.name || 'عام',
        amount: transaction.amount,
        type: transaction.type,
        description: transaction.description,
        date: transaction.created_at
      }))
    }
    
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `finance-report-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    
    toast.success('تم تصدير البيانات بنجاح')
  }

  if (loading) {
    return <LoadingSpinner size="lg" className="min-h-96" />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الحسابات</h1>
          <p className="text-gray-600 mt-1">إدارة الأرباح والعمليات المالية</p>
        </div>
        <div className="flex items-center space-x-3 space-x-reverse">
          <button
            onClick={exportToJSON}
            className="btn-secondary flex items-center"
          >
            <FileText className="w-4 h-4 ml-2" />
            تصدير JSON
          </button>
          <button
            onClick={exportToCSV}
            className="btn-secondary flex items-center"
          >
            <Download className="w-4 h-4 ml-2" />
            تصدير CSV
          </button>
          <button
            onClick={() => setShowAddMoney(true)}
            className="btn-success flex items-center"
          >
            <Plus className="w-4 h-4 ml-2" />
            إضافة أموال
          </button>
          <button
            onClick={() => setShowWithdraw(true)}
            className="btn-primary flex items-center"
            disabled={stats.netProfit <= 0}
          >
            <Minus className="w-4 h-4 ml-2" />
            سحب الأرباح
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div className="mr-3">
              <p className="text-sm font-medium text-gray-600">الفلوس</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Wallet className="w-6 h-6 text-blue-600" />
            </div>
            <div className="mr-3">
              <p className="text-sm font-medium text-gray-600">عدد المرات الدفع</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalDeposits.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-lg">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
            <div className="mr-3">
              <p className="text-sm font-medium text-gray-600">المبالغ المسحوبة</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalWithdrawn.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className={`p-3 rounded-lg ${stats.netProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              <DollarSign className={`w-6 h-6 ${stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
            <div className="mr-3">
              <p className="text-sm font-medium text-gray-600">صافي الأرباح</p>
              <p className={`text-2xl font-bold ${stats.netProfit >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                {stats.netProfit.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Student Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-gray-100 rounded-lg">
              <Users className="w-6 h-6 text-gray-700" />
            </div>
            <div className="mr-3">
              <p className="text-sm font-medium text-gray-600">إجمالي الطلاب</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div className="mr-3">
              <p className="text-sm font-medium text-gray-600">الطلاب المدفوعين</p>
              <p className="text-2xl font-bold text-gray-900">{stats.paidStudents}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-lg">
              <Users className="w-6 h-6 text-red-600" />
            </div>
            <div className="mr-3">
              <p className="text-sm font-medium text-gray-600">الطلاب غير المدفوعين</p>
              <p className="text-2xl font-bold text-gray-900">{stats.unpaidStudents}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions History */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">سجل العمليات</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المجموعة/الطالب
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المبلغ
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  نوع العملية
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الوصف
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  التاريخ
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {transaction.groups?.name || transaction.students?.name || 'عام'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transaction.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      transaction.type === 'withdraw' 
                        ? 'bg-red-100 text-red-800' 
                        : transaction.type === 'deposit'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {transaction.type === 'withdraw' ? 'سحب' : 
                       transaction.type === 'deposit' ? 'إضافة' : 'دفع'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {transaction.description || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(transaction.created_at).toLocaleDateString('ar-SA')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {transactions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              لا توجد عمليات مالية مسجلة
            </div>
          )}
        </div>
      </div>

      {/* Students Payment Status */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">حالة دفع الطلاب</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  اسم المجموعة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  اسم الطالب
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  حالة الدفع
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  آخر دفع
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المبلغ
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الشهر
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {student.group_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      student.paid 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {student.paid ? 'مدفوع' : 'غير مدفوع'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.last_payment_date ? 
                      new Date(student.last_payment_date).toLocaleDateString('ar-SA') : 
                      '-'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {(student.payment_amount || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.month}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {students.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              لا توجد طلاب مسجلين
            </div>
          )}
        </div>
      </div>

      {/* Add Money Modal */}
      {showAddMoney && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">إضافة أموال</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المبلغ
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="input-field"
                  placeholder="أدخل المبلغ"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الوصف (اختياري)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-field"
                  placeholder="وصف العملية"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 space-x-reverse mt-6">
              <button
                onClick={() => {
                  setShowAddMoney(false)
                  setAmount('')
                  setDescription('')
                }}
                className="btn-secondary"
              >
                إلغاء
              </button>
              <button
                onClick={handleAddMoney}
                className="btn-success"
              >
                إضافة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdraw && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">سحب الأرباح</h3>
            <div className="mb-4 p-3 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-600">الأرباح المتاحة للسحب:</p>
              <p className="text-lg font-semibold text-gray-900">{stats.netProfit.toFixed(2)}</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المبلغ المراد سحبه
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="input-field"
                  placeholder="أدخل المبلغ"
                  step="0.01"
                  max={stats.netProfit}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الوصف (اختياري)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-field"
                  placeholder="وصف العملية"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 space-x-reverse mt-6">
              <button
                onClick={() => {
                  setShowWithdraw(false)
                  setAmount('')
                  setDescription('')
                }}
                className="btn-secondary"
              >
                إلغاء
              </button>
              <button
                onClick={handleWithdraw}
                className="btn-primary"
                disabled={!amount || parseFloat(amount) > stats.netProfit}
              >
                سحب
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Finance