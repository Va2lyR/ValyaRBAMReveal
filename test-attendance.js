// ملف اختبار صفحة الحضور - يمكنك تشغيله في Console المتصفح
// للتأكد من أن صفحة الحضور تعمل بشكل صحيح

async function testAttendancePage() {
  console.log('🔍 اختبار صفحة الحضور...');
  
  try {
    // اختبار الاتصال
    const { data: { user } } = await supabase.auth.getUser();
    console.log('✅ المستخدم مسجل دخول:', user?.email);
    
    if (!user) {
      console.error('❌ يجب تسجيل الدخول أولاً');
      return;
    }
    
    // اختبار تحميل المجموعات
    console.log('🔍 تحميل المجموعات...');
    const { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select(`
        *,
        students(id, paid, payment_amount, last_payment_date)
      `)
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });
    
    if (groupsError) {
      console.error('❌ خطأ في تحميل المجموعات:', groupsError);
      return;
    }
    
    console.log('✅ المجموعات محملة:', groups?.length || 0);
    
    if (groups && groups.length > 0) {
      console.log('📊 تفاصيل المجموعات:');
      groups.forEach((group, index) => {
        console.log(`  ${index + 1}. ${group.name} - ${group.students?.length || 0} طالب`);
      });
    } else {
      console.log('⚠️ لا توجد مجموعات - أنشئ مجموعة جديدة');
    }
    
    // اختبار الطلاب
    if (groups && groups.length > 0) {
      const firstGroup = groups[0];
      console.log('🔍 تحميل طلاب المجموعة الأولى...');
      
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('group_id', firstGroup.id);
      
      if (studentsError) {
        console.error('❌ خطأ في تحميل الطلاب:', studentsError);
        return;
      }
      
      console.log('✅ الطلاب محملون:', students?.length || 0);
      
      if (students && students.length > 0) {
        console.log('📊 تفاصيل الطلاب:');
        students.forEach((student, index) => {
          console.log(`  ${index + 1}. ${student.name} - ${student.paid ? 'مدفوع' : 'غير مدفوع'}`);
        });
      }
    }
    
    console.log('🎉 اختبار صفحة الحضور مكتمل!');
    
  } catch (error) {
    console.error('❌ خطأ في اختبار صفحة الحضور:', error);
  }
}

// تشغيل الاختبار
testAttendancePage();
