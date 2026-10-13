import { useState, useRef } from 'react';
import { supabase, format6DigitId } from '@/lib/supabase';
import type { Student } from '@/lib/supabase';
import { StudentAvatar } from '@/components/StudentAvatar';
import { updateAppFavicon } from '@/lib/favicon';
import { ImageCropModal } from '@/components/ImageCropModal';
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  KeyRound,
  Building,
  Droplet,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Upload,
  Trash2,
  Lock,
  BookOpen,
  Camera,
  Crop,
} from 'lucide-react';

interface Props {
  student: Student;
  canEdit: boolean;
  onClose: () => void;
  onUpdated: (updatedStudent: Student) => void;
}

export function StudentProfileModal({ student, canEdit, onClose, onUpdated }: Props) {
  // Direct edit form fields
  const [name, setName] = useState(student.name || '');
  const [className, setClassName] = useState(student.class_name || '');
  const [subjects, setSubjects] = useState(student.subjects || '');
  const [phone, setPhone] = useState(student.phone || '');
  const [email, setEmail] = useState(student.email || '');
  const [address, setAddress] = useState(student.address || '');
  const [gender, setGender] = useState<'Male' | 'Female' | string>(student.gender || 'Female');
  const [institution, setInstitution] = useState(student.institution || '');
  const [bloodGroup, setBloodGroup] = useState(student.blood_group || '');
  const [imageUrl, setImageUrl] = useState(student.image_url || '');

  // File and crop state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // PIN change state
  const [changePin, setChangePin] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setSelectedFile(file);
    // Open the resize & adjustment crop modal directly upon selecting photo
    setCropFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCropComplete = async (croppedDataUrl: string) => {
    setImageUrl(croppedDataUrl);
    setCropFile(null);

    // Auto-save photo immediately to student record and sync session
    try {
      setSaving(true);
      setUploadingPhoto(true);
      setError('');
      await supabase
        .from('students')
        .update({ image_url: croppedDataUrl })
        .eq('id', student.id);

      const updatedStudent: Student = {
        ...student,
        image_url: croppedDataUrl,
      };

      onUpdated(updatedStudent);
      updateAppFavicon(updatedStudent.gender);

      // Sync studywise_session in localStorage so refresh preserves the photo
      try {
        const saved = localStorage.getItem('studywise_session');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.role === 'student' && String(parsed.studentId) === String(student.id)) {
            parsed.imageUrl = croppedDataUrl;
            localStorage.setItem('studywise_session', JSON.stringify(parsed));
          }
        }
      } catch {
        // ignore session parsing error
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to auto-save photo:', err);
    } finally {
      setSaving(false);
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    setImageUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';

    try {
      setSaving(true);
      await supabase
        .from('students')
        .update({ image_url: null })
        .eq('id', student.id);

      const updatedStudent: Student = {
        ...student,
        image_url: null,
      };

      onUpdated(updatedStudent);

      try {
        const saved = localStorage.getItem('studywise_session');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.role === 'student' && parsed.studentId === student.id) {
            parsed.imageUrl = '';
            localStorage.setItem('studywise_session', JSON.stringify(parsed));
          }
        }
      } catch {
        // ignore session parsing error
      }
    } catch (err) {
      console.error('Failed to remove photo:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      setError('Profile editing is currently locked by administrator.');
      return;
    }

    if (!name.trim()) {
      setError('Please provide student name.');
      return;
    }

    let finalPin = student.pin;
    if (changePin) {
      if (!currentPin.trim()) {
        setError('Please enter your current PIN.');
        return;
      }
      if (currentPin.trim() !== student.pin.trim()) {
        setError('Current PIN is incorrect.');
        return;
      }
      if (!newPin.trim()) {
        setError('Please enter a new PIN.');
        return;
      }
      if (newPin.trim().length < 4) {
        setError('New PIN must be at least 4 digits.');
        return;
      }
      if (newPin.trim() !== confirmPin.trim()) {
        setError('New PIN and Confirm PIN do not match.');
        return;
      }
      finalPin = newPin.trim();
    }

    setSaving(true);
    setError('');

    try {
      const updateData: Partial<Student> = {
        name: name.trim(),
        class_name: className.trim(),
        subjects: subjects.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        gender: gender.trim(),
        institution: institution.trim(),
        blood_group: bloodGroup.trim(),
        image_url: imageUrl.trim() || null,
        pin: finalPin,
      };

      const { error: dbError } = await supabase
        .from('students')
        .update(updateData)
        .eq('id', student.id);

      if (dbError) throw dbError;

      const mergedStudent: Student = {
        ...student,
        ...updateData,
      };

      updateAppFavicon(mergedStudent.gender);

      try {
        const saved = localStorage.getItem('studywise_session');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.role === 'student' && parsed.studentId === student.id) {
            parsed.name = mergedStudent.name;
            parsed.className = mergedStudent.class_name;
            parsed.subjects = mergedStudent.subjects;
            parsed.imageUrl = mergedStudent.image_url || '';
            parsed.gender = mergedStudent.gender;
            localStorage.setItem('studywise_session', JSON.stringify(parsed));
          }
        }
      } catch {
        // ignore session parsing error
      }

      setSuccess(true);
      setTimeout(() => {
        onUpdated(mergedStudent);
        setSuccess(false);
        onClose();
      }, 700);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile in Google Sheet.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-stone-900/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto font-sans">
        <div className="bg-[#fffefb] dark:bg-[#1f1d1b] rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl w-full max-w-lg my-6 sm:my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Modal Top Bar - Sleek Blue Brand */}
          <div className="bg-gradient-to-r from-blue-600 via-sky-600 to-blue-700 px-5 py-3.5 flex items-center justify-between text-white shadow-sm">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <h3 className="text-sm font-bold tracking-wide">Edit Profile</h3>
            </div>

            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Lock notice if editing is disabled by Admin */}
          {!canEdit && (
            <div className="mx-5 mt-4 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-200">
              <Lock className="w-4 h-4 flex-shrink-0 text-amber-600" />
              <span>Profile editing is locked by admin. Changes cannot be submitted.</span>
            </div>
          )}

          {/* Form Container with unified natural scrolling for Photo, ID, and Inputs */}
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[78vh] overflow-y-auto">
            {/* Photo Upload & 6-Digit ID Section (Scrolls naturally with the form) */}
            <div className="pb-3 text-center border-b border-stone-200 dark:border-stone-800">
              <div className="inline-block relative group mx-auto">
                <div
                  className="relative cursor-pointer mx-auto inline-block"
                  onClick={() => canEdit && fileInputRef.current?.click()}
                  title="Click to select & crop photo"
                >
                  <StudentAvatar
                    imageUrl={imageUrl}
                    gender={gender}
                    name={name || student.name}
                    size="xl"
                    className="w-24 h-24 mx-auto rounded-2xl shadow-md border-2 border-white dark:border-stone-800 ring-2 ring-blue-300 dark:ring-blue-800"
                  />
                  {canEdit && (
                    <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 rounded-2xl flex items-center justify-center transition-opacity text-white text-xs font-medium">
                      <Camera className="w-6 h-6 drop-shadow" />
                    </div>
                  )}
                </div>
                {canEdit && (
                  <div className="mt-2.5 flex items-center justify-center flex-wrap gap-2">
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
                      disabled={saving || uploadingPhoto}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-200 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-lg cursor-pointer transition-colors shadow-2xs disabled:opacity-60"
                    >
                      {uploadingPhoto ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>{imageUrl ? 'Change Photo' : 'Upload Photo'}</span>
                        </>
                      )}
                    </button>
                    {imageUrl && selectedFile && (
                      <button
                        type="button"
                        onClick={() => setCropFile(selectedFile)}
                        disabled={saving || uploadingPhoto}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-stone-700 dark:text-stone-300 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 rounded-lg cursor-pointer transition-colors"
                        title="Adjust photo crop"
                      >
                        <Crop className="w-3.5 h-3.5 text-blue-600" />
                        <span>Adjust</span>
                      </button>
                    )}
                    {imageUrl && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        disabled={saving || uploadingPhoto}
                        className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-lg cursor-pointer disabled:opacity-50"
                        title="Remove Photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* 6-Digit Student ID Prominently Under Photo */}
              <div className="mt-2.5">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-mono font-bold text-blue-800 dark:text-blue-200 bg-blue-50 dark:bg-blue-950/70 border border-blue-200/80 dark:border-blue-800 shadow-2xs tracking-wider">
                  ID: {format6DigitId(student.id)}
                </span>
              </div>
            </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={saving || !canEdit}
                placeholder="Student Name"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                Gender *
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                disabled={saving || !canEdit}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-60"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                Class / Grade *
              </label>
              <input
                type="text"
                required
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                disabled={saving || !canEdit}
                placeholder="e.g. HSC 2nd Year"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                Subjects *
              </label>
              <input
                type="text"
                required
                value={subjects}
                onChange={(e) => setSubjects(e.target.value)}
                disabled={saving || !canEdit}
                placeholder="e.g. Biology & Chemistry"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={saving || !canEdit}
                placeholder="01XXXXXXXXX"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={saving || !canEdit}
                placeholder="student@example.com"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                College / Institution
              </label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                disabled={saving || !canEdit}
                placeholder="College or School"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                <Droplet className="w-3.5 h-3.5 text-slate-400" />
                Blood Group
              </label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                disabled={saving || !canEdit}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-60"
              >
                <option value="">Select Blood Group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={saving || !canEdit}
              placeholder="Present / Permanent address"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-60"
            />
          </div>

          {/* Change PIN Accordion */}
          <div className="border border-slate-200/90 dark:border-zinc-800 rounded-xl p-3.5 bg-[#f8fafc] dark:bg-zinc-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">Change PIN Code</span>
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    setChangePin(!changePin);
                    setCurrentPin('');
                    setNewPin('');
                    setConfirmPin('');
                  }}
                  className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                >
                  {changePin ? 'Cancel' : 'Change PIN'}
                </button>
              )}
            </div>

            {changePin && canEdit && (
              <div className="mt-3 space-y-2.5 pt-2.5 border-t border-slate-200 dark:border-zinc-700 text-xs">
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                    Current PIN *
                  </label>
                  <input
                    type="password"
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value)}
                    placeholder="Enter current PIN"
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                      New PIN *
                    </label>
                    <input
                      type="password"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      placeholder="Min 4 digits"
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                      Confirm PIN *
                    </label>
                    <input
                      type="password"
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value)}
                      placeholder="Repeat new PIN"
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-lg p-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 rounded-lg p-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Profile updated successfully!</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !canEdit}
              className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 active:scale-95 rounded-lg transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                'Update Profile'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>

    {cropFile && (
      <ImageCropModal
        imageFile={cropFile}
        onCropComplete={handleCropComplete}
        onCancel={() => setCropFile(null)}
      />
    )}
    </>
  );
}
