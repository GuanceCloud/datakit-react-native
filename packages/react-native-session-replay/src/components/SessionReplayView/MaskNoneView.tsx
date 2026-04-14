import React from 'react';
import type { ViewProps } from 'react-native';
import { PrivacyView } from './PrivacyView';
import {
  ImagePrivacyLevel,
  TextAndInputPrivacyLevel,
  TouchPrivacyLevel,
} from '../../ft_session_replay';

type MaskNoneViewProps = ViewProps & {
  children?: React.ReactNode;
};

export function MaskNoneView({ children, ...props }: MaskNoneViewProps) {
  return (
    <PrivacyView
      {...props}
      textAndInputPrivacy={TextAndInputPrivacyLevel.MASK_SENSITIVE_INPUTS}
      imagePrivacy={ImagePrivacyLevel.MASK_NONE}
      touchPrivacy={TouchPrivacyLevel.SHOW}
      hide={false}
    >
      {children as any}
    </PrivacyView>
  );
}
