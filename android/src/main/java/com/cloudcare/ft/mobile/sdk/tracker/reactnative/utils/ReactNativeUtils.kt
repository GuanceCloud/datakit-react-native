package com.cloudcare.ft.mobile.sdk.tracker.reactnative.utils

class ReactNativeUtils {

  companion object {
    /**
     * react native number 转化 int
     */
    fun convertToNativeInt(value: Any?): Int? {
      return value?.toString()?.toDoubleOrNull()?.toInt()
    }

    /**
     * react native number 转化 long
     */
    fun convertToNativeLong(value: Any?): Long? {
      return value?.toString()?.toDoubleOrNull()?.toLong()
    }
  }
}
