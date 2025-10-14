-- قاعدة البيانات المحسنة - قم بتشغيل هذا الملف في Supabase SQL Editor

-- حذف الجداول الموجودة إذا كانت موجودة (لإعادة إنشاء نظيفة)
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS groups CASCADE;

-- إنشاء جدول المجموعات
CREATE TABLE groups (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'سناتر',
    location TEXT NOT NULL,
    day TEXT NOT NULL DEFAULT 'السبت',
    time TEXT NOT NULL DEFAULT '09:00',
    month TEXT NOT NULL DEFAULT 'يناير',
    payment_frequency TEXT NOT NULL DEFAULT 'شهري',
    sessions_per_month INTEGER NOT NULL DEFAULT 4,
    session_price DECIMAL(10,2) DEFAULT 0,
    education_level TEXT NOT NULL DEFAULT 'اعدادية',
    grade_level TEXT NOT NULL DEFAULT 'اولى',
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء جدول الطلاب
CREATE TABLE students (
    id BIGSERIAL PRIMARY KEY,
    group_id BIGINT REFERENCES groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    paid BOOLEAN DEFAULT FALSE,
    month TEXT NOT NULL DEFAULT 'يناير',
    payment_frequency TEXT NOT NULL DEFAULT 'شهري',
    note TEXT,
    phone_student TEXT,
    phone_father TEXT,
    phone_mother TEXT,
    last_payment_date TIMESTAMP WITH TIME ZONE,
    payment_amount DECIMAL(10,2) DEFAULT 0,
    total_sessions INTEGER DEFAULT 4,
    completed_sessions INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء جدول الجلسات
CREATE TABLE sessions (
    id BIGSERIAL PRIMARY KEY,
    group_id BIGINT REFERENCES groups(id) ON DELETE CASCADE,
    session_number INTEGER NOT NULL,
    session_date DATE NOT NULL,
    month TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء جدول الحضور
CREATE TABLE attendance (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT REFERENCES students(id) ON DELETE CASCADE,
    group_id BIGINT REFERENCES groups(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'not_marked',
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, group_id, attendance_date)
);

-- إنشاء جدول حضور الطلاب (للنظام الموحد)
CREATE TABLE student_attendance (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT REFERENCES students(id) ON DELETE CASCADE,
    session_id BIGINT REFERENCES sessions(id) ON DELETE CASCADE,
    group_id BIGINT REFERENCES groups(id) ON DELETE CASCADE,
    attendance_status TEXT NOT NULL DEFAULT 'absent',
    payment_status TEXT NOT NULL DEFAULT 'unpaid',
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, session_id)
);

-- إنشاء جدول العمليات المالية
CREATE TABLE transactions (
    id BIGSERIAL PRIMARY KEY,
    type TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    group_id BIGINT REFERENCES groups(id) ON DELETE SET NULL,
    student_id BIGINT REFERENCES students(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- تفعيل RLS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- حذف السياسات الموجودة إذا كانت موجودة
DROP POLICY IF EXISTS "Users can manage their own groups" ON groups;
DROP POLICY IF EXISTS "Users can manage students in their groups" ON students;
DROP POLICY IF EXISTS "Users can manage sessions in their groups" ON sessions;
DROP POLICY IF EXISTS "Users can manage attendance in their groups" ON attendance;
DROP POLICY IF EXISTS "Users can manage student attendance in their groups" ON student_attendance;
DROP POLICY IF EXISTS "Users can manage their own transactions" ON transactions;

-- سياسات الأمان للمجموعات
CREATE POLICY "Users can manage their own groups" ON groups
    FOR ALL USING (auth.uid() = created_by);

-- سياسات الأمان للطلاب
CREATE POLICY "Users can manage students in their groups" ON students
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM groups 
            WHERE groups.id = students.group_id 
            AND groups.created_by = auth.uid()
        )
    );

-- سياسات الأمان للجلسات
CREATE POLICY "Users can manage sessions in their groups" ON sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM groups 
            WHERE groups.id = sessions.group_id 
            AND groups.created_by = auth.uid()
        )
    );

-- سياسات الأمان للحضور
CREATE POLICY "Users can manage attendance in their groups" ON attendance
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM groups 
            WHERE groups.id = attendance.group_id 
            AND groups.created_by = auth.uid()
        )
    );

-- سياسات الأمان لحضور الطلاب
CREATE POLICY "Users can manage student attendance in their groups" ON student_attendance
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM groups 
            WHERE groups.id = student_attendance.group_id 
            AND groups.created_by = auth.uid()
        )
    );

-- سياسات الأمان للعمليات المالية
CREATE POLICY "Users can manage their own transactions" ON transactions
    FOR ALL USING (auth.uid() = created_by);

-- فهار لتحسين الأداء
CREATE INDEX idx_groups_created_by ON groups(created_by);
CREATE INDEX idx_students_group_id ON students(group_id);
CREATE INDEX idx_sessions_group_id ON sessions(group_id);
CREATE INDEX idx_sessions_month ON sessions(month);
CREATE INDEX idx_attendance_group_date ON attendance(group_id, attendance_date);
CREATE INDEX idx_attendance_student_date ON attendance(student_id, attendance_date);
CREATE INDEX idx_student_attendance_group_id ON student_attendance(group_id);
CREATE INDEX idx_student_attendance_session_id ON student_attendance(session_id);
CREATE INDEX idx_transactions_created_by ON transactions(created_by);

-- إضافة بيانات تجريبية (اختياري)
-- يمكنك حذف هذا الجزء إذا كنت لا تريد بيانات تجريبية
INSERT INTO groups (name, category, location, day, time, month, created_by) 
VALUES 
    ('مجموعة الرياضيات', 'سناتر', 'القاهرة', 'السبت', '09:00', 'يناير', auth.uid()),
    ('مجموعة الفيزياء', 'برايف', 'الجيزة', 'الأحد', '10:00', 'يناير', auth.uid())
ON CONFLICT DO NOTHING;
