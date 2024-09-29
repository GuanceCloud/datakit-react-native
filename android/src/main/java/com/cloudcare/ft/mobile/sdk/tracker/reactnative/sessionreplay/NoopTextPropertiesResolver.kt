/*
 *
 *  * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 *  * This product includes software developed at Datadog (https://www.datadoghq.com/).
 *  * Copyright 2016-Present Datadog, Inc.
 *
 */

package com.cloudcare.ft.mobile.sdk.tracker.reactnative.sessionreplay

import android.widget.TextView
import com.ft.sdk.sessionreplay.model.TextWireframe

public class NoopTextPropertiesResolver : TextPropertiesResolver {
  override fun addReactNativeProperties(
    originalWireframe: TextWireframe,
    view: TextView,
    pixelDensity: Float
  ): TextWireframe {
    return originalWireframe
  }
}
