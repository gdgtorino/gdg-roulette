import React from 'react';

interface ErrorScreenProps {
  error: string;
}

export const ErrorScreen: React.FC<ErrorScreenProps> = ({ error }) => {
  return (
    <div>
      <h2>Error</h2>
      <p>{error}</p>
    </div>
  );
};
