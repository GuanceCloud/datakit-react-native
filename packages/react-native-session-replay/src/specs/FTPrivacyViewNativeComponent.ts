import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';
import type { HostComponent, ViewProps } from 'react-native';

export interface FTPrivacyViewNativeProps extends ViewProps {
  textAndInputPrivacy?: string;
  imagePrivacy?: string;
  touchPrivacy?: string;
  hide?: boolean;
  nativeID?: string;
}

export default codegenNativeComponent<FTPrivacyViewNativeProps>(
  'FTPrivacyView'
) as HostComponent<FTPrivacyViewNativeProps>;
