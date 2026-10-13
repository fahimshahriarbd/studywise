import { useState, useEffect } from 'react';

interface Props {
  imageUrl?: string | null;
  gender?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function StudentAvatar({ imageUrl, gender, name = 'Student', size = 'md', className = '' }: Props) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [imageUrl]);

  const isFemale =
    (gender || '').trim().toLowerCase() === 'female' ||
    (gender || '').trim().toLowerCase() === 'f';

  const isMale =
    (gender || '').trim().toLowerCase() === 'male' ||
    (gender || '').trim().toLowerCase() === 'm';

  const sizeClasses = {
    sm: 'w-10 h-10 rounded-xl text-xs',
    md: 'w-16 h-16 rounded-2xl text-sm',
    lg: 'w-20 h-20 rounded-2xl text-base',
    xl: 'w-24 h-24 rounded-2xl text-lg',
  }[size];

  if (imageUrl && !imgError) {
    return (
      <div className={`overflow-hidden bg-[#fafafa] dark:bg-stone-800 flex-shrink-0 border border-stone-200/90 dark:border-stone-700/80 shadow-2xs ${sizeClasses} ${className}`}>
        <img
          src={imageUrl}
          alt={name}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // 1. Modern College Girl Student Avatar
  if (isFemale) {
    return (
      <div
        className={`overflow-hidden flex-shrink-0 border border-rose-200/70 dark:border-rose-900/40 flex items-center justify-center shadow-2xs select-none ${sizeClasses} ${className}`}
        title={`${name} (Female)`}
      >
        <svg viewBox="0 0 120 120" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="cgirl-bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fff1f2" />
              <stop offset="50%" stopColor="#ffe4e6" />
              <stop offset="100%" stopColor="#fecdd3" />
            </linearGradient>
            <linearGradient id="cgirl-hair" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#451a03" />
              <stop offset="100%" stopColor="#1c0f08" />
            </linearGradient>
            <linearGradient id="cgirl-skin" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fed7aa" />
              <stop offset="100%" stopColor="#fcd34d" />
            </linearGradient>
            <linearGradient id="cgirl-jacket" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#db2777" />
            </linearGradient>
            <linearGradient id="cgirl-shirt" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#f1f5f9" />
            </linearGradient>
          </defs>

          {/* Background */}
          <rect width="120" height="120" fill="url(#cgirl-bg)" />

          {/* Long Back Hair Flow */}
          <path
            d="M32 46 C24 64, 26 88, 30 110 C34 118, 44 116, 46 102 C48 88, 44 70, 42 56 Z"
            fill="url(#cgirl-hair)"
          />
          <path
            d="M88 46 C96 64, 94 88, 90 110 C86 118, 76 116, 74 102 C72 88, 76 70, 78 56 Z"
            fill="url(#cgirl-hair)"
          />

          {/* Torso: College Varsity / Denim Jacket */}
          <path d="M20 120 C20 94, 38 86, 60 86 C82 86, 100 94, 100 120 Z" fill="url(#cgirl-jacket)" />

          {/* White Inner Tee */}
          <path d="M46 86 C46 96, 74 96, 74 86 L74 120 L46 120 Z" fill="url(#cgirl-shirt)" />
          {/* Subtle Necklace / Pendant */}
          <path d="M52 86 C54 92, 66 92, 68 86" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="60" cy="90" r="1.5" fill="#fbbf24" />

          {/* Jacket Collar Accents */}
          <path d="M38 86 L48 106 L44 120" stroke="#fbcfe8" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M82 86 L72 106 L76 120" stroke="#fbcfe8" strokeWidth="2.5" strokeLinecap="round" />

          {/* Neck */}
          <rect x="53" y="68" width="14" height="20" rx="4" fill="url(#cgirl-skin)" />

          {/* Head & Face */}
          <ellipse cx="60" cy="54" rx="20" ry="23" fill="url(#cgirl-skin)" />

          {/* Cute Hoop Earrings */}
          <circle cx="39" cy="56" r="3.5" stroke="#fbbf24" strokeWidth="1.5" fill="none" />
          <circle cx="81" cy="56" r="3.5" stroke="#fbbf24" strokeWidth="1.5" fill="none" />

          {/* Cheerful Blush */}
          <circle cx="49" cy="58" r="3" fill="#f43f5e" opacity="0.22" />
          <circle cx="71" cy="58" r="3" fill="#f43f5e" opacity="0.22" />

          {/* Modern Front Wavy Hairstyle */}
          <path
            d="M36 48 C36 28, 48 20, 60 20 C74 20, 84 28, 84 48 C80 40, 72 36, 60 36 C48 36, 40 42, 36 48 Z"
            fill="url(#cgirl-hair)"
          />
          {/* Chic Side Bangs framing face */}
          <path
            d="M38 36 C44 26, 62 26, 78 34 C82 38, 83 48, 82 56 C79 48, 76 42, 68 38 C58 34, 46 38, 38 46 C39 42, 38 38, 38 36 Z"
            fill="#572608"
          />
          {/* Soft Hair Highlights */}
          <path
            d="M44 26 C52 22, 68 22, 74 26"
            stroke="#9a3412"
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity="0.6"
          />
        </svg>
      </div>
    );
  }

  // 2. Modern College Boy Student Avatar
  if (isMale) {
    return (
      <div
        className={`overflow-hidden flex-shrink-0 border border-sky-200/70 dark:border-sky-900/40 flex items-center justify-center shadow-2xs select-none ${sizeClasses} ${className}`}
        title={`${name} (Male)`}
      >
        <svg viewBox="0 0 120 120" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="cboy-bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f0f9ff" />
              <stop offset="50%" stopColor="#e0f2fe" />
              <stop offset="100%" stopColor="#bae6fd" />
            </linearGradient>
            <linearGradient id="cboy-hair" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#090d16" />
            </linearGradient>
            <linearGradient id="cboy-skin" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fed7aa" />
              <stop offset="100%" stopColor="#fcd34d" />
            </linearGradient>
            <linearGradient id="cboy-hoodie" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
          </defs>

          {/* Background */}
          <rect width="120" height="120" fill="url(#cboy-bg)" />

          {/* Torso: Modern College Hoodie / Bomber */}
          <path d="M18 120 C18 92, 38 84, 60 84 C82 84, 102 92, 102 120 Z" fill="url(#cboy-hoodie)" />

          {/* Hoodie Collar / Drawstrings */}
          <path d="M48 84 C48 98, 72 98, 72 84 Z" fill="#ffffff" />
          <path d="M54 94 L54 108" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M66 94 L66 108" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="54" cy="109" r="1.5" fill="#94a3b8" />
          <circle cx="66" cy="109" r="1.5" fill="#94a3b8" />

          {/* Neck */}
          <rect x="52" y="68" width="16" height="18" rx="4" fill="url(#cboy-skin)" />

          {/* Ears with subtle modern stud */}
          <circle cx="36" cy="54" r="5.5" fill="url(#cboy-skin)" />
          <circle cx="84" cy="54" r="5.5" fill="url(#cboy-skin)" />
          <circle cx="36" cy="56" r="1.2" fill="#0f172a" />

          {/* Head & Face */}
          <ellipse cx="60" cy="53" rx="21" ry="24" fill="url(#cboy-skin)" />

          {/* Modern Textured Hair (Fade on sides, textured top quiff) */}
          <path
            d="M37 46 C35 34, 40 22, 54 18 C68 14, 82 18, 84 32 C85 40, 83 46, 83 46 C79 42, 75 42, 70 38 C62 36, 50 38, 44 43 C40 45, 38 46, 37 46 Z"
            fill="url(#cboy-hair)"
          />
          {/* Hair Texture volume / Quiff strokes */}
          <path
            d="M46 22 C56 16, 72 17, 78 24 C82 28, 82 34, 76 30 C70 26, 58 26, 48 30 Z"
            fill="#334155"
            opacity="0.6"
          />
          <path
            d="M52 26 C62 20, 72 22, 75 28"
            stroke="#64748b"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.4"
          />
        </svg>
      </div>
    );
  }

  // 3. Modern College Default Student Crest Avatar
  return (
    <div
      className={`overflow-hidden flex-shrink-0 border border-sky-200/70 dark:border-sky-900/40 flex items-center justify-center shadow-2xs select-none ${sizeClasses} ${className}`}
      title={name}
    >
      <svg viewBox="0 0 120 120" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="cdef-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="50%" stopColor="#0369a1" />
            <stop offset="100%" stopColor="#075985" />
          </linearGradient>
          <linearGradient id="cdef-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#eab308" />
          </linearGradient>
        </defs>

        <rect width="120" height="120" fill="url(#cdef-bg)" />

        <circle cx="60" cy="60" r="46" stroke="#ffffff" strokeOpacity="0.15" strokeWidth="2" />
        <circle cx="60" cy="60" r="40" stroke="#ffffff" strokeOpacity="0.1" strokeWidth="1" strokeDasharray="3 3" />

        {/* Graduation Cap */}
        <path d="M60 34 L26 50 L60 66 L94 50 Z" fill="#ffffff" opacity="0.95" />
        <path d="M38 56 L38 72 C38 80, 82 80, 82 72 L82 56 L60 66 Z" fill="#f0f9ff" opacity="0.85" />

        {/* Gold Tassel */}
        <path d="M60 50 Q78 52 84 64" stroke="url(#cdef-gold)" strokeWidth="2.5" strokeLinecap="round" />
        <rect x="81" y="64" width="6" height="12" rx="2" fill="url(#cdef-gold)" />
        <circle cx="60" cy="50" r="3.5" fill="url(#cdef-gold)" />

        {/* Academic Open Book Wings */}
        <path
          d="M34 94 C46 90, 56 93, 60 97 C64 93, 74 90, 86 94 L86 86 C74 82, 64 85, 60 88 C56 85, 46 82, 34 86 Z"
          fill="#ffffff"
          opacity="0.9"
        />
      </svg>
    </div>
  );
}
