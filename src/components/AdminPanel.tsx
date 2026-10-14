import { useState, useEffect, useCallback, useRef } from 'react';
import {
  supabase,
  getStudentProfileEditPermission,
  setStudentProfileEditPermission,
  format6DigitId,
  generateNext6DigitId,
} from '@/lib/supabase';
import type { Student, StudyDay, Lesson, Question, QuizResult } from '@/lib/supabase';
import type { SessionUser } from '@/App';
import { formatDayDate, getBangladeshDateString } from '@/lib/time';
import { StudentAvatar } from '@/components/StudentAvatar';
import { ImageCropModal } from '@/components/ImageCropModal';
import { getInitialTheme, applyTheme, ThemeMode } from '@/lib/theme';
import {
  GraduationCap,
  LogOut,
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Users,
  BookOpen,
  HelpCircle,
  BarChart3,
  ShieldCheck,
  ShieldAlert,
  Phone,
  PhoneCall,
  Mail,
  Building,
  Upload,
  Sun,
  Moon,
} from 'lucide-react';

interface Props {
  user: Extract<SessionUser, { role: 'admin' }>;
  onLogout: () => void;
}

type Tab = 'students' | 'lessons' | 'questions' | 'results';

export function AdminPanel({ user, onLogout }: Props) {
  const [tab, setTab] = useState<Tab>('students');
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    const handleThemeChange = (e: Event) => {
      const custom = e as CustomEvent<ThemeMode>;
      if (custom.detail && (custom.detail === 'light' || custom.detail === 'dark')) {
        setTheme(custom.detail);
      }
    };
    window.addEventListener('studywise_theme_change', handleThemeChange);
    return () => {
      window.removeEventListener('studywise_theme_change', handleThemeChange);
    };
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: 'students', label: 'Students', icon: Users },
    { id: 'lessons', label: 'Lessons', icon: BookOpen },
    { id: 'questions', label: 'Questions', icon: HelpCircle },
    { id: 'results', label: 'Results', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-[#fbf8ee] dark:bg-[#191715] text-[#2c2825] dark:text-[#f2ece4] font-sans transition-colors duration-200">
      {/* Header */}
      <header className="bg-[#fffefb] dark:bg-[#221f1d] border-b border-[#ece4d6] dark:border-[#38322c] sticky top-0 z-20 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 via-sky-600 to-blue-700 rounded-xl flex items-center justify-center shadow-md text-white">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-stone-100 leading-tight">StudyWise</h2>
              <p className="text-xs text-blue-700 dark:text-sky-300 font-medium">
                {user.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              aria-label={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-white/80 dark:bg-stone-800/80 border border-stone-200/90 dark:border-stone-700/80 shadow-2xs hover:bg-stone-100 dark:hover:bg-stone-700/80 hover:border-stone-300 dark:hover:border-stone-600 active:scale-95 transition-all text-stone-700 dark:text-stone-200 cursor-pointer"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-500" />
              ) : (
                <Moon className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-blue-600" />
              )}
            </button>

            {/* Logout */}
            <button
              onClick={onLogout}
              title="Logout"
              aria-label="Logout"
              className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-white/80 dark:bg-stone-800/80 border border-stone-200/90 dark:border-stone-700/80 shadow-2xs hover:bg-stone-100 dark:hover:bg-stone-700/80 hover:border-stone-300 dark:hover:border-stone-600 active:scale-95 transition-all text-stone-700 dark:text-stone-200 cursor-pointer"
            >
              <LogOut className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Tabs (Icon-Driven with tooltips) */}
      <nav className="bg-white border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 flex gap-2 py-2 overflow-x-auto justify-center sm:justify-start">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              title={label}
              aria-label={label}
              className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                tab === id
                  ? 'bg-sky-50 text-sky-600 ring-1 ring-sky-200 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-5 h-5" />
            </button>
          ))}
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className={tab === 'students' ? 'block' : 'hidden'}>
          <StudentsTab />
        </div>
        <div className={tab === 'lessons' ? 'block' : 'hidden'}>
          <LessonsTab />
        </div>
        <div className={tab === 'questions' ? 'block' : 'hidden'}>
          <QuestionsTab />
        </div>
        <div className={tab === 'results' ? 'block' : 'hidden'}>
          <ResultsTab />
        </div>
      </div>

      <footer className="text-center text-xs text-slate-400 py-6">
        StudyWise &middot; Home Tutoring Management
      </footer>
    </div>
  );
}

// =================== STUDENTS TAB ===================

function StudentsTab() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const loadStudents = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('students').select('*').order('id', { ascending: true });
      if (error) throw error;
      const studs = (data || []) as Student[];
      const uniqueStuds = Array.from(new Map(studs.map((s) => [String(s.id).trim(), s])).values());
      setStudents(uniqueStuds);
    } catch {
      // keep current cached students
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const filtered = Array.from(
    new Map(
      students
        .filter(
          (s) =>
            !search ||
            s.name.toLowerCase().includes(search.toLowerCase()) ||
            s.id.includes(search) ||
            (s.class_name && s.class_name.toLowerCase().includes(search.toLowerCase())) ||
            (s.phone && s.phone.includes(search))
        )
        .map((s) => [String(s.id).trim(), s])
    ).values()
  );

  const handleDelete = async (id: string) => {
    try {
      await supabase.from('students').delete().eq('id', id);
      setStudents((prev) => prev.filter((s) => s.id !== id));
    } catch {
      // ignore
    }
    setConfirmDelete(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <button
          onClick={() => setShowAdd(true)}
          title="Add Student"
          aria-label="Add Student"
          className="flex items-center justify-center text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 p-2.5 rounded-lg transition-all shadow-xs cursor-pointer flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-sky-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-slate-500 bg-[#fcfdfd] rounded-xl border border-slate-200">
          No students registered yet.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((s, idx) => (
            <div
              key={`${s.id}-${idx}`}
              className="bg-[#fcfdfd] rounded-xl border border-slate-200 shadow-xs p-4 flex gap-3.5 transition-shadow hover:shadow-sm"
            >
              <StudentAvatar
                imageUrl={s.image_url}
                gender={s.gender}
                name={s.name}
                size="md"
                className="w-14 h-14 shadow-xs flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-sm font-bold text-slate-800 truncate">{s.name}</h4>
                  {s.gender && (
                    <span className="text-[10px] uppercase font-bold text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded">
                      {s.gender}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Class: <strong className="text-slate-800">{s.class_name}</strong>
                </div>
                <div className="text-xs text-slate-500">
                  Subject: <span className="text-slate-700">{s.subjects}</span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  ID: <strong className="text-slate-800 font-mono font-bold">{format6DigitId(s.id)}</strong> &middot; PIN:{' '}
                  <strong className="text-slate-800">{s.pin}</strong>
                </div>

                {/* Extra info row */}
                {(s.phone || s.email || s.institution || s.guardian_phone || s.blood_group) && (
                  <div className="text-[11px] text-slate-500 mt-1.5 flex flex-wrap items-center gap-2">
                    {s.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {s.phone}
                      </span>
                    )}
                    {s.email && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {s.email}
                      </span>
                    )}
                    {s.institution && (
                      <span className="inline-flex items-center gap-1">
                        <Building className="w-3 h-3 text-slate-400" />
                        {s.institution}
                      </span>
                    )}
                    {(s.guardian_phone || s.blood_group) && (
                      <span className="font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1">
                        <PhoneCall className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                        Guardian: {s.guardian_phone || s.blood_group}
                      </span>
                    )}
                  </div>
                )}

                {/* Icon-Only Action Buttons */}
                <div className="flex items-center gap-1.5 mt-2.5">
                  {/* Individual Profile Edit Permission Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      const currentAllowed = getStudentProfileEditPermission(s.id, s);
                      setStudentProfileEditPermission(s.id, !currentAllowed);
                      setStudents((prev) =>
                        prev.map((item) => (item.id === s.id ? { ...item, edit_allowed: !currentAllowed } : item))
                      );
                    }}
                    title={
                      getStudentProfileEditPermission(s.id, s)
                        ? 'Profile Edit: Allowed (Click to Lock)'
                        : 'Profile Edit: Locked (Click to Allow)'
                    }
                    aria-label="Toggle Student Profile Edit Permission"
                    className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                      getStudentProfileEditPermission(s.id, s)
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                        : 'bg-slate-100 dark:bg-stone-800 text-slate-500 dark:text-stone-400 border-slate-200 dark:border-stone-700 hover:bg-slate-200'
                    }`}
                  >
                    {getStudentProfileEditPermission(s.id, s) ? (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Edit Allowed</span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="w-3.5 h-3.5 text-slate-400 dark:text-stone-400" />
                        <span>Edit Locked</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setEditStudent(s)}
                    title="Edit Student"
                    aria-label="Edit Student"
                    className="p-1.5 text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(s.id)}
                    title="Delete Student"
                    aria-label="Delete Student"
                    className="p-1.5 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <AddStudentModal
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            loadStudents();
          }}
        />
      )}
      {editStudent && (
        <EditStudentModal
          student={editStudent}
          onClose={() => setEditStudent(null)}
          onSaved={() => {
            setEditStudent(null);
            loadStudents();
          }}
        />
      )}
      {confirmDelete && (
        <ConfirmModal
          title="Delete Student"
          message={`Are you sure you want to delete student ID ${confirmDelete}? All associated study logs will also be removed.`}
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function AddStudentModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [className, setClassName] = useState('');
  const [subjects, setSubjects] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | string>('Female');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [institution, setInstitution] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [pin, setPin] = useState('');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg('');
    setCropFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCropComplete = (croppedDataUrl: string) => {
    setImageUrl(croppedDataUrl);
    setCropFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    setSaving(true);
    try {
      let studentId = id.trim();
      if (!studentId) {
        const { data: allStudents } = await supabase
          .from('students')
          .select('id');
        const existingIds = (allStudents || []).map((s: { id: string }) => s.id);
        studentId = generateNext6DigitId(existingIds);
      } else {
        studentId = format6DigitId(studentId);
      }

      const { error } = await supabase.from('students').insert({
        id: studentId,
        name: name.trim(),
        class_name: className.trim(),
        subjects: subjects.trim(),
        image_url: imageUrl.trim() || null,
        pin: pin.trim(),
        gender: gender.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        institution: institution.trim(),
        guardian_phone: guardianPhone.trim(),
        blood_group: guardianPhone.trim(),
      });

      if (error) {
        setMsg(error.message || 'Failed to add student to Google Sheet.');
        setSaving(false);
        return;
      }

      setMsg(`Student saved to Google Sheet! Assigned ID: ${studentId}`);
      setTimeout(() => onSaved(), 800);
    } catch {
      setMsg('Failed to add student.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {cropFile && (
        <ImageCropModal
          imageFile={cropFile}
          onCropComplete={handleCropComplete}
          onCancel={() => setCropFile(null)}
        />
      )}
      <ModalLayout title="Add Student" subtitle="Create new student with details & avatar" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Student ID (6 Digits)" hint="Leave empty to auto-assign 6-digit ID">
          <input
            type="text"
            value={id}
            onChange={(e) => setId(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="e.g. 100001 (6 digits)"
            maxLength={6}
            className={inputCls}
          />
        </Field>
        <Field label="Full Name *">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Student Name"
            required
            className={inputCls}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Gender *">
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className={inputCls}
            >
              <option value="Female">Female</option>
              <option value="Male">Male</option>
            </select>
          </Field>
          <Field label="Class *">
            <input
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="e.g. HSC 2nd Year"
              required
              className={inputCls}
            />
          </Field>
        </div>
        <Field label="Subjects *">
          <input
            type="text"
            value={subjects}
            onChange={(e) => setSubjects(e.target.value)}
            placeholder="e.g. Biology & Chemistry"
            required
            className={inputCls}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
              className={inputCls}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@example.com"
              className={inputCls}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="College / Institution">
            <input
              type="text"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="College name"
              className={inputCls}
            />
          </Field>
          <Field label="Guardian's Phone">
            <input
              type="tel"
              value={guardianPhone}
              onChange={(e) => setGuardianPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
              className={inputCls}
            />
          </Field>
        </div>
        <Field label="Address">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Address"
            className={inputCls}
          />
        </Field>

        {/* Photo Upload */}
        <Field label="Student Photo">
          <div className="flex items-center gap-3">
            <StudentAvatar imageUrl={imageUrl} gender={gender} name={name} size="sm" />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-200 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-lg cursor-pointer transition-colors shadow-2xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{imageUrl ? 'Change Photo' : 'Upload Photo'}</span>
            </button>
            {imageUrl && (
              <button
                type="button"
                onClick={() => setImageUrl('')}
                className="text-xs text-rose-600 hover:text-rose-700 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </Field>

        <Field label="Student PIN Code *">
          <input
            type="text"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="4-digit PIN"
            required
            className={inputCls}
          />
        </Field>

        {msg && (
          <p className={`text-xs font-bold ${msg.includes('saved') ? 'text-emerald-700' : 'text-rose-600'}`}>
            {msg}
          </p>
        )}
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold py-2.5 rounded-lg transition-all shadow-xs disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Saving...
            </>
          ) : (
            'Save Student'
          )}
        </button>
      </form>
    </ModalLayout>
    </>
  );
}

function EditStudentModal({
  student,
  onClose,
  onSaved,
}: {
  student: Student;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(student.name);
  const [className, setClassName] = useState(student.class_name);
  const [subjects, setSubjects] = useState(student.subjects);
  const [imageUrl, setImageUrl] = useState(student.image_url || '');
  const [gender, setGender] = useState<'Male' | 'Female' | string>(student.gender || 'Female');
  const [phone, setPhone] = useState(student.phone || '');
  const [email, setEmail] = useState(student.email || '');
  const [address, setAddress] = useState(student.address || '');
  const [institution, setInstitution] = useState(student.institution || '');
  const [guardianPhone, setGuardianPhone] = useState(student.guardian_phone || student.blood_group || '');
  const [pin, setPin] = useState(student.pin);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg('');
    setCropFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCropComplete = (croppedDataUrl: string) => {
    setImageUrl(croppedDataUrl);
    setCropFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from('students')
        .update({
          name: name.trim(),
          class_name: className.trim(),
          subjects: subjects.trim(),
          image_url: imageUrl.trim() || null,
          pin: pin.trim(),
          gender: gender.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          institution: institution.trim(),
          guardian_phone: guardianPhone.trim(),
          blood_group: guardianPhone.trim(),
        })
        .eq('id', student.id);

      if (error) {
        setMsg(error.message);
        setSaving(false);
        return;
      }
      setMsg('Student updated successfully in Google Sheet.');
      setTimeout(() => onSaved(), 800);
    } catch {
      setMsg('Failed to update student.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {cropFile && (
        <ImageCropModal
          imageFile={cropFile}
          onCropComplete={handleCropComplete}
          onCancel={() => setCropFile(null)}
        />
      )}
      <ModalLayout title="Edit Student" subtitle={`ID: ${format6DigitId(student.id)}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Full Name *">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={inputCls}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Gender *">
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className={inputCls}
            >
              <option value="Female">Female</option>
              <option value="Male">Male</option>
            </select>
          </Field>
          <Field label="Class *">
            <input
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              required
              className={inputCls}
            />
          </Field>
        </div>
        <Field label="Subjects *">
          <input
            type="text"
            value={subjects}
            onChange={(e) => setSubjects(e.target.value)}
            required
            className={inputCls}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
              className={inputCls}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@example.com"
              className={inputCls}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="College / Institution">
            <input
              type="text"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="College name"
              className={inputCls}
            />
          </Field>
          <Field label="Guardian's Phone">
            <input
              type="tel"
              value={guardianPhone}
              onChange={(e) => setGuardianPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
              className={inputCls}
            />
          </Field>
        </div>
        <Field label="Address">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Address"
            className={inputCls}
          />
        </Field>

        {/* Photo Upload */}
        <Field label="Student Photo">
          <div className="flex items-center gap-3">
            <StudentAvatar imageUrl={imageUrl} gender={gender} name={name} size="sm" />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-200 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-lg cursor-pointer transition-colors shadow-2xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{imageUrl ? 'Change Photo' : 'Upload Photo'}</span>
            </button>
            {imageUrl && (
              <button
                type="button"
                onClick={() => setImageUrl('')}
                className="text-xs text-rose-600 hover:text-rose-700 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </Field>

        <Field label="Update PIN Code *">
          <input
            type="text"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            required
            className={inputCls}
          />
        </Field>

        {msg && (
          <p className={`text-xs font-bold ${msg.includes('success') ? 'text-emerald-700' : 'text-rose-600'}`}>
            {msg}
          </p>
        )}
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold py-2.5 rounded-lg transition-all shadow-xs disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Updating...
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </form>
    </ModalLayout>
    </>
  );
}

// =================== LESSONS TAB ===================

function LessonsTab() {
  const [students, setStudents] = useState<Student[]>([]);
  const [studyDays, setStudyDays] = useState<StudyDay[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [loading, setLoading] = useState(true);
  const [editLesson, setEditLesson] = useState<Lesson | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Add lesson form
  const [lSubject, setLSubject] = useState('');
  const [lNote, setLNote] = useState('');
  const [lPdf, setLPdf] = useState('');
  const [lTestEnabled, setLTestEnabled] = useState(true);
  const [lessonMsg, setLessonMsg] = useState('');
  const [savingLesson, setSavingLesson] = useState(false);

  // Add study day form
  const [dayLabel, setDayLabel] = useState('DAY-');
  const [dayDate, setDayDate] = useState(getBangladeshDateString());
  const [dayMsg, setDayMsg] = useState('');
  const [savingDay, setSavingDay] = useState(false);

  const loadStudents = useCallback(async () => {
    const { data } = await supabase.from('students').select('*').order('id', { ascending: true });
    const studs = (data || []) as Student[];
    const uniqueStuds = Array.from(new Map(studs.map((s) => [String(s.id).trim(), s])).values());
    setStudents(uniqueStuds);
    if (uniqueStuds.length > 0 && !selectedStudent) setSelectedStudent(uniqueStuds[0].id);
    return uniqueStuds;
  }, [selectedStudent]);

  const loadStudyDays = useCallback(async (studentId: string) => {
    const { data } = await supabase
      .from('study_days')
      .select('*')
      .eq('student_id', studentId)
      .order('day_date', { ascending: false });
    const days = (data || []) as StudyDay[];
    const uniqueDays = Array.from(new Map(days.map((d) => [String(d.id).trim(), d])).values());
    setStudyDays(uniqueDays);
    if (uniqueDays.length > 0) {
      setSelectedDay(uniqueDays[0].id);
    } else {
      setSelectedDay('');
    }
  }, []);

  const loadLessons = useCallback(async (studyDayId: string) => {
    if (!studyDayId) {
      setLessons([]);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('lessons')
      .select('*')
      .eq('study_day_id', studyDayId)
      .order('created_at', { ascending: true });
    const allL = (data || []) as Lesson[];
    const uniqueL = Array.from(new Map(allL.map((l) => [String(l.id).trim(), l])).values());
    setLessons(uniqueL);
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const studs = await loadStudents();
      if (studs.length > 0) await loadStudyDays(studs[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedStudent) loadStudyDays(selectedStudent);
  }, [selectedStudent, loadStudyDays]);

  useEffect(() => {
    if (selectedDay) loadLessons(selectedDay);
    else setLessons([]);
  }, [selectedDay, loadLessons]);

  const handleAddDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setSavingDay(true);
    setDayMsg('');
    try {
      const { error } = await supabase.from('study_days').insert({
        student_id: selectedStudent,
        day_label: dayLabel.trim() || 'DAY-',
        day_date: dayDate,
      });
      if (error) {
        setDayMsg(error.message);
        setSavingDay(false);
        return;
      }
      setDayMsg('Day scheduled successfully.');
      setDayLabel('DAY-');
      await loadStudyDays(selectedStudent);
    } catch {
      setDayMsg('Failed to add study day.');
    } finally {
      setSavingDay(false);
    }
  };

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDay) {
      setLessonMsg('Please select a study day first.');
      return;
    }
    setSavingLesson(true);
    setLessonMsg('');
    try {
      const { error } = await supabase.from('lessons').insert({
        study_day_id: selectedDay,
        subject: lSubject.trim(),
        short_note: lNote.trim(),
        pdf_url: lPdf.trim() || null,
        test_enabled: lTestEnabled,
      });
      if (error) {
        setLessonMsg(error.message);
        setSavingLesson(false);
        return;
      }
      setLessonMsg('Lesson saved successfully.');
      setLSubject('');
      setLNote('');
      setLPdf('');
      setLTestEnabled(true);
      await loadLessons(selectedDay);
    } catch {
      setLessonMsg('Failed to save lesson.');
    } finally {
      setSavingLesson(false);
    }
  };

  const handleDeleteLesson = async (id: string) => {
    try {
      await supabase.from('lessons').delete().eq('id', id);
      setLessons((prev) => prev.filter((l) => l.id !== id));
    } catch {
      // ignore
    }
    setConfirmDelete(null);
  };

  const formatDate = (dateStr: string) => formatDayDate(dateStr);

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        {/* Add Study Day */}
        <div className="bg-[#fcfdfd] rounded-xl border border-slate-200 shadow-xs p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-1">1. Schedule Day</h3>
          <p className="text-xs text-slate-500 mb-4">Assign study date for a student</p>
          <form onSubmit={handleAddDay} className="space-y-3">
            <Field label="Select Student">
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className={inputCls}
              >
                {Array.from(new Map(students.map((s) => [String(s.id).trim(), s])).values()).map((s, idx) => (
                  <option key={`${s.id}-${idx}`} value={s.id}>
                    {s.name} ({s.id})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Day Label">
              <input
                type="text"
                value={dayLabel}
                onChange={(e) => setDayLabel(e.target.value)}
                placeholder="DAY-"
                required
                className={inputCls}
              />
            </Field>
            <Field label="Date">
              <input
                type="date"
                value={dayDate}
                onChange={(e) => setDayDate(e.target.value)}
                required
                className={inputCls}
              />
            </Field>
            {dayMsg && (
              <p className={`text-xs font-bold ${dayMsg.includes('success') ? 'text-emerald-700' : 'text-rose-600'}`}>
                {dayMsg}
              </p>
            )}
            <button
              type="submit"
              disabled={savingDay}
              className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold py-2.5 rounded-lg transition-all shadow-xs disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
            >
              {savingDay ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                'Save Day'
              )}
            </button>
          </form>
        </div>

        {/* Add Lesson */}
        <div className="bg-[#fcfdfd] rounded-xl border border-slate-200 shadow-xs p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-1">2. Add Lesson &amp; Topics</h3>
          <p className="text-xs text-slate-500 mb-4">Topic notes and optional PDF resource</p>
          <form onSubmit={handleAddLesson} className="space-y-3">
            <Field label="Select Study Day">
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className={inputCls}
                required
              >
                <option value="">-- Select a day --</option>
                {Array.from(new Map(studyDays.map((d) => [String(d.id).trim(), d])).values()).map((d, idx) => (
                  <option key={`${d.id}-${idx}`} value={d.id}>
                    {d.day_label} ({formatDate(d.day_date)})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Subject">
              <input
                type="text"
                value={lSubject}
                onChange={(e) => setLSubject(e.target.value)}
                placeholder="e.g. Biology"
                required
                className={inputCls}
              />
            </Field>
            <Field label="Topics">
              <textarea
                rows={2}
                value={lNote}
                onChange={(e) => setLNote(e.target.value)}
                placeholder="Topics covered..."
                required
                className={inputCls}
              />
            </Field>
            <Field label="PDF Notes URL (Optional)">
              <input
                type="url"
                value={lPdf}
                onChange={(e) => setLPdf(e.target.value)}
                placeholder="https://drive.google.com/..."
                className={inputCls}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={lTestEnabled}
                onChange={(e) => setLTestEnabled(e.target.checked)}
                className="w-4 h-4 text-sky-600 accent-sky-600 rounded"
              />
              Enable Quiz for this lesson
            </label>
            {lessonMsg && (
              <p
                className={`text-xs font-bold ${
                  lessonMsg.includes('success') ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {lessonMsg}
              </p>
            )}
            <button
              type="submit"
              disabled={savingLesson}
              className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold py-2.5 rounded-lg transition-all shadow-xs disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
            >
              {savingLesson ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                'Save Lesson'
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Manage Lessons */}
      <div className="bg-[#fcfdfd] rounded-xl border border-slate-200 shadow-xs p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-1">Manage Lessons</h3>
        <p className="text-xs text-slate-500 mb-4">Edit or delete lessons for the selected study day</p>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 text-sky-500 animate-spin" />
          </div>
        ) : lessons.length === 0 ? (
          <div className="text-xs text-slate-500 py-4">No lessons logged for selected day.</div>
        ) : (
          <div className="space-y-2">
            {lessons.map((l, idx) => (
              <div
                key={`${l.id}-${idx}`}
                className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-slate-800">{l.subject}</div>
                  <div className="text-xs text-slate-500 truncate">{l.short_note?.slice(0, 50)}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setEditLesson(l)}
                    title="Edit Lesson"
                    aria-label="Edit Lesson"
                    className="p-1.5 text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(l.id)}
                    title="Delete Lesson"
                    aria-label="Delete Lesson"
                    className="p-1.5 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editLesson && (
        <EditLessonModal
          lesson={editLesson}
          onClose={() => setEditLesson(null)}
          onSaved={() => {
            setEditLesson(null);
            loadLessons(selectedDay);
          }}
        />
      )}
      {confirmDelete && (
        <ConfirmModal
          title="Delete Lesson"
          message="Are you sure you want to delete this lesson? Associated questions will also be removed."
          onConfirm={() => handleDeleteLesson(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function EditLessonModal({
  lesson,
  onClose,
  onSaved,
}: {
  lesson: Lesson;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [subject, setSubject] = useState(lesson.subject);
  const [note, setNote] = useState(lesson.short_note);
  const [pdf, setPdf] = useState(lesson.pdf_url || '');
  const [testEnabled, setTestEnabled] = useState(lesson.test_enabled);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from('lessons')
        .update({
          subject: subject.trim(),
          short_note: note.trim(),
          pdf_url: pdf.trim() || null,
          test_enabled: testEnabled,
        })
        .eq('id', lesson.id);
      if (error) {
        setMsg(error.message);
        setSaving(false);
        return;
      }
      setMsg('Lesson updated successfully in Google Sheet.');
      setTimeout(() => onSaved(), 800);
    } catch {
      setMsg('Failed to update lesson.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalLayout title="Edit Lesson" subtitle="Update subject, notes, or quiz" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Subject">
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            className={inputCls}
          />
        </Field>
        <Field label="Topics">
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            required
            className={inputCls}
          />
        </Field>
        <Field label="PDF Notes URL">
          <input
            type="url"
            value={pdf}
            onChange={(e) => setPdf(e.target.value)}
            className={inputCls}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={testEnabled}
            onChange={(e) => setTestEnabled(e.target.checked)}
            className="w-4 h-4 text-sky-600 accent-sky-600 rounded"
          />
          Enable Quiz for this lesson
        </label>
        {msg && (
          <p className={`text-xs font-bold ${msg.includes('success') ? 'text-emerald-700' : 'text-rose-600'}`}>
            {msg}
          </p>
        )}
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold py-2.5 rounded-lg transition-all shadow-xs disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Updating...
            </>
          ) : (
            'Save Lesson Changes'
          )}
        </button>
      </form>
    </ModalLayout>
  );
}

// =================== QUESTIONS TAB ===================

function QuestionsTab() {
  const [allLessons, setAllLessons] = useState<(Lesson & { day_label: string; day_date: string })[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedLesson, setSelectedLesson] = useState('');
  const [loading, setLoading] = useState(true);
  const [editQuestion, setEditQuestion] = useState<Question | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Add question form
  const [qText, setQText] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [correct, setCorrect] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [explanation, setExplanation] = useState('');
  const [qMsg, setQMsg] = useState('');
  const [savingQ, setSavingQ] = useState(false);

  const loadAllLessons = useCallback(async () => {
    const { data: days } = await supabase.from('study_days').select('*').order('day_date', { ascending: false });
    if (!days || days.length === 0) {
      setAllLessons([]);
      return;
    }

    const lessonPromises = (days as StudyDay[]).map(async (d) => {
      const { data: lessons } = await supabase.from('lessons').select('*').eq('study_day_id', d.id);
      return (lessons || []).map((l: Lesson) => ({ ...l, day_label: d.day_label, day_date: d.day_date }));
    });

    const results = await Promise.all(lessonPromises);
    const flat = results.flat();
    const uniqueLessons = Array.from(new Map(flat.map((l) => [String(l.id).trim(), l])).values());
    setAllLessons(uniqueLessons);
    if (uniqueLessons.length > 0 && !selectedLesson) setSelectedLesson(uniqueLessons[0].id);
  }, [selectedLesson]);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('questions').select('*').order('created_at', { ascending: true });
    if (error) {
      setQuestions([]);
      setLoading(false);
      return;
    }
    const qs = (data || []) as Question[];
    const uniqueQs = Array.from(new Map(qs.map((q) => [String(q.id).trim(), q])).values());
    setQuestions(uniqueQs);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAllLessons();
    loadQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLesson) {
      setQMsg('Please select a target lesson.');
      return;
    }

    const existingCount = questions.filter((q) => q.lesson_id === selectedLesson).length;
    if (existingCount >= 10) {
      setQMsg('Maximum 10 questions allowed per lesson.');
      return;
    }

    setSavingQ(true);
    setQMsg('');
    try {
      const { error } = await supabase.from('questions').insert({
        lesson_id: selectedLesson,
        question: qText.trim(),
        option_a: optA.trim(),
        option_b: optB.trim(),
        option_c: optC.trim(),
        option_d: optD.trim(),
        answer: correct,
        explanation: explanation.trim(),
      });
      if (error) {
        setQMsg(error.message);
        setSavingQ(false);
        return;
      }
      setQMsg('Question added successfully.');
      setQText('');
      setOptA('');
      setOptB('');
      setOptC('');
      setOptD('');
      setExplanation('');
      await loadQuestions();
    } catch {
      setQMsg('Failed to add question.');
    } finally {
      setSavingQ(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    try {
      await supabase.from('questions').delete().eq('id', id);
      setQuestions((prev) => prev.filter((q) => q.id !== id));
    } catch {
      // ignore
    }
    setConfirmDelete(null);
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#fcfdfd] rounded-xl border border-slate-200 shadow-xs p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-1">Add Quiz Question</h3>
        <p className="text-xs text-slate-500 mb-4">Create MCQ question with options &amp; explanation</p>
        <form onSubmit={handleAddQuestion} className="space-y-3">
          <Field label="Target Lesson">
            <select
              value={selectedLesson}
              onChange={(e) => setSelectedLesson(e.target.value)}
              className={inputCls}
              required
            >
              {allLessons.length === 0 ? (
                <option value="">No lessons available</option>
              ) : (
                allLessons.map((l, idx) => (
                  <option key={`${l.id}-${idx}`} value={l.id}>
                    [{l.day_label}] ({formatDayDate(l.day_date)}) {l.subject} - {l.short_note?.slice(0, 30)}
                  </option>
                ))
              )}
            </select>
          </Field>
          <Field label="Question Text">
            <input
              type="text"
              value={qText}
              onChange={(e) => setQText(e.target.value)}
              placeholder="Enter question text..."
              required
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Option A">
              <input
                type="text"
                value={optA}
                onChange={(e) => setOptA(e.target.value)}
                placeholder="Option A"
                required
                className={inputCls}
              />
            </Field>
            <Field label="Option B">
              <input
                type="text"
                value={optB}
                onChange={(e) => setOptB(e.target.value)}
                placeholder="Option B"
                required
                className={inputCls}
              />
            </Field>
            <Field label="Option C">
              <input
                type="text"
                value={optC}
                onChange={(e) => setOptC(e.target.value)}
                placeholder="Option C"
                required
                className={inputCls}
              />
            </Field>
            <Field label="Option D">
              <input
                type="text"
                value={optD}
                onChange={(e) => setOptD(e.target.value)}
                placeholder="Option D"
                required
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Correct Answer">
            <select
              value={correct}
              onChange={(e) => setCorrect(e.target.value as 'A' | 'B' | 'C' | 'D')}
              className={inputCls}
              required
            >
              <option value="A">Option A</option>
              <option value="B">Option B</option>
              <option value="C">Option C</option>
              <option value="D">Option D</option>
            </select>
          </Field>
          <Field label="Explanation (Optional)">
            <textarea
              rows={2}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Explanation for the correct answer..."
              className={inputCls}
            />
          </Field>
          {qMsg && (
            <p className={`text-xs font-bold ${qMsg.includes('success') ? 'text-emerald-700' : 'text-rose-600'}`}>
              {qMsg}
            </p>
          )}
          <button
            type="submit"
            disabled={savingQ}
            className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold py-2.5 rounded-lg transition-all shadow-xs disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
          >
            {savingQ ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : (
              'Save Question'
            )}
          </button>
        </form>
      </div>

      {/* Existing Questions */}
      <div className="bg-[#fcfdfd] rounded-xl border border-slate-200 shadow-xs p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-1">Existing Questions</h3>
        <p className="text-xs text-slate-500 mb-4">View, edit, or delete questions</p>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 text-sky-500 animate-spin" />
          </div>
        ) : questions.length === 0 ? (
          <div className="text-xs text-slate-500 py-4">No questions created yet.</div>
        ) : (
          <div className="space-y-2">
            {questions.map((q, idx) => {
              const lesson = allLessons.find((l) => l.id === q.lesson_id);
              return (
                <div
                  key={`${q.id}-${idx}`}
                  className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800">{q.question}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Answer: <strong className="text-sky-700">Option {q.answer}</strong>
                      {lesson && <span className="text-slate-400"> &middot; {lesson.subject}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => setEditQuestion(q)}
                      title="Edit Question"
                      aria-label="Edit Question"
                      className="p-1.5 text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(q.id)}
                      title="Delete Question"
                      aria-label="Delete Question"
                      className="p-1.5 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editQuestion && (
        <EditQuestionModal
          question={editQuestion}
          onClose={() => setEditQuestion(null)}
          onSaved={() => {
            setEditQuestion(null);
            loadQuestions();
          }}
        />
      )}
      {confirmDelete && (
        <ConfirmModal
          title="Delete Question"
          message="Are you sure you want to delete this question?"
          onConfirm={() => handleDeleteQuestion(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function EditQuestionModal({
  question,
  onClose,
  onSaved,
}: {
  question: Question;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [qText, setQText] = useState(question.question);
  const [optA, setOptA] = useState(question.option_a);
  const [optB, setOptB] = useState(question.option_b);
  const [optC, setOptC] = useState(question.option_c);
  const [optD, setOptD] = useState(question.option_d);
  const [correct, setCorrect] = useState(question.answer);
  const [explanation, setExplanation] = useState(question.explanation);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from('questions')
        .update({
          question: qText.trim(),
          option_a: optA.trim(),
          option_b: optB.trim(),
          option_c: optC.trim(),
          option_d: optD.trim(),
          answer: correct,
          explanation: explanation.trim(),
        })
        .eq('id', question.id);
      if (error) {
        setMsg(error.message);
        setSaving(false);
        return;
      }
      setMsg('Question updated successfully.');
      setTimeout(() => onSaved(), 800);
    } catch {
      setMsg('Failed to update question.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalLayout title="Edit Question" subtitle="Update question text and choices" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Question">
          <input
            type="text"
            value={qText}
            onChange={(e) => setQText(e.target.value)}
            required
            className={inputCls}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Option A">
            <input
              type="text"
              value={optA}
              onChange={(e) => setOptA(e.target.value)}
              required
              className={inputCls}
            />
          </Field>
          <Field label="Option B">
            <input
              type="text"
              value={optB}
              onChange={(e) => setOptB(e.target.value)}
              required
              className={inputCls}
            />
          </Field>
          <Field label="Option C">
            <input
              type="text"
              value={optC}
              onChange={(e) => setOptC(e.target.value)}
              required
              className={inputCls}
            />
          </Field>
          <Field label="Option D">
            <input
              type="text"
              value={optD}
              onChange={(e) => setOptD(e.target.value)}
              required
              className={inputCls}
            />
          </Field>
        </div>
        <Field label="Correct Answer">
          <select
            value={correct}
            onChange={(e) => setCorrect(e.target.value as 'A' | 'B' | 'C' | 'D')}
            className={inputCls}
            required
          >
            <option value="A">Option A</option>
            <option value="B">Option B</option>
            <option value="C">Option C</option>
            <option value="D">Option D</option>
          </select>
        </Field>
        <Field label="Explanation">
          <textarea
            rows={2}
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            className={inputCls}
          />
        </Field>
        {msg && (
          <p className={`text-xs font-bold ${msg.includes('success') ? 'text-emerald-700' : 'text-rose-600'}`}>
            {msg}
          </p>
        )}
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold py-2.5 rounded-lg transition-all shadow-xs disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Updating...
            </>
          ) : (
            'Save Question Changes'
          )}
        </button>
      </form>
    </ModalLayout>
  );
}

// =================== RESULTS TAB ===================

function ResultsTab() {
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const loadResults = async () => {
    try {
      const { data, error } = await supabase
        .from('quiz_results')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rawResults = (data || []) as QuizResult[];
      const uniqueResults = Array.from(new Map(rawResults.map((r) => [String(r.id).trim(), r])).values());
      setResults(uniqueResults);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResults();
  }, []);

  const handleDeleteResult = async (id: string) => {
    try {
      await supabase.from('quiz_results').delete().eq('id', id);
      setResults((prev) => prev.filter((r) => r.id !== id));
    } catch {
      // ignore
    }
    setConfirmDelete(null);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-sky-500 animate-spin" />
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-slate-500 bg-[#fcfdfd] rounded-xl border border-slate-200">
        No quiz submissions recorded yet.
      </div>
    );
  }

  return (
    <div className="bg-[#fcfdfd] rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 bg-[#f8fafc] flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Quiz Submissions</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Student scores &amp; percentages synced directly from Google Sheet
          </p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#f8fafc] border-b border-slate-200 text-slate-600">
              <th className="text-left px-4 py-2.5 text-xs font-bold">Student ID</th>
              <th className="text-left px-4 py-2.5 text-xs font-bold">Lesson</th>
              <th className="text-left px-4 py-2.5 text-xs font-bold">Score</th>
              <th className="text-left px-4 py-2.5 text-xs font-bold">Percentage</th>
              <th className="text-left px-4 py-2.5 text-xs font-bold">Date</th>
              <th className="text-right px-4 py-2.5 text-xs font-bold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {results.map((r, idx) => (
              <tr key={`${r.id}-${idx}`} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-2.5 font-bold text-slate-900">{r.student_id}</td>
                <td className="px-4 py-2.5 text-slate-600 text-xs">{r.lesson_id.slice(0, 8)}...</td>
                <td className="px-4 py-2.5">
                  <span className="font-bold text-emerald-700">
                    {r.score} / {r.total}
                  </span>
                </td>
                <td className="px-4 py-2.5 font-semibold text-slate-800">{r.percentage}%</td>
                <td className="px-4 py-2.5 text-slate-500 text-xs">{formatDate(r.created_at)}</td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    onClick={() => setConfirmDelete(r.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                    title="Delete Result"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {confirmDelete && (
        <ConfirmModal
          title="Delete Result"
          message="Are you sure you want to delete this quiz result from Google Sheet?"
          onConfirm={() => handleDeleteResult(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

// =================== SHARED COMPONENTS ===================

const inputCls =
  'w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all text-slate-900 placeholder-slate-400';

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 mb-1">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

function ModalLayout({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-[#fcfdfd] rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-[#f8fafc]">
          <div>
            <h3 className="text-base font-bold text-slate-800">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

function ConfirmModal({
  title,
  message,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-[#fcfdfd] rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mb-3">
            <span className="text-xl font-bold text-rose-600">!</span>
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">{title}</h3>
          <p className="text-sm text-slate-600 mb-5">{message}</p>
          <div className="flex gap-3 w-full">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
