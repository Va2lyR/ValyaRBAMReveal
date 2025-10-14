import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../lib/supabase-unified-fixed'
import { 
  Plus, 
  Users, 
  MapPin, 
  Calendar, 
  Clock, 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Eye,
  Edit,
  UserPlus
} from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'

const Dashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [groups, setGroups] = useState([])
  const [stats, setStats] = useState({
    totalGroups: 0,
    totalStudents: 0,
    paidStudents: 0,
    unpaidStudents: 0,
    totalRevenue: 0,
    netProfit: 0
  })
  const [monthlyStats, setMonthlyStats] = useState([])
  const [groupMonthly, setGroupMonthly] = useState([])

  useEffect(() => {
    if (user) {
      loadGroups()
    }
  }, [user])

  const loadGroups = async () => {
    try {
      setLoading(true)
      
      const groupsData = await db.getGroups(user.id)
      setGroups(groupsData || [])
      // احصل على الإحصائيات المجمعة من الطبقة الموحدة (تعتمد على المعاملات)
      const s = await db.getStatistics(user.id)
      setStats({
        totalGroups: s.totalGroups,
        totalStudents: s.totalStudents,
        paidStudents: s.paidStudents,
        unpaidStudents: s.unpaidStudents,
        totalRevenue: s.totalRevenue,
        netProfit: s.netProfit
      })
      
      // جلب الإحصائيات الشهرية من قاعدة البيانات
      const monthlyData = await calculateMonthlyStatsFromDB(groupsData)
      setMonthlyStats(monthlyData)
      
      // Monthly per-group stats (current month)
      const perGroup = await Promise.all((groupsData || []).map(async (g) => {
        try {
          const m = await db.getMonthlyGroupStats(g.id)
          return { groupId: g.id, groupName: g.name, ...m }
        } catch {
          return { groupId: g.id, groupName: g.name, money: 0, paidCount: 0, unpaidCount: 0, present: 0, absent: 0, late: 0 }
        }
      }))
      setGroupMonthly(perGroup)
      
    } catch (error) {
      console.error('Error loading groups:', error)
      setGroups([])
      setStats({
        totalGroups: 0,
        totalStudents: 0,
        paidStudents: 0,
        unpaidStudents: 0,
        totalRevenue: 0,
        netProfit: 0
      })
    } finally {
      setLoading(false)
    }
  }

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'unpaid':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPaymentStatusText = (status) => {
    switch (status) {
      case 'paid':
        return 'مدفوع بالكامل'
      case 'partial':
        return 'دفع جزئي'
      case 'unpaid':
        return 'غير مدفوع'
      default:
        return 'غير محدد'
    }
  }

  const calculateMonthlyStatsFromDB = async (groupsData) => {
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
    const currentMonth = new Date().getMonth()
    
    const monthlyStats = []
    
    for (let i = 0; i <= currentMonth; i++) {
      const month = months[i]
      const monthGroups = groupsData?.filter(group => group.month === month) || []
      
      let monthStudents = 0
      let monthPaid = 0
      let monthRevenue = 0
      
      // جلب الإحصائيات من قاعدة البيانات لكل مجموعة
      for (const group of monthGroups) {
        try {
          const groupStats = await db.getMonthlyGroupStats(group.id)
          monthStudents += groupStats.present + groupStats.absent + groupStats.late
          monthPaid += groupStats.paidCount
          monthRevenue += groupStats.money
        } catch (error) {
          console.error(`Error loading stats for group ${group.id}:`, error)
        }
      }
      
      monthlyStats.push({
        month,
        groups: monthGroups.length,
        students: monthStudents,
        paid: monthPaid,
        unpaid: monthStudents - monthPaid,
        revenue: monthRevenue
      })
    }
    
    return monthlyStats.reverse() // عرض أحدث الشهور أولاً
  }

  if (loading) {
    return <LoadingSpinner size="lg" className="min-h-96" />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">لوحة التحكم</h1>
          <p className="text-gray-600 mt-1">مرحباً بك، {user?.email}</p>
        </div>
        <div className="flex items-center space-x-3 space-x-reverse">
          <button
            onClick={() => navigate('/groups')}
            className="btn-primary flex items-center"
          >
            <Eye className="w-4 h-4 ml-2" />
            إدارة المجموعات
          </button>
          <button
            onClick={() => navigate('/groups/new')}
            className="btn-success flex items-center"
          >
            <Plus className="w-4 h-4 ml-2" />
            إضافة مجموعة جديدة
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="mr-3">
              <p className="text-sm font-medium text-gray-600">إجمالي المجموعات</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalGroups}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
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
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div className="mr-3">
            <p className="text-sm font-medium text-gray-600">عدد المرات الدفع</p>
              <p className="text-2xl font-bold text-gray-900">{stats.paidStudents}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
          <div className="p-3 bg-red-100 rounded-lg">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
            <div className="mr-3">
            <p className="text-sm font-medium text-gray-600">عدد مرات غير المدفوعين</p>
              <p className="text-2xl font-bold text-gray-900">{stats.unpaidStudents}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Card */}
      <div className="card">
        <div className="flex items-center">
          <div className="p-3 bg-yellow-100 rounded-lg">
            <DollarSign className="w-6 h-6 text-yellow-600" />
          </div>
          <div className="mr-3">
            <p className="text-sm font-medium text-gray-600">الفلوس</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalRevenue.toFixed(2)} جنيه</p>
          </div>
        </div>
      </div>

      {/* Monthly Statistics */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">الإحصائيات الشهرية</h2>
        {monthlyStats.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {monthlyStats.map((monthData, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">{monthData.month}</h3>
                  <span className="text-sm text-gray-500">{monthData.groups} مجموعة</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">الطلاب:</span>
                    <span className="font-medium">{monthData.students}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">مدفوع:</span>
                    <span className="font-medium text-green-600">{monthData.paid}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-red-600">غير مدفوع:</span>
                    <span className="font-medium text-red-600">{monthData.unpaid}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-yellow-600">الإيرادات:</span>
                    <span className="font-medium text-yellow-600">{monthData.revenue.toFixed(2)} جنيه</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>لا توجد بيانات شهرية متاحة</p>
          </div>
        )}
      </div>

      {/* Monthly per group (current month) */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">إحصائيات الشهر الحالي لكل مجموعة</h2>
        {groupMonthly.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupMonthly.map((gm) => (
              <div key={gm.groupId} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">{gm.groupName}</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-yellow-700">الفلوس:</span><span className="font-medium text-yellow-700">{(gm.money || 0).toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">عدد المرات الدفع:</span><span className="font-medium text-green-600">{gm.paidCount || 0}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">عدد مرات غير المدفوعين:</span><span className="font-medium text-red-600">{gm.unpaidCount || 0}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">حضور:</span><span className="font-medium">{gm.present || 0}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">غياب:</span><span className="font-medium">{gm.absent || 0}</span></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">لا توجد بيانات شهرية للمجموعات</div>
        )}
      </div>

      {/* Groups List */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">المجموعات</h2>
          <div className="flex items-center space-x-2 space-x-reverse">
            <button
              onClick={() => navigate('/groups')}
              className="btn-secondary text-sm"
            >
              عرض الكل
            </button>
            <button
              onClick={() => navigate('/groups/new')}
              className="btn-success text-sm flex items-center"
            >
              <Plus className="w-4 h-4 ml-1" />
              إضافة مجموعة
            </button>
          </div>
        </div>

        {groups.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.slice(0, 6).map((group) => (
              <div key={group.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPaymentStatusColor(group.payment_status)}`}>
                    {getPaymentStatusText(group.payment_status)}
                  </span>
                </div>

                {/* معلومات المجموعة الأساسية */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 ml-2" />
                    {group.day} - {group.month}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="w-4 h-4 ml-2" />
                    {group.time}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 ml-2" />
                    {group.location}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="w-4 h-4 ml-2" />
                    {group.category} - {group.payment_frequency}
                  </div>
                </div>

                {/* المرحلة التعليمية وثمن الحصة */}
                <div className="space-y-2 mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">المرحلة:</span>
                    <span className="font-medium text-blue-600">{group.education_level || 'اعدادية'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">الصف:</span>
                    <span className="font-medium text-green-600">{group.grade_level || 'اولى'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">ثمن الحصة:</span>
                    <span className="font-medium text-purple-600">{(group.session_price || 0).toFixed(2)} جنيه</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">عدد الحصص:</span>
                    <span className="font-medium text-orange-600">{group.sessions_per_month || 4}</span>
                  </div>
                </div>

                {/* إحصائيات الطلاب */}
                <div className="space-y-2 mb-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">عدد الطلاب:</span>
                    <span className="font-medium text-gray-900">{group.student_count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">عدد المرات الدفع:</span>
                    <span className="font-medium text-green-600">{group.paid_students || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">عدد مرات غير المدفوعين:</span>
                    <span className="font-medium text-red-600">{group.unpaid_students || 0}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    <span className="text-green-600 font-medium">{group.paid_students}</span> مدفوع / 
                    <span className="text-red-600 font-medium">{group.unpaid_students}</span> غير مدفوع
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <button
                      onClick={() => navigate(`/groups/${group.id}/students`)}
                      className="btn-secondary text-xs flex items-center"
                    >
                      <UserPlus className="w-3 h-3 ml-1" />
                      إدارة الطلاب
                    </button>
                    <button
                      onClick={() => navigate(`/groups/${group.id}`)}
                      className="btn-primary text-xs flex items-center"
                    >
                      <Edit className="w-3 h-3 ml-1" />
                      تعديل
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد مجموعات</h3>
            <p className="text-gray-600 mb-4">ابدأ بإنشاء مجموعة جديدة لإدارة طلابك</p>
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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          onClick={() => navigate('/groups')}
          className="card hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Eye className="w-6 h-6 text-blue-600" />
            </div>
            <div className="mr-3">
              <h3 className="text-lg font-semibold text-gray-900">إدارة المجموعات</h3>
              <p className="text-sm text-gray-600">عرض وتعديل جميع المجموعات</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => navigate('/finance')}
          className="card hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div className="mr-3">
              <h3 className="text-lg font-semibold text-gray-900">الحسابات</h3>
              <p className="text-sm text-gray-600">إدارة الأرباح والعمليات المالية</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => navigate('/settings')}
          className="card hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center">
            <div className="p-3 bg-gray-100 rounded-lg">
              <Edit className="w-6 h-6 text-gray-600" />
            </div>
            <div className="mr-3">
              <h3 className="text-lg font-semibold text-gray-900">الإعدادات</h3>
              <p className="text-sm text-gray-600">تخصيص إعدادات التطبيق</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}

export default Dashboard