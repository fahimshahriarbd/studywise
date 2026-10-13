import { useState, useEffect } from 'react';
import { supabase, verifyAdminCredentialsAsync, getAdminCredentials } from '@/lib/supabase';
import type { Student } from '@/lib/supabase';
import type { SessionUser } from '@/App';
import { updateAppFavicon } from '@/lib/favicon';
import { GraduationCap, Loader2, AlertCircle } from 'lucide-react';

interface Props {
  onLogin: (user: SessionUser) => void;
}

export function LoginScreen({ onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    updateAppFavicon();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedId = username.trim();
    const trimmedPin = pin.trim();
    if (!trimmedId || !trimmedPin) {
      setError('Please enter both Student ID and PIN.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Check admin first
      if (await verifyAdminCredentialsAsync(trimmedId, trimmedPin)) {
        const adminName = getAdminCredentials().username;
        const displayName = adminName.charAt(0).toUpperCase() + adminName.slice(1);
        updateAppFavicon();
        onLogin({ role: 'admin', name: displayName });
        return;
      }

      // Check student
      const { data, error: dbError } = await supabase
        .from('students')
        .select('*')
        .eq('id', trimmedId)
        .maybeSingle();

      if (dbError) throw dbError;

      const student = data as Student | null;
      if (!student || student.pin !== trimmedPin) {
        setError('Invalid Student ID or PIN.');
        return;
      }

      updateAppFavicon(student.gender);

      onLogin({
        role: 'student',
        studentId: student.id,
        name: student.name,
        className: student.class_name,
        subjects: student.subjects,
        imageUrl: student.image_url || '',
        gender: student.gender,
      });
    } catch {
      setError('Network connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fbf8ee] dark:bg-[#191715] px-4 font-sans text-[#2c2825] dark:text-[#f2ece4] transition-colors duration-200">
      <div className="w-full max-w-sm">
        <div className="bg-[#fffefb] dark:bg-[#221f1d] rounded-2xl shadow-xl border border-[#ece4d6] dark:border-[#38322c] p-7 sm:p-8">
          {/* Brand */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 via-sky-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg mb-4 text-white">
              <GraduationCap className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-[#2c2825] dark:text-stone-100 tracking-tight">StudyWise</h1>
            <p className="text-xs text-blue-700 dark:text-sky-300 font-semibold mt-1">Student Portal</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-xs font-bold text-slate-700 dark:text-stone-300 mb-1.5">
                Student ID
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter 6-digit Student ID"
                autoComplete="username"
                disabled={loading}
                className="w-full px-4 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-slate-900 dark:text-stone-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold text-slate-700 dark:text-stone-300 mb-1.5">
                PIN Code
              </label>
              <input
                id="password"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter 4-digit PIN"
                autoComplete="current-password"
                disabled={loading}
                className="w-full px-4 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-slate-900 dark:text-stone-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-lg px-3 py-2.5">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold py-2.5 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                'Sign In'
              )}
            </button>

            {/* Forgot Password */}
            <div className="text-center pt-2">
              <a
                href={`https://wa.me/8801316831199?text=${encodeURIComponent(
                  'Hello, I forgot my Student ID or PIN. Here are my details:\n\nName: \nClass: \nMobile: '
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-slate-500 dark:text-stone-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-block font-semibold hover:underline underline-offset-2"
              >
                Forgot PIN or ID?
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
