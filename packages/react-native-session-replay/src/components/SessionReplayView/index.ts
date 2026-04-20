import { PrivacyView } from './PrivacyView';
import { MaskAllView } from './MaskAllView';
import { MaskNoneView } from './MaskNoneView';
import { HideView } from './HideView';

export const FTSessionReplayView = {
  /**
   * Privacy view component - Low-level configurable component for fine-grained privacy control
   */
  Privacy: PrivacyView,

  /**
   * Mask all view component - Masks all text, inputs and images
   */
  MaskAll: MaskAllView,

  /**
   * Mask none view component - Displays most content as-is
   */
  MaskNone: MaskNoneView,

  /**
   * Hide view component - Completely hides the view and its content
   */
  Hide: HideView,
};
