import { UIManager } from 'react-native';
import { requireNativeComponent } from 'react-native';
import type { FTPrivacyViewNativeProps } from '../types';

const isNewArchitectureEnabled = () => {
  return UIManager.getViewManagerConfig?.('FTPrivacyView') === undefined;
};

const getNativeComponent = () => {
  if (isNewArchitectureEnabled()) {
    try {
      /* eslint-disable @typescript-eslint/no-var-requires */
      const NewArchComponent =
        require('./FTPrivacyViewNativeComponent').default;
      /* eslint-enable @typescript-eslint/no-var-requires */
      if (NewArchComponent) {
        return NewArchComponent;
      }
    } catch (error) {
      console.debug(
        'Fabric component not available, falling back to Paper:',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  return requireNativeComponent<FTPrivacyViewNativeProps>('FTPrivacyView');
};

const FTPrivacyViewNative = getNativeComponent();

export default FTPrivacyViewNative;
