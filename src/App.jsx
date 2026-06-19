import ToastProvider from './context/ToastProvider';
import AppInner from './AppInner';

export default function App() {
    return <ToastProvider><AppInner /></ToastProvider>;
}
