import type { ViewProps } from 'react-native';

export interface FTPrivacyViewNativeProps extends ViewProps {
  textAndInputPrivacy?: string;
  imagePrivacy?: string;
  touchPrivacy?: string;
  hide?: boolean;
  nativeID?: string;
}
