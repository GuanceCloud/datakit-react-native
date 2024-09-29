/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.cloudcare.ft.mobile.sdk.tracker.reactnative.sessionreplay

import android.view.Gravity
import android.widget.TextView
import androidx.annotation.VisibleForTesting
import com.cloudcare.ft.mobile.sdk.tracker.reactnative.sessionreplay.utils.DrawableUtils
import com.cloudcare.ft.mobile.sdk.tracker.reactnative.sessionreplay.utils.ReactViewBackgroundDrawableUtils
import com.cloudcare.ft.mobile.sdk.tracker.reactnative.sessionreplay.utils.ReflectionUtils
import com.cloudcare.ft.mobile.sdk.tracker.reactnative.utils.formatAsRgba
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.UIManagerModule
import com.facebook.react.views.text.TextAttributes
import com.facebook.react.views.view.ReactViewBackgroundDrawable
import com.ft.sdk.sessionreplay.model.Alignment
import com.ft.sdk.sessionreplay.model.ShapeBorder
import com.ft.sdk.sessionreplay.model.ShapeStyle
import com.ft.sdk.sessionreplay.model.TextPosition
import com.ft.sdk.sessionreplay.model.TextStyle
import com.ft.sdk.sessionreplay.model.TextWireframe
import com.ft.sdk.sessionreplay.model.Vertical
import com.ft.sdk.sessionreplay.utils.Utils
import java.util.Locale

internal class ReactTextPropertiesResolver(
  private val reactContext: ReactContext,
  private val uiManagerModule: UIManagerModule,
  private val reflectionUtils: ReflectionUtils = ReflectionUtils(),
  private val reactViewBackgroundDrawableUtils: ReactViewBackgroundDrawableUtils =
    ReactViewBackgroundDrawableUtils(),
  private val drawableUtils: DrawableUtils = DrawableUtils()
) : TextPropertiesResolver {
  override fun addReactNativeProperties(
    originalWireframe: TextWireframe,
    view: TextView,
    pixelDensity: Float,
  ): TextWireframe {
    val (shapeStyle, border) = resolveShapeStyleAndBorder(view, pixelDensity)
      ?: (originalWireframe.shapeStyle to originalWireframe.border)

    val (textStyle, textPosition) = resolveTextStyleAndPosition(
      originalWireframe,
      view,
      pixelDensity
    ) ?: (originalWireframe.textStyle to originalWireframe.textPosition)

    // nothing changed, return the original wireframe
    @Suppress("ComplexCondition")
    if (shapeStyle == originalWireframe.shapeStyle
      && border == originalWireframe.border
      && textStyle == originalWireframe.textStyle
      && textPosition == originalWireframe.textPosition
    ) {
      return originalWireframe
    }

    originalWireframe.setTextStyle(textStyle)
    originalWireframe.setShapeStyle(shapeStyle)
    originalWireframe.setTextPosition(textPosition)
    originalWireframe.setBorder(border)
    return originalWireframe
  }

  private fun resolveTextStyleAndPosition(
    originalWireframe: TextWireframe,
    view: TextView,
    pixelDensity: Float,
  ):
    Pair<TextStyle, TextPosition>? {

    if (!reactContext.hasActiveReactInstance()) {
      return null
    }

    val shadowNodeWrapper: ShadowNodeWrapper =
      ShadowNodeWrapper.getShadowNodeWrapper(
        reactContext = reactContext,
        uiManagerModule = uiManagerModule,
        reflectionUtils = reflectionUtils,
        viewId = view.id
      ) ?: return null

    val textStyle = resolveTextStyle(originalWireframe, pixelDensity, shadowNodeWrapper)
    val alignment = resolveTextAlignment(view, originalWireframe)

    val textPosition = TextPosition(
      originalWireframe.textPosition?.padding,
      alignment,

      )

    return textStyle to textPosition
  }

  private fun resolveShapeStyleAndBorder(
    view: TextView,
    pixelDensity: Float,
  ): Pair<ShapeStyle?, ShapeBorder?>? {
    val backgroundDrawable: ReactViewBackgroundDrawable =
      drawableUtils.getReactBackgroundFromDrawable(view.background) ?: return null

    // view.alpha is the value of the opacity prop on the js side
    val opacity = view.alpha

    val (shapeStyle, border) =
      reactViewBackgroundDrawableUtils
        .resolveShapeAndBorder(backgroundDrawable, opacity, pixelDensity)

    return shapeStyle to border
  }

  private fun resolveTextAlignment(
    view: TextView,
    textWireframe: TextWireframe
  ): Alignment {
    val gravity = view.gravity
    val horizontal = textWireframe.textPosition?.alignment?.horizontal
    val vertical =
      when (gravity.and(Gravity.VERTICAL_GRAVITY_MASK)) {
        Gravity.TOP -> Vertical.TOP
        Gravity.CENTER_VERTICAL,
        Gravity.CENTER -> Vertical.CENTER

        Gravity.BOTTOM -> Vertical.BOTTOM
        else -> Vertical.TOP
      }

    return Alignment(
      horizontal,
      vertical
    )
  }

  private fun resolveTextStyle(
    textWireframe: TextWireframe,
    pixelsDensity: Float,
    shadowNodeWrapper: ShadowNodeWrapper
  ): TextStyle {
    val fontFamily = getFontFamily(shadowNodeWrapper)
      ?: textWireframe.textStyle.family
    val fontSize = getFontSize(shadowNodeWrapper)?.let { it ->
      Utils.densityNormalized(it, pixelsDensity)
    }
      ?: textWireframe.textStyle.size
    val fontColor = getTextColor(shadowNodeWrapper)
      ?: textWireframe.textStyle.color

    return TextStyle(
      fontFamily,
      fontSize,
      fontColor
    )
  }

  private fun getTextColor(shadowNodeWrapper: ShadowNodeWrapper): String? {
    val isColorSet = shadowNodeWrapper
      .getDeclaredShadowNodeField(IS_COLOR_SET_FIELD_NAME) as Boolean?
    if (isColorSet != true) {
      // Improvement: get default text color if different from black
      return "#000000FF"
    }
    val resolvedColor = shadowNodeWrapper
      .getDeclaredShadowNodeField(COLOR_FIELD_NAME) as Int?
    if (resolvedColor != null) {
      return formatAsRgba(resolvedColor)
    }

    return null
  }

  private fun getFontSize(shadowNodeWrapper: ShadowNodeWrapper): Long? {
    val textAttributes = shadowNodeWrapper
      .getDeclaredShadowNodeField(TEXT_ATTRIBUTES_FIELD_NAME) as? TextAttributes?
    if (textAttributes != null) {
      return textAttributes.effectiveFontSize.toLong()
    }

    return null
  }

  private fun getFontFamily(shadowNodeWrapper: ShadowNodeWrapper): String? {
    val fontFamily = shadowNodeWrapper
      .getDeclaredShadowNodeField(FONT_FAMILY_FIELD_NAME) as? String

    if (fontFamily != null) {
      return resolveFontFamily(fontFamily.lowercase(Locale.US))
    }

    return null
  }

  private fun resolveFontFamily(typefaceName: String): String =
    when (typefaceName) {
      ROBOTO_TYPEFACE_NAME -> SANS_SERIF_FAMILY_NAME
      MONOSPACE_FAMILY_NAME -> MONOSPACE_FAMILY_NAME
      SERIF_FAMILY_NAME -> SERIF_FAMILY_NAME
      else -> SANS_SERIF_FAMILY_NAME
    }

  @VisibleForTesting
  internal companion object {
    internal const val TEXT_ATTRIBUTES_FIELD_NAME = "mTextAttributes"
    internal const val FONT_FAMILY_FIELD_NAME = "mFontFamily"
    internal const val COLOR_FIELD_NAME = "mColor"
    internal const val IS_COLOR_SET_FIELD_NAME = "mIsColorSet"

    private const val ROBOTO_TYPEFACE_NAME = "roboto"
    private const val SERIF_FAMILY_NAME = "serif"
    private const val SANS_SERIF_FAMILY_NAME = "roboto, sans-serif"
    internal const val MONOSPACE_FAMILY_NAME = "monospace"
  }
}
