import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { createComplaint } from '../services/complaintService';
import { cn } from '../utils/cn';

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const categories = ['electrical', 'plumbing', 'furniture', 'network', 'equipment'] as const;

type Category = (typeof categories)[number];

type ComplaintFormState = {
  rollNumber: string;
  roomNumber: string;
  category: Category;
  description: string;
  photoUrl: string;
};

type ComplaintErrors = Partial<Record<keyof ComplaintFormState, string>>;

const ComplaintForm = () => {
  const location = useLocation();
  const prefilledRoom = (location.state as { roomNumber?: string } | null)?.roomNumber;
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [form, setForm] = useState<ComplaintFormState>({
    rollNumber: '',
    roomNumber: '',
    category: 'electrical',
    description: '',
    photoUrl: '',
  });
  const [photoName, setPhotoName] = useState('');
  const [errors, setErrors] = useState<ComplaintErrors>({});
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; tone: 'success' | 'error' | '' }>({ message: '', tone: '' });
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');

  const inputStyles = useMemo(
    () =>
      'block w-full rounded-2xl border border-surface-border bg-white px-4 py-3 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 shadow-soft transition focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary/40',
    [],
  );

  const resetFeedback = useCallback(() => setFeedback({ message: '', tone: '' }), []);

  const appendDescription = useCallback(
    (spokenText: string) => {
      const normalized = spokenText.replace(/\s+/g, ' ').trim();
      if (!normalized) return;
      resetFeedback();
      setForm((prev) => {
        const combined = `${prev.description} ${normalized}`.replace(/\s+/g, ' ').trim();
        return { ...prev, description: combined };
      });
      setErrors((prev) => ({ ...prev, description: undefined }));
    },
    [resetFeedback],
  );

  const stopVoiceInput = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError('Voice input is unavailable in this browser.');
      return undefined;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let chunk = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result?.isFinal) {
          chunk += result[0]?.transcript || '';
        }
      }
      if (chunk.trim()) {
        appendDescription(chunk);
      }
    };
    recognition.onerror = (event) => {
      const message =
        event.error === 'not-allowed'
          ? 'Microphone permission blocked. Allow access in your browser settings.'
          : 'Speech recognition error. Try again.';
      setVoiceError(message);
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    return () => {
      stopVoiceInput();
      recognitionRef.current = null;
    };
  }, [appendDescription, stopVoiceInput]);

  useEffect(() => {
    if (!prefilledRoom) return;
    setForm((prev) => ({ ...prev, roomNumber: prefilledRoom }));
    setErrors((prev) => ({ ...prev, roomNumber: undefined }));
    setFeedback({ message: `Room ${prefilledRoom} pre-filled from QR scan.`, tone: 'success' });
  }, [prefilledRoom]);

  const updateField = (field: keyof ComplaintFormState, value: string) => {
    resetFeedback();
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const startVoiceInput = () => {
    setVoiceError('');
    if (!recognitionRef.current) {
      setVoiceError('Voice input is unavailable in this browser.');
      return;
    }
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (error) {
      setVoiceError('Unable to access the microphone. Refresh and try again.');
      setIsListening(false);
    }
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      stopVoiceInput();
      return;
    }
    startVoiceInput();
  };

  const validate = () => {
    const nextErrors: ComplaintErrors = {};
    if (!form.rollNumber.trim()) {
      nextErrors.rollNumber = 'Roll number is required';
    }
    if (!form.roomNumber.trim()) {
      nextErrors.roomNumber = 'Specify a room or area';
    }
    if (!form.description.trim()) {
      nextErrors.description = 'Describe the issue for the maintenance team';
    }
    if (!form.photoUrl) {
      nextErrors.photoUrl = 'Photo evidence is required to validate severity';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetFeedback();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        ...form,
        title: `${form.category.toUpperCase()} issue in ${form.roomNumber}`,
      };

      await createComplaint(payload);
      setFeedback({ message: 'Complaint submitted successfully.', tone: 'success' });
      setPhotoName('');
      setForm({ rollNumber: '', roomNumber: '', category: 'electrical', description: '', photoUrl: '' });
    } catch (error: any) {
      setFeedback({ message: error?.response?.data?.message || 'Unable to submit complaint.', tone: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = (file?: File) => {
    if (!file) {
      updateField('photoUrl', '');
      setPhotoName('');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, photoUrl: 'Only image files are allowed' }));
      return;
    }

    setPhotoName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      updateField('photoUrl', reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <section className="rounded-2xl border border-surface-border bg-white p-4 shadow-sm sm:p-6 lg:p-8">
        <div className="mb-4 flex items-center gap-3 sm:mb-6">
          <div className="text-2xl">📝</div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-primary">Submit complaint</p>
            <h2 className="text-xl sm:text-2xl font-semibold text-neutral-900">Report an issue</h2>
          </div>
        </div>
        <p className="mb-6 text-sm text-neutral-600 sm:mb-8">
          Include photos and precise location details to accelerate response time.
        </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-5 sm:mt-6 sm:space-y-6">
        <div className="grid gap-4 sm:gap-5 md:grid-cols-2 md:gap-6">
          <div>
            <label htmlFor="rollNumber" className="text-sm font-semibold text-neutral-700">
              Roll Number
            </label>
            <input
              id="rollNumber"
              className={cn(inputStyles, errors.rollNumber && 'border-danger focus:ring-danger/30')}
              placeholder="e.g. EC-21-045"
              value={form.rollNumber}
              onChange={(e) => updateField('rollNumber', e.target.value.toUpperCase())}
              aria-invalid={Boolean(errors.rollNumber)}
              aria-describedby={errors.rollNumber ? 'rollNumber-error' : undefined}
            />
            {errors.rollNumber && (
              <p id="rollNumber-error" className="mt-2 text-xs font-semibold text-danger">
                {errors.rollNumber}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="roomNumber" className="text-sm font-semibold text-neutral-700">
              Room Number
            </label>
            <input
              id="roomNumber"
              className={cn(inputStyles, errors.roomNumber && 'border-danger focus:ring-danger/30')}
              placeholder="Hostel B-204"
              value={form.roomNumber}
              onChange={(e) => updateField('roomNumber', e.target.value.toUpperCase())}
              aria-invalid={Boolean(errors.roomNumber)}
              aria-describedby={errors.roomNumber ? 'roomNumber-error' : undefined}
            />
            {errors.roomNumber && (
              <p id="roomNumber-error" className="mt-2 text-xs font-semibold text-danger">
                {errors.roomNumber}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:gap-5 md:grid-cols-2 md:gap-6">
          <div>
            <label htmlFor="category" className="text-sm font-semibold text-neutral-700">
              Issue Category
            </label>
            <select
              id="category"
              className={cn(inputStyles, 'appearance-none font-semibold capitalize')}
              value={form.category}
              onChange={(e) => updateField('category', e.target.value)}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-neutral-700 block mb-3">Photo Evidence</label>
            <label
              className={cn(
                'relative flex min-h-[170px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-4 text-center transition-all cursor-pointer hover:border-primary/60 sm:min-h-[190px] sm:p-6',
                errors.photoUrl ? 'border-red-300 bg-red-50' : 'border-neutral-300 bg-neutral-50 hover:bg-primary/5',
              )}
            >
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(e) => handlePhotoUpload(e.target.files?.[0])}
              />
              <div className="text-3xl text-neutral-400">📷</div>
              <div>
                <p className="text-sm font-semibold text-neutral-700">
                  {photoName ? 'Photo selected' : 'Take or upload photo'}
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                  {photoName ? photoName : 'Tap to open camera or select from gallery'}
                </p>
              </div>
            </label>
            {errors.photoUrl && (
              <p className="mt-2 text-xs font-semibold text-red-600">{errors.photoUrl}</p>
            )}
            {form.photoUrl && (
              <div className="mt-4 overflow-hidden rounded-xl border border-neutral-200">
                <img
                  src={form.photoUrl}
                  alt="Uploaded evidence"
                  className="w-full h-48 sm:h-64 object-cover"
                />
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <label htmlFor="description" className="text-sm font-semibold text-neutral-700">
              Description
            </label>
            <button
              type="button"
              onClick={handleVoiceToggle}
              disabled={!recognitionRef.current}
              className={cn(
                'inline-flex min-h-[40px] items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition sm:min-h-[44px]',
                isListening
                  ? 'border-red-300 bg-red-50 text-red-700'
                  : 'border-neutral-300 bg-white text-neutral-600 hover:border-primary/60 hover:text-primary',
                !recognitionRef.current && 'opacity-50 cursor-not-allowed',
              )}
            >
              <span className="text-sm">{isListening ? '🎤' : '🎙️'}</span>
              {isListening ? 'Stop recording' : 'Voice input'}
            </button>
          </div>
          <textarea
            id="description"
            className={cn(
              'block w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary/40',
              'min-h-[120px] resize-y align-top',
              errors.description && 'border-red-300 focus:ring-red-400/40',
            )}
            placeholder="Describe the issue in detail. What happened? When did it start? Any safety concerns?"
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            aria-invalid={Boolean(errors.description)}
            aria-describedby={errors.description ? 'description-error' : undefined}
          />
          {errors.description && (
            <p id="description-error" className="mt-2 text-xs font-semibold text-red-600">
              {errors.description}
            </p>
          )}
          <p className="mt-2 text-xs text-neutral-500">
            💡 Tip: Use voice input for faster reporting, or type details manually.
          </p>
          {voiceError && (
            <p className="mt-2 text-xs font-semibold text-red-600">{voiceError}</p>
          )}
        </div>

        {feedback.message && (
          <div
            className={cn(
              'rounded-xl border px-4 py-3 text-sm font-semibold flex items-center gap-3',
              feedback.tone === 'success'
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-red-200 bg-red-50 text-red-800',
            )}
          >
            <span className="text-lg">{feedback.tone === 'success' ? '✅' : '❌'}</span>
            {feedback.message}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-neutral-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Submitting…
              </>
            ) : (
              <>
                <span>📤</span>
                Submit Complaint
              </>
            )}
          </button>
          <p className="text-xs text-neutral-500 text-center sm:text-left">
            All submissions are recorded with timestamps for audit compliance.
          </p>
        </div>
      </form>
    </section>
    </div>
  );
};

export default ComplaintForm;
