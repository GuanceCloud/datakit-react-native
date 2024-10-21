import type { ErrorHandlerCallback } from 'react-native';
import { FTReactNativeRUM } from '../ft_rum';
const EMPTY_MESSAGE = 'Unknown Error';
const CONSOLE_ERROR = "console_error";

export class FTRumErrorTracking {
  private static isTracking = false;

  private static isInDefaultErrorHandler = false;

  // 原有的 error 处理方法
  private static defaultErrorHandler: ErrorHandlerCallback = (_error: any, _isFatal?: boolean) => { }

  // 原有的 console error 处理方法
  private static defaultConsoleError = (..._params: unknown[]) => { }

  static startTracking(): void {
    if(FTRumErrorTracking.isTracking){
      return;
    }
    if (ErrorUtils) {
      FTRumErrorTracking.defaultErrorHandler = ErrorUtils.getGlobalHandler;
      FTRumErrorTracking.defaultConsoleError = console.error;
      ErrorUtils.setGlobalHandler(FTRumErrorTracking.onGlobalError);
      console.error = FTRumErrorTracking.onConsoleError;
      FTRumErrorTracking.isTracking = true;
    }
  }
  static onGlobalError(error: any, isFatal?: boolean): void {
    const message = FTRumErrorTracking.getErrorMessage(error);
    const stacktrace = FTRumErrorTracking.getErrorStackTrace(error);
    FTReactNativeRUM.addError(
      stacktrace,
      message
      ).then(() => {
        try {
          FTRumErrorTracking.isInDefaultErrorHandler = true;
          //调用原有的 error 处理方法
          FTRumErrorTracking.defaultErrorHandler(error, isFatal);
        } finally {
          FTRumErrorTracking.isInDefaultErrorHandler = false;
        }
      });
    }

    static onConsoleError(...params: unknown[]): void {
      if ( FTRumErrorTracking.isInDefaultErrorHandler) {
        return;
      }

      let stack: string = '';
      for (let i = 0; i < params.length; i += 1) {
        const param = params[i];
        const paramStack = FTRumErrorTracking.getErrorStackTrace(param);
        if (paramStack != undefined && paramStack != '') {
          stack = paramStack;
          break;
        }
      }

      const message = params.map((param) => {
        if (typeof param === 'string') { return param; }
        else { return FTRumErrorTracking.getErrorMessage(param); }
      }).join(' ');


      FTReactNativeRUM.addErrorWithType(
        CONSOLE_ERROR,
        stack,
        message,
        ).then(() => {
          FTRumErrorTracking.defaultConsoleError.apply(console, params);
        });

      }
      private static getErrorMessage(error: any | undefined): string {
        let message = EMPTY_MESSAGE;
        if (error == undefined || error === null) {
          message = EMPTY_MESSAGE;
        } else if (typeof error === 'object' && 'message' in error){
          message = String(error.message);
        } else {
          message = String(error);
        }

        return message
      }

      private static getErrorStackTrace(error: any | undefined): string {
        let stack = '';

        if (error == undefined) {
          stack = '';
        } else if (typeof error === 'string') {
          stack = '';
        } else if ('componentStack' in error) {
          stack = String(error.componentStack);
        } else if ('stacktrace' in error) {
          stack = String(error.stacktrace);
        } else if ('stack' in error) {
          stack = String(error.stack);
        } else if (('sourceURL' in error) && ('line' in error) && ('column' in error)) {
          stack = `at ${error.sourceURL}:${error.line}:${error.column}`;
        }

        return stack
      }
    }


