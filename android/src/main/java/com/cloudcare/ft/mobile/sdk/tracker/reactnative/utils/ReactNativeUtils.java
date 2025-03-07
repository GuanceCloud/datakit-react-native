package com.cloudcare.ft.mobile.sdk.tracker.reactnative.utils;

import kotlin.text.Regex;

public class ReactNativeUtils {

  private static final Regex[] RN_DEV_INNER_URL_REGEX = {
    new Regex("^http://((10|172|192).[0-9]+.[0-9]+.[0-9]+|localhost|127.0.0.1):808[0-9]/logs$"), // expo
    new Regex("^http://localhost:808[0-9]/(hot|symbolicate|message|inspector).*$") // rn
  };

    private ReactNativeUtils() {
        // Private constructor to prevent instantiation
    }

    /**
     * React Native number 转化为 int
     */
    public static Integer convertToNativeInt(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return (int) Double.parseDouble(value.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /**
     * React Native number 转化为 long
     */
    public static Long convertToNativeLong(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return (long) Double.parseDouble(value.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

  /**
   * 判断是否是 React Native debug 阶段生成的 url 请求
   * @param url
   * @return
   */

  public static boolean isReactNativeDevUrl(String url) {
    for (Regex regex : RN_DEV_INNER_URL_REGEX) {
      if (regex.matches(url)) {
        return true;
      }
    }
    return false;
  }


}
