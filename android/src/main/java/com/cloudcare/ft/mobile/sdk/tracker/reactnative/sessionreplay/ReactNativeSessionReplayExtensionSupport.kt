/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.cloudcare.ft.mobile.sdk.tracker.reactnative.sessionreplay

import androidx.annotation.VisibleForTesting
import com.cloudcare.ft.mobile.sdk.tracker.reactnative.sessionreplay.mappers.ReactEditTextMapper
import com.cloudcare.ft.mobile.sdk.tracker.reactnative.sessionreplay.mappers.ReactTextMapper
import com.cloudcare.ft.mobile.sdk.tracker.reactnative.sessionreplay.mappers.ReactViewGroupMapper
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.UIManagerModule
import com.facebook.react.views.text.ReactTextView
import com.facebook.react.views.textinput.ReactEditText
import com.facebook.react.views.view.ReactViewGroup
import com.ft.sdk.garble.utils.LogUtils
import com.ft.sdk.sessionreplay.ExtensionSupport
import com.ft.sdk.sessionreplay.MapperTypeWrapper
import com.ft.sdk.sessionreplay.recorder.OptionSelectorDetector
import com.ft.sdk.sessionreplay.utils.InternalLogger

internal class ReactNativeSessionReplayExtensionSupport(
  private val reactContext: ReactContext,
  private val logger: InternalLogger
) : ExtensionSupport {

  override fun getCustomViewMappers(): List<MapperTypeWrapper<*>> {
    val uiManagerModule = getUiManagerModule()
    val reactTextMapper = ReactTextMapper(reactContext, uiManagerModule)
    return listOf(
      MapperTypeWrapper(ReactViewGroup::class.java, ReactViewGroupMapper()),
      MapperTypeWrapper(ReactTextView::class.java, reactTextMapper),
      MapperTypeWrapper(
        ReactEditText::class.java,
        ReactEditTextMapper(reactContext, uiManagerModule)
      ),
    )
  }

  override fun getOptionSelectorDetectors(): List<OptionSelectorDetector> {
    return listOf()
  }

  @VisibleForTesting
  internal fun getUiManagerModule(): UIManagerModule? {
    return try {
      reactContext.getNativeModule(UIManagerModule::class.java)
    } catch (e: IllegalStateException) {
      logger.w(
        "",
        RESOLVE_UIMANAGERMODULE_ERROR + "\n" + LogUtils.getStackTraceString(e),
      )
      return null
    }
  }

  internal companion object {
    internal const val RESOLVE_UIMANAGERMODULE_ERROR = "Unable to resolve UIManagerModule"
    private const val TAG = "ReactNativeSessionRepla"
  }
}
