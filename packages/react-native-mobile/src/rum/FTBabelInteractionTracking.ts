import { resolveActionTrackingContext } from './FTRumActionTrackingContext';

declare global {
  // eslint-disable-next-line no-var
  var __FT_RN_BABEL_PLUGIN_ENABLED__: boolean | undefined;
}

export type FTBabelActionTarget = {
  'options': {
    useContent: boolean;
    useNamePrefix: boolean;
  };
  'handlerArgs'?: unknown[];
  'componentName': string;
  'getContent'?: () => string[];
  'ft-action-name'?: string[];
  'customActionName'?: string[];
  'accessibilityLabel'?: string[];
};

type ActionReporter = (
  actionName: string,
  actionType: string,
  property?: object
) => Promise<void>;

type BabelTrackingConfig = {
  trackInteractions: boolean;
  actionReporter?: ActionReporter;
};

const DEFAULT_ACTION_TYPE = 'click';

const normalize = (value: string): string => value.replace(/\s+/g, ' ').trim();

const normalizeActionType = (value: unknown): string =>
  typeof value === 'string' && value.trim()
    ? value.trim()
    : DEFAULT_ACTION_TYPE;

const nonEmpty = (values: string[] | undefined): string[] | null => {
  if (!values) {
    return null;
  }
  const normalized = values.map(normalize).filter(Boolean);
  return normalized.length > 0 ? normalized : null;
};

class BabelInteractionTracking {
  private trackInteractions = false;
  private actionReporter: ActionReporter | undefined;

  getInstance(): BabelInteractionTracking {
    return this;
  }

  configure(config: BabelTrackingConfig): void {
    this.trackInteractions = config.trackInteractions;
    this.actionReporter = config.actionReporter;
  }

  getTargetName(target: FTBabelActionTarget): string {
    let selectedContent = nonEmpty(target['ft-action-name']);
    selectedContent ||= nonEmpty(target.customActionName);
    selectedContent ||= nonEmpty(target.accessibilityLabel);
    if (!selectedContent && target.options.useContent) {
      selectedContent = nonEmpty(target.getContent?.());
    }

    if (!selectedContent) {
      return target.componentName;
    }

    const handlerArgs = target.handlerArgs || [];
    const numericArgument = handlerArgs.find(
      (value) => typeof value === 'number'
    ) as number | undefined;
    const index =
      numericArgument !== undefined &&
      Number.isInteger(numericArgument) &&
      numericArgument >= 0 &&
      numericArgument < selectedContent.length
        ? numericArgument
        : 0;
    const output = selectedContent[index] || selectedContent[0];

    return target.options.useNamePrefix
      ? `${target.componentName} ("${output}")`
      : output;
  }

  wrapRumAction(
    handler: ((...args: any[]) => any) | null | undefined,
    actionType: string,
    target: FTBabelActionTarget
  ): (...args: any[]) => any {
    const normalizedActionType = normalizeActionType(actionType);
    return (...args: any[]) => {
      try {
        if (this.trackInteractions && this.actionReporter) {
          const context = resolveActionTrackingContext(args);
          if (context.enabled) {
            const actionName = this.getTargetName({
              ...target,
              handlerArgs: args,
            });
            Promise.resolve(
              this.actionReporter(
                actionName,
                normalizedActionType,
                context.property
              )
            ).catch(() => undefined);
          }
        }
      } catch (_error) {
        // Tracking must never block the application's original handler.
      }
      return handler?.(...args);
    };
  }
}

export const FTBabelInteractionTracking = new BabelInteractionTracking();
