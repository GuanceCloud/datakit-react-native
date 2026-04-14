import React from 'react';
import type { ViewProps } from 'react-native';
import { PrivacyView } from './PrivacyView';

type HideViewProps = ViewProps & {
  children?: React.ReactNode;
};

export function HideView({ children, ...props }: HideViewProps) {
  return (
    <PrivacyView {...props} hide={true}>
      {children as any}
    </PrivacyView>
  );
}
