/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.cloudcare.ft.mobile.sdk.tracker.reactnative.sessionreplay.mappers

import com.cloudcare.ft.mobile.sdk.tracker.reactnative.sessionreplay.NoopTextPropertiesResolver
import com.cloudcare.ft.mobile.sdk.tracker.reactnative.sessionreplay.ReactTextPropertiesResolver
import com.cloudcare.ft.mobile.sdk.tracker.reactnative.sessionreplay.TextPropertiesResolver
import com.cloudcare.ft.mobile.sdk.tracker.reactnative.sessionreplay.TextViewUtils
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.UIManagerModule
import com.facebook.react.views.textinput.ReactEditText
import com.ft.sdk.sessionreplay.model.Wireframe
import com.ft.sdk.sessionreplay.recorder.MappingContext
import com.ft.sdk.sessionreplay.recorder.mapper.EditTextMapper
import com.ft.sdk.sessionreplay.recorder.mapper.WireframeMapper
import com.ft.sdk.sessionreplay.utils.AsyncJobStatusCallback
import com.ft.sdk.sessionreplay.utils.DefaultColorStringFormatter
import com.ft.sdk.sessionreplay.utils.DefaultViewBoundsResolver
import com.ft.sdk.sessionreplay.utils.DefaultViewIdentifierResolver
import com.ft.sdk.sessionreplay.utils.DrawableToColorMapper
import com.ft.sdk.sessionreplay.utils.InternalLogger

internal class ReactEditTextMapper(
  private val reactTextPropertiesResolver: TextPropertiesResolver =
    NoopTextPropertiesResolver(),
  private val textViewUtils: TextViewUtils = TextViewUtils(),
) : WireframeMapper<ReactEditText> {

  private val editTextMapper = EditTextMapper(
    DefaultViewIdentifierResolver.get(),
    DefaultColorStringFormatter.get(),
    DefaultViewBoundsResolver.get(),
    DrawableToColorMapper.getDefault(),
  )

  internal constructor(
    reactContext: ReactContext,
    uiManagerModule: UIManagerModule?
  ) : this(
    reactTextPropertiesResolver = if (uiManagerModule == null) {
      NoopTextPropertiesResolver()
    } else {
      ReactTextPropertiesResolver(
        reactContext = reactContext,
        uiManagerModule = uiManagerModule
      )
    }
  )

  override fun map(
    view: ReactEditText,
    mappingContext: MappingContext,
    asyncJobStatusCallback: AsyncJobStatusCallback,
    internalLogger: InternalLogger
  ): List<Wireframe> {
    val wireframes = editTextMapper.map(
      view,
      mappingContext,
      asyncJobStatusCallback,
      internalLogger
    )

    return textViewUtils.mapTextViewToWireframes(
      wireframes = wireframes,
      view = view,
      mappingContext = mappingContext,
      reactTextPropertiesResolver = reactTextPropertiesResolver
    )
  }
}
