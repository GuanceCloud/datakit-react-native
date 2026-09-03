const FT_ENABLE_TRACK = 'ft-enable-track';
const FT_EXTRA_PROPERTY = 'ft-extra-property';

export type FTRumActionTrackingContext = {
  enabled: boolean;
  property?: object;
};

type FiberNode = {
  memoizedProps?: Record<string, unknown>;
  return?: FiberNode | null;
};

function findFiberTarget(handlerArgs: unknown[]): FiberNode | null {
  for (const handlerArg of handlerArgs) {
    if (
      handlerArg &&
      typeof handlerArg === 'object' &&
      '_targetInst' in handlerArg
    ) {
      return (handlerArg as { _targetInst?: FiberNode })._targetInst || null;
    }
  }
  return null;
}

function findFiberProperty(
  targetNode: FiberNode | null,
  propertyName: string
): unknown {
  let currentNode = targetNode;
  while (currentNode) {
    const props = currentNode.memoizedProps;
    if (props && props[propertyName]) {
      return props[propertyName];
    }
    currentNode = currentNode.return || null;
  }
  return undefined;
}

export function resolveActionTrackingContextFromTarget(
  targetNode: FiberNode | null
): FTRumActionTrackingContext {
  const enableTrack = findFiberProperty(targetNode, FT_ENABLE_TRACK);
  const extraProperty = findFiberProperty(targetNode, FT_EXTRA_PROPERTY);
  const context: FTRumActionTrackingContext = {
    enabled: enableTrack === undefined || enableTrack === 'true',
  };

  if (extraProperty !== undefined) {
    try {
      const parsedProperty = JSON.parse(String(extraProperty));
      if (parsedProperty && typeof parsedProperty === 'object') {
        context.property = parsedProperty as object;
      }
    } catch (error) {
      console.warn(`Error parsing JSON string ${extraProperty}:`, error);
    }
  }
  return context;
}

export function resolveActionTrackingContext(
  handlerArgs: unknown[]
): FTRumActionTrackingContext {
  return resolveActionTrackingContextFromTarget(findFiberTarget(handlerArgs));
}
