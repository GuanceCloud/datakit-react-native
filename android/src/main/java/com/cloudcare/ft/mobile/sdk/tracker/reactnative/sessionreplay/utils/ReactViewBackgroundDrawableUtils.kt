/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.cloudcare.ft.mobile.sdk.tracker.reactnative.sessionreplay.utils

import com.cloudcare.ft.mobile.sdk.tracker.reactnative.utils.formatAsRgba
import com.facebook.react.uimanager.Spacing
import com.facebook.react.views.view.ReactViewBackgroundDrawable
import com.ft.sdk.sessionreplay.model.ShapeBorder
import com.ft.sdk.sessionreplay.model.ShapeStyle
import com.ft.sdk.sessionreplay.utils.Utils

internal class ReactViewBackgroundDrawableUtils(
  private val reflectionUtils: ReflectionUtils = ReflectionUtils()
) {
  internal fun resolveShapeAndBorder(
    drawable: ReactViewBackgroundDrawable,
    opacity: Float,
    pixelDensity: Float
  ): Pair<ShapeStyle?, ShapeBorder?> {
    val borderProps = resolveBorder(drawable, pixelDensity)
    val backgroundColor = getBackgroundColor(drawable)
    val colorHexString = if (backgroundColor != null) {
      formatAsRgba(backgroundColor)
    } else {
      return null to borderProps
    }

    val cornerRadius = Utils.densityNormalized(drawable.fullBorderRadius.toLong(), pixelDensity)

    return ShapeStyle(
      colorHexString,
      opacity,
      cornerRadius
    ) to borderProps
  }

  private fun getBackgroundColor(
    backgroundDrawable: ReactViewBackgroundDrawable,
  ): Int? {
    return reflectionUtils.getDeclaredField(
      backgroundDrawable,
      COLOR_FIELD_NAME
    ) as Int?
  }

  private fun resolveBorder(
    backgroundDrawable: ReactViewBackgroundDrawable,
    pixelDensity: Float
  ): ShapeBorder {
    val borderWidth =
      Utils.densityNormalized(backgroundDrawable.fullBorderWidth.toLong(), pixelDensity)
    val borderColor = formatAsRgba(backgroundDrawable.getBorderColor(Spacing.ALL))

    return ShapeBorder(
      borderColor,
      borderWidth
    )
  }

  private companion object {
    private const val COLOR_FIELD_NAME = "mColor"
  }
}
