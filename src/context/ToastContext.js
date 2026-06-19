import React from 'react';

export const ToastContext = React.createContext(null);
export const useToast = () => React.useContext(ToastContext);
