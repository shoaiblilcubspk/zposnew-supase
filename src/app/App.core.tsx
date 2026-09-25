import { AuthProvider } from '../context/AuthContext';
import { AppProvider } from '../context/SupabaseAppContext';
import { TouchKeyboardProvider } from '../providers/TouchKeyboardProvider';
import { AppContent } from './AppContent';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

export default function App() {
  return (
    // Top-level boundary: any throw during provider/AppContent render (e.g. an offline boot
    // failure) shows a recoverable fallback instead of a blank white screen.
    <ErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <TouchKeyboardProvider>
            <AppContent />
          </TouchKeyboardProvider>
        </AppProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
