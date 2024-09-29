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
import com.ft.sdk.sessionreplay.model.Wireframe
import com.ft.sdk.sessionreplay.recorder.MappingContext

internal class TextViewUtils {
    internal fun mapTextViewToWireframes(
      wireframes: List<Wireframe>,
      view: TextView,
      mappingContext: MappingContext,
      reactTextPropertiesResolver: TextPropertiesResolver
    ): List<Wireframe> {
        val result = mutableListOf<Wireframe>()
        val pixelDensity = mappingContext.systemInformation.screenDensity

        for (originalWireframe in wireframes) {
            if (originalWireframe !is TextWireframe) {
                result.add(originalWireframe)
            } else {
                result.add(reactTextPropertiesResolver.addReactNativeProperties(
                    originalWireframe = originalWireframe,
                    view = view,
                    pixelDensity = pixelDensity,
                ))
            }
        }

        return result
    }
}
