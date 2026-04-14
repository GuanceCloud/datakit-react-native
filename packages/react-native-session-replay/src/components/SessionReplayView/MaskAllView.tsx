import React from 'react';
import type { ViewProps } from 'react-native';
import { PrivacyView } from './PrivacyView';
import {
  ImagePrivacyLevel,
  TextAndInputPrivacyLevel,
  TouchPrivacyLevel,
} from '../../ft_session_replay';

type MaskAllViewProps = ViewProps & {
  children?: React.ReactNode;
  showTouch?: boolean;
};

export function MaskAllView({
  children,
  showTouch = false,
  ...props
}: MaskAllViewProps) {
  const touchPrivacy = showTouch
    ? TouchPrivacyLevel.SHOW
    : TouchPrivacyLevel.HIDE;

  return (
    <PrivacyView
      {...props}
      textAndInputPrivacy={TextAndInputPrivacyLevel.MASK_ALL}
      imagePrivacy={ImagePrivacyLevel.MASK_ALL}
      touchPrivacy={touchPrivacy}
      hide={false}
    >
      {children as any}
    </PrivacyView>
  );
}
