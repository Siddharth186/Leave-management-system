import { useContext } from 'react';
import { LeaveContext } from '../context/LeaveContext';

export const useLeaves = () => {
  const context = useContext(LeaveContext);
  if (context === undefined) {
    throw new Error('useLeaves must be used within a LeaveProvider');
  }
  return context;
};
