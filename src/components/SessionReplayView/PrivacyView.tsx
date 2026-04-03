import React from 'react';
import FTPrivacyViewNative from '../../specs/FTPrivacyViewNative';
import type { ViewProps } from 'react-native';
import type {
  ImagePrivacyLevel,
  TextAndInputPrivacyLevel,
  TouchPrivacyLevel,
} from '../../ft_session_replay';

export interface PrivacyViewProps extends ViewProps {
  children?: React.ReactNode;
  textAndInputPrivacy?: TextAndInputPrivacyLevel;
  imagePrivacy?: ImagePrivacyLevel;
  touchPrivacy?: TouchPrivacyLevel;
  hide?: boolean;
  nativeID?: string;
}

export function PrivacyView({
  children,
  textAndInputPrivacy,
  imagePrivacy,
  touchPrivacy,
  nativeID,
  hide,
  ...props
}: PrivacyViewProps) {
  return (
    <FTPrivacyViewNative
      {...props}
      textAndInputPrivacy={textAndInputPrivacy}
      imagePrivacy={imagePrivacy}
      touchPrivacy={touchPrivacy}
      hide={hide}
      nativeID={nativeID}
    >
      {children}
    </FTPrivacyViewNative>
  );
}
